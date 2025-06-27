'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { FormEvent, useState } from 'react'
import { useSafelinkAdd, useSafelinkUpdate } from './useSafelinkList'
import { ActionTypeNames, PatternTypeNames, ReasonTypeNames } from './helpers'
import { Alert } from '@/common/Alert'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Input, Select, Textarea } from '@/common/forms'

const getSubmitButtonText = (
  rule: ToolsOzoneSafelinkDefs.UrlRule | null | undefined,
  isSubmitting: boolean,
) => {
  if (!isSubmitting) {
    return !!rule ? 'Update Rule' : 'Add Rule'
  }
  return !!rule ? 'Updating Rule...' : 'Adding Rule...'
}

const useSafelinkEditor = ({
  isUpdate,
  onSuccess,
}: {
  isUpdate: boolean
  onSuccess: () => void
}) => {
  const addRule = useSafelinkAdd()
  const updateRule = useSafelinkUpdate()
  const [submission, setSubmission] = useState<{
    isSubmitting: boolean
    error: string
  }>({ isSubmitting: false, error: '' })

  const onFormSubmit = async (
    ev: FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    ev.preventDefault()
    try {
      setSubmission({ isSubmitting: true, error: '' })
      const formData = new FormData(ev.currentTarget)

      const url = formData.get('url') as string
      const pattern = formData.get(
        'pattern',
      ) as ToolsOzoneSafelinkDefs.PatternType
      const action = formData.get('action') as ToolsOzoneSafelinkDefs.ActionType
      const reason = formData.get('reason') as ToolsOzoneSafelinkDefs.ReasonType
      const comment = formData.get('comment') as string

      const ruleData = {
        url: url.trim(),
        pattern,
        action,
        reason,
        comment: comment?.trim() || undefined,
      }

      if (isUpdate) {
        await updateRule.mutateAsync(ruleData)
      } else {
        await addRule.mutateAsync(ruleData)
      }

      onSuccess()
    } catch (err: any) {
      console.log(err)
      setSubmission({
        isSubmitting: false,
        error: err.message || 'An error occurred',
      })
    }
  }

  return { onFormSubmit, submission }
}

export function SafelinkEditor({
  rule,
  onSuccess,
  onCancel,
}: {
  rule?: ToolsOzoneSafelinkDefs.UrlRule | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const isUpdate = !!rule
  const { onFormSubmit, submission } = useSafelinkEditor({
    isUpdate,
    onSuccess,
  })

  return (
    <Card>
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {isUpdate ? 'Update Safelink Rule' : 'Add Safelink Rule'}
          </h2>
        </div>

        <form onSubmit={onFormSubmit} className="space-y-4">
          <div>
            <FormLabel label="URL or Domain" htmlFor="url" />
            <Input
              type="text"
              id="url"
              name="url"
              defaultValue={rule?.url || ''}
              placeholder="https://example.com or example.com"
              required
              disabled={submission.isSubmitting}
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
              defaultValue={rule?.pattern || ToolsOzoneSafelinkDefs.DOMAIN}
              required
              disabled={submission.isSubmitting}
            >
              {Object.entries(PatternTypeNames).map(([value, label]) => (
                <option key={value} value={value}>
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
              defaultValue={rule?.action || ToolsOzoneSafelinkDefs.BLOCK}
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
              defaultValue={rule?.reason || ToolsOzoneSafelinkDefs.NONE}
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
            <ActionButton
              type="button"
              appearance="outlined"
              size="sm"
              onClick={onCancel}
              disabled={submission.isSubmitting}
            >
              Cancel
            </ActionButton>
          </div>
        </form>
      </div>
    </Card>
  )
}
