import { useState, useEffect, memo } from 'react'
import { useThrottledDebounce } from '@/hooks/useThrottledDebounce'
import { highlightCode } from '@/highlighter'

interface CodeBlockProps {
  className?: string
  children: React.ReactNode
}

const PRE_CLASS = 'overflow-x-auto p-2 rounded-md scrollbar-thin scrollbar-thumb-gray-800'

const escapeHtml = (html: string) =>
  html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

// Memoized component to prevent re-renders when HTML hasn't changed
const HighlightedCode = memo(({ html }: { html: string }) => {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
})

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [html, setHtml] = useState<string>('')
  const [error, setError] = useState<Error | null>(null)

  const lang = className?.replace(/^lang-/, '') || 'text'
  const rawCode = String(children)

  // Split into complete lines and incomplete line
  const hasIncompleteLastLine = rawCode.length > 0 && !rawCode.endsWith('\n')
  const lastNewlineIndex = rawCode.lastIndexOf('\n')

  const completeLines =
    hasIncompleteLastLine && lastNewlineIndex >= 0
      ? rawCode.slice(0, lastNewlineIndex + 1)
      : rawCode

  const incompleteLine =
    hasIncompleteLastLine && lastNewlineIndex >= 0
      ? rawCode.slice(lastNewlineIndex + 1)
      : ''

  const code = useThrottledDebounce(completeLines)

  useEffect(() => {
    // Don't highlight if there's no complete code
    if (!code) {
      setHtml('')
      return
    }

    const abortController = new AbortController()
    setError(null)

    highlightCode(code, lang, true, PRE_CLASS, abortController.signal)
      .then((result) => {
        if (!abortController.signal.aborted) {
          setHtml(result)
          setError(null)
        }
      })
      .catch((err) => {
        // Ignore abort errors
        if (err instanceof DOMException && err.message === 'Request aborted') {
          return
        }
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
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
    <div className="relative pb-4">
      {html ? (
        <div>
          <HighlightedCode html={html} />
          {incompleteLine && (
            <pre className={PRE_CLASS}>
              <code>
                <span className="line">{escapeHtml(incompleteLine)}</span>
              </code>
            </pre>
          )}
        </div>
      ) : (
        <pre className={className}>
          <code>{escapeHtml(rawCode)}</code>
        </pre>
      )}
    </div>
  )
}
