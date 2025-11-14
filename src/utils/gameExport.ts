/**
 * Downloads game HTML as a file
 */
export function downloadGame(htmlCode: string, filename = 'game.html'): void {
  const blob = new Blob([htmlCode], { type: 'text/html' })
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
 * Extracts HTML code from markdown code blocks
 */
export function extractCodeFromMarkdown(content: string): string | null {
  // Try to extract code from ```html blocks
  const htmlMatch = content.match(/```html\n([\s\S]*?)```/)
  if (htmlMatch) {
    return htmlMatch[1].trim()
  }

  // Try generic code blocks
  const genericMatch = content.match(/```\n([\s\S]*?)```/)
  if (genericMatch) {
    const code = genericMatch[1].trim()
    const lowerCode = code.toLowerCase()
    // Check if it looks like HTML
    if (lowerCode.includes('<!doctype') || lowerCode.includes('<html')) {
      return code
    }
  }

  // If no code block, check if the content looks like HTML
  const lowerContent = content.toLowerCase()
  if (lowerContent.includes('<!doctype') ||
      (lowerContent.includes('<html') && lowerContent.includes('</html>'))) {
    return content.trim()
  }

  return null
}
