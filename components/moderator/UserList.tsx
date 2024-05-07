import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { LabelChip } from '@/common/labels'
import { useActionPanelLink } from '@/common/useActionPanelLink'
import { useSession } from '@/lib/useSession'
import { ToolsOzoneModeratorDefs } from '@atproto/api'
import { PencilIcon } from '@heroicons/react/20/solid'
import { RoleTag } from './Role'

export function UserList({
  users,
  isInitialLoading,
  fetchNextPage,
  onEdit,
}: {
  isInitialLoading: boolean
  users: ToolsOzoneModeratorDefs.User[] | undefined
  fetchNextPage: () => void
  onEdit: (user: ToolsOzoneModeratorDefs.User) => void
}) {
  const createActionPanelLink = useActionPanelLink()
  const session = useSession()
  return (
    <Card>
      {isInitialLoading ? (
        <p>Hang tight, we{"'"}re loading all users...</p>
      ) : (
        <div>
          {!users?.length && <p>No users found.</p>}
          {users?.map((user) => {
            const isCurrentUser = session?.did === user.did
            return (
              <div
                key={user.did}
                className="flex flex-row justify-between mb-2 px-2"
              >
                <div>
                  {user.profile ? (
                    <>
                      <p>
                        <a
                          className="text-sm"
                          href={createActionPanelLink(user.did)}
                        >
                          {user.profile.displayName || 'No Display Name'}
                        </a>
                      </p>
                      <p className="text-sm">{`@${user.profile.handle}`}</p>
                    </>
                  ) : (
                    <>
                      <p>
                        <a
                          className="text-sm"
                          href={createActionPanelLink(user.did)}
                        >
                          Profile not found
                        </a>
                      </p>
                      <p className="text-sm">{user.did}</p>
                    </>
                  )}
                  <div className="-mx-1">
                    {user.disabled && (
                      <LabelChip className="text-red-600">Disabled</LabelChip>
                    )}
                    <RoleTag role={user.role} />
                    {isCurrentUser && (
                      <LabelChip className="text-teal-600">
                        Current User
                      </LabelChip>
                    )}
                  </div>
                </div>
                <div>
                  {!isCurrentUser && (
                    <ActionButton
                      size="xs"
                      appearance="outlined"
                      onClick={() => onEdit(user)}
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
  )
}
