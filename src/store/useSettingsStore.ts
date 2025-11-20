import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface SettingsStore {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Initialize from system preference on first visit
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          // Update document class
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          return { theme: newTheme }
        }),

      setTheme: (theme) =>
        set(() => {
          // Update document class
          if (theme === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          return { theme }
        }),
    }),
    {
      name: 'settings-storage',
    }
  )
)
