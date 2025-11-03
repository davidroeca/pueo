# Claude Chat with Rig - Usage Guide

This is a complete example of integrating Claude AI into a Tauri app using the Rig library.

## Architecture Overview

**Backend (Rust):**
- Uses `rig-core` with Anthropic provider
- Manages Claude API client securely in Rust
- Provides both streaming and non-streaming chat commands
- Uses Tauri events to stream tokens to frontend

**Frontend (React):**
- Event-driven architecture using Tauri's event system
- Listens for `chat-token`, `chat-complete`, and `chat-error` events
- Displays streaming responses with animated cursor
- Full chat history management

## How to Use

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Your API Key (Recommended)

**Option A: Use .env file (Recommended)**
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your API key to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
3. The app will auto-load the key on startup!

**Option B: Enter manually**
- The app will prompt you to enter the API key when it starts
- Get your key at https://console.anthropic.com/

### 3. Run the App
```bash
npm run tauri dev
```

If you set up the `.env` file, the app will automatically initialize and go straight to the chat interface!

### 4. Chat with Claude
- Type a message in the input field
- Click "Stream" for streaming responses (token-by-token)
- Click "Send (No Stream)" for complete responses

## Available Tauri Commands

### `is_ai_initialized() -> bool`
Check if the AI client is already initialized (e.g., from .env file).

### `init_ai(api_key: String)`
Initialize the Anthropic client with your API key. Not needed if you use the .env file.

### `stream_chat(messages: Vec<ChatMessage>, model: Option<String>)`
Send a chat request with streaming response.
- Emits `chat-token` events for each token
- Emits `chat-complete` when done
- Emits `chat-error` on errors

### `chat_completion(messages: Vec<ChatMessage>, model: Option<String>)`
Send a chat request and wait for full response (no streaming).

## Message Format

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}
```

## Customization

### Change Model
Edit the model parameter in `App.tsx`:
```typescript
model: 'claude-sonnet-4-5-20250929'  // or claude-3-5-sonnet-20241022, etc.
```

### Add System Prompts
Insert a system message at the start:
```typescript
const systemMessage: ChatMessage = {
  role: 'system',
  content: 'You are a helpful assistant...'
}
setMessages([systemMessage, userMessage])
```

### Background Processing
For non-UI AI tasks, call `chat_completion` from Rust without involving the frontend:
```rust
// In any Rust module
let response = chat_completion(state, messages, Some("claude-sonnet-4-5-20250929".to_string()))
    .await
    .unwrap();
```

## Security Note

The API key is stored in memory only and is managed by the Rust backend. It's never exposed to the frontend beyond the initialization step.

**Important:** When using the `.env` file:
- Make sure `.env` is in your `.gitignore` (already configured)
- Never commit your API key to version control
- The `.env.example` file is safe to commit (it has no actual keys)

## Available Models

- `claude-sonnet-4-5-20250929` (recommended, latest)
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-opus-4-20250514`

See Anthropic's docs for the full list: https://docs.anthropic.com/en/docs/models-overview
