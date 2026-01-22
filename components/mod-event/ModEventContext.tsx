'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { ModEventViewWithDetails } from './useModEventList'

interface ModEventContextType {
  modEvents: ModEventViewWithDetails[]
  setModEvents: (events: ModEventViewWithDetails[]) => void
}

export const ModEventContext = createContext<ModEventContextType | undefined>(
  undefined,
)

export const ModEventProvider = ({ children }: { children: ReactNode }) => {
  const [modEvents, setModEvents] = useState<ModEventViewWithDetails[]>([])

  return (
    <ModEventContext.Provider value={{ modEvents, setModEvents }}>
      {children}
    </ModEventContext.Provider>
  )
}

export const useModEventContext = () => {
  const context = useContext(ModEventContext)
  if (context === undefined) {
    throw new Error(
      'useModEventContext must be used within a ModEventContextProvider',
    )
  }
  return context
}
