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

    highlightCode(
      code,
      lang,
      true,
      'overflow-x-auto p-2 rounded-sm',
      abortController.signal,
    )
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
    <div className="relative">
      {html ? (
        <div>
          <HighlightedCode html={html} />
          {incompleteLine && (
            <pre className="overflow-x-auto p-2 rounded-sm">
              <code>
                <span className="line">{incompleteLine}</span>
              </code>
            </pre>
          )}
        </div>
      ) : (
        <pre className={className}>
          <code>{rawCode}</code>
        </pre>
      )}
    </div>
  )
}
