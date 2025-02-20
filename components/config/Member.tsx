import { useState } from 'react'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { PlusIcon } from '@heroicons/react/24/outline'

import { ActionButton } from '@/common/buttons'
import { usePermission } from '@/shell/ConfigurationContext'
import { MemberEditor } from '@/team/MemberEditor'
import { MemberList } from '@/team/MemberList'
import RolePicker from '@/team/RolePicker'
import { StatusPicker } from '@/team/StatusPicker'
import { useMemberList } from '@/team/useMemberList'

export function MemberConfig() {
  const [editingMember, setEditingMember] =
    useState<ToolsOzoneTeamDefs.Member | null>(null)
  const [showMemberCreateForm, setShowMemberCreateForm] = useState(false)
  const {
    fetchNextPage,
    data,
    hasNextPage,
    isInitialLoading,
    disabled,
    setDisabled,
    roles,
    setRoles,
  } = useMemberList()
  const hideEditorForm = () => {
    if (editingMember) {
      setEditingMember(null)
    } else {
      setShowMemberCreateForm(false)
    }
  }
  const canManageTeam = usePermission('canManageTeam')

  return (
    <div className="pt-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Manage Members
        </h4>
        <div className="flex flex-row justify-end items-center gap-2">
          {!showMemberCreateForm && !editingMember && canManageTeam && (
            <ActionButton
              size="sm"
              appearance="primary"
              onClick={() => setShowMemberCreateForm((current) => !current)}
            >
              <PlusIcon className="h-3 w-3 mr-1" />
              <span className="text-xs">Add</span>
            </ActionButton>
          )}
          <StatusPicker onSelect={setDisabled} selected={disabled} />
          <RolePicker size="sm" values={roles} onChange={setRoles} />
        </div>
      </div>
      {(showMemberCreateForm || !!editingMember) && canManageTeam && (
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
          canEdit: canManageTeam,
          members: data?.pages.map((page) => page.members).flat(),
        }}
      />
    </div>
  )
}
