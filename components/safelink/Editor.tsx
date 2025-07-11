'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { FormEvent, useState, useEffect } from 'react'
import {
  useSafelinkAdd,
  useSafelinkUpdate,
  useSafelinkRules,
} from './useSafelinkRules'
import { useQueryClient } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  ActionTypeNames,
  createSafelinkPageLink,
  PatternTypeNames,
  ReasonTypeNames,
} from './helpers'
import { Alert } from '@/common/Alert'
import { ActionButton, LinkButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Input, Select, Textarea } from '@/common/forms'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const getSubmitButtonText = (
  rule: ToolsOzoneSafelinkDefs.UrlRule | null | undefined,
  isSubmitting: boolean,
) => {
  if (!isSubmitting) {
    return !!rule ? 'Update Rule' : 'Add Rule'
  }
  return !!rule ? 'Updating Rule...' : 'Adding Rule...'
}

const useSafelinkEditor = () => {
  const searchParams = useSearchParams()
  const url = searchParams.get('url') || ''
  const pattern = searchParams.get(
    'pattern',
  ) as ToolsOzoneSafelinkDefs.PatternType | null
  const router = useRouter()
  const addRule = useSafelinkAdd()
  const updateRule = useSafelinkUpdate()

  const [submission, setSubmission] = useState<{
    isSubmitting: boolean
    error: string
  }>({ isSubmitting: false, error: '' })

  const isUpdate = !!url && !!pattern

  const { data: rulesData, isLoading: isLoadingRule } = useSafelinkRules({
    urls: url ? [url] : undefined,
    patternType: pattern || undefined,
    isDisabled: !url || !pattern,
  })

  const rule = rulesData?.pages[0]?.rules.find(
    (r) => r.url === url && r.pattern === pattern,
  )

  const onFormSubmit = async (
    ev: FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    ev.preventDefault()
    try {
      setSubmission({ isSubmitting: true, error: '' })
      const formData = new FormData(ev.currentTarget)

      const formUrl = formData.get('url') as string
      const formPattern = formData.get(
        'pattern',
      ) as ToolsOzoneSafelinkDefs.PatternType
      const action = formData.get('action') as ToolsOzoneSafelinkDefs.ActionType
      const reason = formData.get('reason') as ToolsOzoneSafelinkDefs.ReasonType
      const comment = formData.get('comment') as string

      const ruleData = {
        url: rule ? rule.url : formUrl.trim(),
        pattern: rule ? rule.pattern : formPattern,
        action,
        reason,
        comment: comment?.trim() || undefined,
      }

      if (isUpdate && rule) {
        await updateRule.mutateAsync({
          ...rule,
          ...ruleData,
        })
      } else {
        await addRule.mutateAsync(ruleData as ToolsOzoneSafelinkDefs.UrlRule)
      }

      setSubmission({ isSubmitting: false, error: '' })

      router.push(createSafelinkPageLink({ view: 'list' }))
    } catch (err: any) {
      setSubmission({
        isSubmitting: false,
        error: err.message || 'An error occurred',
      })
    }
  }

  return {
    onFormSubmit,
    submission,
    isUpdate,
    rule,
    isLoadingRule,
  }
}

export function SafelinkEditor() {
  const { onFormSubmit, submission, isUpdate, rule, isLoadingRule } =
    useSafelinkEditor()

  // Show loading state when fetching rule data for editing
  if (isUpdate && isLoadingRule) {
    return (
      <div>
        <div className="flex items-center gap-4 my-4">
          <Link href="/configure?tab=safelink&view=list">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <h4 className="font-medium text-gray-700 dark:text-gray-100">
            Update Safelink Rule
          </h4>
        </div>
        <Card>
          <div className="px-2 py-8 text-center text-gray-600 dark:text-gray-400">
            Loading rule data...
          </div>
        </Card>
      </div>
    )
  }

  // Show error if rule not found in edit mode
  if (isUpdate && !isLoadingRule && !rule) {
    return (
      <div>
        <div className="flex items-center gap-4 my-4">
          <Link href="/configure?tab=safelink&view=list">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <h4 className="font-medium text-gray-700 dark:text-gray-100">
            Update Safelink Rule
          </h4>
        </div>
        <Card>
          <div className="px-2 py-8">
            <Alert
              title="Rule not found"
              body="The rule you're trying to edit could not be found. It may have been deleted or the URL parameters are incorrect."
              type="error"
            />
            <div className="mt-4">
              <LinkButton
                href={createSafelinkPageLink({ view: 'list' })}
                appearance="primary"
                size="sm"
              >
                Back to Rules List
              </LinkButton>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 my-4">
        <Link href="/configure?tab=safelink&view=list">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          {isUpdate ? 'Update Safelink Rule' : 'Add Safelink Rule'}
        </h4>
      </div>
      <Card>
        <form onSubmit={onFormSubmit} className="px-2 space-y-4">
          <div>
            <FormLabel label="URL or Domain" htmlFor="url" />
            <Input
              type="text"
              id="url"
              name="url"
              className="w-full"
              defaultValue={rule?.url || ''}
              placeholder="https://example.com/profile or example.com"
              required
              disabled={submission.isSubmitting || !!rule}
              readOnly={isUpdate}
            />
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {isUpdate
                ? 'URL cannot be changed when updating'
                : 'Enter the URL or domain to apply the rule to'}
            </div>
          </div>

          <div>
            <FormLabel label="Pattern Type" htmlFor="pattern" />
            <Select
              id="pattern"
              name="pattern"
              required
              disabled={submission.isSubmitting || isUpdate}
            >
              {Object.entries(PatternTypeNames).map(([value, label]) => (
                <option
                  selected={rule?.pattern === value}
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </Select>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {isUpdate
                ? 'Pattern type cannot be changed when updating'
                : 'Domain applies to entire domain, URL applies to specific URL'}
            </div>
          </div>

          <div>
            <FormLabel label="Action" htmlFor="action" />
            <Select
              id="action"
              name="action"
              defaultValue={rule?.action || 'block'}
              required
              disabled={submission.isSubmitting}
            >
              {Object.entries(ActionTypeNames).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Block prevents access, Warn shows interstitial, Whitelist
              explicitly allows
            </div>
          </div>

          <div>
            <FormLabel label="Reason" htmlFor="reason" />
            <Select
              id="reason"
              name="reason"
              defaultValue={rule?.reason || 'none'}
              required
              disabled={submission.isSubmitting}
            >
              {Object.entries(ReasonTypeNames).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <FormLabel label="Comment" htmlFor="comment" />
            <Textarea
              id="comment"
              name="comment"
              className="w-full"
              defaultValue={rule?.comment || ''}
              placeholder="Optional comment about this rule"
              rows={3}
              disabled={submission.isSubmitting}
            />
          </div>

          {submission.error && <Alert title={submission.error} type="error" />}

          <div className="flex gap-2 pt-4">
            <ActionButton
              size="sm"
              type="submit"
              appearance="primary"
              disabled={submission.isSubmitting}
            >
              {getSubmitButtonText(rule, submission.isSubmitting)}
            </ActionButton>
            <LinkButton
              type="button"
              appearance="outlined"
              size="sm"
              href={
                submission.isSubmitting
                  ? '#'
                  : createSafelinkPageLink({
                      view: 'list',
                    })
              }
            >
              Cancel
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  )
}
