import { useEffect, useRef, useState } from 'react'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
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

      // Listen for tool execution
      const unlistenToolExecuting = await listen<string>('tool-executing', (event) => {
        setActiveToolCall({ name: event.payload, timestamp: Date.now() })
      })

      // Listen for tool calls (from stream)
      const unlistenToolCall = await listen<{ function: { name: string; arguments: unknown } }>(
        'tool-call',
        (event) => {
          const toolCall = event.payload

          if (toolCall.function.name === 'generate_phaser_game') {
            const gameSpec = toolCall.function.arguments as PhaserGameSpec
            setGeneratedGameSpec(gameSpec)
          }

          // Clear the tool execution indicator after successful extraction
          setActiveToolCall(null)
        }
      )

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

      // Listen for extraction failures
      const unlistenExtractionFailed = await listen<string>('extraction-failed', () => {
        setActiveToolCall(null)  // Clear the "Generating Game..." indicator
        // Note: We don't set this as an error since the conversation was successful,
        // just no game was generated (e.g., user asked a question instead)
      })

      unlisten = [
        unlistenToken,
        unlistenReasoning,
        unlistenToolExecuting,
        unlistenToolCall,
        unlistenFinalResponse,
        unlistenComplete,
        unlistenError,
        unlistenExtractionFailed,
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
            className="ml-4 p-2 rounded-lg border border-transparent bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white hover:border-blue-600 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        {/* Navigation tabs */}
        {isInitialized && (
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('chat')}
              className={`text-sm rounded-lg border px-4 py-2 transition-colors ${
                currentView === 'chat'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white border-transparent hover:border-blue-600'
              }`}
            >
              Game Builder
            </button>
            <button
              onClick={() => setCurrentView('library')}
              className={`text-sm rounded-lg border px-4 py-2 transition-colors ${
                currentView === 'library'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white border-transparent hover:border-blue-600'
              }`}
            >
              Library
            </button>
            <button
              onClick={() => setCurrentView('test')}
              className={`text-sm rounded-lg border px-4 py-2 transition-colors ${
                currentView === 'test'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white border-transparent hover:border-blue-600'
              }`}
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
          <p className="text-gray-600 text-sm mb-5 dark:text-gray-400">
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
              className="w-full rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm hover:border-blue-600 active:bg-gray-200 dark:active:bg-gray-900/40 cursor-pointer"
            >
              Initialize
            </button>
          </form>
          {initError && (
            <p className="text-red-600 mt-3 dark:text-red-400">{initError}</p>
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
