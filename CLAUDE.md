# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri desktop application using React 19 and TypeScript for the frontend, with a Rust backend. Tauri enables building lightweight, secure desktop apps with web technologies, where the frontend communicates with the Rust backend via commands.

## Development Commands

**Frontend development:**
```bash
npm run dev          # Start Vite dev server (port 1420)
npm run build        # TypeScript compilation + Vite production build
npm run preview      # Preview production build
```

**Tauri desktop app:**
```bash
npm run tauri dev    # Run app in development mode (auto-starts Vite dev server)
npm run tauri build  # Build production app bundle for distribution
```

**Rust backend:**
```bash
cd src-tauri
cargo build          # Build Rust backend
cargo test           # Run Rust tests
cargo clippy         # Lint Rust code
```

## Architecture

### Frontend (src/)
- **Entry point:** `src/main.tsx` - React app initialization
- **Main component:** `src/App.tsx` - UI and Tauri command invocations
- **Tauri API usage:** Import `invoke` from `@tauri-apps/api/core` to call Rust commands
- **Build tool:** Vite with React plugin (port 1420 for dev, HMR on 1421)

### Backend (src-tauri/)
- **Entry point:** `src-tauri/src/main.rs` - calls `pueo_lib::run()`
- **Library:** `src-tauri/src/lib.rs` - main Tauri application setup, command handlers
- **Configuration:** `src-tauri/tauri.conf.json` - app metadata, window config, build settings
- **Library name:** The Rust library is named `pueo_lib` (note the `_lib` suffix to avoid naming conflicts on Windows)

### Frontend-Backend Communication
Commands are defined in Rust with the `#[tauri::command]` macro and registered in the `invoke_handler`. Frontend calls them using `invoke("command_name", { args })`.

Example flow:
1. Define command in `src-tauri/src/lib.rs`: `#[tauri::command] fn greet(name: &str) -> String`
2. Register in builder: `.invoke_handler(tauri::generate_handler![greet])`
3. Call from frontend: `await invoke("greet", { name: "World" })`

### Active Plugins
- `tauri-plugin-opener` - Opens URLs and files in default system applications

## Game Builder System

This application includes an AI-powered game builder that creates browser-based games using Phaser 3. The system uses a structured JSON specification to define games.

### Game Object Types

Games support the following object types (defined in `src/types/gameSpec.ts`):

1. **emoji** - Emoji characters with custom collision boxes (🚀, 👾, ⭐, etc.)
   - Primary choice for game objects - visually appealing and recognizable
   - Rendered as text with configurable size
   - Collision detection uses separate collision box (rectangle or circle)
   - Example: Player as 🏃, enemies as 👾, collectibles as ⭐

2. **rectangle** - Rectangular shapes
   - Best for platforms, walls, and abstract objects
   - Color, width, and height configurable
   - Collision box matches visual exactly

3. **circle** - Circular shapes
   - Good for simple bullets or abstract objects
   - Color and radius configurable
   - Collision box matches visual exactly

4. **text** - Text labels
   - Used for UI elements (scores, instructions)
   - No collision detection by default

5. **sprite** - Custom image sprites
   - Requires external assets

### Emoji Objects and Collision Boxes

Emojis use a **hybrid visual + collision system** (standard in game development):

**Visual Representation:**
- Rendered as Unicode text at specified size
- Always centered (origin 0.5, 0.5)
- Visually expressive and cross-platform

**Physics/Collision:**
- Separate collision box defines hitbox
- Can be `rectangle` (width, height) or `circle` (radius)
- Collision box doesn't need to match emoji visual exactly

**Example:**
```typescript
{
  type: 'emoji',
  emoji: {
    emoji: '🚗',
    size: 40,
    collision_box: {
      shape: 'rectangle',
      width: 40,
      height: 30
    }
  },
  physics: {
    body: 'dynamic',
    collide_world_bounds: true
  }
}
```

### Key Files

- **Game builder prompt:** `src-tauri/src/game_builder.rs` - System prompt and Rust type definitions
- **TypeScript types:** `src/types/gameSpec.ts` - Game specification types
- **Phaser renderer:** `src/utils/phaserRenderer.ts` - Converts JSON specs to running Phaser games
- **Sample games:** `src/utils/sampleGames.ts` - Example game specifications

