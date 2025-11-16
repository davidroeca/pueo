import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useChatStore, ChatMessage } from '@/store/useChatStore'
import { Markdown } from '@/components/Markdown'
import { PhaserGameRenderer } from '@/components/PhaserGameRenderer'

export function GameBuilder() {
  const [showGameRenderer, setShowGameRenderer] = useState(false)
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
  } = useChatStore()


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
      <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-3">Chat</h3>

          <div className="min-h-[400px] max-h-[600px] text-left overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-5 mb-5 bg-white dark:bg-gray-900">
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

            {streamingResponse && (
              <div className="mb-4 p-2.5 rounded-md bg-gray-100 dark:bg-gray-800 mr-[10%]">
                <div className="font-bold mb-1">Assistant</div>
                <Markdown content={streamingResponse} />
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
              handleSendMessage()
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'Describe the game you want to build...'}
              disabled={isStreaming}
              className="flex-1 rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming}
              className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm hover:border-blue-600 active:bg-gray-200 dark:active:bg-gray-900/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
            {generatedGameSpec && (
              <>
                <button
                  type="button"
                  onClick={() => setShowGameRenderer(true)}
                  className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm cursor-pointer"
                >
                  Play Game
                </button>
                <button
                  type="button"
                  onClick={saveGame}
                  className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                  Save Game
                </button>
              </>
            )}
            <button
              type="button"
              onClick={clearChat}
              className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm hover:border-blue-600 active:bg-gray-200 dark:active:bg-gray-900/40 cursor-pointer"
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
