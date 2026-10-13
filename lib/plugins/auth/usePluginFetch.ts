'use client'

import { useMemo } from 'react'

import { usePdsAgent } from '@/shell/AuthContext'
import { useConfigContext } from '@/shell/ConfigContext'
import { createPluginFetch } from './client'

export function usePluginFetch() {
  const pdsAgent = usePdsAgent()
  const { config } = useConfigContext()

  return useMemo(
    () => createPluginFetch(pdsAgent, config.did),
    [pdsAgent, config.did],
  )
}
