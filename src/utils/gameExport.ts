/**
 * Wraps JavaScript game code in an HTML template with Phaser CDN
 */
export function wrapGameInHTML(jsCode: string, title = 'Phaser Game'): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <script>
${jsCode}
    </script>
</body>
</html>`
}

/**
 * Downloads game code as an HTML file
 */
export function downloadGame(jsCode: string, filename = 'game.html'): void {
  const html = wrapGameInHTML(jsCode)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Extracts JavaScript code from markdown code blocks
 */
export function extractCodeFromMarkdown(content: string): string | null {
  // Try to extract code from ```javascript or ```js blocks
  const jsMatch = content.match(/```(?:javascript|js)\n([\s\S]*?)```/)
  if (jsMatch) {
    return jsMatch[1].trim()
  }

  // Try generic code blocks
  const genericMatch = content.match(/```\n([\s\S]*?)```/)
  if (genericMatch) {
    return genericMatch[1].trim()
  }

  // If no code block, check if the content looks like JavaScript
  if (content.includes('const game = new Phaser.Game') ||
      content.includes('Phaser.AUTO')) {
    return content.trim()
  }

  return null
}
