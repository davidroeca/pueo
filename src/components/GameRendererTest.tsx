import { useState } from 'react'
import { PhaserGameRenderer } from './PhaserGameRenderer'
import { samplePlatformer, sampleDodger } from '@/utils/sampleGames'
import type { PhaserGameSpec } from '@/types/gameSpec'

export function GameRendererTest() {
  const [activeGame, setActiveGame] = useState<PhaserGameSpec | null>(null)

  return (
    <div className="max-w-[800px] mx-auto p-10">
      <h2 className="text-2xl font-bold mb-5">Test Phaser Renderer</h2>

      <div className="space-y-4">
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900">
          <h3 className="text-xl font-semibold mb-2">
            {samplePlatformer.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {samplePlatformer.description}
          </p>
          <button
            onClick={() => setActiveGame(samplePlatformer)}
            className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            Play Platformer
          </button>
        </div>

        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900">
          <h3 className="text-xl font-semibold mb-2">{sampleDodger.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {sampleDodger.description}
          </p>
          <button
            onClick={() => setActiveGame(sampleDodger)}
            className="rounded-lg border border-transparent px-5 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            Play Dodger
          </button>
        </div>
      </div>

      {activeGame && (
        <PhaserGameRenderer
          spec={activeGame}
          onClose={() => setActiveGame(null)}
        />
      )}
    </div>
  )
}
