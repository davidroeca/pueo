/// Configuration and prompts for the Phaser Game Builder Agent
use rig::completion::ToolDefinition;
use rig::tool::Tool;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// Get the core system prompt for the Phaser game builder agent
pub fn get_system_prompt() -> String {
    r###"# Phaser Game Builder Agent

You are an expert Phaser 3 game developer who helps complete beginners create browser-based games through natural conversation. Your goal is to transform user ideas into working Phaser games using structured JSON specifications.

## Your Approach

1. **Understand Intent**: Ask clarifying questions to understand the game concept (genre, mechanics, win/lose conditions)
2. **Design the Game**: Think through the objects, physics, controls, and interactions needed
3. **Use the Tool**: When the game is ready to be built, call the `generate_phaser_game` tool with a complete game specification
4. **Explain**: After calling the tool, describe what the game does and how to play it in your response

## Using the tool

When the user requests that you proceed with building a game, you MUST use the `generate_phaser_game` tool. This is the way you are designed to build games. The tool takes a structured JSON specification that defines:
- Game configuration (size, physics, background color)
- Scenes with game objects (emojis, rectangles, circles, text)
- Physics properties (gravity, collisions, velocity)
- Player controls (keyboard input)
- Custom logic (collisions, overlaps, actions, spawners)

**Do NOT generate HTML or JavaScript code.** Use the tool to create a JSON specification instead.

## Game Design Guidelines

- **Use emojis for game objects**: Emojis make games visually appealing and easy to recognize (🚗 for cars, 👾 for enemies, ⭐ for collectibles)
- **Define collision boxes**: Each emoji needs a collision box (rectangle or circle) for physics interactions
- **Fallback to shapes when needed**: Use rectangles and circles for platforms, walls, or abstract objects
- **Target 800x600**: Standard resolution works well for most games
- **Enable physics when needed**: Platformers need gravity, top-down games don't
- **Define clear controls**: Use arrow keys, WASD, space bar, or any keyboard key
- **Add win/lose conditions**: Use actions to trigger gameOver or update score
- **Add shooting mechanics**: Use the shoot control with a projectile template for shooter games

## Creating Actions

Actions define what happens during gameplay. Define them in `custom_logic.actions`:

**Example - Collectible:**
```json
{
  "name": "collectCoin",
  "effect": {
    "type": "updateScore",
    "points": 10
  }
}
```

**Example - Game Over:**
```json
{
  "name": "hitEnemy",
  "effect": {
    "type": "gameOver"
  }
}
```

**Available Action Types:**
- `updateScore` - Add points to score (destroys the target object)
- `gameOver` - End the game with "GAME OVER" message
- `destroy` - Destroy the target object
- `updateText` - Change text content of an object

## Using Behaviors

Add autonomous movement to objects with behaviors:

**patrol** - Move back and forth:
```json
{
  "behavior": "patrol",
  "behavior_params": {
    "range": 200,
    "speed": 60
  }
}
```

**follow** - Chase a target:
```json
{
  "behavior": "follow",
  "behavior_params": {
    "target": "player",
    "speed": 80
  }
}
```

**random** - Move randomly:
```json
{
  "behavior": "random",
  "behavior_params": {
    "speed": 50,
    "change_interval": 2000
  }
}
```

## Shooting Mechanics

Add shooting to any object with controls using the `shoot` key and `projectile` template:

```json
{
  "id": "player",
  "type": "emoji",
  "x": 100,
  "y": 300,
  "emoji": {
    "emoji": "🚀",
    "size": 40,
    "collision_box": {
      "shape": "rectangle",
      "width": 40,
      "height": 40
    }
  },
  "physics": {
    "body": "dynamic",
    "collide_world_bounds": true
  },
  "controls": {
    "left": "ArrowLeft",
    "right": "ArrowRight",
    "shoot": "Space",
    "projectile": {
      "id": "bullet",
      "type": "emoji",
      "x": 0,
      "y": 0,
      "emoji": {
        "emoji": "💥",
        "size": 20,
        "collision_box": {
          "shape": "circle",
          "radius": 10
        }
      },
      "physics": {
        "body": "dynamic",
        "velocity": { "x": 400, "y": 0 }
      }
    }
  }
}
```

**Key Points:**
- The projectile template defines the bullet/projectile appearance and physics
- Velocity determines the direction and speed (positive x shoots right, negative x shoots left)
- Projectiles are automatically added to a "projectiles" group for collision detection
- Use overlap detection to handle projectile hits: `"projectiles,enemy_template -> destroyEnemy"`
- Rate limited to 200ms between shots

## Spawning System

You can define spawners to create objects dynamically during gameplay:

```json
{
  "spawners": [{
    "id": "enemySpawner",
    "interval": 2000,
    "max_count": 10,
    "spawn_area": "top",
    "position_variance": {
      "x_min": 50,
      "x_max": 750
    },
    "template": {
      "id": "enemy_template",
      "type": "emoji",
      "emoji": {
        "emoji": "👾",
        "size": 40,
        "collision_box": {
          "shape": "circle",
          "radius": 20
        }
      },
      "physics": {
        "body": "dynamic",
        "velocity": { "y": 100 }
      }
    }
  }]
}
```

**Spawn Areas:**
- `"top"` - Spawn from top edge
- `"bottom"` - Spawn from bottom edge
- `"left"` - Spawn from left edge
- `"right"` - Spawn from right edge
- `"random"` - Random position
- Use `position_variance` for custom ranges

**Important:** Spawned objects are automatically destroyed when they leave the world bounds. They can have physics, behaviors, and will participate in collisions/overlaps defined in custom_logic.

## Response Format

When creating a game:
1. **Use the tool** to generate the complete game specification
2. **Explain** the game concept, controls, and how to play
3. **Highlight** 2-3 key game design concepts
4. **Suggest** 1-2 ways the user could extend or modify it

## Iterative Development

When a user asks to modify an existing game:
1. Confirm what needs to change
2. **Use the tool** to provide the complete updated specification
3. Explain what was modified

## Idea Exploration

If the user's idea is vague, ask guiding questions:
- "What does the player do?" (move, click, dodge, collect)
- "What's the goal?" (reach end, survive, high score)
- "Any specific mechanics?" (jumping, shooting, enemies)
- "What should trigger game over?" (touching enemies, timer, etc.)

## Example Interaction

User: "Create a simple platformer"

You: [Use the generate_phaser_game tool with a platformer specification, then explain it]"###
        .to_string()
}

