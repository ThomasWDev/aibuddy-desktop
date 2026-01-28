import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'darker' | 'system'
export type FontSize = 'small' | 'medium' | 'large'

interface ThemeSettings {
  theme: Theme
  fontSize: FontSize
}

const fontSizeMap: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px'
}

const themeColors: Record<Theme, { bg: string; bgAlt: string; border: string }> = {
  dark: { bg: '#0f172a', bgAlt: '#1e293b', border: '#334155' },
  darker: { bg: '#030712', bgAlt: '#111827', border: '#1f2937' },
  system: { bg: '#0f172a', bgAlt: '#1e293b', border: '#334155' } // Defaults to dark
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [fontSize, setFontSizeState] = useState<FontSize>('medium')

  useEffect(() => {
    // Load saved settings
    const electronAPI = (window as any).electronAPI
    if (electronAPI) {
      electronAPI.store.get('themeSettings').then((settings: ThemeSettings | undefined) => {
        if (settings) {
          setThemeState(settings.theme || 'dark')
          setFontSizeState(settings.fontSize || 'medium')
          applyTheme(settings.theme || 'dark')
          applyFontSize(settings.fontSize || 'medium')
        }
      })
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    const body = document.body
    
    // Apply theme-specific colors
    let colors = themeColors[newTheme]
    
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      colors = prefersDark ? themeColors.dark : themeColors.dark // Always dark for now
    }
    
    body.style.setProperty('--theme-bg', colors.bg)
    body.style.setProperty('--theme-bg-alt', colors.bgAlt)
    body.style.setProperty('--theme-border', colors.border)
    body.style.background = colors.bg
    
    root.classList.remove('theme-dark', 'theme-darker')
    root.classList.add(`theme-${newTheme === 'system' ? 'dark' : newTheme}`)
  }

  const applyFontSize = (newSize: FontSize) => {
    document.documentElement.style.fontSize = fontSizeMap[newSize]
  }

  const changeTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    saveSettings({ theme: newTheme, fontSize })
  }

  const changeFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize)
    applyFontSize(newSize)
    saveSettings({ theme, fontSize: newSize })
  }

  const saveSettings = (settings: ThemeSettings) => {
    const electronAPI = (window as any).electronAPI
    if (electronAPI) {
      electronAPI.store.set('themeSettings', settings)
    }
  }

  return { 
    theme, 
    setTheme: changeTheme, 
    fontSize, 
    setFontSize: changeFontSize 
  }
}

