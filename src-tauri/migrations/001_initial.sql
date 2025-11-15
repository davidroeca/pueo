-- Initial schema for Pueo game builder
-- Games table stores the complete game specifications
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    spec_json TEXT NOT NULL,  -- Complete PhaserGameSpec as JSON
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
);

-- Index for searching by title
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);

-- Index for sorting by update date
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at DESC);

-- Game versions table for tracking changes
CREATE TABLE IF NOT EXISTS game_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    spec_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE(game_id, version)
);

-- Index for querying versions by game
CREATE INDEX IF NOT EXISTS idx_game_versions_game_id ON game_versions(game_id, version DESC);
