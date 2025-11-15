import {
  isErrorResponse,
  type HighlightRequest,
  type HighlightResponse,
} from './types/highlighter'

interface PendingRequest {
  resolve: (html: string) => void
  reject: (error: Error) => void
  abortController: AbortController
}

class HighlighterService {
  private worker: Worker | null = null
  private requestId = 0
  private pendingRequests = new Map<number, PendingRequest>()

  private initWorker(): void {
    if (this.worker) return

    this.worker = new Worker(
      new URL('./workers/highlighter.ts', import.meta.url),
      { type: 'module' },
    )

    this.worker.onmessage = (e: MessageEvent<HighlightResponse>) => {
      const response = e.data
      const pending = this.pendingRequests.get(response.id)

      if (!pending) return

      // Don't process if request was aborted
      if (pending.abortController.signal.aborted) {
        this.pendingRequests.delete(response.id)
        return
      }

      if (isErrorResponse(response)) {
        pending.reject(new Error(response.error))
      } else {
        pending.resolve(response.html)
      }

      this.pendingRequests.delete(response.id)
    }

    this.worker.onerror = (error) => {
      console.error('Worker error:', error)
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject }) => {
        reject(new Error('Worker error'))
      })
      this.pendingRequests.clear()
    }
  }

  public async highlight(
    code: string,
    lang: string,
    dark: boolean,
    preClass?: string,
    signal?: AbortSignal,
  ): Promise<string> {
    this.initWorker()

    const id = this.requestId++
    const abortController = new AbortController()

    // If external signal provided, forward abort
    if (signal) {
      signal.addEventListener('abort', () => {
        abortController.abort()
        const pending = this.pendingRequests.get(id)
        if (pending) {
          this.pendingRequests.delete(id)
          pending.reject(new DOMException('Request aborted'))
        }
      })
    }

    return new Promise<string>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, abortController })

      const request: HighlightRequest = { id, code, lang, dark, preClass }
      this.worker!.postMessage(request)

      // Optional: Add timeout
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Highlight request timeout'))
        }
      }, 10000)

      // Clear timeout when request completes/aborts
      abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeout)
      })
    })
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.pendingRequests.clear()
    }
  }
}

// Singleton instance
export const highlighter = new HighlighterService()

// Convenience exports
export const highlightCode = (
  code: string,
  lang: string,
  dark: boolean = true,
  preClass?: string,
  signal?: AbortSignal,
) => highlighter.highlight(code, lang, dark, preClass, signal)

export const terminateHighlighter = () => highlighter.terminate()
