import Phaser from 'phaser'
import type {
  PhaserGameSpec,
  Scene as SceneSpec,
  GameObject,
  CustomLogic,
  Spawner,
  ActionDefinition,
  ActionEffect,
  BehaviorType,
} from '@/types/gameSpec'

/**
 * Behavior state storage for patrol, follow, random behaviors
 */
interface BehaviorState {
  patrolStart?: number
  lastDirectionChange?: number
}

/**
 * Extended GameObject that may have physics
 */
interface GameObjectWithPhysics extends Phaser.GameObjects.GameObject {
  body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody
}

/**
 * Type guard to check if object has physics body
 */
function hasBody(obj: Phaser.GameObjects.GameObject): obj is GameObjectWithPhysics {
  return 'body' in obj && obj.body !== undefined && obj.body !== null
}

/**
 * Type guard to check if object has an Arcade body (not static)
 */
function hasArcadeBody(obj: Phaser.GameObjects.GameObject): obj is GameObjectWithPhysics & { body: Phaser.Physics.Arcade.Body } {
  return hasBody(obj) && obj.body instanceof Phaser.Physics.Arcade.Body
}

/**
 * Parse hex color string to number for Phaser
 * Supports both '#RRGGBB' and '0xRRGGBB' formats
 */
function parseColor(color: string): number {
  if (color.startsWith('#')) {
    return parseInt(color.substring(1), 16)
  }
  if (color.startsWith('0x')) {
    return parseInt(color.substring(2), 16)
  }
  return parseInt(color, 16)
}

/**
 * Game state to track created objects and their references
 */
interface GameState {
  objects: Map<string, Phaser.GameObjects.GameObject>
  groups: Map<string, Phaser.GameObjects.Group>
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null
  customKeys: Map<string, Phaser.Input.Keyboard.Key>
  timers: Phaser.Time.TimerEvent[]
  spawnCounters: Map<string, number>
  score: number
  actions: Map<string, ActionDefinition>
  behaviorState: Map<string, BehaviorState>  // Separate state storage for behaviors
  objectBehaviors: Map<string, { behavior: BehaviorType; params?: Record<string, unknown> }>  // Track which objects have behaviors
}

/**
 * Create a Phaser scene from a SceneSpec
 */
