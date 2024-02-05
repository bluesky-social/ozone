import { useEffect, useState } from 'react'

export const isDarkModeEnabled = () => {
  if (typeof window === 'undefined') return false
  return (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  )
}

export const useColorScheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const addClassName = () => {
    if (isDarkModeEnabled()) {
      document.documentElement.classList.add('dark')
      setTheme('dark')
    } else {
      document.documentElement.classList.remove('dark')
      setTheme('light')
    }
  }
  useEffect(() => {
    addClassName()
  }, [])

  return {
    theme,
    toggleTheme: () => {
      localStorage.theme = localStorage.theme === 'dark' ? 'light' : 'dark'
      addClassName()
    },
  }
}
