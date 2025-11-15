import { useEffect, useRef } from 'react'
import type Phaser from 'phaser'
import { createPhaserGame } from '@/utils/phaserRenderer'
import type { PhaserGameSpec } from '@/types/gameSpec'

interface PhaserGameRendererProps {
  spec: PhaserGameSpec
  onClose: () => void
}

export function PhaserGameRenderer({ spec, onClose }: PhaserGameRendererProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameInstanceRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!gameContainerRef.current) return

    // Create the game
    try {
      gameInstanceRef.current = createPhaserGame(spec, gameContainerRef.current)
    } catch (error) {
      console.error('Failed to create Phaser game:', error)
    }

    // Cleanup on unmount
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true)
        gameInstanceRef.current = null
      }
    }
  }, [spec])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-[95vw] max-h-[95vh] overflow-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-300 dark:border-gray-600">
          <div>
            <h3 className="text-xl font-semibold">{spec.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {spec.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:text-red-600 transition-colors"
            aria-label="Close game"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex justify-center items-center">
          <div ref={gameContainerRef} className="border-2 border-gray-300 dark:border-gray-600 rounded" />
        </div>

        <div className="p-4 border-t border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
          <div className="mb-2">
            <strong>Controls:</strong>
            {spec.controls_description.length > 0 ? (
              <ul className="list-disc list-inside ml-2">
                {spec.controls_description.map((control, i) => (
                  <li key={i}>{control}</li>
                ))}
              </ul>
            ) : (
              <span className="ml-2">Use keyboard to interact</span>
            )}
          </div>
          {spec.key_concepts.length > 0 && (
            <div>
              <strong>Key Concepts:</strong>
              <span className="ml-2">{spec.key_concepts.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
