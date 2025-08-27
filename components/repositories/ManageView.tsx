import { ComponentProps, useState } from 'react'
import {
  ArrowDownIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/solid'

import { Alert } from '@/common/Alert'
import { LinkButton } from '@/common/buttons'
import { EmailComposer } from '@/email/Composer'
import { useEmailRecipientStatus } from '@/email/useEmailRecipientStatus'
import { ToolsOzoneModerationGetRepo } from '@atproto/api'
import { SecuritySection } from './RevokeCredential'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type ManageViewProps = ComponentProps<typeof EmailComposer> & {
  repo: ToolsOzoneModerationGetRepo.OutputSchema
}

export const ManageView = (props: ManageViewProps) => {
  return (
    <div className="mx-auto mt-8 max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      <SecuritySection did={props.repo.did} handle={props.repo.handle} />
      <EmailSection {...props} />
    </div>
  )
}

const EmailSection = (props: ManageViewProps) => {
  const { repo } = props
  const [isComposerShown, setIsComposerShown] = useState(false)
  const { cantReceive } = useEmailRecipientStatus(props.did)
  return (
    <div className="border-t border-b border-gray-200 dark:border-gray-700 py-3">
      <div className="flex flex-row justify-between items-center">
        <button
          className="flex flex-row items-center text-gray-700 dark:text-gray-100 "
          onClick={() => setIsComposerShown(!isComposerShown)}
        >
          <h3 className="text-lg mr-1">Email User</h3>
          {!cantReceive ? (
            isComposerShown ? (
              <ArrowUpIcon className="h-4 w-4" />
            ) : (
              <ArrowDownIcon className="h-4 w-4" />
            )
          ) : null}
        </button>
        <div className="flex flex-row items-center gap-1">
          {repo?.email && (
            <LinkButton
              appearance="outlined"
              size="sm"
              href={`mailto:${repo.email}`}
              title={
                repo.emailConfirmedAt
                  ? `Email verified at ${dateFormatter.format(
                      new Date(repo.emailConfirmedAt),
                    )}`
                  : 'Email not verified'
              }
            >
              <EnvelopeIcon
                className={`-ml-1 mr-1 h-4 w-4  ${
                  repo.emailConfirmedAt ? 'text-green-600' : 'text-gray-400'
                }`}
                aria-hidden="true"
              />
              <span>Email Directly</span>
            </LinkButton>
          )}
          <LinkButton
            prefetch={false}
            href="/communication-template"
            appearance="primary"
            size="sm"
          >
            Manage Templates
            <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 ml-1" />
          </LinkButton>
        </div>
      </div>
      {cantReceive && (
        <div className="my-2">
          <Alert
            showIcon
            type="warning"
            title="Can not send email to this user"
            body="This user's account is hosted on PDS that does not allow sending emails. Please check the PDS of the user to verify."
          />
        </div>
      )}
      {!cantReceive && isComposerShown && <EmailComposer {...props} />}
    </div>
  )
}
