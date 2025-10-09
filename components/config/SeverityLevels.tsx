import { ActionButton, LinkButton } from '@/common/buttons'
import { Input } from '@/common/forms'
import { SeverityLevelEditor } from '@/setting/severity-level/Editor'
import { SeverityLevelList } from '@/setting/severity-level/List'
import { useSeverityLevelSetting } from '@/setting/severity-level/useSeverityLevel'
import { useServerConfig } from '@/shell/ConfigurationContext'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export function SeverityLevelsConfig({
  searchQuery,
  showCreateForm,
  onSearchChange,
  onCancelSearch,
  onCreateClick,
  onCancelCreate,
  onCreateSuccess,
}: {
  searchQuery: string | null
  showCreateForm: boolean
  onSearchChange: (value: string) => void
  onCancelSearch: () => void
  onCreateClick: () => void
  onCancelCreate: () => void
  onCreateSuccess: () => void
}) {
  const { role } = useServerConfig()
  const canManageSeverityLevels = role === ToolsOzoneTeamDefs.ROLEADMIN

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        {typeof searchQuery === 'string' ? (
          <>
            <Input
              type="text"
              autoFocus
              className="w-3/4"
              placeholder="Search severity levels..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />{' '}
            <ActionButton
              size="sm"
              className="ml-1"
              appearance="outlined"
              onClick={onCancelSearch}
            >
              Cancel
            </ActionButton>
          </>
        ) : (
          <>
            <div className="flex flex-row items-center">
              <h4 className="font-medium text-gray-700 dark:text-gray-100">
                Manage Severity Levels
              </h4>
            </div>
            {!showCreateForm && (
              <div className="flex flex-row items-center">
                {canManageSeverityLevels && (
                  <ActionButton
                    size="sm"
                    appearance="primary"
                    onClick={onCreateClick}
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    <span className="text-xs">Add New Severity Level</span>
                  </ActionButton>
                )}

                <ActionButton
                  size="sm"
                  className="ml-1"
                  appearance="outlined"
                  onClick={() => onSearchChange('')}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </ActionButton>
              </div>
            )}
          </>
        )}
      </div>
      {showCreateForm && (
        <div className="mb-4">
          <SeverityLevelEditor
            onCancel={onCancelCreate}
            onSuccess={onCreateSuccess}
          />
        </div>
      )}

      <SeverityLevelList
        {...{
          searchQuery,
          canEdit: canManageSeverityLevels,
        }}
      />
    </div>
  )
}
