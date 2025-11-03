import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import './App.css'

interface ChatMessage {
  role: string
  content: string
}

function App() {
  const [apiKey, setApiKey] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState('')

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streamingResponse, setStreamingResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')

  // Check if AI is already initialized (from .env)
  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const initialized = await invoke<boolean>('is_ai_initialized')
        setIsInitialized(initialized)
      } catch (err) {
        console.error('Failed to check initialization:', err)
      }
    }
    checkInitialization()
  }, [])

  // Set up event listeners for streaming
  useEffect(() => {
    let unlisten: UnlistenFn[] = []

    const setupListeners = async () => {
      // Listen for streaming tokens
      const unlistenToken = await listen<string>('chat-token', (event) => {
        console.log(event.payload)
        setStreamingResponse((prev) => prev + event.payload)
      })

      // Listen for stream completion
      const unlistenComplete = await listen('chat-complete', () => {
        setIsStreaming(false)
        // Add the completed response to messages
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: streamingResponse },
        ])
        setStreamingResponse('')
      })

      // Listen for errors
      const unlistenError = await listen<string>('chat-error', (event) => {
        setError(event.payload)
        setIsStreaming(false)
        setStreamingResponse('')
      })

      unlisten = [unlistenToken, unlistenComplete, unlistenError]
    }

    setupListeners()

    return () => {
      unlisten.forEach((fn) => fn())
    }
  }, [streamingResponse])

  // Initialize the AI client
  async function initializeAI() {
    try {
      setInitError('')
      const result = await invoke<string>('init_ai', { apiKey })
      setIsInitialized(true)
      console.log(result)
    } catch (err) {
      setInitError(String(err))
    }
  }

  // Send a streaming chat message
  async function sendStreamingMessage() {
    if (!input.trim()) return

    setError('')
    const userMessage: ChatMessage = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsStreaming(true)
    setStreamingResponse('')

    try {
      await invoke('stream_chat', {
        messages: updatedMessages,
        model: 'claude-sonnet-4-5-20250929',
      })
    } catch (err) {
      setError(String(err))
      setIsStreaming(false)
    }
  }

  // Send a non-streaming chat message (waits for full response)
  async function sendNonStreamingMessage() {
    if (!input.trim()) return

    setError('')
    const userMessage: ChatMessage = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsStreaming(true)

    try {
      const response = await invoke<string>('chat_completion', {
        messages: updatedMessages,
        model: 'claude-sonnet-4-5-20250929',
      })

      setMessages([...updatedMessages, { role: 'assistant', content: response }])
      setIsStreaming(false)
    } catch (err) {
      setError(String(err))
      setIsStreaming(false)
    }
  }

  // Clear chat history
  function clearChat() {
    setMessages([])
    setStreamingResponse('')
    setError('')
  }

  return (
    <main className="container">
      <h1>Claude Chat via Rig</h1>

      {!isInitialized ? (
        <div className="init-section">
          <h2>Initialize AI Client</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
            Enter your API key, or add <code>ANTHROPIC_API_KEY</code> to <code>.env</code> file
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              initializeAI()
            }}
          >
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Anthropic API key"
              style={{ width: '400px' }}
            />
            <button type="submit">Initialize</button>
          </form>
          {initError && <p style={{ color: 'red' }}>{initError}</p>}
        </div>
      ) : (
        <div className="chat-section">
          <div className="chat-controls">
            <button onClick={clearChat}>Clear Chat</button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <strong>{msg.role === 'user' ? 'You' : 'Claude'}:</strong>{' '}
                {msg.content}
              </div>
            ))}

            {streamingResponse && (
              <div className="message assistant streaming">
                <strong>Claude:</strong> {streamingResponse}
                <span className="cursor">▊</span>
              </div>
            )}
          </div>

          {error && <p style={{ color: 'red' }}>Error: {error}</p>}

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault()
              sendStreamingMessage()
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isStreaming}
              style={{ width: '500px' }}
            />
            <button type="submit" disabled={isStreaming}>
              Stream
            </button>
            <button
              type="button"
              onClick={sendNonStreamingMessage}
              disabled={isStreaming}
            >
              Send (No Stream)
            </button>
          </form>
        </div>
      )}
    </main>
  )
}

export default App
