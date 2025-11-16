import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { PhaserGameRenderer } from '@/components/PhaserGameRenderer'
import type { GameSummary, PhaserGameSpec } from '@/types/gameSpec'

export function GameLibrary() {
  const [games, setGames] = useState<GameSummary[]>([])
  const [filteredGames, setFilteredGames] = useState<GameSummary[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState<PhaserGameSpec | null>(null)
  const [showRenderer, setShowRenderer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load games on mount
  useEffect(() => {
    loadGames()
  }, [])

  // Filter games when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGames(games)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = games.filter(
        (game) =>
          game.title.toLowerCase().includes(query) ||
          game.description.toLowerCase().includes(query)
      )
      setFilteredGames(filtered)
    }
  }, [searchQuery, games])

  const loadGames = async () => {
    try {
      setLoading(true)
      setError('')
      const gameList = await invoke<GameSummary[]>('list_games')
      setGames(gameList)
      setFilteredGames(gameList)
    } catch (err) {
      setError(String(err))
      console.error('Failed to load games:', err)
    } finally {
      setLoading(false)
    }
  }

  const playGame = async (gameId: string) => {
    try {
      const game = await invoke<{ spec: PhaserGameSpec }>('get_game', { id: gameId })
      setSelectedGame(game.spec)
      setShowRenderer(true)
    } catch (err) {
      alert(`Failed to load game: ${err}`)
      console.error('Failed to load game:', err)
    }
  }

  const deleteGame = async (gameId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }

    try {
      await invoke('delete_game', { id: gameId })
      await loadGames()
    } catch (err) {
      alert(`Failed to delete game: ${err}`)
      console.error('Failed to delete game:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-5 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Game Library</h2>
        <button
          onClick={loadGames}
          disabled={loading}
          className="rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-gray-900 bg-white dark:text-white dark:bg-gray-900/60 transition-colors shadow-sm hover:border-blue-600 cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search games by title or description..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-base bg-white dark:bg-gray-900 transition-colors shadow-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredGames.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          {searchQuery ? 'No games found matching your search.' : 'No games yet. Create one in the Game Builder!'}
        </div>
      )}

      {/* Game grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-2">{game.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {game.description}
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              Created: {formatDate(game.created_at)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => playGame(game.id)}
                className="flex-1 text-sm rounded border border-transparent px-3 py-2 text-white bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer"
              >
                Play
              </button>
              <button
                onClick={() => deleteGame(game.id, game.title)}
                className="text-sm rounded border border-transparent px-3 py-2 text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Game renderer modal */}
      {showRenderer && selectedGame && (
        <PhaserGameRenderer
          spec={selectedGame}
          onClose={() => {
            setShowRenderer(false)
            setSelectedGame(null)
          }}
        />
      )}
    </div>
  )
}
