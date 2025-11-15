import { useState, useEffect, memo } from 'react'
import { useThrottledDebounce } from '@/hooks/useThrottledDebounce'
import { highlightCode } from '@/highlighter'

interface CodeBlockProps {
  className?: string
  children: React.ReactNode
}

// Memoized component to prevent re-renders when HTML hasn't changed
const HighlightedCode = memo(({ html }: { html: string }) => {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
})

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [html, setHtml] = useState<string>('')
  const [isHighlighting, setIsHighlighting] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const lang = className?.replace(/^lang-/, '') || 'text'
  const code = useThrottledDebounce(String(children).trim())
  useEffect(() => {
    const abortController = new AbortController()
    setIsHighlighting(true)
    setError(null)

    highlightCode(code, lang, true, 'overflow-x-auto p-2 rounded-sm', abortController.signal)
      .then((result) => {
        if (!abortController.signal.aborted) {
          setHtml(result)
          setError(null)
        }
      })
      .catch((err) => {
        // Ignore abort errors
        if (err.message === 'Request aborted') {
          return
        }
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsHighlighting(false)
        }
      })

    return () => {
      abortController.abort()
    }
  }, [code, lang])

  // Show error fallback
  if (error) {
    return (
      <pre className={className}>
        <code>{children}</code>
      </pre>
    )
  }

  // Show previous highlighted version (or raw code if first load)
  // with optional loading indicator
  return (
    <div className="relative">
      {html ? (
        <HighlightedCode html={html} />
      ) : (
        <pre className={className}>
          <code>{children}</code>
        </pre>
      )}
      {isHighlighting && html && (
        <div className="absolute top-1 right-1 opacity-50">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}
