import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useChatStore, ChatMessage } from '../store/useChatStore'
import { downloadGame, extractCodeFromMarkdown } from '../utils/gameExport'
import { Markdown } from './Markdown'
import { GamePreview } from './GamePreview'

interface GameTemplate {
  name: string
  description: string
  code: string
}

export function GameBuilderTest() {
  const [templates, setTemplates] = useState<[string, string, string][] | null>(
    null,
  )
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(
    null,
  )
  const [isGameBuilderMode, setIsGameBuilderMode] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState<string>('')
  const [previewCode, setPreviewCode] = useState<string | null>(null)

  const {
    messages,
    input,
    setInput,
    streamingResponse,
    isStreaming,
    error,
    sendStreamingMessage,
    clearChat,
    setMessages,
  } = useChatStore()

  // Load templates on mount
  useEffect(() => {
    invoke<[string, string, string][]>('get_game_template_list')
      .then(setTemplates)
      .catch(console.error)
  }, [])

  // Load system prompt when entering game builder mode
  useEffect(() => {
    if (isGameBuilderMode && !systemPrompt) {
      invoke<string>('get_game_builder_prompt')
        .then(setSystemPrompt)
        .catch(console.error)
    }
  }, [isGameBuilderMode, systemPrompt])

  const loadTemplate = async (key: string) => {
    try {
      const template = await invoke<GameTemplate>('get_game_template', { key })
      setSelectedTemplate(template)
    } catch (err) {
      console.error('Failed to load template:', err)
    }
  }

  const toggleGameBuilderMode = () => {
    if (!isGameBuilderMode) {
      // Entering game builder mode
      clearChat()
      setIsGameBuilderMode(true)
    } else {
      // Exiting game builder mode
      setIsGameBuilderMode(false)
      setSelectedTemplate(null)
    }
  }

  const handleSendMessage = async () => {
    if (!isGameBuilderMode) {
      await sendStreamingMessage()
      return
    }

    // In game builder mode, prepend system prompt
    const systemMessage: ChatMessage = {
      role: 'system',
      content: systemPrompt,
    }

    // Temporarily inject system message
    const currentMessages = [...messages]
    if (currentMessages.length === 0 || currentMessages[0].role !== 'system') {
      setMessages([systemMessage, ...currentMessages])
    }

    await sendStreamingMessage()
  }

  const saveTemplate = () => {
    if (!selectedTemplate) return

    const filename = `${selectedTemplate.name.toLowerCase().replace(/\s+/g, '-')}.html`
    downloadGame(selectedTemplate.code, filename)
  }

  const previewGame = (code: string) => {
    setPreviewCode(code)
  }

  const closePreview = () => {
    setPreviewCode(null)
  }

  const previewLatestGame = () => {
    // Find the last assistant message with code
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        const code = extractCodeFromMarkdown(messages[i].content)
        if (code) {
          previewGame(code)
          return
        }
      }
    }
    // Also check streaming response
    if (streamingResponse) {
      const code = extractCodeFromMarkdown(streamingResponse)
      if (code) {
        previewGame(code)
      }
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Game Builder Test Interface</h2>
        <button
          onClick={toggleGameBuilderMode}
          className={`rounded-lg border border-transparent px-5 py-3 text-base font-medium transition-colors shadow-sm cursor-pointer ${
            isGameBuilderMode
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isGameBuilderMode
            ? 'Exit Game Builder Mode'
            : 'Enter Game Builder Mode'}
        </button>
      </div>

      {isGameBuilderMode && (
        <div className="mb-5 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <p className="text-sm">
            <strong>Game Builder Mode Active:</strong> Your messages will
            include the Phaser game builder system prompt automatically.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="md:col-span-2">
          <h3 className="text-xl font-semibold mb-3">Chat</h3>

          <div className="min-h-[400px] max-h-[600px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-5 mb-5 bg-white dark:bg-gray-900">
            {messages
              .filter((msg) => msg.role !== 'system')
              .map((msg, idx) => (
                <div
                  key={idx}
                  className={`mb-4 p-2.5 rounded-md ${
                    msg.role === 'user'
                      ? 'bg-blue-50 dark:bg-blue-900/30 ml-[10%]'
                      : 'bg-gray-100 dark:bg-gray-800 mr-[10%]'
                  }`}
                >
                  <div className="font-bold mb-1">
                    {msg.role === 'user' ? 'You' : 'Claude'}
                  </div>
                  <Markdown content={msg.content} />
                </div>
              ))}

            {streamingResponse && (
              <div className="mb-4 p-2.5 rounded-md bg-gray-100 dark:bg-gray-800 mr-[10%]">
                <div className="font-bold mb-1">Claude</div>
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
              placeholder={
                isGameBuilderMode
                  ? 'Describe the game you want to build...'
                  : 'Type your message...'
              }
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
            <button
              type="button"
              onClick={previewLatestGame}
              className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm cursor-pointer"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={clearChat}
              className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm hover:border-blue-600 active:bg-gray-200 dark:active:bg-gray-900/40 cursor-pointer"
            >
              Clear
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-3">Templates</h3>

          <div className="space-y-3">
            {templates?.map(([key, name, description]) => (
              <div
                key={key}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900"
              >
                <h4 className="font-semibold mb-1">{name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {description}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const template = await invoke<GameTemplate>(
                        'get_game_template',
                        { key },
                      )
                      previewGame(template.code)
                    }}
                    className="text-sm rounded border border-transparent px-3 py-1.5 text-white bg-green-600 hover:bg-green-700 cursor-pointer"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => loadTemplate(key)}
                    className="text-sm rounded border border-transparent px-3 py-1.5 text-gray-900 bg-gray-100 dark:text-white dark:bg-gray-800 hover:border-blue-600 cursor-pointer"
                  >
                    View Code
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedTemplate && (
            <div className="mt-5 border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">{selectedTemplate.name}</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => previewGame(selectedTemplate.code)}
                    className="text-sm rounded border border-transparent px-3 py-1.5 text-white bg-green-600 hover:bg-green-700 cursor-pointer"
                  >
                    Preview
                  </button>
                  <button
                    onClick={saveTemplate}
                    className="text-sm rounded border border-transparent px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              </div>
              <pre className="text-xs overflow-auto max-h-[300px] bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <code>{selectedTemplate.code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {previewCode && <GamePreview code={previewCode} onClose={closePreview} />}
    </div>
  )
}
