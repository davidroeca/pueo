/// Configuration and prompts for the Phaser Game Builder Agent
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameTemplate {
    pub name: String,
    pub description: String,
    pub code: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommonPatterns {
    pub player_movement: String,
    pub spawning: String,
    pub collision: String,
    pub ui: String,
}

/// Get the core system prompt for the Phaser game builder agent
pub fn get_system_prompt() -> String {
    r#"# Phaser Game Builder Agent

You are an expert Phaser 3 game developer who helps complete beginners create browser-based games through natural conversation. Your goal is to transform user ideas into working Phaser games.

## Your Approach

1. **Understand Intent**: Ask clarifying questions to understand the game concept (genre, mechanics, win/lose conditions)
2. **Scaffold First**: Generate a complete, working game script based on the description
3. **Explain Clearly**: Use simple language to explain what the code does and how Phaser works
4. **Use Placeholders**: Create games using basic shapes, colors, and Phaser's graphics API - no external assets needed

## Code Structure

Always generate **pure JavaScript code** containing:
- Game configuration
- Complete game code (scenes, entities, game logic)
- All code in one JavaScript file
- No HTML wrapper (that will be added automatically on export)

**IMPORTANT**: Output ONLY JavaScript code, no HTML. The user's app will wrap it in HTML with the Phaser CDN link when exporting.

**Template Structure:**
```javascript
// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// Game state
let player, cursors, score = 0, scoreText;

function preload() {
    // Placeholder graphics only
}

function create() {
    // Initialize game objects, physics, input
}

function update() {
    // Game loop logic
}

// Helper functions
```

## Placeholder Graphics Guidelines

- **Rectangles**: `this.add.rectangle(x, y, width, height, color)`
- **Circles**: `this.add.circle(x, y, radius, color)`
- **Text**: `this.add.text(x, y, 'text', { fontSize: '32px', fill: '#fff' })`
- **Dynamic shapes**: Use `this.add.graphics()` for custom drawing
- **Color palette**: Use distinct, vibrant colors (0xff0000, 0x00ff00, 0x0066ff, etc.)

## Beginner-Friendly Explanations

When presenting code, include:
1. **Brief description** of what the game does
2. **How to run it**: "Save as game.html and open in a browser"
3. **Controls explanation**: List keyboard/mouse inputs
4. **Code walkthrough**: Explain key sections in simple terms
   - "The `create()` function runs once when the game starts..."
   - "The `update()` function runs 60 times per second..."
   - "We use `this.physics.add.collider()` to detect when things touch..."

## Best Practices

- Start with physics enabled only if needed (platformers, collisions)
- Use `Phaser.Math.Between()` for randomness
- Keep game loop logic simple and readable
- Add comments for beginners to follow along
- Test boundary conditions (objects leaving screen)
- Include win/lose conditions when appropriate

## Constraints

- No external image/sound files (keep games self-contained)
- Target 800x600 or similar standard resolutions
- Avoid complex state management (keep it simple)
- Don't use advanced TypeScript/module features
- Prioritize readability over optimization

## Response Format

When creating a game:
1. Generate the complete JavaScript code within a code block
2. Explain the game concept and controls
3. Highlight 2-3 key Phaser concepts used
4. Suggest 1-2 ways the user could extend it

## Iterative Development

When a user asks to modify an existing game:
1. Confirm what needs to change
2. Provide the updated complete JavaScript code
3. Clearly indicate what was modified

## Debugging Support

If a user reports an error:
1. Ask for the error message if not provided
2. Check common issues (syntax, Phaser API misuse, missing physics)
3. Provide fixed code with explanation of what was wrong

## Idea Exploration

If the user's idea is vague, ask guiding questions:
- "What does the player do?" (move, click, dodge, collect)
- "What's the goal?" (reach end, survive, high score)
- "Any specific mechanics?" (jumping, shooting, puzzle)"#
        .to_string()
}

/// Get common code patterns for reference
pub fn get_common_patterns() -> CommonPatterns {
    CommonPatterns {
        player_movement: r#"// Keyboard-based player movement
cursors = this.input.keyboard.createCursorKeys();

// In update():
if (cursors.left.isDown) {
    player.setVelocityX(-160);
} else if (cursors.right.isDown) {
    player.setVelocityX(160);
} else {
    player.setVelocityX(0);
}

if (cursors.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
}"#
        .to_string(),

        spawning: r#"// Spawning objects at random positions
function spawnEnemy() {
    const x = Phaser.Math.Between(50, 750);
    const enemy = this.add.circle(x, 0, 20, 0xff0000);
    this.physics.add.existing(enemy);
    enemy.body.setVelocity(Phaser.Math.Between(-50, 50), 100);
    enemies.add(enemy);
}

// Call periodically using timer
this.time.addEvent({
    delay: 2000,
    callback: spawnEnemy,
    callbackScope: this,
    loop: true
});"#
            .to_string(),

        collision: r#"// Collision detection and handling
this.physics.add.overlap(player, enemies, hitEnemy, null, this);

function hitEnemy(player, enemy) {
    enemy.destroy();
    score += 10;
    scoreText.setText('Score: ' + score);
}

// For collectibles
this.physics.add.overlap(player, collectibles, collectItem, null, this);

function collectItem(player, item) {
    item.destroy();
    score += 5;
    scoreText.setText('Score: ' + score);
}"#
        .to_string(),

        ui: r#"// Simple score display
scoreText = this.add.text(16, 16, 'Score: 0', {
    fontSize: '32px',
    fill: '#fff'
});
scoreText.setScrollFactor(0); // Fixed position (won't move with camera)

// Game over screen
function showGameOver() {
    const gameOverText = this.add.text(400, 300, 'GAME OVER', {
        fontSize: '64px',
        fill: '#ff0000'
    });
    gameOverText.setOrigin(0.5);
    this.physics.pause();
}

// Timer display
let timeLeft = 60;
timerText = this.add.text(700, 16, 'Time: 60', { fontSize: '32px', fill: '#fff' });

this.time.addEvent({
    delay: 1000,
    callback: () => {
        timeLeft--;
        timerText.setText('Time: ' + timeLeft);
        if (timeLeft <= 0) showGameOver.call(this);
    },
    callbackScope: this,
    loop: true
});"#
            .to_string(),
    }
}

/// Get a specific game template
pub fn get_template(key: &str) -> Option<GameTemplate> {
    match key {
        "platformer" => Some(get_platformer_template()),
        "dodger" => Some(get_dodger_template()),
        "clicker" => Some(get_clicker_template()),
        _ => None,
    }
}

/// Get list of all available templates
pub fn get_template_list() -> Vec<(String, String, String)> {
    vec![
        (
            "platformer".to_string(),
            "Simple Platformer".to_string(),
            "A basic platformer with jumping, platforms, and collectibles".to_string(),
        ),
        (
            "dodger".to_string(),
            "Enemy Dodger".to_string(),
            "Dodge falling enemies and survive as long as possible".to_string(),
        ),
        (
            "clicker".to_string(),
            "Click Collector".to_string(),
            "Click on spawning targets before they disappear".to_string(),
        ),
    ]
}

fn get_platformer_template() -> GameTemplate {
    GameTemplate {
        name: "Simple Platformer".to_string(),
        description: "A basic platformer with jumping, platforms, and collectibles".to_string(),
        code: include_str!("templates/platformer.js").to_string(),
    }
}

fn get_dodger_template() -> GameTemplate {
    GameTemplate {
        name: "Enemy Dodger".to_string(),
        description: "Dodge falling enemies and survive as long as possible".to_string(),
        code: include_str!("templates/dodger.js").to_string(),
    }
}

fn get_clicker_template() -> GameTemplate {
    GameTemplate {
        name: "Click Collector".to_string(),
        description: "Click on spawning targets before they disappear".to_string(),
        code: include_str!("templates/clicker.js").to_string(),
    }
}
