// TypeScript types matching the Rust game specification

export interface PhaserGameSpec {
  title: string
  description: string
  game: GameConfig
  assets: Asset[]
  scenes: Scene[]
  controls_description: string[]
  key_concepts: string[]
}

export interface GameConfig {
  width: number
  height: number
  background_color: string
  physics: PhysicsConfig
}

export interface PhysicsConfig {
  enabled: boolean
  gravity: GravityConfig
  debug: boolean
}

export interface GravityConfig {
  x: number
  y: number
}

export type AssetType = 'sprite' | 'audio' | 'image'

export interface Asset {
  key: string
  type: AssetType
  url: string
}

export type PhysicsBody = 'dynamic' | 'static' | 'none'

export interface ObjectPhysics {
  body: PhysicsBody
  bounce?: number
  collide_world_bounds?: boolean
  velocity?: VelocityConfig
}

export interface VelocityConfig {
  x: number
  y: number
}

export interface Controls {
  left?: string
  right?: string
  jump?: string
  up?: string
  down?: string
  shoot?: string
  projectile?: GameObject
}

export type ObjectType = 'sprite' | 'rectangle' | 'circle' | 'text' | 'emoji' | 'group'

export interface ShapeProperties {
  width?: number
  height?: number
  radius?: number
  color?: string
}

export interface TextProperties {
  text: string
  font_size?: string
  fill?: string
}

export interface EmojiProperties {
  emoji: string
  size?: number
  collision_box: CollisionBox
}

export type CollisionBoxShape = 'rectangle' | 'circle'

export interface CollisionBox {
  shape: CollisionBoxShape
  width?: number
  height?: number
  radius?: number
}

export type BehaviorType = 'patrol' | 'follow' | 'static' | 'random'

export interface GameObject {
  id: string
  type: ObjectType
  x: number
  y: number
  texture?: string
  shape?: ShapeProperties
  text?: TextProperties
  emoji?: EmojiProperties
  physics?: ObjectPhysics
  controls?: Controls
  behavior?: BehaviorType
  behavior_params?: any
}

export interface Spawner {
  id: string
  template: GameObject
  interval: number
  max_count?: number
  spawn_area: string
  position_variance?: PositionVariance
}

export interface PositionVariance {
  x_min: number
  x_max: number
  y_min?: number
  y_max?: number
}

export interface CustomLogic {
  on_collision?: string[]
  on_overlap?: string[]
  timers?: string[]
  spawners?: Spawner[]
  actions?: ActionDefinition[]
}

export interface ActionDefinition {
  name: string
  effect: ActionEffect
}

export type ActionEffect =
  | { type: 'updateScore'; points: number }
  | { type: 'gameOver' }
  | { type: 'destroy' }
  | { type: 'updateText'; object_id: string; text: string }

export interface Scene {
  name: string
  objects: GameObject[]
  custom_logic?: CustomLogic
}

// Database types
export interface GameRecord {
  id: string
  title: string
  description: string
  spec: PhaserGameSpec
  created_at: string
  updated_at: string
  version: number
}

export interface GameSummary {
  id: string
  title: string
  description: string
  created_at: string
  updated_at: string
  version: number
}

export interface GameVersion {
  id: number
  game_id: string
  version: number
  spec: PhaserGameSpec
  created_at: string
  notes: string | null
}
