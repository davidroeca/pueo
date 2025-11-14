interface GamePreviewProps {
  code: string
  onClose: () => void
}

export function GamePreview({ code, onClose }: GamePreviewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-[900px] max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-300 dark:border-gray-600">
          <h3 className="text-xl font-semibold">Game Preview</h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:text-red-600 transition-colors"
            aria-label="Close preview"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          <iframe
            srcDoc={code}
            className="border-0 bg-gray-100 dark:bg-gray-800 rounded"
            style={{ width: '800px', height: '600px' }}
            title="Game Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        <div className="p-4 border-t border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Controls:</strong> Use arrow keys or click/tap to interact.
            Close and reopen the preview to restart the game.
          </p>
        </div>
      </div>
    </div>
  )
}
