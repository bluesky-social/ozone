import { ActionButton } from '@/common/buttons'
import { CopyButton } from '@/common/CopyButton'
import {
  PlusIcon,
  CheckIcon,
  NoSymbolIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'

export const WorkspacePanelActions = ({
  handleSelectAll,
  handleRemoveSelected,
  handleEmptyWorkspace,
  setShowActionForm,
  setShowItemCreator,
  showActionForm,
  workspaceList,
}: {
  handleSelectAll: () => void
  handleRemoveSelected: () => void
  handleEmptyWorkspace: () => void
  setShowActionForm: React.Dispatch<React.SetStateAction<boolean>>
  setShowItemCreator: React.Dispatch<React.SetStateAction<boolean>>
  showActionForm: boolean
  workspaceList: string[]
}) => {
  return (
    <>
      <ActionButton
        appearance="outlined"
        size="xs"
        type="button"
        title="Select/unselect all items"
        onClick={handleSelectAll}
      >
        <CheckIcon className="h-3 w-3" />
      </ActionButton>
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
