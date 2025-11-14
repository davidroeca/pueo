import { useState, useEffect } from 'react'
import { highlightCode } from '../highlighter'

interface CodeBlockProps {
  className?: string
  children: React.ReactNode
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const lang = className?.replace(/^lang-/, '') || 'text'
  const code = String(children).trim()

  useEffect(() => {
    let cancelled = false

    highlightCode(code, lang, true, 'overflow-x-auto p-2 rounded-sm')
      .then((result) => {
        if (!cancelled) {
          setHtml(result)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [code, lang])

  return error ? (
    <pre className={className}>
      <code>{children}</code>
    </pre>
  ) : loading ? (
    <pre className={className}>
      <code>{children}</code>
    </pre>
  ) : (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  )
}
