import { ActionButton } from '@/common/buttons'
import { usePermission, useServerConfig } from '@/shell/ConfigurationContext'
import {
  AppBskyActorDefs,
  ToolsOzoneVerificationGrantVerifications,
} from '@atproto/api'
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { Fragment } from 'react'
import { useVerifier } from './useVerifier'
import { WorkspaceListData } from '@/workspace/useWorkspaceListData'
import { isValidProfileViewDetailed } from '@/repositories/helpers'
import { classNames } from '@/lib/util'

export const BulkVerificationActionButton = ({
  subjects,
  onVerification,
}: {
  subjects?: WorkspaceListData
  onVerification?: () => void
}) => {
  const { verifierDid } = useServerConfig()
  const grantVerifications: ToolsOzoneVerificationGrantVerifications.VerificationInput[] =
    []
  const revokeUris: string[] = []

  Object.values(subjects || {}).map((sub) => {
    if (isValidProfileViewDetailed(sub.profile)) {
      const verifications = sub.profile.verification?.verifications?.filter(
        (v) => v.issuer == verifierDid,
      )
      if (verifications?.length) {
        verifications.forEach((v) => revokeUris.push(v.uri))
      } else {
        grantVerifications.push({
          subject: sub.profile.did,
          handle: sub.profile.handle,
          displayName: sub.profile.displayName || '',
        })
      }
    }
  })

  if (!grantVerifications.length && !revokeUris.length) {
    return null
  }

  return (
    <VerificationActionPopup
      buttonText="User Verification"
      title="Verify Users/Revoke Verifications"
      revokeUris={revokeUris}
      grantVerifications={grantVerifications}
      size="xs"
      onVerification={onVerification}
    >
      Granting verification will issue a verification record for all users in
      your workspace.
      <br />
      Revoking verification will remove any active verification record issued by
      you in the past.
    </VerificationActionPopup>
  )
}

export const VerificationActionButton = ({
  did,
  profile,
}: {
  did: string
  profile: AppBskyActorDefs.ProfileViewDetailed
}) => {
  const { verifierDid } = useServerConfig()
  // Revocation is only allowed when there is a verification record by the issuer that is configured with the ozone agent
  const revocableVerificationUri = profile.verification?.verifications?.find(
    (v) => v.issuer == verifierDid,
  )?.uri

  return (
    <VerificationActionPopup
      buttonText={
        revocableVerificationUri ? 'Revoke Verification' : 'Verify User'
      }
      title={
        revocableVerificationUri
          ? `Revoke Verification?`
          : `Verify ${profile.displayName || profile.handle}?`
      }
      revokeUris={revocableVerificationUri ? [revocableVerificationUri] : []}
      grantVerifications={
        !revocableVerificationUri
          ? [
              {
                subject: did,
                handle: profile.handle,
                displayName: profile.displayName || '',
              },
            ]
          : []
      }
    >
      {revocableVerificationUri ? (
        <div>
          You have already verified this user. Do you want to revoke the
          verification record?
        </div>
      ) : (
        <div>
          A verification record will be created with the following details
          <ul className="list-disc ml-4">
            <li>
              Name: <b>{profile.displayName}</b>
            </li>
            <li>
              Handle: <b>{profile.handle}</b>
            </li>
          </ul>
          <p className="mt-2">
            You can always revoke this verification later if needed.
          </p>
        </div>
      )}
    </VerificationActionPopup>
  )
}

const VerificationActionPopup = ({
  size = 'sm',
  buttonText,
  title,
  children,
  revokeUris,
  onVerification,
  grantVerifications,
}: {
  size?: 'xs' | 'sm'
  buttonText: string
  title: string
  children?: React.ReactNode
  revokeUris?: string[]
  onVerification?: () => void
  grantVerifications: ToolsOzoneVerificationGrantVerifications.VerificationInput[]
}) => {
  const canVerify = usePermission('canVerify')
  const { revoke, grant } = useVerifier()

  if (!canVerify) {
    return null
  }

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <PopoverButton className="ring-none">
            <ActionButton appearance="outlined" size={size} type="button">
              <CheckCircleIcon className="inline-block h-4 w-4 mr-1" />
              <span className={classNames(`text-${size}`)}>{buttonText}</span>
            </ActionButton>
          </PopoverButton>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel className="absolute left-2 z-20 mt-3 w-72 transform lg:max-w-3xl max-w-sm">
              <div className="overflow-hidden rounded-lg shadow-lg">
                <div className="relative bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-50">
                  <div className="px-4 py-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-100 flex flex-row items-center">
                      {title}
                    </h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-600 px-4 py-3">
                    {children}
                  </div>
                  <div className="flex flex-row justify-between">
                    <ActionButton
                      onClick={() => close()}
                      appearance="outlined"
                      className="m-2"
                      type="button"
                      size="xs"
                    >
                      Cancel
                    </ActionButton>
                    <div>
                      {!!revokeUris?.length && (
                        <ActionButton
                          disabled={revoke.isLoading}
                          appearance="negative"
                          className="m-2"
                          type="button"
                          size="xs"
                          onClick={() =>
                            revoke
                              .mutateAsync(revokeUris)
                              .then(() => onVerification?.())
                          }
                        >
                          {revoke.isLoading ? 'Revoking...' : 'Revoke'}
                        </ActionButton>
                      )}
                      {!!grantVerifications.length && (
                        <ActionButton
                          disabled={grant.isLoading}
                          appearance="primary"
                          className="m-2"
                          type="button"
                          size="xs"
                          onClick={() =>
                            grant
                              .mutateAsync(grantVerifications)
                              .then(() => onVerification?.())
                          }
                        >
                          {grant.isLoading ? 'Verifying user...' : 'Verify'}
                        </ActionButton>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
