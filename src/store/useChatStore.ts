import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type { PhaserGameSpec } from '@/types/gameSpec'

export interface ChatMessage {
  id: string
  role: 'assistant' | 'system' | 'user'
  content: string
}

interface ChatStore {
  // AI Initialization state
  apiKey: string
  isInitialized: boolean
  initError: string

  // Chat state
  messages: ChatMessage[]
  input: string
  streamingResponse: string
  isStreaming: boolean
  error: string
  model: string

  // Game Builder state
  systemPrompt: string
  generatedGameSpec: PhaserGameSpec | null

  // AI Initialization actions
  setApiKey: (key: string) => void
  setIsInitialized: (value: boolean) => void
  setInitError: (error: string) => void
  initializeAI: () => Promise<void>

  // Chat actions
  setInput: (value: string) => void
  setMessages: (messages: ChatMessage[]) => void
  setStreamingResponse: (value: string) => void
  appendStreamingResponse: (chunk: string) => void
  setIsStreaming: (value: boolean) => void
  setError: (error: string) => void
  addMessage: (message: ChatMessage) => void
  sendStreamingMessage: () => Promise<void>
  sendNonStreamingMessage: () => Promise<void>
  sendGameBuilderMessage: () => Promise<void>
  clearChat: () => void
  checkInitialization: () => Promise<void>

  // Game Builder actions
  setSystemPrompt: (prompt: string) => void
  setGeneratedGameSpec: (spec: PhaserGameSpec | null) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  apiKey: '',
  isInitialized: false,
  initError: '',
  messages: [],
  input: '',
  streamingResponse: '',
  isStreaming: false,
  error: '',
  model: 'claude-sonnet-4-5-20250929',

  // Game Builder initial state
  systemPrompt: '',
  generatedGameSpec: null,

  // AI Initialization actions
  setApiKey: (key) => set({ apiKey: key }),
  setIsInitialized: (value) => set({ isInitialized: value }),
  setInitError: (error) => set({ initError: error }),

  initializeAI: async () => {
    const { apiKey } = get()
    try {
      set({ initError: '' })
      const result = await invoke<string>('init_ai', { apiKey })
      set({ isInitialized: true })
      console.log(result)
    } catch (err) {
      set({ initError: String(err) })
    }
  },

  checkInitialization: async () => {
    try {
      const initialized = await invoke<boolean>('is_ai_initialized')
      set({ isInitialized: initialized })
    } catch (err) {
      console.error('Failed to check initialization:', err)
    }
  },

  // Chat actions
  setInput: (value) => set({ input: value }),
  setMessages: (messages) => set({ messages }),
  setStreamingResponse: (value) => set({ streamingResponse: value }),
  appendStreamingResponse: (chunk) =>
    set((state) => ({ streamingResponse: state.streamingResponse + chunk })),
  setIsStreaming: (value) => set({ isStreaming: value }),
  setError: (error) => set({ error }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  sendStreamingMessage: async () => {
    const { input, messages, model } = get()
    if (!input.trim()) return

    set({ error: '' })
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    set({
      messages: updatedMessages,
      input: '',
      isStreaming: true,
      streamingResponse: '',
    })

    try {
      await invoke('stream_chat', {
        messages: updatedMessages,
        model,
      })
    } catch (err) {
      set({ error: String(err), isStreaming: false })
    }
  },

  sendNonStreamingMessage: async () => {
    const { input, messages, model } = get()
    if (!input.trim()) return

    set({ error: '' })
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    set({
      messages: updatedMessages,
      input: '',
      isStreaming: true,
    })

    try {
      const response = await invoke<string>('chat_completion', {
        messages: updatedMessages,
        model,
      })

      set({
        messages: [
          ...updatedMessages,
          { id: crypto.randomUUID(), role: 'assistant', content: response },
        ],
        isStreaming: false,
      })
    } catch (err) {
      set({ error: String(err), isStreaming: false })
    }
  },

  sendGameBuilderMessage: async () => {
    const { input, messages, model } = get()
    if (!input.trim()) return

    set({ error: '' })
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    set({
      messages: updatedMessages,
      input: '',
      isStreaming: true,
      streamingResponse: '',
    })

    try {
      await invoke('stream_game_builder', {
        messages: updatedMessages,
        model,
      })
    } catch (err) {
      set({ error: String(err), isStreaming: false })
    }
  },

  clearChat: () =>
    set({
      messages: [],
      streamingResponse: '',
      error: '',
    }),

  // Game Builder actions
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  setGeneratedGameSpec: (spec) => set({ generatedGameSpec: spec }),
}))
