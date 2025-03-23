import { createContext, useContext, useState } from 'react'
import { FilterGroup, WorkspaceFilterItem } from './types'
import { WorkspaceListData } from './useWorkspaceListData'
import { checkFilterMatchForWorkspaceItem } from './utils'

type FilterContextType = {
  filterGroup: FilterGroup[]
  addFilter: (groupId: number, filter: WorkspaceFilterItem) => void
  addGroup: (operator: 'AND' | 'OR') => void
  removeGroup: (groupId: number) => void
  removeFilter: (groupId: number, field: string, operator: string) => void
  selectAll: () => void
  unselectAll: () => void
  toggleFilteredItems: (select: boolean) => void
}

const FilterContext = createContext<FilterContextType | null>(null)

const toggleItemCheck = (item: string, select: boolean = true) => {
  const checkbox = document?.querySelector<HTMLInputElement>(
    `#mod-workspace input[type="checkbox"][name="workspaceItem"][value="${item}"]`,
  )
  if (checkbox) {
    checkbox.checked = select
  }
}

export const FilterProvider = ({
  children,
  listData,
}: {
  children: React.ReactNode
  listData?: WorkspaceListData
}) => {
  const [filterGroup, setFilterGroup] = useState<FilterGroup[]>([
    { filters: [] },
  ])

  const selectAll = () => {
    if (!listData) return
    Object.keys(listData).forEach((uri) => {
      toggleItemCheck(uri)
    })
  }

  const unselectAll = () => {
    if (!listData) return
    Object.keys(listData).forEach((uri) => {
      toggleItemCheck(uri, false)
    })
  }

  const toggleFilteredItems = (select: boolean) => {
    if (!listData) return
    const filteredItems: string[] = []

    for (const [subject, data] of Object.entries(listData)) {
      let matchesFilters = false

      for (const group of filterGroup) {
        let groupMatches = false

        for (const filter of group.filters) {
          if (checkFilterMatchForWorkspaceItem(filter, data)) {
            groupMatches = true
          }
        }

        if (group.operator === 'AND' && !groupMatches) {
          matchesFilters = false
          break
        } else if (group.operator === 'OR' && groupMatches) {
          matchesFilters = true
          break
        }

        if (matchesFilters) {
          filteredItems.push(subject)
        }
      }
    }
  }

  const addFilter = (groupId: number, filter: WorkspaceFilterItem) => {
    setFilterGroup((prev) => {
      const newGroup = [...prev]
      if (!newGroup[groupId]?.filters.some((f) => f.field === filter.field)) {
        newGroup[groupId].filters.push(filter)
      }
      return newGroup
    })
  }

  const addGroup = (operator: 'AND' | 'OR') => {
    setFilterGroup((prev) => [...prev, { operator, filters: [] }])
  }

  const removeGroup = (groupId: number) => {
    setFilterGroup((prev) => prev.filter((_, i) => i !== groupId))
  }

  const removeFilter = (groupId: number, field: string, operator: string) => {
    setFilterGroup((prev) => {
      const newGroup = [...prev]
      newGroup[groupId].filters = newGroup[groupId].filters.filter(
        (f) => !(f.field === field && f.operator === operator), // fix: negate the match
      )
      return newGroup
    })
  }

  return (
    <FilterContext.Provider
      value={{
        filterGroup,
        addFilter,
        addGroup,
        removeFilter,
        removeGroup,
        selectAll,
        unselectAll,
        toggleFilteredItems,
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export const useFilter = () => {
  const context = useContext(FilterContext)
  if (!context)
    throw new Error('useFilter must be used within a FilterProvider')
  return context
}
