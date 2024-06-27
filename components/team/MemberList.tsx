import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { LabelChip } from '@/common/labels'
import { useActionPanelLink } from '@/common/useActionPanelLink'
import { useSession } from '@/lib/useSession'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { PencilIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { RoleTag } from './Role'
import { SOCIAL_APP_URL } from '@/lib/constants'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid'
import { LoadMoreButton } from '@/common/LoadMoreButton'

export function MemberList({
  members,
  isInitialLoading,
  fetchNextPage,
  hasNextPage,
  onEdit,
}: {
  isInitialLoading: boolean
  members: ToolsOzoneTeamDefs.Member[] | undefined
  fetchNextPage: () => void
  hasNextPage?: boolean
  onEdit: (member: ToolsOzoneTeamDefs.Member) => void
}) {
  const createActionPanelLink = useActionPanelLink()
  const session = useSession()
  return (
    <>
      <Card className="mb-3 py-3">
        {isInitialLoading ? (
          <p>Hang tight, we{"'"}re loading all members...</p>
        ) : (
          <div>
            {!members?.length && <p>No members found.</p>}
            {members?.map((member, i) => {
              const isCurrentMember = session?.did === member.did
              const lastItem = i === members.length - 1
              return (
                <div
                  key={member.did}
                  className={`flex flex-row justify-between px-2 ${
                    !lastItem
                      ? 'mb-2 border-b dark:border-gray-700 border-gray-100 pb-3'
                      : ''
                  }`}
                >
                  <div>
                    {member.profile ? (
                      <>
                        <p>
                          <Link
                            className="text-sm underline text-gray-500 dark:text-gray-400"
                            href={createActionPanelLink(member.did)}
                          >
                            {member.profile.displayName || 'No Display Name'}
                          </Link>
                        </p>
                        <p className="text-sm">
                          <a
                            target="_blank"
                            className="flex items-center gap-1"
                            href={`${SOCIAL_APP_URL}/profile/${member.profile.handle}`}
                          >
                            {`@${member.profile.handle}`}
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </a>
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <Link
                            className="text-sm underline text-gray-500 dark:text-gray-400"
                            href={createActionPanelLink(member.did)}
                          >
                            Profile not found
                          </Link>
                        </p>
                        <p className="text-sm">
                          <a
                            target="_blank"
                            className="flex items-center gap-1"
                            href={`${SOCIAL_APP_URL}/profile/${member.did}`}
                          >
                            {member.did}
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </a>
                        </p>
                      </>
                    )}
                    <div className="-mx-1">
                      {member.disabled && (
                        <LabelChip className="text-red-600">Disabled</LabelChip>
                      )}
                      <RoleTag role={member.role} />
                      {isCurrentMember && (
                        <LabelChip className="text-teal-600">You</LabelChip>
                      )}
                    </div>
                  </div>
                  <div>
                    {!isCurrentMember && (
                      <ActionButton
                        size="xs"
                        appearance="outlined"
                        onClick={() => onEdit(member)}
                      >
                        <PencilIcon className="h-3 w-3 mr-1" />
                        <span className="text-xs">Edit</span>
                      </ActionButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {members?.length && hasNextPage && (
        <div className="flex justify-center pb-2">
          <LoadMoreButton onClick={fetchNextPage} />
        </div>
      )}
    </>
  )
}
