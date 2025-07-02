'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useState } from 'react'
import { useSafelinkList, useSafelinkRemove } from './useSafelinkList'
import { ActionButton, LinkButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ChevronRightIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PencilIcon } from '@heroicons/react/24/solid'
import {
  SafelinkAction,
  SafelinkPattern,
  SafelinkReason,
  SafelinkUrl,
} from './Shared'
import { createSafelinkEventsLink, createSafelinkEditLink } from './helpers'

export function SafelinkRuleList() {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSafelinkList({})

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
          {'No safelink rules found.'}
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
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <LinkButton
                    size="xs"
                    appearance="outlined"
                    href={createSafelinkEventsLink(rule.url, rule.pattern)}
                    title="View events"
                  >
                    <ChevronRightIcon className="h-3 w-3" />
                  </LinkButton>

                  <LinkButton
                    size="xs"
                    appearance="outlined"
                    href={createSafelinkEditLink(rule.url, rule.pattern)}
                    title="Edit rule"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </LinkButton>

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

              {rule.createdBy && (
                <div className="text-xs text-gray-500 dark:text-gray-500 flex flex-row justify-between">
                  <div>Created by: {rule.createdBy}</div>
                  <div>{new Date(rule.updatedAt).toLocaleString()}</div>
                </div>
              )}
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
