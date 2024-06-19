import { ActionButton } from '@/common/buttons'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { PlusIcon } from '@heroicons/react/24/outline'
import { MemberEditor } from 'components/team/MemberEditor'
import { MemberList } from 'components/team/MemberList'
import { useMemberList } from 'components/team/useMemberList'
import { useState } from 'react'

export function MemberConfig() {
  const [editingMember, setEditingMember] =
    useState<ToolsOzoneTeamDefs.Member | null>(null)
  const [showMemberCreateForm, setShowMemberCreateForm] = useState(false)
  const { fetchNextPage, data, hasNextPage, isInitialLoading } = useMemberList()
  const hideEditorForm = () => {
    if (editingMember) {
      setEditingMember(null)
    } else {
      setShowMemberCreateForm(false)
    }
  }

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Manage Members
        </h4>
        {!showMemberCreateForm && !editingMember && (
          <ActionButton
            size="sm"
            appearance="primary"
            disabled={!!editingMember}
            onClick={() => setShowMemberCreateForm((current) => !current)}
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            <span className="text-xs">Add New</span>
          </ActionButton>
        )}
      </div>
      {(showMemberCreateForm || !!editingMember) && (
        <MemberEditor
          member={editingMember}
          onCancel={hideEditorForm}
          onSuccess={hideEditorForm}
        />
      )}
      <MemberList
        {...{
          hasNextPage,
          fetchNextPage,
          isInitialLoading,
          onEdit: setEditingMember,
          members: data?.pages.map((page) => page.members).flat(),
        }}
      />
    </div>
  )
}
