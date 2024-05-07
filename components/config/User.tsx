import { ActionButton } from '@/common/buttons'
import { ToolsOzoneModeratorDefs } from '@atproto/api'
import { PlusIcon } from '@heroicons/react/24/outline'
import { UserEditor } from 'components/moderator/UserEditor'
import { UserList } from 'components/moderator/UserList'
import { useUserList } from 'components/moderator/useUserList'
import { useState } from 'react'

export function UserConfig() {
  const [editingUser, setEditingUser] =
    useState<ToolsOzoneModeratorDefs.User | null>(null)
  const [showUserCreateForm, setShowUserCreateForm] = useState(false)
  const { fetchNextPage, data, isInitialLoading } = useUserList()

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Manage Users
        </h4>
        <ActionButton
          size="sm"
          appearance="primary"
          disabled={!!editingUser}
          onClick={() => setShowUserCreateForm((current) => !current)}
        >
          <PlusIcon className="h-3 w-3 mr-1" />
          <span className="text-xs">Add New</span>
        </ActionButton>
      </div>
      {(showUserCreateForm || !!editingUser) && (
        <UserEditor
          user={editingUser}
          onSuccess={() => {
            if (editingUser) {
              setEditingUser(null)
            } else {
              setShowUserCreateForm(false)
            }
          }}
        />
      )}
      <UserList
        {...{
          fetchNextPage,
          isInitialLoading,
          onEdit: setEditingUser,
          users: data?.pages.map((page) => page.users).flat(),
        }}
      />
    </div>
  )
}