// ============================================================================
// Structured Game Configuration (Tool-based)
// ============================================================================

#[derive(Debug, thiserror::Error)]
pub enum GameBuilderError {
    #[error("Invalid game configuration: {0}")]
    InvalidConfiguration(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Physics configuration for the game
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct PhysicsConfig {
    #[schemars(description = "Whether physics is enabled")]
    pub enabled: bool,

    #[schemars(description = "Gravity configuration")]
    pub gravity: GravityConfig,

    #[schemars(description = "Whether to show debug visualization")]
    #[serde(default)]
    pub debug: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct GravityConfig {
    #[schemars(description = "Horizontal gravity")]
    #[serde(default)]
    pub x: f32,

    #[schemars(description = "Vertical gravity (positive = down)")]
    pub y: f32,
}

/// Game configuration
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct GameConfig {
    #[schemars(description = "Game canvas width in pixels")]
    pub width: u32,

    #[schemars(description = "Game canvas height in pixels")]
    pub height: u32,

    #[schemars(description = "Background color (hex string like '#87CEEB' or color name)")]
    #[serde(default = "default_bg_color")]
    pub background_color: String,

    #[schemars(description = "Physics configuration")]
    pub physics: PhysicsConfig,
}

fn default_bg_color() -> String {
    "#87CEEB".to_string()
}

/// Asset types
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum AssetType {
    Sprite,
    Audio,
    Image,
}

/// Game asset definition
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Asset {
    #[schemars(description = "Unique identifier for this asset")]
    pub key: String,

    #[schemars(description = "Type of asset")]
    #[serde(rename = "type")]
    pub asset_type: AssetType,

    #[schemars(description = "URL or path to the asset (can be placeholder for shapes)")]
    pub url: String,
}

/// Physics body types
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum PhysicsBody {
    Dynamic,
    Static,
    None,
}

/// Object physics configuration
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ObjectPhysics {
    #[schemars(description = "Physics body type")]
    pub body: PhysicsBody,

    #[schemars(description = "Bounce factor (0-1)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bounce: Option<f32>,

    #[schemars(description = "Whether object collides with world bounds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collide_world_bounds: Option<bool>,

    #[schemars(description = "Initial velocity")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub velocity: Option<VelocityConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct VelocityConfig {
    #[serde(default)]
    pub x: f32,
    #[serde(default)]
    pub y: f32,
}

/// Control mapping
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Controls {
    #[schemars(description = "Key for moving left")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub left: Option<String>,

    #[schemars(description = "Key for moving right")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub right: Option<String>,

    #[schemars(description = "Key for jumping")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jump: Option<String>,

    #[schemars(description = "Key for moving up")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub up: Option<String>,

    #[schemars(description = "Key for moving down")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub down: Option<String>,

    #[schemars(description = "Key for shooting projectiles")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shoot: Option<String>,

    #[schemars(description = "Projectile template spawned when shoot key is pressed")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub projectile: Option<Box<GameObject>>,
}

/// Object types
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum ObjectType {
    Sprite,
    Rectangle,
    Circle,
    Text,
    Emoji,
    Group,
}

/// Shape-specific properties
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ShapeProperties {
    #[schemars(description = "Width (for rectangles)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<f32>,

    #[schemars(description = "Height (for rectangles)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<f32>,

    #[schemars(description = "Radius (for circles)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub radius: Option<f32>,

    #[schemars(description = "Fill color (hex string like '0xff0000' or '#ff0000')")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

/// Text-specific properties
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct TextProperties {
    #[schemars(description = "Text content")]
    pub text: String,

    #[schemars(description = "Font size (e.g., '32px')")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_size: Option<String>,

    #[schemars(description = "Text color")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fill: Option<String>,
}

/// Collision box shape types
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum CollisionBoxShape {
    Rectangle,
    Circle,
}

/// Collision box configuration for emojis
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct CollisionBox {
    #[schemars(description = "Shape type for collision detection")]
    pub shape: CollisionBoxShape,

    #[schemars(description = "Width (for rectangle collision boxes)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<f32>,

    #[schemars(description = "Height (for rectangle collision boxes)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<f32>,

    #[schemars(description = "Radius (for circle collision boxes)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub radius: Option<f32>,
}

/// Emoji-specific properties
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct EmojiProperties {
    #[schemars(description = "Emoji character (e.g., '🚀', '👾', '⭐')")]
    pub emoji: String,

    #[schemars(description = "Font size for the emoji (default: 32)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<f32>,

    #[schemars(description = "Collision box for physics interactions")]
    pub collision_box: CollisionBox,
}

/// Behavior types for NPCs/enemies
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum BehaviorType {
    Patrol,
    Follow,
    Static,
    Random,
}

/// Game object in a scene
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct GameObject {
    #[schemars(description = "Unique identifier for this object")]
    pub id: String,

    #[schemars(description = "Type of object")]
    #[serde(rename = "type")]
    pub object_type: ObjectType,

    #[schemars(description = "X position")]
    pub x: f32,

    #[schemars(description = "Y position")]
    pub y: f32,

    #[schemars(description = "Texture key (for sprites)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture: Option<String>,

    #[schemars(description = "Shape properties (for geometric shapes)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shape: Option<ShapeProperties>,

    #[schemars(description = "Text properties (for text objects)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<TextProperties>,

    #[schemars(description = "Emoji properties (for emoji objects)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emoji: Option<EmojiProperties>,

    #[schemars(description = "Physics configuration")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub physics: Option<ObjectPhysics>,

    #[schemars(description = "Control mapping (for player-controlled objects)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub controls: Option<Controls>,

    #[schemars(description = "Behavior type (for NPCs/enemies)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub behavior: Option<BehaviorType>,

    #[schemars(description = "Behavior-specific parameters (e.g., patrol range, follow speed)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub behavior_params: Option<serde_json::Value>,
}

/// Spawner configuration for creating objects dynamically
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Spawner {
    #[schemars(description = "Unique identifier for this spawner")]
    pub id: String,

    #[schemars(description = "Template object to spawn (properties will be copied)")]
    pub template: Box<GameObject>,

    #[schemars(description = "Spawn interval in milliseconds")]
    pub interval: u32,

    #[schemars(description = "Maximum number of objects to spawn (None = unlimited)")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_count: Option<u32>,

    #[schemars(
        description = "Spawn area: 'random', 'top', 'bottom', 'left', 'right', or custom coordinates"
    )]
    pub spawn_area: String,

    #[schemars(description = "Random position variation")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position_variance: Option<PositionVariance>,
}

/// Position variance for spawning
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct PositionVariance {
    #[schemars(description = "X position min value")]
    pub x_min: f32,

    #[schemars(description = "X position max value")]
    pub x_max: f32,

    #[schemars(description = "Y position min value")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y_min: Option<f32>,

    #[schemars(description = "Y position max value")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y_max: Option<f32>,
}

/// Action effect types
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ActionEffect {
    #[schemars(description = "Update the score")]
    UpdateScore { points: i32 },

    #[schemars(description = "End the game")]
    GameOver,

    #[schemars(description = "Destroy the object")]
    Destroy,

    #[schemars(description = "Update text content")]
    UpdateText { object_id: String, text: String },
}

/// Action definition
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ActionDefinition {
    #[schemars(description = "Action name to reference in callbacks")]
    pub name: String,

    #[schemars(description = "The effect this action performs")]
    pub effect: ActionEffect,
}

/// Custom logic/interactions
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct CustomLogic {
    #[schemars(description = "Collision handlers (e.g., 'player,enemy -> gameOver')")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_collision: Option<Vec<String>>,

    #[schemars(description = "Overlap handlers (e.g., 'player,coin -> collectCoin')")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_overlap: Option<Vec<String>>,

    #[schemars(description = "Timer events (e.g., 'every 2000ms -> spawnEnemy')")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timers: Option<Vec<String>>,

    #[schemars(description = "Object spawners for dynamic object creation")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spawners: Option<Vec<Spawner>>,

    #[schemars(description = "Reusable action definitions")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actions: Option<Vec<ActionDefinition>>,
}

/// Scene definition
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Scene {
    #[schemars(description = "Scene name/identifier")]
    pub name: String,

    #[schemars(description = "Objects in this scene")]
    pub objects: Vec<GameObject>,

    #[schemars(description = "Custom game logic and interactions")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_logic: Option<CustomLogic>,
}

/// Complete Phaser game specification
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct PhaserGameSpec {
    #[schemars(description = "Game title")]
    pub title: String,

    #[schemars(description = "Brief description of game mechanics and objective")]
    pub description: String,

    #[schemars(description = "Game configuration (canvas size, physics, etc.)")]
    pub game: GameConfig,

    #[schemars(description = "Assets to load (can be empty for placeholder graphics)")]
    #[serde(default)]
    pub assets: Vec<Asset>,

    #[schemars(description = "Game scenes (at least one required)")]
    pub scenes: Vec<Scene>,

    #[schemars(description = "Player controls description for documentation")]
    pub controls_description: Vec<String>,

    #[schemars(description = "Key Phaser concepts demonstrated in this game")]
    pub key_concepts: Vec<String>,
}

/// Tool for generating Phaser games
#[derive(Debug, Serialize, Deserialize)]
pub struct PhaserGameTool;

impl Tool for PhaserGameTool {
    const NAME: &'static str = "generate_phaser_game";

    type Error = GameBuilderError;
    type Args = PhaserGameSpec;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let schema = schemars::schema_for!(PhaserGameSpec);

        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Generate a complete Phaser 3 game configuration as structured JSON. \
                         Use this tool when the user asks you to create or modify a browser-based game. \
                         Define the game using structured configuration including game settings, objects, \
                         physics, and interactions. Use placeholder graphics (rectangles, circles) by \
                         specifying shape properties instead of texture assets. The frontend will render \
                         this configuration into a playable game.".to_string(),
            parameters: serde_json::to_value(schema)
                .expect("Failed to serialize schema"),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        // Validate the game spec
        if args.scenes.is_empty() {
            return Err(GameBuilderError::InvalidConfiguration(
                "Game must have at least one scene".to_string(),
            ));
        }

        if args.game.width == 0 || args.game.height == 0 {
            return Err(GameBuilderError::InvalidConfiguration(
                "Game dimensions must be greater than 0".to_string(),
            ));
        }

        // Serialize the complete game spec as the response
        serde_json::to_string_pretty(&args)
            .map_err(|e| GameBuilderError::SerializationError(e.to_string()))
    }
}

/// Create an instance of the Phaser game tool
pub fn create_phaser_game_tool() -> PhaserGameTool {
    PhaserGameTool
}
