'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useDebounce } from 'react-use'
import { useSyncedState } from '@/lib/useSyncedState'
import { SafelinkConfig, SafelinkView } from './Safelink'

const SafelinkSearchInput = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const [inputValue, setInputValue] = useSyncedState(searchQuery)

  useDebounce(
    () => {
      if (inputValue !== searchQuery) {
        const newParams = new URLSearchParams(searchParams)
        if (inputValue) {
          newParams.set('search', inputValue)
        } else {
          newParams.delete('search')
        }
        router.push(`/configure?${newParams.toString()}`, { scroll: false })
      }
    },
    300,
    [inputValue],
  )

  return { searchQuery: inputValue, setSearchQuery: setInputValue }
}

export function SafelinkConfigWrapper() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { searchQuery, setSearchQuery } = SafelinkSearchInput()

  // URL state management
  const view = (searchParams.get('view') as SafelinkView) || SafelinkView.List
  const editParam = searchParams.get('edit')
  const createParam = searchParams.get('create') === 'true'
  const eventsUrl = searchParams.get('eventsUrl')
  const eventsPattern = searchParams.get('eventsPattern') as ToolsOzoneSafelinkDefs.PatternType

  // Local state
  const [editingRule, setEditingRule] = useState<ToolsOzoneSafelinkDefs.UrlRule | null>(null)

  const updateURL = (params: Record<string, string | boolean | undefined>) => {
    const newParams = new URLSearchParams(searchParams)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === false || value === '') {
        newParams.delete(key)
      } else {
        newParams.set(key, String(value))
      }
    })
    
    router.push(`/configure?${newParams.toString()}`)
  }

  const handleViewChange = (newView: SafelinkView) => {
    updateURL({ view: newView, eventsUrl: undefined, eventsPattern: undefined })
  }

  const handleEditRule = (rule: ToolsOzoneSafelinkDefs.UrlRule | null) => {
    setEditingRule(rule)
    updateURL({ 
      edit: rule ? `${rule.url}-${rule.pattern}` : undefined,
      create: undefined 
    })
  }

  const handleCreateRule = (creating: boolean) => {
    updateURL({ 
      create: creating ? true : undefined,
      edit: undefined 
    })
  }

  const handleViewEvents = (params: { url: string; pattern: ToolsOzoneSafelinkDefs.PatternType } | null) => {
    updateURL({
      view: params ? SafelinkView.Events : SafelinkView.List,
      eventsUrl: params?.url,
      eventsPattern: params?.pattern,
    })
  }

  const viewingEvents = eventsUrl && eventsPattern ? { url: eventsUrl, pattern: eventsPattern } : null

  return (
    <SafelinkConfig
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      view={view}
      onViewChange={handleViewChange}
      editingRule={editingRule}
      onEditRule={handleEditRule}
      creatingRule={createParam}
      onCreateRule={handleCreateRule}
      viewingEvents={viewingEvents}
      onViewEvents={handleViewEvents}
    />
  )
}