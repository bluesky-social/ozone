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
import { Checkbox, FormLabel, Input } from '@/common/forms'
import { useActionCommunicationTemplates } from 'components/communication-template/action-template'
import { useCommunicationTemplateList } from 'components/communication-template/hooks'
import { Alert } from '@/common/Alert'
import { ToolsOzoneCommunicationDefs } from '@atproto/api'
import { MOD_EVENTS } from '@/mod-event/constants'
import { compileTemplateContent } from '@/email/helpers'
import { executeBatchedOperation, pluralize } from '@/lib/util'
import { getBatchId, regenerateBatchId } from '@/lib/batchId'
import {
  ActionPanelNames,
  hydrateModToolInfo,
} from '@/mod-event/helpers/emitEvent'
import { ModToolForm } from '@/workspace/ModToolForm'

const useRevokeCredentialsMutation = () => {
  const labelerAgent = useLabelerAgent()
  return useMutation({
    mutationFn: async ({
      accounts,
      emailTemplate,
      batchId,
      comment,
      externalUrl,
    }: {
      accounts: Array<{
        did: string
        handle: string
      }>
      emailTemplate?: ToolsOzoneCommunicationDefs.TemplateView
      batchId?: string
      comment?: string
      externalUrl?: string
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
            const subject = {
              $type: 'com.atproto.admin.defs#repoRef',
              did: account.did,
            }
            const modToolName = batchId
              ? ActionPanelNames.Workspace
              : ActionPanelNames.AccountManager
            const modToolMeta = batchId
              ? {
                  batchId,
                  externalUrl,
                  batchSize: totalCount,
                }
              : undefined
            await labelerAgent.tools.ozone.moderation.emitEvent(
              hydrateModToolInfo(
                {
                  subject,
                  event: {
                    $type: MOD_EVENTS.REVOKE_ACCOUNT_CREDENTIALS,
                    comment,
                  },
                  createdBy: labelerAgent.assertDid,
                },
                modToolName,
                modToolMeta,
              ),
            )
            if (emailContent) {
              await labelerAgent.tools.ozone.moderation.emitEvent(
                hydrateModToolInfo(
                  {
                    subject,
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
                  modToolName,
                  modToolMeta,
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

// keeping data management with outside deps together here to help test component separately (mutations, data fetching)
function useRevokeCredentialsData() {
  const mutation = useRevokeCredentialsMutation()
  const { data: actionTemplatesSetting } = useActionCommunicationTemplates()
  const { data: communicationTemplates } = useCommunicationTemplateList({})

  const revokeCredentialsTemplateId = actionTemplatesSetting?.revokeCredentials
  const emailTemplate =
    revokeCredentialsTemplateId && communicationTemplates
      ? communicationTemplates.find(
          (template) => template.id === revokeCredentialsTemplateId,
        )
      : undefined

  return {
    mutation,
    emailTemplate,
    revokeCredentialsTemplateId,
  }
}

// custom hook managing local state
function useRevokeCredentialsState() {
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false)
  const [currentBatchId, setCurrentBatchId] = useState(getBatchId())
  const [comment, setComment] = useState('')
  const [externalUrl, setExternalUrl] = useState('')

  const handleRegenerateBatchId = () => {
    const newBatchId = regenerateBatchId()
    setCurrentBatchId(newBatchId)
    toast.success('Batch ID updated')
  }

  return {
    isRevokeModalOpen,
    setIsRevokeModalOpen,
    currentBatchId,
    setCurrentBatchId,
    comment,
    setComment,
    externalUrl,
    setExternalUrl,
    handleRegenerateBatchId,
  }
}

type RevokeCredentialsFormProps = {
  accounts: Array<{ did: string; handle: string }>
  onClose?: () => void
  onSuccess?: (dids: string[]) => void
  revokeCredentials: ReturnType<typeof useRevokeCredentialsMutation>['mutate']
  isLoading: boolean
  error: ReturnType<typeof useRevokeCredentialsMutation>['error']
  emailTemplate?: ToolsOzoneCommunicationDefs.TemplateView
  revokeCredentialsTemplateId?: string
}

export const RevokeCredentialsForm = ({
  accounts,
  onClose,
  revokeCredentials,
  isLoading,
  error,
  emailTemplate,
  revokeCredentialsTemplateId,
  onSuccess,
}: RevokeCredentialsFormProps) => {
  const {
    isRevokeModalOpen,
    setIsRevokeModalOpen,
    currentBatchId,
    setCurrentBatchId,
    comment,
    setComment,
    externalUrl,
    setExternalUrl,
    handleRegenerateBatchId,
  } = useRevokeCredentialsState()

  const templateName = emailTemplate?.name

  const handleRevokeCredentials = () => {
    revokeCredentials(
      {
        comment,
        externalUrl,
        accounts,
        emailTemplate,
        batchId: shouldShowBatchId ? currentBatchId : undefined,
      },
      {
        onSuccess: (data) => {
          setIsRevokeModalOpen(false)
          const newBatchId = regenerateBatchId()
          setCurrentBatchId(newBatchId)
          onSuccess?.(data.results.map((r) => r.item.did))
          onClose?.()
        },
      },
    )
  }

  const shouldShowBatchId = accounts.length > 1
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
        revoke all app passwords and force password reset for {accountText}.
      </p>

      <FormLabel label="Reason (optional)" htmlFor="comment" className="mb-3">
        <Input
          autoFocus
          type="text"
          name="comment"
          value={comment}
          className="block w-full"
          onChange={(e) => setComment(e.target.value)}
          placeholder="Account was compromised/User contacted support etc."
        />
      </FormLabel>

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
        <ModToolForm
          externalUrl={externalUrl}
          setExternalUrl={setExternalUrl}
          currentBatchId={currentBatchId}
          handleRegenerateBatchId={handleRegenerateBatchId}
        />
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

// wrappercomponent that combines external dependencies and pure component
export const RevokeCredentials = (props: {
  accounts: Array<{ did: string; handle: string }>
  onClose?: () => void
  onSuccess?: (dids: string[]) => void
}) => {
  const { mutation, emailTemplate, revokeCredentialsTemplateId } =
    useRevokeCredentialsData()

  return (
    <RevokeCredentialsForm
      {...props}
      revokeCredentials={mutation.mutate}
      error={mutation.error}
      isLoading={mutation.isLoading}
      emailTemplate={emailTemplate}
      revokeCredentialsTemplateId={revokeCredentialsTemplateId}
    />
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
