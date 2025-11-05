// Click Collector - Click targets before they disappear
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#2d2d2d',
  scene: {
    create: create,
    update: update,
  },
}

const game = new Phaser.Game(config)

let targets
let score = 0
let scoreText
let timeLeft = 30
let timerText
let gameOver = false

function create() {
  // UI
  scoreText = this.add.text(16, 16, 'Score: 0', {
    fontSize: '32px',
    fill: '#fff',
  })

  timerText = this.add.text(700, 16, 'Time: 30', {
    fontSize: '32px',
    fill: '#fff',
  })

  this.add
    .text(400, 50, 'Click the circles!', {
      fontSize: '28px',
      fill: '#aaa',
    })
    .setOrigin(0.5)

  // Targets group
  targets = this.add.group()

  // Spawn targets periodically
  this.time.addEvent({
    delay: 800,
    callback: spawnTarget,
    callbackScope: this,
    loop: true,
  })

  // Countdown timer
  this.time.addEvent({
    delay: 1000,
    callback: () => {
      if (!gameOver) {
        timeLeft--
        timerText.setText('Time: ' + timeLeft)

        if (timeLeft <= 0) {
          endGame.call(this)
        }
      }
    },
    callbackScope: this,
    loop: true,
  })
}

function update() {
  // Targets fade and shrink over time
  targets.children.entries.forEach((target) => {
    if (target.active) {
      target.alpha -= 0.01
      target.scale -= 0.005

      if (target.alpha <= 0 || target.scale <= 0) {
        target.destroy()
      }
    }
  })
}

function spawnTarget() {
  if (gameOver) return

  const x = Phaser.Math.Between(100, 700)
  const y = Phaser.Math.Between(150, 550)
  const color = Phaser.Math.RND.pick([0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e6cf])

  const target = this.add.circle(x, y, 40, color)
  target.setInteractive()

  target.on('pointerdown', () => {
    if (!gameOver && target.active) {
      // More points for clicking faster (higher alpha = newer target)
      const points = Math.floor(target.alpha * 10)
      score += points
      scoreText.setText('Score: ' + score)

      // Visual feedback
      const pointsText = this.add.text(target.x, target.y, '+' + points, {
        fontSize: '24px',
        fill: '#fff',
      })
      pointsText.setOrigin(0.5)

      this.tweens.add({
        targets: pointsText,
        y: target.y - 50,
        alpha: 0,
        duration: 500,
        onComplete: () => pointsText.destroy(),
      })

      target.destroy()
    }
  })

  targets.add(target)
}

function endGame() {
  gameOver = true

  const gameOverText = this.add.text(400, 250, "TIME'S UP!", {
    fontSize: '64px',
    fill: '#fff',
  })
  gameOverText.setOrigin(0.5)

  const finalScoreText = this.add.text(400, 340, 'Final Score: ' + score, {
    fontSize: '40px',
    fill: '#ffe66d',
  })
  finalScoreText.setOrigin(0.5)

  const restartText = this.add.text(400, 420, 'Refresh to play again', {
    fontSize: '24px',
    fill: '#aaa',
  })
  restartText.setOrigin(0.5)
}
