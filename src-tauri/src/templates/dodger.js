// Enemy Dodger - Survive as long as possible
let player
let cursors
let enemies
let score = 0
let scoreText
let gameOver = false
let sceneContext

const spawnEnemy = function () {
  if (gameOver) return

  const x = Phaser.Math.Between(30, 770)
  const enemyGraphic = sceneContext.add.rectangle(x, -20, 30, 30, 0xff0000)

  // Add to group first, then set velocity
  enemies.add(enemyGraphic)
  sceneContext.physics.add.existing(enemyGraphic)

  // Enemies get faster as score increases
  const speed = 100 + score / 10
  enemyGraphic.body.setVelocityY(speed)
}

const hitEnemy = function () {
  if (gameOver) return

  gameOver = true
  sceneContext.physics.pause()

  const gameOverText = sceneContext.add.text(400, 300, 'GAME OVER', {
    fontSize: '64px',
    fill: '#ff0000',
  })
  gameOverText.setOrigin(0.5)

  const finalScoreText = sceneContext.add.text(
    400,
    370,
    'Final Score: ' + score,
    {
      fontSize: '32px',
      fill: '#fff',
    },
  )
  finalScoreText.setOrigin(0.5)

  const restartText = sceneContext.add.text(400, 430, 'Refresh to play again', {
    fontSize: '24px',
    fill: '#aaa',
  })
  restartText.setOrigin(0.5)
}

function create() {
  sceneContext = this
  // Create player (green circle at bottom)
  const playerGraphic = this.add.circle(400, 550, 20, 0x00ff00)
  player = this.physics.add.existing(playerGraphic)
  player.body.setCollideWorldBounds(true)

  // Create enemy group
  enemies = this.physics.add.group()

  // Spawn enemies periodically
  this.time.addEvent({
    delay: 1000,
    callback: () => spawnEnemy(),
    loop: true,
  })

  // Score increases over time
  this.time.addEvent({
    delay: 100,
    callback: () => {
      if (!gameOver) {
        score += 1
        scoreText.setText('Score: ' + score)
      }
    },
    loop: true,
  })

  // Collision detection
  this.physics.add.overlap(player, enemies, hitEnemy)

  // Input
  cursors = this.input.keyboard.createCursorKeys()

  // UI
  scoreText = this.add.text(16, 16, 'Score: 0', {
    fontSize: '32px',
    fill: '#fff',
  })

  this.add
    .text(400, 50, 'Use Arrow Keys to Move', {
      fontSize: '24px',
      fill: '#aaa',
    })
    .setOrigin(0.5)
}

function update() {
  if (gameOver) return

  // Player movement
  if (cursors.left.isDown) {
    player.body.setVelocityX(-300)
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(300)
  } else {
    player.body.setVelocityX(0)
  }

  // Remove enemies that have left the screen
  enemies.children.entries.forEach((enemy) => {
    if (enemy.y > 650) {
      enemy.destroy()
    }
  })
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: {
    create: create,
    update: update,
  },
}

const game = new Phaser.Game(config)
