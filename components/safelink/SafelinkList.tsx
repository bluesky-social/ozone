'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useState } from 'react'
import { useSafelinkList, useSafelinkRemove } from './useSafelinkList'
import { getActionText, getPatternText, getReasonText, getActionColor } from './helpers'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ChevronRightIcon, TrashIcon } from '@heroicons/react/24/outline'

interface SafelinkListProps {
  searchQuery?: string
  onEdit?: (rule: ToolsOzoneSafelinkDefs.UrlRule) => void
  onViewEvents?: (url: string, pattern: ToolsOzoneSafelinkDefs.PatternType) => void
}

export function SafelinkList({ searchQuery = '', onEdit, onViewEvents }: SafelinkListProps) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSafelinkList(searchQuery)

  const removeRule = useSafelinkRemove()
  const [removingRule, setRemovingRule] = useState<string | null>(null)

  const handleRemove = async (rule: ToolsOzoneSafelinkDefs.UrlRule) => {
    if (!confirm(`Are you sure you want to remove the rule for "${rule.url}"?`)) {
      return
    }

    const ruleKey = `${rule.url}-${rule.pattern}`
    setRemovingRule(ruleKey)
    
    try {
      await removeRule.mutateAsync({
        url: rule.url,
        pattern: rule.pattern,
        comment: 'Removed via UI',
      })
    } finally {
      setRemovingRule(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <div className="p-4 text-center text-gray-600 dark:text-gray-400">
          Loading safelink rules...
        </div>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <div className="p-4 text-center text-red-600 dark:text-red-400">
          Error loading safelink rules
        </div>
      </Card>
    )
  }

  const rules = data?.pages.flatMap((page) => page.rules) || []

  if (rules.length === 0) {
    return (
      <Card>
        <div className="p-4 text-center text-gray-600 dark:text-gray-400">
          {searchQuery ? 'No safelink rules found matching your search.' : 'No safelink rules found.'}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => {
        const ruleKey = `${rule.url}-${rule.pattern}`
        const isRemoving = removingRule === ruleKey
        
        return (
          <Card key={ruleKey}>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {getPatternText(rule.pattern)}
                    </span>
                    <span className={`font-medium ${getActionColor(rule.action)}`}>
                      {getActionText(rule.action)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getReasonText(rule.reason)}
                    </span>
                  </div>
                  
                  <div className="font-mono text-sm mb-2 break-all">
                    {rule.url}
                  </div>
                  
                  {rule.comment && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {rule.comment}
                    </div>
                  )}
                  
                  {rule.createdBy && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Created by: {rule.createdBy}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {onViewEvents && (
                    <ActionButton
                      size="xs"
                      variant="outline"
                      onClick={() => onViewEvents(rule.url, rule.pattern)}
                      title="View events"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </ActionButton>
                  )}
                  
                  {onEdit && (
                    <ActionButton
                      size="xs"
                      variant="outline"
                      onClick={() => onEdit(rule)}
                    >
                      Edit
                    </ActionButton>
                  )}
                  
                  <ActionButton
                    size="xs"
                    variant="outline"
                    onClick={() => handleRemove(rule)}
                    disabled={isRemoving}
                    title="Remove rule"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </ActionButton>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
      
      {hasNextPage && (
        <LoadMoreButton
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
          className="w-full"
        />
      )}
    </div>
  )
}