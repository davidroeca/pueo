import BaseMarkdown from 'markdown-to-jsx'
import { CodeBlock } from '@/components/CodeBlock'

interface BaseMarkdownProps {
  content: string
}

export function Markdown({ content }: BaseMarkdownProps) {
  return (
    <BaseMarkdown
      options={{
        overrides: {
          code: {
            component: CodeBlock,
          },
        },
      }}
    >
      {content}
    </BaseMarkdown>
  )
}
