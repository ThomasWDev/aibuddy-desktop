import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Load saved theme
    const electronAPI = (window as any).electronAPI
    if (electronAPI) {
      electronAPI.store.get('theme').then((savedTheme: Theme | undefined) => {
        if (savedTheme) {
          setTheme(savedTheme)
          applyTheme(savedTheme)
        }
      })
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', newTheme === 'dark')
    }
  }

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    applyTheme(newTheme)
    
    const electronAPI = (window as any).electronAPI
    if (electronAPI) {
      electronAPI.store.set('theme', newTheme)
    }
  }

  return { theme, setTheme: changeTheme }
}