function createSceneClass(sceneSpec: SceneSpec, gameSpec: PhaserGameSpec) {
  return class extends Phaser.Scene {
    private state: GameState = {
      objects: new Map(),
      groups: new Map(),
      cursors: null,
      customKeys: new Map(),
      timers: [],
      spawnCounters: new Map(),
      score: 0,
      actions: new Map(),
      behaviorState: new Map(),
      objectBehaviors: new Map(),
    }

    constructor() {
      super({ key: sceneSpec.name })
    }

    preload() {
      // Load assets if any
      for (const asset of gameSpec.assets) {
        switch (asset.type) {
          case 'sprite':
          case 'image':
            this.load.image(asset.key, asset.url)
            break
          case 'audio':
            this.load.audio(asset.key, asset.url)
            break
        }
      }
    }

    create() {
      // Create all objects
      for (const objSpec of sceneSpec.objects) {
        this.createObject(objSpec)
      }

      // Set up custom logic
      if (sceneSpec.custom_logic) {
        this.setupCustomLogic(sceneSpec.custom_logic)
      }

      // Initialize cursor keys if any object has controls
      const hasControls = sceneSpec.objects.some((obj) => obj.controls)
      if (hasControls && this.input.keyboard) {
        this.state.cursors = this.input.keyboard.createCursorKeys()
      }
    }

    update() {
      // Handle controls for all objects
      for (const objSpec of sceneSpec.objects) {
        if (objSpec.controls) {
          this.handleControls(objSpec)
        }
      }

      // Handle behaviors for scene objects
      for (const objSpec of sceneSpec.objects) {
        if (objSpec.behavior) {
          this.handleBehavior(objSpec)
        }
      }

      // Handle behaviors for spawned objects
      for (const [id, behaviorInfo] of this.state.objectBehaviors) {
        const obj = this.state.objects.get(id)
        if (obj && hasArcadeBody(obj)) {
          switch (behaviorInfo.behavior) {
            case 'patrol':
              this.handlePatrolBehavior(id, obj, obj.body, behaviorInfo.params)
              break
            case 'follow':
              this.handleFollowBehavior(id, obj, obj.body, behaviorInfo.params)
              break
            case 'random':
              this.handleRandomBehavior(id, obj.body, behaviorInfo.params)
              break
          }
        }
      }
    }

    private createObject(objSpec: GameObject) {
      let gameObject: Phaser.GameObjects.GameObject | null = null

      switch (objSpec.type) {
        case 'rectangle':
          if (objSpec.shape) {
            const rect = this.add.rectangle(
              objSpec.x,
              objSpec.y,
              objSpec.shape.width || 100,
              objSpec.shape.height || 100,
              objSpec.shape.color ? parseColor(objSpec.shape.color) : 0xffffff
            )
            gameObject = rect
          }
          break

        case 'circle':
          if (objSpec.shape) {
            const circle = this.add.circle(
              objSpec.x,
              objSpec.y,
              objSpec.shape.radius || 50,
              objSpec.shape.color ? parseColor(objSpec.shape.color) : 0xffffff
            )
            gameObject = circle
          }
          break

        case 'text':
          if (objSpec.text) {
            const text = this.add.text(objSpec.x, objSpec.y, objSpec.text.text, {
              fontSize: objSpec.text.font_size || '32px',
              color: objSpec.text.fill || '#ffffff',
            })
            gameObject = text
          }
          break

        case 'sprite':
          if (objSpec.texture) {
            const sprite = this.add.sprite(objSpec.x, objSpec.y, objSpec.texture)
            gameObject = sprite
          }
          break

        case 'group':
          // Create a group for managing multiple objects
          const group = this.add.group()
          this.state.groups.set(objSpec.id, group)
          return // Groups don't need physics setup
      }

      if (!gameObject) {
        console.warn(`Failed to create object: ${objSpec.id}`)
        return
      }

      // Store reference
      this.state.objects.set(objSpec.id, gameObject)

      // Apply physics if specified
      if (objSpec.physics && gameObject) {
        this.applyPhysics(gameObject, objSpec.physics)
      }
    }

    private applyPhysics(
      gameObject: Phaser.GameObjects.GameObject,
      physics: GameObject['physics']
    ) {
      if (!physics || physics.body === 'none') return

      const isStatic = physics.body === 'static'
      this.physics.add.existing(gameObject, isStatic)

      // Apply physics properties (only works on dynamic bodies)
      if (hasArcadeBody(gameObject)) {
        const body = gameObject.body
        if (physics.bounce !== undefined) {
          body.setBounce(physics.bounce)
        }
        if (physics.collide_world_bounds !== undefined) {
          body.setCollideWorldBounds(physics.collide_world_bounds)
        }
        if (physics.velocity) {
          body.setVelocity(physics.velocity.x, physics.velocity.y)
        }
      }
    }

    private setupCustomLogic(logic: CustomLogic) {
      // Register actions first
      if (logic.actions) {
        for (const action of logic.actions) {
          this.state.actions.set(action.name, action)
        }
      }

      // Set up spawners FIRST so groups are created before collision handlers
      if (logic.spawners) {
        for (const spawner of logic.spawners) {
          this.setupSpawner(spawner)
        }
      }

      // Set up collisions
      if (logic.on_collision) {
        for (const collision of logic.on_collision) {
          this.parseAndSetupInteraction(collision, 'collision')
        }
      }

      // Set up overlaps
      if (logic.on_overlap) {
        for (const overlap of logic.on_overlap) {
          this.parseAndSetupInteraction(overlap, 'overlap')
        }
      }

      // Set up timers
      if (logic.timers) {
        for (const timerSpec of logic.timers) {
          this.parseAndSetupTimer(timerSpec)
        }
      }
    }

    private parseAndSetupInteraction(
      spec: string,
      type: 'collision' | 'overlap'
    ) {
      // Parse format: "object1,object2 -> callback"
      const match = spec.match(/([^,]+),([^\s]+)\s*->\s*(.+)/)
      if (!match) {
        console.warn(`Invalid interaction spec: ${spec}`)
        return
      }

      const [, id1, id2, callback] = match
      const id1Trimmed = id1.trim()
      const id2Trimmed = id2.trim()

      // Check if we're referring to an object or a group (template ID)
      const obj1 = this.state.objects.get(id1Trimmed) || this.state.groups.get(id1Trimmed)
      const obj2 = this.state.objects.get(id2Trimmed) || this.state.groups.get(id2Trimmed)

      if (!obj1 || !obj2) {
        console.warn(`Objects/groups not found for interaction: ${id1Trimmed}, ${id2Trimmed}`)
        return
      }

      const handler = this.createInteractionHandler(callback.trim())

      if (type === 'collision') {
        this.physics.add.collider(obj1, obj2, handler, undefined, this)
      } else {
        this.physics.add.overlap(obj1, obj2, handler, undefined, this)
      }
    }

    private createInteractionHandler(callback: string) {
      return (
        _obj1: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        obj2: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
      ) => {
        // First check if it's a registered action
        const action = this.state.actions.get(callback)
        if (action) {
          // Extract GameObject from the various types
          let gameObj: Phaser.GameObjects.GameObject | undefined
          if ('gameObject' in obj2) {
            gameObj = obj2.gameObject as Phaser.GameObjects.GameObject
          } else if (obj2 instanceof Phaser.GameObjects.GameObject) {
            gameObj = obj2
          }
          this.executeAction(action.effect, gameObj)
          return
        }

        // Fall back to legacy hard-coded callbacks for backward compatibility
        switch (callback) {
          case 'null':
            // Do nothing - just physics response
            break
          case 'gameOver':
            this.handleGameOver()
            break
          case 'destroy':
            // Extract GameObject and destroy it
            let gameObj: Phaser.GameObjects.GameObject | undefined
            if ('gameObject' in obj2) {
              gameObj = obj2.gameObject as Phaser.GameObjects.GameObject
            } else if (obj2 instanceof Phaser.GameObjects.GameObject) {
              gameObj = obj2
            }
            if (gameObj) {
              gameObj.destroy()
            }
            break
          default:
            console.warn(`Unknown callback: ${callback}`)
        }
      }
    }

    private executeAction(effect: ActionEffect, targetObj?: Phaser.GameObjects.GameObject) {
      switch (effect.type) {
        case 'updateScore':
          this.state.score += effect.points
          this.updateScoreDisplay()
          if (targetObj) {
            targetObj.destroy()
          }
          break
        case 'gameOver':
          this.handleGameOver()
          break
        case 'destroy':
          if (targetObj) {
            targetObj.destroy()
          }
          break
        case 'updateText':
          const textObj = this.state.objects.get(effect.object_id)
          if (textObj && (textObj as Phaser.GameObjects.Text).setText) {
            ;(textObj as Phaser.GameObjects.Text).setText(effect.text)
          }
          break
      }
    }

    private updateScoreDisplay() {
      // Try to find scoreText object and update it
      const scoreText = this.state.objects.get('scoreText')
      if (scoreText && (scoreText as Phaser.GameObjects.Text).setText) {
        ;(scoreText as Phaser.GameObjects.Text).setText(`Score: ${this.state.score}`)
      }
    }

    private handleGameOver() {
      const gameOverText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        'GAME OVER',
        {
          fontSize: '64px',
          color: '#ff0000',
        }
      )
      gameOverText.setOrigin(0.5)
      this.physics.pause()
    }

    private parseAndSetupTimer(spec: string) {
      // Parse format: "every 2000ms -> callback" or "after 1000ms -> callback"
      const everyMatch = spec.match(/every\s+(\d+)ms\s*->\s*(.+)/)
      const afterMatch = spec.match(/after\s+(\d+)ms\s*->\s*(.+)/)

      if (everyMatch) {
        const [, delay, callback] = everyMatch
        const timer = this.time.addEvent({
          delay: parseInt(delay),
          callback: () => this.handleTimerCallback(callback.trim()),
          callbackScope: this,
          loop: true,
        })
        this.state.timers.push(timer)
      } else if (afterMatch) {
        const [, delay, callback] = afterMatch
        const timer = this.time.addEvent({
          delay: parseInt(delay),
          callback: () => this.handleTimerCallback(callback.trim()),
          callbackScope: this,
          loop: false,
        })
        this.state.timers.push(timer)
      }
    }

    private handleTimerCallback(callback: string) {
      switch (callback) {
        case 'spawnEnemy':
          // Implement enemy spawning logic
          console.log('Spawn enemy triggered')
          break
        default:
          console.log(`Unhandled timer callback: ${callback}`)
      }
    }

    private setupSpawner(spawner: Spawner) {
      this.state.spawnCounters.set(spawner.id, 0)

      // Create a group for this template ID to enable collision detection
      const templateId = spawner.template.id
      if (!this.state.groups.has(templateId)) {
        const group = this.physics.add.group()
        this.state.groups.set(templateId, group)
      }

      const timer = this.time.addEvent({
        delay: spawner.interval,
        callback: () => this.spawnObject(spawner),
        callbackScope: this,
        loop: true,
      })

      this.state.timers.push(timer)
    }

    private spawnObject(spawner: Spawner) {
      // Check max count
      const currentCount = this.state.spawnCounters.get(spawner.id) || 0
      if (spawner.max_count && currentCount >= spawner.max_count) {
        return
      }

      // Calculate spawn position
      const position = this.calculateSpawnPosition(spawner)

      // Create object from template
      const spawnedObj = this.createSpawnedObject(spawner.template, position)

      if (spawnedObj) {
        // Generate unique ID for spawned object
        const uniqueId = `${spawner.id}_spawned_${currentCount}`
        this.state.objects.set(uniqueId, spawnedObj)

        // Register behavior if template has one
        if (spawner.template.behavior) {
          this.state.objectBehaviors.set(uniqueId, {
            behavior: spawner.template.behavior,
            params: spawner.template.behavior_params,
          })
        }

        // Add to the group for this template
        const templateId = spawner.template.id
        const group = this.state.groups.get(templateId)
        if (group) {
          group.add(spawnedObj)
        }

        // Increment counter
        this.state.spawnCounters.set(spawner.id, currentCount + 1)

        // Clean up when object is destroyed
        spawnedObj.once('destroy', () => {
          this.state.objects.delete(uniqueId)
          this.state.objectBehaviors.delete(uniqueId)
          this.state.behaviorState.delete(uniqueId)
          // Also remove from group
          if (group) {
            group.remove(spawnedObj)
          }
        })
      }
    }

    private calculateSpawnPosition(spawner: Spawner): { x: number; y: number } {
      const { spawn_area, position_variance } = spawner

      let x = 0
      let y = 0

      // Handle predefined spawn areas
      switch (spawn_area.toLowerCase()) {
        case 'top':
          x = Phaser.Math.Between(0, this.cameras.main.width)
          y = 0
          break
        case 'bottom':
          x = Phaser.Math.Between(0, this.cameras.main.width)
          y = this.cameras.main.height
          break
        case 'left':
          x = 0
          y = Phaser.Math.Between(0, this.cameras.main.height)
          break
        case 'right':
          x = this.cameras.main.width
          y = Phaser.Math.Between(0, this.cameras.main.height)
          break
        case 'random':
          x = Phaser.Math.Between(0, this.cameras.main.width)
          y = Phaser.Math.Between(0, this.cameras.main.height)
          break
        default:
          // Use position variance if provided
          if (position_variance) {
            x = Phaser.Math.Between(position_variance.x_min, position_variance.x_max)
            y = position_variance.y_min !== undefined && position_variance.y_max !== undefined
              ? Phaser.Math.Between(position_variance.y_min, position_variance.y_max)
              : 0
          }
      }

      // Apply variance if specified (overrides spawn_area position)
      if (position_variance) {
        x = Phaser.Math.Between(position_variance.x_min, position_variance.x_max)
        if (position_variance.y_min !== undefined && position_variance.y_max !== undefined) {
          y = Phaser.Math.Between(position_variance.y_min, position_variance.y_max)
        }
      }

      return { x, y }
    }

    private createSpawnedObject(
      template: GameObject,
      position: { x: number; y: number }
    ): Phaser.GameObjects.GameObject | null {
      let gameObject: Phaser.GameObjects.GameObject | null = null

      // Create object based on template type
      switch (template.type) {
        case 'rectangle':
          if (template.shape) {
            const rect = this.add.rectangle(
              position.x,
              position.y,
              template.shape.width || 100,
              template.shape.height || 100,
              template.shape.color ? parseColor(template.shape.color) : 0xffffff
            )
            gameObject = rect
          }
          break

        case 'circle':
          if (template.shape) {
            const circle = this.add.circle(
              position.x,
              position.y,
              template.shape.radius || 50,
              template.shape.color ? parseColor(template.shape.color) : 0xffffff
            )
            gameObject = circle
          }
          break

        case 'sprite':
          if (template.texture) {
            const sprite = this.add.sprite(position.x, position.y, template.texture)
            gameObject = sprite
          }
          break
      }

      if (!gameObject) {
        return null
      }

      // Apply physics from template
      if (template.physics) {
        this.applyPhysics(gameObject, template.physics)
      }

      // Note: Behavior state is managed separately in this.state.behaviorState
      // and initialized when the behavior handler is first called

      return gameObject
    }

    private handleControls(objSpec: GameObject) {
      if (!objSpec.controls) return

      const obj = this.state.objects.get(objSpec.id)
      if (!obj || !hasArcadeBody(obj)) return

      const body = obj.body
      const controls = objSpec.controls

      // Handle left/right
      if (controls.left || controls.right) {
        const leftKey = this.getKey(controls.left)
        const rightKey = this.getKey(controls.right)

        if (leftKey?.isDown) {
          body.setVelocityX(-160)
        } else if (rightKey?.isDown) {
          body.setVelocityX(160)
        } else {
          body.setVelocityX(0)
        }
      }

      // Handle up/down
      if (controls.up) {
        const upKey = this.getKey(controls.up)
        if (upKey?.isDown) {
          body.setVelocityY(-160)
        }
      }

      if (controls.down) {
        const downKey = this.getKey(controls.down)
        if (downKey?.isDown) {
          body.setVelocityY(160)
        }
      }

      // Handle jump (only when touching ground)
      if (controls.jump) {
        const jumpKey = this.getKey(controls.jump)
        if (jumpKey?.isDown && body.touching.down) {
          body.setVelocityY(-330)
        }
      }
    }

    private getKey(keyName?: string): Phaser.Input.Keyboard.Key | undefined {
      if (!keyName || !this.input.keyboard) return undefined

      // Check if it's a cursor key
      if (this.state.cursors) {
        switch (keyName.toLowerCase()) {
          case 'arrowleft':
          case 'left':
            return this.state.cursors.left
          case 'arrowright':
          case 'right':
            return this.state.cursors.right
          case 'arrowup':
          case 'up':
            return this.state.cursors.up
          case 'arrowdown':
          case 'down':
            return this.state.cursors.down
          case 'space':
            return this.state.cursors.space
        }
      }

      // Check custom keys
      if (!this.state.customKeys.has(keyName)) {
        const key = this.input.keyboard.addKey(keyName)
        this.state.customKeys.set(keyName, key)
      }

      return this.state.customKeys.get(keyName)
    }

    private handleBehavior(objSpec: GameObject) {
      if (!objSpec.behavior) return

      const obj = this.state.objects.get(objSpec.id)
      if (!obj || !hasArcadeBody(obj)) return

      switch (objSpec.behavior) {
        case 'patrol':
          this.handlePatrolBehavior(objSpec.id, obj, obj.body, objSpec.behavior_params)
          break
        case 'follow':
          this.handleFollowBehavior(objSpec.id, obj, obj.body, objSpec.behavior_params)
          break
        case 'random':
          this.handleRandomBehavior(objSpec.id, obj.body, objSpec.behavior_params)
          break
      }
    }

    private handlePatrolBehavior(
      id: string,
      _obj: GameObjectWithPhysics,
      body: Phaser.Physics.Arcade.Body,
      params: Record<string, unknown> | undefined
    ) {
      // Simple patrol: move back and forth
      const range = (params?.range as number) || 200
      const speed = (params?.speed as number) || 50

      // Get or initialize behavior state
      let state = this.state.behaviorState.get(id)
      if (!state) {
        state = { patrolStart: body.x }
        this.state.behaviorState.set(id, state)
      }

      // Store initial position if not set
      if (state.patrolStart === undefined) {
        state.patrolStart = body.x
      }

      const start = state.patrolStart
      const distance = Math.abs(body.x - start)

      if (distance >= range) {
        // Reverse direction
        body.setVelocityX(-body.velocity.x || speed)
      } else if (body.velocity.x === 0) {
        // Start moving
        body.setVelocityX(speed)
      }
    }

    private handleFollowBehavior(
      _id: string,
      _obj: GameObjectWithPhysics,
      body: Phaser.Physics.Arcade.Body,
      params: Record<string, unknown> | undefined
    ) {
      const targetId = (params?.target as string) || 'player'
      const target = this.state.objects.get(targetId)

      if (!target || !hasBody(target)) return

      const speed = (params?.speed as number) || 80
      const angle = Phaser.Math.Angle.Between(
        body.x,
        body.y,
        target.body.x,
        target.body.y
      )

      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
    }

    private handleRandomBehavior(
      id: string,
      body: Phaser.Physics.Arcade.Body,
      params: Record<string, unknown> | undefined
    ) {
      const speed = (params?.speed as number) || 100
      const interval = (params?.interval as number) || 1000

      // Get or initialize behavior state
      let state = this.state.behaviorState.get(id)
      if (!state) {
        state = { lastDirectionChange: 0 }
        this.state.behaviorState.set(id, state)
      }

      // Change direction at random intervals
      if (state.lastDirectionChange === undefined) {
        state.lastDirectionChange = 0
      }

      const now = this.time.now
      if (now - state.lastDirectionChange > interval) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
        body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
        state.lastDirectionChange = now
      }
    }
  }
}

/**
 * Create a Phaser game from a PhaserGameSpec
 */
export function createPhaserGame(
  spec: PhaserGameSpec,
  parent: string | HTMLElement
): Phaser.Game {
  const sceneClasses = spec.scenes.map((sceneSpec) =>
    createSceneClass(sceneSpec, spec)
  )

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: spec.game.width,
    height: spec.game.height,
    backgroundColor: spec.game.background_color,
    parent,
    physics: spec.game.physics.enabled
      ? {
          default: 'arcade',
          arcade: {
            gravity: spec.game.physics.gravity,
            debug: spec.game.physics.debug,
          },
        }
      : undefined,
    scene: sceneClasses,
  }

  return new Phaser.Game(config)
}
