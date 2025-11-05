import { useEffect, useRef } from 'react'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { Streamdown } from 'streamdown'
import { useChatStore } from './store/useChatStore'

function App() {
  const {
    apiKey,
    setApiKey,
    isInitialized,
    initError,
    messages,
    input,
    setInput,
    streamingResponse,
    isStreaming,
    error,
    initializeAI,
    sendStreamingMessage,
    sendNonStreamingMessage,
    clearChat,
    checkInitialization,
    appendStreamingResponse,
    setStreamingResponse,
    setIsStreaming,
    addMessage,
    setError,
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
        console.log('chat-token', event.payload)
      })

      const unlistenFinalResponse = await listen<string>(
        'chat-final-response',
        (event) => {
          // When we receive the final response, add it to messages immediately
          const finalContent = event.payload
          console.log('final-content', event.payload)
          addMessage({ role: 'assistant', content: finalContent })
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
    <main className="m-0 pt-[10vh] flex flex-col justify-center text-center">
      <h1 className="text-center">Claude Chat via Rig</h1>

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
        <div className="max-w-[800px] mx-auto px-5">
          <div className="mb-5 text-right">
            <button
              onClick={clearChat}
              className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm hover:border-blue-600 active:bg-gray-200 dark:active:bg-gray-900/40 cursor-pointer"
            >
              Clear Chat
            </button>
          </div>

          <div className="min-h-[400px] max-h-[600px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-5 mb-5 bg-white dark:bg-gray-900 text-left">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 p-2.5 rounded-md ${
                  msg.role === 'user'
                    ? 'bg-blue-50 dark:bg-blue-900/30 ml-[20%]'
                    : 'bg-gray-100 dark:bg-gray-800 mr-[20%]'
                }`}
              >
                <div className="font-bold mb-1">
                  {msg.role === 'user' ? 'You' : 'Claude'}
                </div>
                <Streamdown>{msg.content}</Streamdown>
              </div>
            ))}

            {streamingResponse && (
              <div className="mb-4 p-2.5 rounded-md bg-gray-100 dark:bg-gray-800 mr-[20%]">
                <div className="font-bold mb-1">Claude</div>
                <Streamdown isAnimating={isStreaming}>
                  {streamingResponse}
                </Streamdown>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-600 mb-3 dark:text-red-400">
              Error: {error}
            </p>
          )}

          <form
            className="flex gap-2.5 items-center"
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
              className="flex-1 rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming}
              className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm hover:border-blue-600 active:bg-gray-200 dark:active:bg-gray-900/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stream
            </button>
            <button
              type="button"
              onClick={sendNonStreamingMessage}
              disabled={isStreaming}
              className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm hover:border-blue-600 active:bg-gray-200 dark:active:bg-gray-900/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
