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
          h1: {
            props: {
              className: 'text-3xl font-bold mb-4 mt-6 text-gray-900 dark:text-gray-100',
            },
          },
          h2: {
            props: {
              className: 'text-2xl font-bold mb-3 mt-5 text-gray-900 dark:text-gray-100',
            },
          },
          h3: {
            props: {
              className: 'text-xl font-semibold mb-2 mt-4 text-gray-900 dark:text-gray-100',
            },
          },
          h4: {
            props: {
              className: 'text-lg font-semibold mb-2 mt-3 text-gray-900 dark:text-gray-100',
            },
          },
          p: {
            props: {
              className: 'mb-3 text-gray-900 dark:text-gray-100 leading-relaxed',
            },
          },
          a: {
            props: {
              className: 'text-blue-600 dark:text-blue-400 hover:underline',
            },
          },
          ul: {
            props: {
              className: 'list-disc list-inside mb-3 text-gray-900 dark:text-gray-100',
            },
          },
          ol: {
            props: {
              className: 'list-decimal list-inside mb-3 text-gray-900 dark:text-gray-100',
            },
          },
          li: {
            props: {
              className: 'mb-1',
            },
          },
          blockquote: {
            props: {
              className: 'border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-3 text-gray-700 dark:text-gray-300',
            },
          },
          strong: {
            props: {
              className: 'font-bold text-gray-900 dark:text-gray-100',
            },
          },
          em: {
            props: {
              className: 'italic text-gray-900 dark:text-gray-100',
            },
          },
          code: {
            component: CodeBlock,
          },
          pre: {
            props: {
              className: 'mb-3',
            },
          },
          hr: {
            props: {
              className: 'my-6 border-gray-300 dark:border-gray-600',
            },
          },
          table: {
            props: {
              className: 'min-w-full divide-y divide-gray-300 dark:divide-gray-600 mb-3',
            },
          },
          thead: {
            props: {
              className: 'bg-gray-50 dark:bg-gray-800',
            },
          },
          tbody: {
            props: {
              className: 'divide-y divide-gray-200 dark:divide-gray-700',
            },
          },
          th: {
            props: {
              className: 'px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100',
            },
          },
          td: {
            props: {
              className: 'px-4 py-2 text-sm text-gray-700 dark:text-gray-300',
            },
          },
        },
      }}
    >
      {content}
    </BaseMarkdown>
  )
}
