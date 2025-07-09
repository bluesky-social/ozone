'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface ModToolContextType {
  showModToolMeta: boolean
  setShowModToolMeta: (show: boolean) => void
}

const ModToolContext = createContext<ModToolContextType | undefined>(undefined)

export const ModToolProvider = ({ children }: { children: ReactNode }) => {
  const [showModToolMeta, setShowModToolMeta] = useState(false)

  return (
    <ModToolContext.Provider value={{ showModToolMeta, setShowModToolMeta }}>
      {children}
    </ModToolContext.Provider>
  )
}

export const useModToolContext = () => {
  const context = useContext(ModToolContext)
  if (context === undefined) {
    throw new Error('useModToolContext must be used within a ModToolProvider')
  }
  return context
}