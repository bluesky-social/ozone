import {
  ArrowDownIcon,
  ArrowUpIcon,
  LockClosedIcon,
} from '@heroicons/react/24/solid'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'react-toastify'
import Link from 'next/link'

import { ActionButton } from '@/common/buttons'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { Checkbox } from '@/common/forms'
import { useActionCommunicationTemplates } from 'components/communication-template/action-template'
import { useCommunicationTemplateList } from 'components/communication-template/hooks'
import { Alert } from '@/common/Alert'
import { ToolsOzoneCommunicationDefs } from '@atproto/api'
import { MOD_EVENTS } from '@/mod-event/constants'
import { compileTemplateContent } from '@/email/helpers'
import { executeBatchedOperation, pluralize } from '@/lib/util'
import { getBatchId, regenerateBatchId } from '@/lib/batchId'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { CopyButton } from '@/common/CopyButton'
import {
  ActionPanelNames,
  hydrateModToolInfo,
} from '@/mod-event/helpers/emitEvent'

const useRevokeCredentialsMutation = () => {
  const labelerAgent = useLabelerAgent()
  return useMutation({
    mutationFn: async ({
      accounts,
      emailTemplate,
      batchId,
    }: {
      accounts: Array<{
        did: string
        handle: string
      }>
      emailTemplate?: ToolsOzoneCommunicationDefs.TemplateView
      batchId?: string
    }) => {
      let emailContent: string
      if (emailTemplate) {
        const [{ remark }, { default: remarkHtml }] = await Promise.all([
          import('remark'),
          import('remark-html'),
        ])
        emailContent = remark()
          .use(remarkHtml)
          .processSync(emailTemplate.contentMarkdown)
          .toString()
      }

      const totalCount = accounts.length
      const toastId = toast.info(`Processing ${totalCount} accounts...`, {
        autoClose: false,
      })

      try {
        const batchResults = await executeBatchedOperation({
          items: accounts,
          batchSize: 25,
          operation: async (account) => {
            await labelerAgent.com.atproto.temp.revokeCredentials({
              did: account.did,
            })
            if (emailContent) {
              await labelerAgent.tools.ozone.moderation.emitEvent(
                hydrateModToolInfo(
                  {
                    subject: {
                      $type: 'com.atproto.admin.defs#repoRef',
                      did: account.did,
                    },
                    event: {
                      content: compileTemplateContent(emailContent, {
                        handle: account.handle,
                      }),
                      $type: MOD_EVENTS.EMAIL,
                      subjectLine: emailTemplate?.subject,
                      comment: '[AUTOMATED_EMAIL_FOLLOWING_REVOKE_CREDENTIALS]',
                    },
                    createdBy: labelerAgent.assertDid,
                  },
                  batchId
                    ? ActionPanelNames.Workspace
                    : ActionPanelNames.AccountManager,
                  batchId
                    ? {
                        batchId,
                        batchSize: totalCount,
                      }
                    : undefined,
                ),
              )
            }
          },
          onBatchProgress: (
            processed,
            failed,
            total,
            batchIndex,
            totalBatches,
            retryAttempt,
          ) => {
            const retryText = retryAttempt ? ` - Retry ${retryAttempt}` : ''
            toast.update(toastId, {
              render: `Processing batch ${
                batchIndex + 1
              }/${totalBatches} (${processed}/${total} complete, ${failed} failed)${retryText}`,
              type: retryAttempt ? 'warning' : 'info',
            })
          },
        })

        toast.dismiss(toastId)

        const { successCount, failedCount } = batchResults

        if (failedCount === 0) {
          toast.success(
            `Successfully revoked credentials for all ${successCount} accounts`,
          )
        } else if (successCount === 0) {
          toast.error(
            `Failed to revoke credentials for all ${failedCount} accounts`,
          )
        } else {
          toast.warning(
            `Revoked credentials for ${successCount} accounts, ${failedCount} failed`,
          )
        }

        return batchResults
      } catch (error) {
        toast.dismiss(toastId)
        throw error
      }
    },
    onError: (error: any) => {
      toast.error(
        `Failed to revoke credentials: ${error?.message || 'Unknown error'}`,
      )
    },
  })
}

