import { Dropdown } from '@/common/Dropdown'
import { EmptyDataset } from '@/common/feeds/EmptyFeed'
import { Loading } from '@/common/Loader'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { PostAsCard } from '@/common/posts/PostsFeed'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { ProfileCard } from '@/repositories/AccountView'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { WorkspacePanel } from '@/workspace/Panel'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { VerificationList } from 'components/verification/List'
import { useVerificationList } from 'components/verification/useVerificationList'
import { useSearchParams } from 'next/navigation'
import { useTitle } from 'react-use'

export const VerificationPageContent = () => {
  const searchParams = useSearchParams()
  const isRevoked = searchParams.get('isRevoked') || undefined
  const issuers = searchParams.get('issuers') ?? ''
  const createdAfter = searchParams.get('createdAfter') ?? undefined
  const createdBefore = searchParams.get('createdBefore') ?? undefined

  let pageTitle = `Verifications`

  useTitle(pageTitle)
  const { data, isLoading, fetchNextPage, hasNextPage } = useVerificationList({
    createdAfter,
    createdBefore,
    issuers: issuers.split(','),
    isRevoked: isRevoked ? isRevoked === 'true' : undefined,
  })
  const verifications = data?.pages?.flatMap((page) => page.verifications) ?? []

  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()
  const workspaceOptions = [
    {
      id: 'add_users_to_workspace',
      text: 'Add verified users to workspace',
      onClick: () => {
        addToWorkspace(verifications.map((item) => item.subject))
      },
    },
    {
      id: 'add_issuers_to_workspace',
      text: 'Add verifiers to workspace',
      onClick: () => {
        addToWorkspace(verifications.map((item) => item.issuer))
      },
    },
  ]
  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <div className="flex flex-row justify-between items-center">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Verifications
        </h4>
        {!!verifications.length && (
          <div className="flex-1 lg:text-right lg:pr-2 px-1 lg:pt-0">
            <Dropdown
              containerClassName="inline-block"
              rightAligned
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-400 bg-white dark:bg-slate-800 dark:text-gray-100 dark px-3 py-1 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
              items={workspaceOptions}
            >
              Add to workspace
            </Dropdown>
          </div>
        )}
      </div>
      {!isLoading && !verifications.length && (
        <EmptyDataset message="No verifications indexed">
          <CheckBadgeIcon className="h-8 w-8" />
        </EmptyDataset>
      )}
      {isLoading && <Loading message="Loading verifications..." />}
      <VerificationList verifications={verifications} />
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
    </div>
  )
}
