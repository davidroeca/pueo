import { useEffect, useRef, useState } from 'react'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { Sun, Moon } from 'lucide-react'
import { useChatStore } from '@/store/useChatStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { GameBuilder } from '@/components/GameBuilder'
import { GameLibrary } from '@/components/GameLibrary'
import { GameRendererTest } from '@/components/GameRendererTest'
import { Logo } from '@/components/Logo'
import type { PhaserGameSpec } from '@/types/gameSpec'

type View = 'chat' | 'library' | 'test'

function App() {
  const [currentView, setCurrentView] = useState<View>('chat')
  const {
    apiKey,
    setApiKey,
    isInitialized,
    initError,
    initializeAI,
    checkInitialization,
    appendStreamingResponse,
    setStreamingResponse,
    setIsStreaming,
    addMessage,
    setError,
    setGeneratedGameSpec,
    setActiveToolCall,
  } = useChatStore()

  const { theme, toggleTheme } = useSettingsStore()

  // Initialize theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Check if AI is already initialized (from .env)
  useEffect(() => {
    checkInitialization()
  }, [checkInitialization])

  // https://stackoverflow.com/a/72238236 - fixes double initialization in strict mode
  const listenersInitialized = useRef(false)

  // Set up event listeners for streaming
  useEffect(() => {
    if (listenersInitialized.current) {
      return
    }
    let unlisten: UnlistenFn[] = []

    const setupListeners = async () => {
      // Listen for streaming tokens
      const unlistenToken = await listen<string>('chat-token', (event) => {
        appendStreamingResponse(event.payload)
      })

      // Listen for reasoning (Claude thinking)
      const unlistenReasoning = await listen<string>('reasoning', () => {
        // Show thinking indicator
        setActiveToolCall({ name: 'thinking', timestamp: Date.now() })
      })

      // Listen for tool calls (when LLM decides to call a tool)
      // With multi-turn enabled, the tool is automatically executed by rig
      const unlistenToolCall = await listen<{ function: { name: string; arguments: unknown } }>(
        'tool-call',
        (event) => {
          const toolCall = event.payload

          if (toolCall.function.name === 'generate_phaser_game') {
            // Show "Generating Game..." indicator while tool executes
            setActiveToolCall({ name: toolCall.function.name, timestamp: Date.now() })

            const gameSpec = toolCall.function.arguments as PhaserGameSpec
            setGeneratedGameSpec(gameSpec)
          }
        }
      )

      // Listen for tool results (after tool execution completes)
      const unlistenToolResult = await listen<string>('tool-result', () => {
        // Tool execution completed, clear the indicator
        // The result is the JSON string returned by the tool
        setActiveToolCall(null)
      })

      // Listen for new turn (when agent responds again after tool use)
      const unlistenNewTurn = await listen('chat-new-turn', () => {
        // Get the current streaming response from the store
        const store = useChatStore.getState()
        const currentStreaming = store.streamingResponse

        if (currentStreaming) {
          store.addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: currentStreaming,
          })
        }
        // Clear streaming response to start fresh for the new turn
        store.setStreamingResponse('')
      })

      const unlistenFinalResponse = await listen<string>(
        'chat-final-response',
        (event) => {
          // When we receive the final response, add it to messages
          const finalContent = event.payload

          addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: finalContent,
          })
          setStreamingResponse('')
          // Don't clear activeToolCall here - extraction is about to start
          // It will be cleared when tool-call or chat-complete arrives
        },
      )

      // Listen for stream completion (just cleanup, message already added by final-response)
      const unlistenComplete = await listen('chat-complete', () => {
        // Just ensure streaming state is cleaned up
        setIsStreaming(false)
        setStreamingResponse('')
        setActiveToolCall(null)  // Clear any remaining tool indicators
      })

      // Listen for errors
      const unlistenError = await listen<string>('chat-error', (event) => {
        setError(event.payload)
        setIsStreaming(false)
        setStreamingResponse('')
        setActiveToolCall(null)  // Clear tool indicators on error
      })

      unlisten = [
        unlistenToken,
        unlistenReasoning,
        unlistenToolCall,
        unlistenToolResult,
        unlistenNewTurn,
        unlistenFinalResponse,
        unlistenComplete,
        unlistenError,
      ]
    }

    setupListeners()

    listenersInitialized.current = true

    return () => {
      unlisten.forEach((fn) => fn())
    }
  }, [
    appendStreamingResponse,
    addMessage,
    setStreamingResponse,
    setIsStreaming,
    setError,
  ])

  return (
    <main className="m-0 pt-[5vh] flex flex-col justify-center text-center">
      <div className="flex flex-col gap-4 items-center mb-6">
        <div className="flex flex-row gap-3 items-center">
          <Logo className="h-[80px] w-[80px]" />
          <h1 className="text-center text-4xl font-bold">Pueo</h1>
          <button
            onClick={toggleTheme}
            className="ml-4 p-2 btn-sm"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Navigation tabs */}
        {isInitialized && (
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('chat')}
              className={currentView === 'chat' ? 'btn-tab-active' : 'btn-tab'}
            >
              Game Builder
            </button>
            <button
              onClick={() => setCurrentView('library')}
              className={currentView === 'library' ? 'btn-tab-active' : 'btn-tab'}
            >
              Library
            </button>
            <button
              onClick={() => setCurrentView('test')}
              className={currentView === 'test' ? 'btn-tab-active' : 'btn-tab'}
            >
              Test
            </button>
          </div>
        )}
      </div>

      {/* View content */}
      {currentView === 'test' ? (
        <GameRendererTest />
      ) : currentView === 'library' ? (
        <GameLibrary />
      ) : (
        <>

      {!isInitialized ? (
        <div className="max-w-[500px] mx-auto p-10">
          <h2>Initialize AI Client</h2>
          <p className="text-muted text-sm mb-5">
            Enter your API key, or add{' '}
            <code className="bg-gray-200 px-1 rounded dark:bg-gray-700">
              ANTHROPIC_API_KEY
            </code>{' '}
            to{' '}
            <code className="bg-gray-200 px-1 rounded dark:bg-gray-700">
              .env
            </code>{' '}
            file
          </p>
          <form
            className="flex flex-col gap-3"
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
              className="input"
            />
            <button
              type="submit"
              className="btn"
            >
              Initialize
            </button>
          </form>
          {initError && (
            <p className="text-error mt-3">{initError}</p>
          )}
        </div>
      ) : (
        <div className="w-full px-5">
          <GameBuilder />
        </div>
      )}
        </>
      )}
    </main>
  )
}

export default App