### Design Philosophy

The game builder **emphasizes emojis first**, falling back to shapes only when needed:
- ✅ Use emojis for characters, enemies, collectibles, vehicles, etc.
- ✅ Use rectangles/circles for platforms, walls, bullets, abstract elements
- ✅ Collision boxes are standard practice (same as sprite-based games)
- ✅ Visual appeal > pixel-perfect collision matching

## Styling Approach

This project uses a **hybrid Tailwind CSS approach** that balances maintainability with flexibility.

### Component Classes (in `src/globals.css`)
We extract repeated UI patterns into the `@layer components` section. Available classes include:

**Buttons:**
- `.btn` - Default button (white/dark bg, hover effects)
- `.btn-sm` - Small button variant
- `.btn-tab` / `.btn-tab-active` - Navigation tab styles
- `.btn-primary` - Blue primary action
- `.btn-purple` - Purple action (e.g., "Play Game")
- `.btn-danger` - Red destructive action
- `.btn-purple-sm` / `.btn-danger-sm` - Small colored buttons
- `.btn-refresh` - Refresh/reload button

**Inputs:**
- `.input` - Standard text input with focus states
- `.input-search` - Search input with visible border

**Containers:**
- `.card` - Card container (used in game library)
- `.chat-container` - Chat message container

**Text:**
- `.text-error` - Error message text (red with dark mode support)
- `.text-muted` - Muted/secondary text (gray with dark mode support)

### When to Extract to Components Layer
Extract a pattern to `@layer components` when:
1. **Repeated 3+ times** across the codebase
2. **Complex combinations** of utilities (50+ characters)
3. **Dark mode variants** that appear frequently (e.g., `dark:bg-gray-900 dark:text-white`)

### When to Keep Utilities Inline
Keep Tailwind utilities inline for:
1. **Layout & spacing** - flex, grid, gap, margins, padding
2. **One-off styles** - unique component-specific adjustments
3. **Responsive variants** - breakpoint-specific changes (md:, lg:)
4. **State modifiers** - disabled:, hover: for unique cases

### Examples

**✅ Good - Component class + layout utilities:**
```tsx
<button className="btn-primary mt-4">Save Game</button>
<input className="input mb-3" placeholder="Enter name" />
<div className="card mb-5">Content here</div>
```

**❌ Avoid - Repeating long utility strings:**
```tsx
// Don't do this - extract to component class instead
<button className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer">
  Save Game
</button>
```

**✅ Good - Mixing component classes with utilities:**
```tsx
// Component class for the base style, utilities for layout/spacing
<div className="flex gap-2">
  <button className="flex-1 btn-purple-sm">Play</button>
  <button className="btn-danger-sm">Delete</button>
</div>
```

### Adding New Component Classes
If you notice a pattern being repeated multiple times:
1. Add it to `src/globals.css` in the `@layer components` section
2. Use semantic names (e.g., `.btn-warning` not `.btn-yellow`)
3. Include dark mode support with `dark:` variants
4. Document it in this section of CLAUDE.md

## Key Configuration Files

- `tauri.conf.json` - Tauri app configuration (window size, identifier, build commands)
- `vite.config.ts` - Fixed ports (1420/1421), Vite watches frontend but ignores src-tauri
- `Cargo.toml` - Rust dependencies and crate configuration
- `package.json` - Node dependencies and npm scripts

## Assistant Directives

- You likely think it's the wrong year. Prior to referencing the current year, please run the `date` command in bash to get the current date/time.
- The user is not always right. Avoid phrases like "you're absolutely right" when there's some uncertainty. Maintain a healthy sense of skepticism if the user's idea has potential pitfalls. Ultimately, they have the final say, but pause to implement and highlight trade-offs if there are some architectural problems.
- Before implementing a complex solution, chime in with 1-2 alternatives and confirm that the chosen approach is best.
- Your information is likely outdated. Double check dependency files to make sure you're working with the right versions of the libraries. If in doubt, you can pull in information from the context7 mcp.
