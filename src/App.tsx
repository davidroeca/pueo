import { useEffect, useRef, useState } from 'react'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { useChatStore } from '@/store/useChatStore'
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
  } = useChatStore()

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

      const unlistenFinalResponse = await listen<string>(
        'chat-final-response',
        (event) => {
          // When we receive the final response, add it to messages immediately
          const finalContent = event.payload

          // Try to parse tool calls from the response
          try {
            const parsed = JSON.parse(finalContent)

            // Check if there are tool uses
            if (parsed.content && Array.isArray(parsed.content)) {
              for (const item of parsed.content) {
                if (item.type === 'tool_use' && item.name === 'generate_phaser_game') {
                  // Extract the game spec from the tool call
                  const gameSpec = item.input as PhaserGameSpec
                  setGeneratedGameSpec(gameSpec)
                  console.log('Game spec generated:', gameSpec)
                }
              }
            }
          } catch (e) {
            // If parsing fails, it's probably just a text response
            console.log('Not a tool call response:', e)
          }

          addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: finalContent,
          })
          setStreamingResponse('')
          setIsStreaming(false)
        },
      )

      // Listen for stream completion (just cleanup, message already added by final-response)
      const unlistenComplete = await listen('chat-complete', () => {
        // Just ensure streaming state is cleaned up
        setIsStreaming(false)
        setStreamingResponse('')
      })

      // Listen for errors
      const unlistenError = await listen<string>('chat-error', (event) => {
        setError(event.payload)
        setIsStreaming(false)
        setStreamingResponse('')
      })

      unlisten = [
        unlistenToken,
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
