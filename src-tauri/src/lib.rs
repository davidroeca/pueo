use futures::StreamExt;
use rig::agent::MultiTurnStreamItem;
use rig::client::CompletionClient;
use rig::completion::Message;
use rig::providers::anthropic;
use rig::streaming::{StreamedAssistantContent, StreamedUserContent, StreamingChat, StreamingPrompt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{Emitter, Manager, State, Window};
use tokio::sync::Mutex;

mod db;
mod game_builder;

// Shared state for the LLM client and database
pub struct AppState {
    client: Arc<Mutex<Option<anthropic::Client>>>,
    db: Arc<db::Database>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub id: String,
    pub role: String,
    pub content: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Check if AI client is already initialized
#[tauri::command]
async fn is_ai_initialized(state: State<'_, AppState>) -> Result<bool, String> {
    let client_guard = state.client.lock().await;
    Ok(client_guard.is_some())
}

// Initialize the Anthropic client with API key
#[tauri::command]
async fn init_ai(state: State<'_, AppState>, api_key: String) -> Result<String, String> {
    if api_key.is_empty() {
        return Err("API key cannot be empty".to_string());
    }
    let client = anthropic::Client::new(&api_key);
    let mut client_guard = state.client.lock().await;
    *client_guard = Some(client);
    Ok("AI client initialized successfully".to_string())
}

// Stream chat completion with game builder tool
#[tauri::command]
async fn stream_chat(
    window: Window,
    state: State<'_, AppState>,
    messages: Vec<ChatMessage>,
    model: Option<String>,
) -> Result<(), String> {
    // Get the client from state
    let client_guard = state.client.lock().await;
    let client = client_guard
        .as_ref()
        .ok_or("AI client not initialized. Call init_ai first.")?;

    // Use specified model or default to claude-sonnet-4-5
    let model_name = model.unwrap_or_else(|| "claude-sonnet-4-5-20250929".to_string());

    // Build the chat history - separate system messages, last user message, and history
    let mut system_prompt = game_builder::get_system_prompt();
    let mut history = Vec::new();
    let mut last_user_message = String::new();

    for msg in messages {
        match msg.role.as_str() {
            "system" => {
                system_prompt.push_str("\n");
                system_prompt.push_str(&msg.content);
            }
            "user" => {
                last_user_message = msg.content;
            }
            "assistant" => {
                // Add previous user message and this assistant response to history
                if !last_user_message.is_empty() {
                    history.push(Message::user(&last_user_message));
                    last_user_message = String::new();
                }
                history.push(Message::assistant(&msg.content));
            }
            _ => return Err(format!("Unknown role: {}", msg.role)),
        }
    }

    // Create agent with the Phaser game tool
    let agent = client
        .agent(&model_name)
        .preamble(&system_prompt)
        .tool(game_builder::create_phaser_game_tool())
        .build();

    // Create streaming completion with multi-turn enabled for automatic tool execution
    // Max depth of 5 allows the agent to call tools up to 5 times before requiring a text response
    let mut stream = if history.is_empty() {
        // Simple prompt if no history
        agent.stream_prompt(&last_user_message).multi_turn(5).await
    } else {
        // Chat with history
        agent.stream_chat(&last_user_message, history).multi_turn(5).await
    };

    // Stream tokens to frontend and accumulate the full response
    let mut accumulated_response = String::new();
    let mut has_received_text = false;

    while let Some(result) = stream.next().await {
        match result {
            Ok(chunk) => match chunk {
                MultiTurnStreamItem::StreamAssistantItem(item) => match item {
                    StreamedAssistantContent::Text(text) => {
                        has_received_text = true;
                        accumulated_response.push_str(&text.text);
                        window
                            .emit("chat-token", &text.text)
                            .map_err(|e| format!("Failed to emit token: {}", e))?;
                    }
                    StreamedAssistantContent::ToolCall(tool_call) => {
                        // With multi_turn enabled, rig automatically executes tools
                        // Emit the tool call event with the game spec
                        window
                            .emit(
                                "tool-call",
                                serde_json::json!({
                                    "function": {
                                        "name": &tool_call.function.name,
                                        "arguments": &tool_call.function.arguments
                                    }
                                }),
                            )
                            .map_err(|e| format!("Failed to emit tool call: {}", e))?;
                    }
                    _ => (),
                },
                MultiTurnStreamItem::StreamUserItem(user_item) => {
                    // This is emitted after a tool is executed (tool result)
                    match user_item {
                        StreamedUserContent::ToolResult(result) => {
                            window
                                .emit("tool-result", &result.content)
                                .map_err(|e| format!("Failed to emit tool result: {}", e))?;

                            // After tool execution, emit new-turn to signal the frontend
                            // to save the current streaming content and start a new message
                            window
                                .emit("chat-new-turn", ())
                                .map_err(|e| format!("Failed to emit new-turn: {}", e))?;

                            // Reset the text tracking for the new turn
                            has_received_text = false;
                        }
                    }
                }
                MultiTurnStreamItem::FinalResponse(response) => {
                    // Emit the final response first
                    window
                        .emit("chat-final-response", &response.response())
                        .map_err(|e| format!("Failed to emit final response: {}", e))?;
                }
                _ => (),
            },
            Err(e) => {
                window
                    .emit("chat-error", format!("Stream error: {}", e))
                    .map_err(|e| format!("Failed to emit error: {}", e))?;
                return Err(format!("Stream error: {}", e));
            }
        }
    }

    // Signal completion
    window
        .emit("chat-complete", ())
        .map_err(|e| format!("Failed to emit completion: {}", e))?;

    Ok(())
}

// Game Builder commands
#[tauri::command]
fn get_game_builder_prompt() -> String {
    game_builder::get_system_prompt()
}

// Database commands for game persistence
#[tauri::command]
async fn save_game(
    state: State<'_, AppState>,
    spec: game_builder::PhaserGameSpec,
) -> Result<db::GameRecord, String> {
    state
        .db
        .create_game(spec)
        .await
        .map_err(|e| format!("Failed to save game: {}", e))
}

#[tauri::command]
async fn get_game(state: State<'_, AppState>, id: String) -> Result<db::GameRecord, String> {
    state
        .db
        .get_game(&id)
        .await
        .map_err(|e| format!("Failed to get game: {}", e))
}

#[tauri::command]
async fn update_game(
    state: State<'_, AppState>,
    id: String,
    spec: game_builder::PhaserGameSpec,
    notes: Option<String>,
) -> Result<db::GameRecord, String> {
    state
        .db
        .update_game(&id, spec, notes)
        .await
        .map_err(|e| format!("Failed to update game: {}", e))
}

#[tauri::command]
async fn delete_game(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .db
        .delete_game(&id)
        .await
        .map_err(|e| format!("Failed to delete game: {}", e))
}

#[tauri::command]
async fn list_games(state: State<'_, AppState>) -> Result<Vec<db::GameSummary>, String> {
    state
        .db
        .list_games()
        .await
        .map_err(|e| format!("Failed to list games: {}", e))
}

#[tauri::command]
async fn search_games(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<db::GameSummary>, String> {
    state
        .db
        .search_games(&query)
        .await
        .map_err(|e| format!("Failed to search games: {}", e))
}

#[tauri::command]
async fn get_game_versions(
    state: State<'_, AppState>,
    game_id: String,
) -> Result<Vec<db::GameVersion>, String> {
    state
        .db
        .get_game_versions(&game_id)
        .await
        .map_err(|e| format!("Failed to get game versions: {}", e))
}

#[tauri::command]
async fn get_game_version(
    state: State<'_, AppState>,
    game_id: String,
    version: i64,
) -> Result<db::GameVersion, String> {
    state
        .db
        .get_game_version(&game_id, version)
        .await
        .map_err(|e| format!("Failed to get game version: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Try to load .env file (ignore if it doesn't exist)
    let _ = dotenvy::dotenv();

    // Try to initialize client from environment variable
    let initial_client = std::env::var("ANTHROPIC_API_KEY")
        .ok()
        .filter(|key| !key.is_empty())
        .map(|key| anthropic::Client::new(&key));

    if initial_client.is_some() {
        println!("Loaded ANTHROPIC_API_KEY from environment");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database in app data directory
            let app_handle = app.handle();
            tauri::async_runtime::block_on(async move {
                let app_data_dir = app_handle
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app data directory");

                let db_path = app_data_dir.join("games.db");

                let database = db::Database::new(db_path)
                    .await
                    .expect("Failed to initialize database");

                app_handle.manage(AppState {
                    client: Arc::new(Mutex::new(initial_client)),
                    db: Arc::new(database),
                });
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            is_ai_initialized,
            init_ai,
            stream_chat,
            get_game_builder_prompt,
            save_game,
            get_game,
            update_game,
            delete_game,
            list_games,
            search_games,
            get_game_versions,
            get_game_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
