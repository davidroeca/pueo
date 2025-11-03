use futures::StreamExt;
use rig::agent::MultiTurnStreamItem;
use rig::client::CompletionClient;
use rig::completion::{Chat, Message, Prompt};
use rig::providers::anthropic;
use rig::streaming::{StreamedAssistantContent, StreamingChat, StreamingPrompt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{Emitter, State, Window};
use tokio::sync::Mutex;

// Shared state for the LLM client
pub struct AppState {
    client: Arc<Mutex<Option<anthropic::Client>>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
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

// Stream chat completion to frontend
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
    let agent = client.agent(&model_name).build();

    // Build the chat history - separate system messages, last user message, and history
    let mut system_prompt = String::new();
    let mut history = Vec::new();
    let mut last_user_message = String::new();

    for msg in messages {
        match msg.role.as_str() {
            "system" => {
                if !system_prompt.is_empty() {
                    system_prompt.push_str("\n");
                }
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

    // Apply system prompt if present
    let agent = if !system_prompt.is_empty() {
        client.agent(&model_name).preamble(&system_prompt).build()
    } else {
        agent
    };

    // Create streaming completion
    let mut stream = if history.is_empty() {
        // Simple prompt if no history
        agent.stream_prompt(&last_user_message).await
    } else {
        // Chat with history
        agent.stream_chat(&last_user_message, history).await
    };

    // Stream tokens to frontend
    while let Some(result) = stream.next().await {
        match result {
            Ok(chunk) => {
                if let MultiTurnStreamItem::StreamItem(StreamedAssistantContent::Text(text)) = chunk
                {
                    window
                        .emit("chat-token", &text.text)
                        .map_err(|e| format!("Failed to emit token: {}", e))?;
                }
            }
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

// Non-streaming chat (simpler, waits for full response)
#[tauri::command]
async fn chat_completion(
    state: State<'_, AppState>,
    messages: Vec<ChatMessage>,
    model: Option<String>,
) -> Result<String, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard
        .as_ref()
        .ok_or("AI client not initialized. Call init_ai first.")?;

    let model_name = model.unwrap_or_else(|| "claude-sonnet-4-5-20250929".to_string());
    let agent = client.agent(&model_name).build();

    // Build the chat history - separate system messages, last user message, and history
    let mut system_prompt = String::new();
    let mut history = Vec::new();
    let mut last_user_message = String::new();

    for msg in messages {
        match msg.role.as_str() {
            "system" => {
                if !system_prompt.is_empty() {
                    system_prompt.push_str("\n");
                }
                system_prompt.push_str(&msg.content);
            }
            "user" => {
                last_user_message = msg.content;
            }
            "assistant" => {
                if !last_user_message.is_empty() {
                    history.push(Message::user(&last_user_message));
                    last_user_message = String::new();
                }
                history.push(Message::assistant(&msg.content));
            }
            _ => return Err(format!("Unknown role: {}", msg.role)),
        }
    }

    // Apply system prompt if present
    let agent = if !system_prompt.is_empty() {
        client.agent(&model_name).preamble(&system_prompt).build()
    } else {
        agent
    };

    // Get completion
    let response = if history.is_empty() {
        agent
            .prompt(&last_user_message)
            .await
            .map_err(|e| format!("Completion failed: {}", e))?
    } else {
        agent
            .chat(&last_user_message, history)
            .await
            .map_err(|e| format!("Completion failed: {}", e))?
    };

    Ok(response)
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
        .manage(AppState {
            client: Arc::new(Mutex::new(initial_client)),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            is_ai_initialized,
            init_ai,
            stream_chat,
            chat_completion
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
