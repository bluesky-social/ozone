import { ActionButton } from '@/common/buttons'
import { CopyButton } from '@/common/CopyButton'
import { NoSymbolIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import { WorkspaceFilterSelector } from './FilterSelector'
import { WorkspaceListData } from './useWorkspaceListData'

export const WorkspacePanelActions = ({
  handleRemoveSelected,
  handleEmptyWorkspace,
  handleFindCorrelation,
  setShowActionForm,
  setShowItemCreator,
  showActionForm,
  workspaceList,
  listData,
}: {
  handleRemoveSelected: () => void
  handleEmptyWorkspace: () => void
  handleFindCorrelation?: () => void
  setShowActionForm: React.Dispatch<React.SetStateAction<boolean>>
  setShowItemCreator: React.Dispatch<React.SetStateAction<boolean>>
  showActionForm: boolean
  workspaceList: string[]
  listData: WorkspaceListData | undefined
}) => {
  return (
    <>
      <WorkspaceFilterSelector listData={listData} />
      <ActionButton
        appearance="outlined"
        size="xs"
        type="button"
        title="Remove selected items from workspace"
        onClick={handleRemoveSelected}
      >
        <TrashIcon className="h-3 w-3" />
      </ActionButton>
      <ActionButton
        appearance="outlined"
        size="xs"
        type="button"
        title="Remove all items and empty workspace"
        onClick={handleEmptyWorkspace}
      >
        <NoSymbolIcon className="h-3 w-3" />
      </ActionButton>
      <ActionButton
        appearance="outlined"
        size="xs"
        type="button"
        onClick={() => setShowActionForm((current) => !current)}
      >
        {showActionForm ? 'Hide Action Form' : 'Show Action Form'}
      </ActionButton>

      {handleFindCorrelation && (
        <ActionButton
          appearance="outlined"
          size="xs"
          type="button"
          onClick={handleFindCorrelation}
        >
          Find correlation
        </ActionButton>
      )}

      <ActionButton
        appearance="outlined"
        size="xs"
        type="button"
        onClick={() => setShowItemCreator((current) => !current)}
      >
        <PlusIcon className="h-3 w-3" />
      </ActionButton>
      {workspaceList.length > 0 && (
        <CopyButton
          title="Copy workspace items"
          text={workspaceList.join(',')}
        />
      )}
    </>
  )
}
