// Zod schemas for game specification with runtime validation
import { z } from 'zod'

// Gravity configuration
export const GravityConfigSchema = z.object({
  x: z.number(),
  y: z.number(),
})

// Physics configuration
export const PhysicsConfigSchema = z.object({
  enabled: z.boolean(),
  gravity: GravityConfigSchema,
  debug: z.boolean(),
})

// Game configuration
export const GameConfigSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  background_color: z.string(),
  physics: PhysicsConfigSchema,
})

// Asset types
export const AssetTypeSchema = z.enum(['sprite', 'audio', 'image'])

export const AssetSchema = z.object({
  key: z.string(),
  type: AssetTypeSchema,
  url: z.string().url(),
})

// Physics body types
export const PhysicsBodySchema = z.enum(['dynamic', 'static', 'none'])

// Velocity configuration
export const VelocityConfigSchema = z.object({
  x: z.number(),
  y: z.number(),
})

// Object physics
export const ObjectPhysicsSchema = z.object({
  body: PhysicsBodySchema,
  bounce: z.number().optional(),
  collide_world_bounds: z.boolean().optional(),
  velocity: VelocityConfigSchema.optional(),
})

// Shape properties
export const ShapePropertiesSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  color: z.string().optional(),
})

// Text properties
export const TextPropertiesSchema = z.object({
  text: z.string(),
  font_size: z.string().optional(),
  fill: z.string().optional(),
})

// Collision box
export const CollisionBoxShapeSchema = z.enum(['rectangle', 'circle'])

export const CollisionBoxSchema = z.object({
  shape: CollisionBoxShapeSchema,
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
})

// Emoji properties
export const EmojiPropertiesSchema = z.object({
  emoji: z.string(),
  size: z.number().optional(),
  collision_box: CollisionBoxSchema,
})

// Behavior types
export const BehaviorTypeSchema = z.enum(['patrol', 'follow', 'static', 'random'])

// Object types
export const ObjectTypeSchema = z.enum(['sprite', 'rectangle', 'circle', 'text', 'emoji', 'group'])

// Controls
export const ControlsSchema = z.object({
  left: z.string().optional(),
  right: z.string().optional(),
  jump: z.string().optional(),
  up: z.string().optional(),
  down: z.string().optional(),
  shoot: z.string().optional(),
  projectile: z.lazy(() => GameObjectSchema).optional(),
})

// Game object
export const GameObjectSchema: z.ZodType<any> = z.object({
  id: z.string(),
  type: ObjectTypeSchema,
  x: z.number(),
  y: z.number(),
  texture: z.string().optional(),
  shape: ShapePropertiesSchema.optional(),
  text: TextPropertiesSchema.optional(),
  emoji: EmojiPropertiesSchema.optional(),
  physics: ObjectPhysicsSchema.optional(),
  controls: ControlsSchema.optional(),
  behavior: BehaviorTypeSchema.optional(),
  behavior_params: z.any().optional(),
})

// Position variance
export const PositionVarianceSchema = z.object({
  x_min: z.number(),
  x_max: z.number(),
  y_min: z.number().optional(),
  y_max: z.number().optional(),
})

// Spawner
export const SpawnerSchema = z.object({
  id: z.string(),
  template: GameObjectSchema,
  interval: z.number(),
  max_count: z.number().optional(),
  spawn_area: z.string(),
  position_variance: PositionVarianceSchema.optional(),
})

// Action effects
export const ActionEffectSchema = z.union([
  z.object({
    type: z.literal('updateScore'),
    points: z.number(),
  }),
  z.object({
    type: z.literal('gameOver'),
  }),
  z.object({
    type: z.literal('destroy'),
  }),
  z.object({
    type: z.literal('updateText'),
    object_id: z.string(),
    text: z.string(),
  }),
])

// Action definition
export const ActionDefinitionSchema = z.object({
  name: z.string(),
  effect: ActionEffectSchema,
})

// Custom logic
export const CustomLogicSchema = z.object({
  on_collision: z.array(z.string()).optional(),
  on_overlap: z.array(z.string()).optional(),
  timers: z.array(z.string()).optional(),
  spawners: z.array(SpawnerSchema).optional(),
  actions: z.array(ActionDefinitionSchema).optional(),
})

// Scene
export const SceneSchema = z.object({
  name: z.string(),
  objects: z.array(GameObjectSchema),
  custom_logic: CustomLogicSchema.optional(),
})

// Complete Phaser game specification
export const PhaserGameSpecSchema = z.object({
  title: z.string(),
  description: z.string(),
  game: GameConfigSchema,
  assets: z.array(AssetSchema).default([]), // Default to empty array
  scenes: z.array(SceneSchema).min(1, 'Game must have at least one scene'),
  controls_description: z.array(z.string()),
  key_concepts: z.array(z.string()),
})

// Database types
export const GameRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  spec: PhaserGameSpecSchema,
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number(),
})

export const GameSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number(),
})

export const GameVersionSchema = z.object({
  id: z.number(),
  game_id: z.string(),
  version: z.number(),
  spec: PhaserGameSpecSchema,
  created_at: z.string(),
  notes: z.string().nullable(),
})

// Export inferred TypeScript types from Zod schemas
export type PhaserGameSpec = z.infer<typeof PhaserGameSpecSchema>
export type GameConfig = z.infer<typeof GameConfigSchema>
export type PhysicsConfig = z.infer<typeof PhysicsConfigSchema>
export type GravityConfig = z.infer<typeof GravityConfigSchema>
export type AssetType = z.infer<typeof AssetTypeSchema>
export type Asset = z.infer<typeof AssetSchema>
export type PhysicsBody = z.infer<typeof PhysicsBodySchema>
export type ObjectPhysics = z.infer<typeof ObjectPhysicsSchema>
export type VelocityConfig = z.infer<typeof VelocityConfigSchema>
export type Controls = z.infer<typeof ControlsSchema>
export type ObjectType = z.infer<typeof ObjectTypeSchema>
export type ShapeProperties = z.infer<typeof ShapePropertiesSchema>
export type TextProperties = z.infer<typeof TextPropertiesSchema>
export type EmojiProperties = z.infer<typeof EmojiPropertiesSchema>
export type CollisionBox = z.infer<typeof CollisionBoxSchema>
export type CollisionBoxShape = z.infer<typeof CollisionBoxShapeSchema>
export type BehaviorType = z.infer<typeof BehaviorTypeSchema>
export type GameObject = z.infer<typeof GameObjectSchema>
export type Spawner = z.infer<typeof SpawnerSchema>
export type PositionVariance = z.infer<typeof PositionVarianceSchema>
export type CustomLogic = z.infer<typeof CustomLogicSchema>
export type ActionDefinition = z.infer<typeof ActionDefinitionSchema>
export type ActionEffect = z.infer<typeof ActionEffectSchema>
export type Scene = z.infer<typeof SceneSchema>
export type GameRecord = z.infer<typeof GameRecordSchema>
export type GameSummary = z.infer<typeof GameSummarySchema>
export type GameVersion = z.infer<typeof GameVersionSchema>
