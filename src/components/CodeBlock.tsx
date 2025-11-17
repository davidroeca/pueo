import { useState, useEffect, memo } from 'react'
import { useThrottledDebounce } from '@/hooks/useThrottledDebounce'
import { highlightCode } from '@/highlighter'
import { useSettingsStore } from '@/store/useSettingsStore'

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
  const { theme } = useSettingsStore()

  const lang = className?.replace(/^lang-/, '') || 'text'
  const rawCode = String(children)

  // Check if this is inline code (no className means inline)
  const isInline = !className

  // For inline code, render it with simple styling
  if (isInline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono">
        {children}
      </code>
    )
  }

  // Extract only complete lines (ending with \n)
  const lastNewlineIndex = rawCode.lastIndexOf('\n')
  const completeLines = lastNewlineIndex >= 0
    ? rawCode.slice(0, lastNewlineIndex + 1)
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

    const isDark = theme === 'dark'
    highlightCode(code, lang, isDark, PRE_CLASS, abortController.signal)
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
  }, [code, lang, theme])

  // Show error fallback
  if (error) {
    return (
      <pre className={className}>
        <code>{children}</code>
      </pre>
    )
  }

  // Show highlighted code (only complete lines)
  return (
    <div className="relative pb-4">
      {html ? (
        <HighlightedCode html={html} />
      ) : (
        <pre className={className}>
          <code>{escapeHtml(completeLines)}</code>
        </pre>
      )}
    </div>
  )
}
