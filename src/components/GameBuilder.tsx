import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useChatStore, ChatMessage } from '@/store/useChatStore'
import { Markdown } from '@/components/Markdown'
import { PhaserGameRenderer } from '@/components/PhaserGameRenderer'

export function GameBuilder() {
  const [showGameRenderer, setShowGameRenderer] = useState(false)
  const [showNewGameNotification, setShowNewGameNotification] = useState(false)
  const previousGameSpecRef = useRef<string | null>(null)
  const {
    messages,
    input,
    setInput,
    streamingResponse,
    isStreaming,
    error,
    sendGameBuilderMessage,
    clearChat,
    setMessages,
    systemPrompt,
    setSystemPrompt,
    generatedGameSpec,
    activeToolCall,
  } = useChatStore()

  // Show notification when a new game spec is generated
  useEffect(() => {
    if (generatedGameSpec) {
      const currentSpecId = generatedGameSpec.title
      if (currentSpecId !== previousGameSpecRef.current) {
        previousGameSpecRef.current = currentSpecId
        setShowNewGameNotification(true)

        // Auto-hide notification after 3 seconds
        const timer = setTimeout(() => {
          setShowNewGameNotification(false)
        }, 3000)

        return () => clearTimeout(timer)
      }
    }
  }, [generatedGameSpec])


  const handleSendMessage = async () => {
    let systemMessage: ChatMessage
    if (systemPrompt) {
      systemMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: systemPrompt,
      }
    } else {
      const newSystemPrompt = await invoke<string>('get_game_builder_prompt')
      setSystemPrompt(newSystemPrompt)
      systemMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: newSystemPrompt,
      }
    }

    // Temporarily inject system message
    const currentMessages = [...messages]
    if (currentMessages.length === 0 || currentMessages[0].role !== 'system') {
      setMessages([systemMessage, ...currentMessages])
    }

    await sendGameBuilderMessage()
  }

  const saveGame = async () => {
    if (!generatedGameSpec) return

    try {
      const gameId = await invoke<string>('save_game', { spec: generatedGameSpec })
      alert(`Game saved successfully! ID: ${gameId}`)
    } catch (err) {
      alert(`Failed to save game: ${err}`)
      console.error('Failed to save game:', err)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-10">
      <div className="flex justify-left items-center mb-6">
        <h2 className="text-2xl font-bold">Game Builder Interface</h2>
      </div>

      {/* New game notification */}
      {showNewGameNotification && (
        <div className="fixed top-20 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span className="font-semibold">Game Ready!</span>
          </div>
          <div className="text-sm mt-1">Click "Play Game" to preview</div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-3">Chat</h3>

          <div className="min-h-[400px] max-h-[600px] text-left chat-container mb-5">
            {messages
              .filter((msg) => msg.role !== 'system')
              .map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 p-2.5 rounded-md ${
                    msg.role === 'user'
                      ? 'bg-blue-50 dark:bg-blue-900/30 ml-[10%]'
                      : 'bg-gray-100 dark:bg-gray-800 mr-[10%]'
                  }`}
                >
                  <div className="font-bold mb-1">
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <Markdown content={msg.content} />
                </div>
              ))}

            {activeToolCall && (
              <div className="mb-4 p-2.5 rounded-md bg-purple-50 dark:bg-purple-900/30 mr-[10%] border-l-4 border-purple-500">
                <div className="font-bold mb-1 text-purple-700 dark:text-purple-300">
                  {activeToolCall.name === 'thinking' ? '💭 Thinking...' : '⚙️ Generating Game...'}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400">
                  {activeToolCall.name === 'thinking'
                    ? 'Claude is reasoning about your request...'
                    : 'Extracting game specification and creating playable game...'
                  }
                </div>
              </div>
            )}

            {streamingResponse && (
              <div className="mb-4 p-2.5 rounded-md bg-gray-100 dark:bg-gray-800 mr-[10%]">
                <div className="font-bold mb-1">Assistant</div>
                <Markdown content={streamingResponse} />
              </div>
            )}
          </div>

          {error && (
            <p className="text-error mb-3">
              Error: {error}
            </p>
          )}

          <form
            className="flex gap-2.5 items-center"
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'Describe the game you want to build...'}
              disabled={isStreaming}
              className="flex-1 input"
            />
            <button
              type="submit"
              disabled={isStreaming}
              className="btn"
            >
              Send
            </button>
            {generatedGameSpec && (
              <>
                <button
                  type="button"
                  onClick={() => setShowGameRenderer(true)}
                  className="btn-purple"
                >
                  Play Game
                </button>
                <button
                  type="button"
                  onClick={saveGame}
                  className="btn-primary"
                >
                  Save Game
                </button>
              </>
            )}
            <button
              type="button"
              onClick={clearChat}
              className="btn"
            >
              Clear
            </button>
          </form>
      </div>

      {showGameRenderer && generatedGameSpec && (
        <PhaserGameRenderer
          spec={generatedGameSpec}
          onClose={() => setShowGameRenderer(false)}
        />
      )}
    </div>
  )
}
