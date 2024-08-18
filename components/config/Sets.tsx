import { ActionButton } from '@/common/buttons'
import { checkPermission } from '@/lib/server-config'
import { SetEditor } from '@/sets/SetEditor'
import { SetList } from '@/sets/SetList'
import { useSetList } from '@/sets/useSetList'
import { ToolsOzoneSetDefs } from '@atproto/api'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

export function SetsConfig() {
  const [editingSets, setEditingSets] = useState<ToolsOzoneSetDefs.Set | null>(
    null,
  )
  const [showSetsCreateForm, setShowSetsCreateForm] = useState(false)
  const { fetchNextPage, data, hasNextPage, isInitialLoading } = useSetList()
  const hideEditorForm = () => {
    if (editingSets) {
      setEditingSets(null)
    } else {
      setShowSetsCreateForm(false)
    }
  }
  const canManageSets = checkPermission('canManageSets')

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Manage Sets
        </h4>
        {!showSetsCreateForm && !editingSets && (
          <ActionButton
            size="sm"
            appearance="primary"
            onClick={() => setShowSetsCreateForm((current) => !current)}
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            <span className="text-xs">Add New</span>
          </ActionButton>
        )}
      </div>
      {showSetsCreateForm && (
        <SetEditor
          set={editingSets}
          onCancel={hideEditorForm}
          onSuccess={hideEditorForm}
        />
      )}
      <SetList
        {...{
          hasNextPage,
          fetchNextPage,
          isInitialLoading,
          onEdit: setEditingSets,
          canEdit: canManageSets,
          sets: data?.pages.map((page) => page.sets).flat(),
        }}
      />
    </div>
  )
}
