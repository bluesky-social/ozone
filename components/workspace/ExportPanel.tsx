import { ActionButton } from '@/common/buttons'
import {
  Popover,
  Transition,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'
import { useWorkspaceExport } from './hooks'
import { WorkspaceListData } from './useWorkspaceListData'
import { Checkbox, FormLabel, Input } from '@/common/forms'

export const WorkspaceExportPanel = ({
  listData,
}: {
  listData: WorkspaceListData
}) => {
  const {
    mutateAsync,
    isLoading,
    headers,
    filename,
    setFilename,
    selectedColumns,
    setSelectedColumns,
  } = useWorkspaceExport()

  const canDownload = selectedColumns.length > 0 && !isLoading && !!filename

  return (
    <Popover className="relative z-30">
      {({ open, close }) => (
        <>
          <PopoverButton className="text-sm flex flex-row items-center z-20">
            <ActionButton
              size="sm"
              appearance="outlined"
              title="Export all users from workspace"
            >
              <span className="text-xs">
                {isLoading ? 'Exporting...' : 'Export'}
              </span>
            </ActionButton>
          </PopoverButton>

          {/* Use the `Transition` component. */}
          <Transition
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <PopoverPanel className="absolute right-0 z-30 mt-1 flex w-screen max-w-max -translate-x-1/5 px-4">
              <div className="w-fit-content flex-auto rounded bg-white dark:bg-slate-800 p-4 text-sm leading-6 shadow-lg dark:shadow-slate-900 ring-1 ring-gray-900/5">
                <div className="">
                  <FormLabel label="Export File Name" className="mb-3" required>
                    <Input
                      type="text"
                      name="filename"
                      id="filename"
                      className="py-2 w-full"
                      placeholder="Enter the file name for your export"
                      required
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                    />
                  </FormLabel>

                  <FormLabel
                    label="Select Columns to Export"
                    className="mb-1"
                    required
                  />

                  {headers.map((fieldName) => {
                    return (
                      <Checkbox
                        key={fieldName}
                        value="true"
                        id={fieldName}
                        name={fieldName}
                        checked={selectedColumns.includes(fieldName)}
                        className="mb-2 flex items-center"
                        label={fieldName}
                        onChange={(e) =>
                          e.target.checked
                            ? setSelectedColumns([
                                ...selectedColumns,
                                fieldName,
                              ])
                            : setSelectedColumns(
                                selectedColumns.filter(
                                  (col) => col !== fieldName,
                                ),
                              )
                        }
                      />
                    )
                  })}
                </div>
                <p className="py-2 block max-w-lg text-gray-500 dark:text-gray-300 text-xs">
                  Note:{' '}
                  <i>
                    The exported file will only contain the selected columns.
                    <br />
                    When exporting from records (posts, profiles etc.) the
                    exported file will only contain the author account details
                    of the records.
                  </i>
                </p>
                <div className="flex flex-row mt-2 gap-2">
                  <ActionButton
                    size="xs"
                    appearance="outlined"
                    disabled={!canDownload}
                    onClick={() => {
                      mutateAsync(listData).then(() => close())
                    }}
                  >
                    <span className="text-xs">
                      {isLoading ? 'Downloading...' : 'Download'}
                    </span>
                  </ActionButton>
                </div>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