export const RevokeCredentials = (props: {
  accounts: Array<{ did: string; handle: string }>
  onClose?: () => void
}) => {
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false)
  const [currentBatchId, setCurrentBatchId] = useState(getBatchId())
  const {
    mutate: revokeCredentials,
    isLoading,
    error,
  } = useRevokeCredentialsMutation()
  const { accounts, onClose } = props

  const { data: actionTemplatesSetting } = useActionCommunicationTemplates()
  const { data: communicationTemplates } = useCommunicationTemplateList({})

  const revokeCredentialsTemplateId = actionTemplatesSetting?.revokeCredentials
  const emailTemplate =
    revokeCredentialsTemplateId && communicationTemplates
      ? communicationTemplates.find(
          (template) => template.id === revokeCredentialsTemplateId,
        )
      : undefined
  const templateName = emailTemplate?.name

  const handleRegenerateBatchId = () => {
    const newBatchId = regenerateBatchId()
    setCurrentBatchId(newBatchId)
    toast.success('Batch ID updated')
  }

  const handleRevokeCredentials = () => {
    revokeCredentials(
      {
        accounts,
        emailTemplate,
        batchId: shouldShowBatchId ? currentBatchId : undefined,
      },
      {
        onSuccess: () => {
          setIsRevokeModalOpen(false)
          const newBatchId = regenerateBatchId()
          setCurrentBatchId(newBatchId)
          onClose?.()
        },
      },
    )
  }

  // batch id is only needed when actioning multiple accounts from workspace
  // this component is also shown in repository page for single account where we wont need batch id
  const shouldShowBatchId = accounts.length > 1 && !!emailTemplate

  const accountText =
    accounts.length === 1
      ? `@${accounts[0].handle}`
      : `${accounts.length} accounts`

  return (
    <div>
      <h3 className="font-medium mb-2 dark:text-gray-300 text-gray-700">
        Revoke Account Credentials
      </h3>
      <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
        Revoking account credentials will remove all active session tokens,
        revoke all app passwords and force password reset for the selected{' '}
        {pluralize(accounts.length, 'user')}.
      </p>

      {revokeCredentialsTemplateId && templateName ? (
        <Checkbox
          defaultChecked
          value="true"
          name="sendActionEmail"
          className="mb-3 flex items-center leading-3"
          label={
            <span className="leading-4">
              Send email using template:{' '}
              <a
                target="_blank"
                className="underline"
                onClick={(e) => e.stopPropagation()}
                href={`/communication-template/${revokeCredentialsTemplateId}/edit`}
              >
                <strong>{templateName}</strong>
              </a>
            </span>
          }
        />
      ) : (
        <div className="mb-3">
          <Alert
            type="warning"
            body={
              <>
                No email template configured for credential revocation.{' '}
                <Link
                  href="/configure#action-template-config"
                  className="underline"
                >
                  Configure a template
                </Link>{' '}
                to automatically send notification emails to users.
              </>
            }
          />
        </div>
      )}

      {shouldShowBatchId && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Batch ID:
              </span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 font-mono">
                {currentBatchId}
              </span>
            </div>
            <div>
              <CopyButton
                text={currentBatchId}
                className="mr-2"
                labelText="Batch ID "
                title={`Copy batch id to clipboard`}
              />
              <button
                type="button"
                onClick={handleRegenerateBatchId}
                className="text-xs text-white transition-colors"
                title="Regenerate Batch ID"
              >
                <ArrowPathIcon className="h-3 w-3 text-gray-500 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionButton
        appearance="primary"
        size="sm"
        onClick={() => setIsRevokeModalOpen(true)}
        disabled={isLoading}
      >
        <LockClosedIcon className="h-3 w-3 mr-1" />
        {isLoading ? 'Revoking...' : 'Revoke Credentials'}
      </ActionButton>

      <ConfirmationModal
        isOpen={isRevokeModalOpen}
        setIsOpen={setIsRevokeModalOpen}
        title="Revoke Account Credentials?"
        description={
          <>
            {"You're"} about to revoke all active session tokens and app
            passwords for {accountText}. This will force{' '}
            {accounts.length === 1 ? 'the user' : 'these users'} to sign in
            again on all devices and applications.
          </>
        }
        confirmButtonText={
          isLoading ? 'Revoking...' : 'Yes, Revoke Credentials'
        }
        confirmButtonDisabled={isLoading}
        onConfirm={handleRevokeCredentials}
        error={error?.message}
      />
    </div>
  )
}

export const SecuritySection = (props: { did: string; handle: string }) => {
  const [isSecurityShown, setIsSecurityShown] = useState(false)
  const { did, handle } = props

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 py-3">
      <div className="flex flex-row items-center">
        <button
          className="flex flex-row items-center text-gray-700 dark:text-gray-100 "
          onClick={() => setIsSecurityShown(!isSecurityShown)}
        >
          <h3 className="text-lg mr-1">Account Security</h3>
          {isSecurityShown ? (
            <ArrowUpIcon className="h-4 w-4" />
          ) : (
            <ArrowDownIcon className="h-4 w-4" />
          )}
        </button>
      </div>
      {isSecurityShown && <RevokeCredentials accounts={[{ did, handle }]} />}
    </div>
  )
}
