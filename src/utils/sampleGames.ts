import type { PhaserGameSpec } from '@/types/gameSpec'

export const samplePlatformer: PhaserGameSpec = {
  title: 'Simple Platformer',
  description: 'Jump on platforms and collect stars',
  game: {
    width: 800,
    height: 600,
    background_color: '#87CEEB',
    physics: {
      enabled: true,
      gravity: { x: 0, y: 300 },
      debug: false,
    },
  },
  assets: [],
  scenes: [
    {
      name: 'MainScene',
      objects: [
        // Ground platform
        {
          id: 'ground',
          type: 'rectangle',
          x: 400,
          y: 568,
          shape: {
            width: 800,
            height: 64,
            color: '#00aa00',
          },
          physics: {
            body: 'static',
          },
        },
        // Platform 1
        {
          id: 'platform1',
          type: 'rectangle',
          x: 600,
          y: 400,
          shape: {
            width: 200,
            height: 32,
            color: '#00aa00',
          },
          physics: {
            body: 'static',
          },
        },
        // Platform 2
        {
          id: 'platform2',
          type: 'rectangle',
          x: 150,
          y: 250,
          shape: {
            width: 200,
            height: 32,
            color: '#00aa00',
          },
          physics: {
            body: 'static',
          },
        },
        // Player
        {
          id: 'player',
          type: 'rectangle',
          x: 100,
          y: 450,
          shape: {
            width: 32,
            height: 48,
            color: '#0000ff',
          },
          physics: {
            body: 'dynamic',
            bounce: 0.2,
            collide_world_bounds: true,
          },
          controls: {
            left: 'ArrowLeft',
            right: 'ArrowRight',
            jump: 'ArrowUp',
          },
        },
        // Star 1
        {
          id: 'star1',
          type: 'circle',
          x: 150,
          y: 200,
          shape: {
            radius: 10,
            color: '#ffff00',
          },
          physics: {
            body: 'dynamic',
            bounce: 0.8,
            collide_world_bounds: true,
          },
        },
        // Star 2
        {
          id: 'star2',
          type: 'circle',
          x: 600,
          y: 350,
          shape: {
            radius: 10,
            color: '#ffff00',
          },
          physics: {
            body: 'dynamic',
            bounce: 0.8,
            collide_world_bounds: true,
          },
        },
        // Score text
        {
          id: 'scoreText',
          type: 'text',
          x: 16,
          y: 16,
          text: {
            text: 'Score: 0',
            font_size: '32px',
            fill: '#000',
          },
        },
      ],
      custom_logic: {
        actions: [
          {
            name: 'collectCoin',
            effect: {
              type: 'updateScore',
              points: 10,
            },
          },
        ],
        on_collision: [
          'player,ground -> null',
          'player,platform1 -> null',
          'player,platform2 -> null',
          'star1,ground -> null',
          'star1,platform1 -> null',
          'star1,platform2 -> null',
          'star2,ground -> null',
          'star2,platform1 -> null',
          'star2,platform2 -> null',
        ],
        on_overlap: [
          'player,star1 -> collectCoin',
          'player,star2 -> collectCoin',
        ],
      },
    },
  ],
  controls_description: [
    'Arrow Left/Right - Move left and right',
    'Arrow Up - Jump',
  ],
  key_concepts: [
    'Arcade physics with gravity',
    'Static and dynamic bodies',
    'Collision detection',
    'Keyboard input handling',
    'Overlap detection for collectibles',
  ],
}

export const sampleDodger: PhaserGameSpec = {
  title: 'Dodge the Enemies',
  description: 'Move left and right to avoid continuously spawning falling enemies',
  game: {
    width: 800,
    height: 600,
    background_color: '#0a0a0a',
    physics: {
      enabled: true,
      gravity: { x: 0, y: 200 },
      debug: false,
    },
  },
  assets: [],
  scenes: [
    {
      name: 'MainScene',
      objects: [
        // Player
        {
          id: 'player',
          type: 'rectangle',
          x: 400,
          y: 550,
          shape: {
            width: 40,
            height: 40,
            color: '#00ff00',
          },
          physics: {
            body: 'dynamic',
            collide_world_bounds: true,
          },
          controls: {
            left: 'ArrowLeft',
            right: 'ArrowRight',
          },
        },
        // Score
        {
          id: 'score',
          type: 'text',
          x: 16,
          y: 16,
          text: {
            text: 'Survive!',
            font_size: '32px',
            fill: '#ffffff',
          },
        },
      ],
      custom_logic: {
        actions: [
          {
            name: 'hitByEnemy',
            effect: {
              type: 'gameOver',
            },
          },
        ],
        spawners: [
          {
            id: 'enemySpawner',
            interval: 1500,
            spawn_area: 'top',
            position_variance: {
              x_min: 50,
              x_max: 750,
              y_min: -50,
              y_max: 0,
            },
            template: {
              id: 'enemy_template',
              type: 'circle',
              x: 0,
              y: 0,
              shape: {
                radius: 20,
                color: '#ff0000',
              },
              physics: {
                body: 'dynamic',
                velocity: { x: 0, y: 50 },
              },
            },
          },
        ],
        on_overlap: [
          'player,enemy_template -> hitByEnemy',
        ],
      },
    },
  ],
  controls_description: ['Arrow Left/Right - Move to dodge enemies'],
  key_concepts: [
    'Dynamic object spawning',
    'Physics with gravity',
    'Collision avoidance gameplay',
    'Spawner system',
  ],
}
