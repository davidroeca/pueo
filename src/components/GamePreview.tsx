import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

interface GamePreviewProps {
  code: string
  onClose: () => void
}

export function GamePreview({ code, onClose }: GamePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create a sandbox environment for the game code
    const executeGameCode = () => {
      try {
        // Create a wrapper function that modifies the game config to include our container
        const gameFunction = new Function('Phaser', 'parentContainer', `
          // Intercept the Phaser.Game constructor to add our parent element
          const OriginalGame = Phaser.Game;
          const wrappedGame = function(config) {
            // Inject the parent element into the config
            config.parent = parentContainer;
            return new OriginalGame(config);
          };

          // Temporarily replace Phaser.Game
          Phaser.Game = wrappedGame;

          ${code}

          // Restore original
          Phaser.Game = OriginalGame;

          // Return the game instance if it was created
          return typeof game !== 'undefined' ? game : null;
        `)

        // Execute the game code and get the game instance
        const gameInstance = gameFunction(Phaser, containerRef.current)

        if (gameInstance) {
          gameRef.current = gameInstance
        } else {
          console.warn('Game instance not found - cleanup may not work properly')
        }
      } catch (error) {
        console.error('Error executing game code:', error)
        // Show error to user
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding: 20px; color: #ff6b6b;">
              <strong>Error loading game:</strong><br/>
              ${error instanceof Error ? error.message : String(error)}
            </div>
          `
        }
      }
    }

    executeGameCode()

    // Cleanup function
    return () => {
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true)
          gameRef.current = null
        } catch (error) {
          console.error('Error destroying game:', error)
        }
      }

      // Clean up any remaining canvas elements
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [code])

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
          <div
            ref={containerRef}
            className="flex justify-center items-center bg-gray-100 dark:bg-gray-800 rounded min-h-[600px]"
            style={{ minWidth: '800px' }}
          />
        </div>

        <div className="p-4 border-t border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Controls:</strong> Use arrow keys or click/tap to interact.
            Refresh may be needed to restart the game.
          </p>
        </div>
      </div>
    </div>
  )
}
