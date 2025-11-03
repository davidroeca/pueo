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

## Key Configuration Files

- `tauri.conf.json` - Tauri app configuration (window size, identifier, build commands)
- `vite.config.ts` - Fixed ports (1420/1421), Vite watches frontend but ignores src-tauri
- `Cargo.toml` - Rust dependencies and crate configuration
- `package.json` - Node dependencies and npm scripts
