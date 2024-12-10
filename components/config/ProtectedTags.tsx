import { ActionButton } from '@/common/buttons'
import { ProtectedTagEditor } from 'components/setting/protected-tag/Editor'
import { useProtectedTagEditor } from 'components/setting/protected-tag/useProtectedTag'

export const ProtectedTagsConfig = () => {
  const {
    editorData,
    setEditorData,
    handleSave,
    memberList,
    handleRemoveKey,
    handleAddKey,
    handleUpdateField,
    canManageTags,
  } = useProtectedTagEditor()

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Protected Tags
        </h4>
        {canManageTags && (
          <ActionButton
            size="sm"
            appearance="primary"
            onClick={() => handleSave()}
          >
            <span className="text-xs">Save Settings</span>
          </ActionButton>
        )}
      </div>
      <ProtectedTagEditor
        {...{
          editorData,
          setEditorData,
          memberList,
          handleRemoveKey,
          handleAddKey,
          handleUpdateField,
          canManageTags,
        }}
      />
    </div>
  )
}
