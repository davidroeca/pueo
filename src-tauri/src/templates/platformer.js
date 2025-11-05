// Simple Platformer - Jump and collect stars
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
  scene: {
    create: create,
    update: update,
  },
}

const game = new Phaser.Game(config)

let player
let platforms
let cursors
let stars
let score = 0
let scoreText

function create() {
  // Create platforms
  platforms = this.physics.add.staticGroup()

  // Ground
  platforms.create(400, 568, null).setDisplaySize(800, 64).refreshBody()
  this.add.rectangle(400, 568, 800, 64, 0x00aa00)

  // Other platforms
  this.add.rectangle(600, 400, 200, 32, 0x00aa00)
  platforms.create(600, 400, null).setDisplaySize(200, 32).refreshBody()

  this.add.rectangle(50, 250, 200, 32, 0x00aa00)
  platforms.create(50, 250, null).setDisplaySize(200, 32).refreshBody()

  this.add.rectangle(750, 220, 200, 32, 0x00aa00)
  platforms.create(750, 220, null).setDisplaySize(200, 32).refreshBody()

  // Create player (blue square)
  const playerGraphic = this.add.rectangle(100, 450, 32, 48, 0x0000ff)
  player = this.physics.add.existing(playerGraphic)
  player.body.setBounce(0.2)
  player.body.setCollideWorldBounds(true)

  // Create stars (collectibles)
  stars = this.physics.add.group()

  for (let i = 0; i < 12; i++) {
    const x = Phaser.Math.Between(50, 750)
    const y = Phaser.Math.Between(50, 400)
    const star = this.add.circle(x, y, 10, 0xffff00)
    stars.add(star)
    this.physics.add.existing(star)
    star.body.setBounce(0.8)
    star.body.setCollideWorldBounds(true)
  }

  // Physics interactions
  this.physics.add.collider(player, platforms)
  this.physics.add.collider(stars, platforms)
  this.physics.add.overlap(player, stars, collectStar, null, this)

  // Input
  cursors = this.input.keyboard.createCursorKeys()

  // Score text
  scoreText = this.add.text(16, 16, 'Score: 0', {
    fontSize: '32px',
    fill: '#000',
  })
}

function update() {
  if (cursors.left.isDown) {
    player.body.setVelocityX(-160)
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(160)
  } else {
    player.body.setVelocityX(0)
  }

  if (cursors.up.isDown && player.body.touching.down) {
    player.body.setVelocityY(-330)
  }
}

function collectStar(player, star) {
  star.destroy()
  score += 10
  scoreText.setText('Score: ' + score)

  if (stars.countActive(true) === 0) {
    // All stars collected - you win!
    const winText = this.add.text(400, 300, 'YOU WIN!', {
      fontSize: '64px',
      fill: '#00ff00',
    })
    winText.setOrigin(0.5)
    this.physics.pause()
  }
}
