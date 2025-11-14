import {
  createHighlighter,
  type Highlighter,
  bundledLanguages,
  type BundledLanguage,
  type ShikiTransformer,
} from 'shiki'
import type {
  HighlightRequest,
  HighlightErrorResponse,
  HighlightSuccessResponse,
} from '../types/highlighter'

let highlighter: Highlighter | null = null
let initializationPromise: Promise<void> | null = null

const DARK_THEME = 'github-dark'
const LIGHT_THEME = 'github-light'

type InitializeOptions = {
  language?: string
}

const getTransformersFromPreClass = (preClass?: string): ShikiTransformer[] => {
  if (!preClass) {
    return []
  }
  const preTransformer: ShikiTransformer = {
    pre(node) {
      this.addClassToHast(node, preClass)
      return node
    },
  }
  return [preTransformer]
}

const ensureInitialized = async (options: InitializeOptions) => {
  if (highlighter) {
    return
  }

  highlighter = await createHighlighter({
    themes: [DARK_THEME, LIGHT_THEME],
    langs: options.language ? [options.language] : [],
  })
}

self.onclose = async () => {
  if (highlighter) {
    highlighter.dispose()
    highlighter = null
  }
}

const supportsLanguage = (lang: string): lang is BundledLanguage => {
  return lang in bundledLanguages
}

self.onmessage = async (e: MessageEvent<HighlightRequest>) => {
  const { id, code, lang, dark, preClass } = e.data

  try {
    const isLangSupported = supportsLanguage(lang)
    const language = isLangSupported ? lang : 'text'

    if (initializationPromise) {
      await initializationPromise
    }
    // Initialize highlighter lazily on first use
    initializationPromise = ensureInitialized({ language })
    await initializationPromise

    // Load additional languages/themes as needed
    const loadedLangs = highlighter!.getLoadedLanguages()
    if (isLangSupported && !loadedLangs.includes(lang)) {
      await highlighter!.loadLanguage(lang)
    }

    const theme = dark ? DARK_THEME : LIGHT_THEME

    const transformers = getTransformersFromPreClass(preClass)

    const html = highlighter!.codeToHtml(code, { lang, theme, transformers })

    const response: HighlightSuccessResponse = { id, html }
    self.postMessage(response)
  } catch (error) {
    const response: HighlightErrorResponse = {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    self.postMessage(response)
  }
}
