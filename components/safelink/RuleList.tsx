'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSafelinkRules, useSafelinkRemove } from './useSafelinkRules'
import { ActionButton, LinkButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { FormLabel, Textarea } from '@/common/forms'
import { ChevronRightIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PencilIcon } from '@heroicons/react/24/solid'
import {
  SafelinkAction,
  SafelinkPattern,
  SafelinkReason,
  SafelinkUrl,
} from './Shared'
import {
  createSafelinkEventsLink,
  createSafelinkEditLink,
  getPatternText,
} from './helpers'
import Link from 'next/link'

export function SafelinkRuleList() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urls = searchParams.get('urls')?.split(',').filter(Boolean) || []
  const pattern = searchParams.get('pattern') as
    | ToolsOzoneSafelinkDefs.PatternType
    | undefined
  const actions = searchParams.get('actions')?.split(',').filter(Boolean) as
    | ToolsOzoneSafelinkDefs.ActionType[]
    | undefined
  const getQuickActionPanelLink = (subject: string) =>
    `${pathname}?${
      searchParams.toString() ? searchParams.toString() + '&' : ''
    }quickOpen=${subject}`

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSafelinkRules({
    urls: urls.length > 0 ? urls : undefined,
    patternType: pattern,
    actions: actions,
  })

  const removeFormRef = useRef<HTMLFormElement>(null)
  const removeRule = useSafelinkRemove()
  const [removingRule, setRemovingRule] = useState<string | null>(null)
  const [ruleToRemove, setRuleToRemove] =
    useState<ToolsOzoneSafelinkDefs.UrlRule | null>(null)

  const handleRemove = (rule: ToolsOzoneSafelinkDefs.UrlRule) => {
    setRuleToRemove(rule)
  }

  const confirmRemove = async () => {
    if (!ruleToRemove) return

    const form = removeFormRef.current
    if (!form) return

    const formData = new FormData(form)
    const comment = (formData.get('comment') as string) || 'Removed via UI'

    const ruleKey = `${ruleToRemove.url}-${ruleToRemove.pattern}`
    setRemovingRule(ruleKey)

    try {
      await removeRule.mutateAsync({
        url: ruleToRemove.url,
        pattern: ruleToRemove.pattern,
        comment,
      })
      setRuleToRemove(null)
    } catch (err) {
      // Error is already handled by the mutation and toast is shown
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
                      Note: {rule.comment}
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
                  <div>
                    Created by:{' '}
                    <Link
                      className="underline"
                      href={getQuickActionPanelLink(rule.createdBy)}
                    >
                      {rule.createdBy}
                    </Link>
                  </div>
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

      <ConfirmationModal
        isOpen={!!ruleToRemove}
        setIsOpen={(isOpen) => !isOpen && setRuleToRemove(null)}
        onConfirm={confirmRemove}
        title="Remove Safelink Rule?"
        confirmButtonText={removingRule ? 'Removing...' : 'Remove Rule'}
        confirmButtonDisabled={!!removingRule}
        error={removeRule.error?.message}
        description={
          <>
            Are you sure you want to remove the{' '}
            {ruleToRemove && getPatternText(ruleToRemove?.pattern)} rule for{' '}
            <a className="underline" href={ruleToRemove?.url} target="_blank">
              {ruleToRemove?.url}
            </a>
            ?
          </>
        }
      >
        <div className="pt-4">
          <form ref={removeFormRef}>
            <FormLabel label="Comment" htmlFor="remove-comment">
              <Textarea
                id="remove-comment"
                name="comment"
                rows={3}
                defaultValue="Removed via UI"
                className="w-full"
                placeholder="Enter a comment for this action..."
              />
            </FormLabel>
          </form>
        </div>
      </ConfirmationModal>
    </div>
  )
}
