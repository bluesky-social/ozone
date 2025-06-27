'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useState } from 'react'
import { useSafelinkList, useSafelinkRemove } from './useSafelinkList'
import {
  getActionText,
  getPatternText,
  getReasonText,
  getActionColor,
} from './helpers'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ChevronRightIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PencilIcon } from '@heroicons/react/24/solid'
import { CopyButton } from '@/common/CopyButton'
import { LabelChip } from '@/common/labels/List'
import {
  SafelinkAction,
  SafelinkPattern,
  SafelinkReason,
  SafelinkUrl,
} from './Shared'

export function SafelinkRuleList({
  searchQuery = '',
  onEdit,
  onViewEvents,
}: {
  searchQuery?: string
  onEdit?: (rule: ToolsOzoneSafelinkDefs.UrlRule) => void
  onViewEvents?: (
    url: string,
    pattern: ToolsOzoneSafelinkDefs.PatternType,
  ) => void
}) {
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
    if (
      !confirm(`Are you sure you want to remove the rule for "${rule.url}"?`)
    ) {
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
      <Card className="mt-4">
        <div className="p-4 text-center text-gray-600 dark:text-gray-400">
          {searchQuery
            ? 'No safelink rules found matching your search.'
            : 'No safelink rules found.'}
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
            <div className="px-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <SafelinkPattern rule={rule} />
                    <SafelinkAction rule={rule} />
                    <SafelinkReason rule={rule} />
                  </div>

                  <SafelinkUrl rule={rule} />

                  {rule.comment && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
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
                      appearance="outlined"
                      onClick={() => onViewEvents(rule.url, rule.pattern)}
                      title="View events"
                    >
                      <ChevronRightIcon className="h-3 w-3" />
                    </ActionButton>
                  )}

                  {onEdit && (
                    <ActionButton
                      size="xs"
                      appearance="outlined"
                      onClick={() => onEdit(rule)}
                    >
                      <PencilIcon className="h-3 w-3" />
                    </ActionButton>
                  )}

                  <ActionButton
                    size="xs"
                    appearance="outlined"
                    onClick={() => handleRemove(rule)}
                    disabled={isRemoving}
                    title="Remove rule"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </ActionButton>
                </div>
              </div>
            </div>
          </Card>
        )
      })}

      {hasNextPage && (
        <div className="flex justify-center mb-4">
          <LoadMoreButton
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          />
        </div>
      )}
    </div>
  )
}
