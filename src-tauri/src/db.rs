/// Database module for storing and managing Phaser game specifications
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use sqlx::Row;
use std::path::PathBuf;
use std::str::FromStr;

use crate::game_builder::PhaserGameSpec;

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("DateTime parse error: {0}")]
    DateTimeParse(String),
    #[error("Game not found: {0}")]
    NotFound(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Stored game record with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameRecord {
    pub id: String,
    pub title: String,
    pub description: String,
    pub spec: PhaserGameSpec,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i64,
}

/// Game version record for tracking changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameVersion {
    pub id: i64,
    pub game_id: String,
    pub version: i64,
    pub spec: PhaserGameSpec,
    pub created_at: DateTime<Utc>,
    pub notes: Option<String>,
}

/// Summary of a game (without full spec)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSummary {
    pub id: String,
    pub title: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i64,
}

/// Database connection and operations
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Initialize database with migrations
    pub async fn new(db_path: PathBuf) -> Result<Self, DbError> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        // Create connection options
        let options = SqliteConnectOptions::from_str(&format!("sqlite:{}", db_path.display()))?
            .create_if_missing(true);

        // Create connection pool
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        // Run migrations
        Self::run_migrations(&pool).await?;

        Ok(Self { pool })
    }

    /// Run database migrations
    async fn run_migrations(pool: &SqlitePool) -> Result<(), DbError> {
        let migration = include_str!("../migrations/001_initial.sql");
        sqlx::query(migration).execute(pool).await?;
        Ok(())
    }

    /// Generate a unique ID for a new game
    fn generate_id() -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
        format!("game_{}", timestamp)
    }

    /// Create a new game
    pub async fn create_game(&self, spec: PhaserGameSpec) -> Result<GameRecord, DbError> {
        let id = Self::generate_id();
        let now = Utc::now();
        let spec_json = serde_json::to_string(&spec)?;

        sqlx::query(
            r#"
            INSERT INTO games (id, title, description, spec_json, created_at, updated_at, version)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)
            "#,
        )
        .bind(&id)
        .bind(&spec.title)
        .bind(&spec.description)
        .bind(&spec_json)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        // Create initial version record
        sqlx::query(
            r#"
            INSERT INTO game_versions (game_id, version, spec_json, created_at, notes)
            VALUES (?1, 1, ?2, ?3, ?4)
            "#,
        )
        .bind(&id)
        .bind(&spec_json)
        .bind(now.to_rfc3339())
        .bind("Initial version")
        .execute(&self.pool)
        .await?;

        Ok(GameRecord {
            id,
            title: spec.title.clone(),
            description: spec.description.clone(),
            spec,
            created_at: now,
            updated_at: now,
            version: 1,
        })
    }

    /// Get a game by ID
    pub async fn get_game(&self, id: &str) -> Result<GameRecord, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, title, description, spec_json, created_at, updated_at, version
            FROM games
            WHERE id = ?1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| DbError::NotFound(id.to_string()))?;

        let spec_json: String = row.get("spec_json");
        let spec: PhaserGameSpec = serde_json::from_str(&spec_json)?;
        let created_at: String = row.get("created_at");
        let updated_at: String = row.get("updated_at");

        Ok(GameRecord {
            id: row.get("id"),
            title: row.get("title"),
            description: row.get("description"),
            spec,
            created_at: DateTime::parse_from_rfc3339(&created_at)
                .map_err(|e| DbError::DateTimeParse(e.to_string()))?
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&updated_at)
                .map_err(|e| DbError::DateTimeParse(e.to_string()))?
                .with_timezone(&Utc),
            version: row.get("version"),
        })
    }

    /// Update an existing game (creates a new version)
    pub async fn update_game(
        &self,
        id: &str,
        spec: PhaserGameSpec,
        notes: Option<String>,
    ) -> Result<GameRecord, DbError> {
        // Get current version
        let current = self.get_game(id).await?;
        let new_version = current.version + 1;
        let now = Utc::now();
        let spec_json = serde_json::to_string(&spec)?;

        // Update main record
        sqlx::query(
            r#"
            UPDATE games
            SET title = ?1, description = ?2, spec_json = ?3, updated_at = ?4, version = ?5
            WHERE id = ?6
            "#,
        )
        .bind(&spec.title)
        .bind(&spec.description)
        .bind(&spec_json)
        .bind(now.to_rfc3339())
        .bind(new_version)
        .bind(id)
        .execute(&self.pool)
        .await?;

        // Create version record
        sqlx::query(
            r#"
            INSERT INTO game_versions (game_id, version, spec_json, created_at, notes)
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
        )
        .bind(id)
        .bind(new_version)
        .bind(&spec_json)
        .bind(now.to_rfc3339())
        .bind(notes)
        .execute(&self.pool)
        .await?;

        Ok(GameRecord {
            id: id.to_string(),
            title: spec.title.clone(),
            description: spec.description.clone(),
            spec,
            created_at: current.created_at,
            updated_at: now,
            version: new_version,
        })
    }

    /// Delete a game and all its versions
    pub async fn delete_game(&self, id: &str) -> Result<(), DbError> {
        let result = sqlx::query("DELETE FROM games WHERE id = ?1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(DbError::NotFound(id.to_string()));
        }

        Ok(())
    }

    /// List all games (summaries only)
    pub async fn list_games(&self) -> Result<Vec<GameSummary>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, title, description, created_at, updated_at, version
            FROM games
            ORDER BY updated_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let mut summaries = Vec::new();
        for row in rows {
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");

            summaries.push(GameSummary {
                id: row.get("id"),
                title: row.get("title"),
                description: row.get("description"),
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .map_err(|e| DbError::DateTimeParse(e.to_string()))?
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at)
                    .map_err(|e| DbError::DateTimeParse(e.to_string()))?
                    .with_timezone(&Utc),
                version: row.get("version"),
            });
        }

        Ok(summaries)
    }

    /// Get all versions of a game
    pub async fn get_game_versions(&self, game_id: &str) -> Result<Vec<GameVersion>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, game_id, version, spec_json, created_at, notes
            FROM game_versions
            WHERE game_id = ?1
            ORDER BY version DESC
            "#,
        )
        .bind(game_id)
        .fetch_all(&self.pool)
        .await?;

        let mut versions = Vec::new();
        for row in rows {
            let spec_json: String = row.get("spec_json");
            let spec: PhaserGameSpec = serde_json::from_str(&spec_json)?;
            let created_at: String = row.get("created_at");

            versions.push(GameVersion {
                id: row.get("id"),
                game_id: row.get("game_id"),
                version: row.get("version"),
                spec,
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .map_err(|e| DbError::DateTimeParse(e.to_string()))?
                    .with_timezone(&Utc),
                notes: row.get("notes"),
            });
        }

        Ok(versions)
    }

    /// Get a specific version of a game
    pub async fn get_game_version(
        &self,
        game_id: &str,
        version: i64,
    ) -> Result<GameVersion, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, game_id, version, spec_json, created_at, notes
            FROM game_versions
            WHERE game_id = ?1 AND version = ?2
            "#,
        )
        .bind(game_id)
        .bind(version)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| DbError::NotFound(format!("{} v{}", game_id, version)))?;

        let spec_json: String = row.get("spec_json");
        let spec: PhaserGameSpec = serde_json::from_str(&spec_json)?;
        let created_at: String = row.get("created_at");

        Ok(GameVersion {
            id: row.get("id"),
            game_id: row.get("game_id"),
            version: row.get("version"),
            spec,
            created_at: DateTime::parse_from_rfc3339(&created_at)
                .map_err(|e| DbError::DateTimeParse(e.to_string()))?
                .with_timezone(&Utc),
            notes: row.get("notes"),
        })
    }

    /// Search games by title
    pub async fn search_games(&self, query: &str) -> Result<Vec<GameSummary>, DbError> {
        let search_pattern = format!("%{}%", query);
        let rows = sqlx::query(
            r#"
            SELECT id, title, description, created_at, updated_at, version
            FROM games
            WHERE title LIKE ?1 OR description LIKE ?1
            ORDER BY updated_at DESC
            "#,
        )
        .bind(&search_pattern)
        .fetch_all(&self.pool)
        .await?;

        let mut summaries = Vec::new();
        for row in rows {
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");

            summaries.push(GameSummary {
                id: row.get("id"),
                title: row.get("title"),
                description: row.get("description"),
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .map_err(|e| DbError::DateTimeParse(e.to_string()))?
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at)
                    .map_err(|e| DbError::DateTimeParse(e.to_string()))?
                    .with_timezone(&Utc),
                version: row.get("version"),
            });
        }

        Ok(summaries)
    }
}
