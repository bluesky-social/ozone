import {
  EventListState,
  FIRST_EVENT_TIMESTAMP,
  formatDateForInput,
  useModEventList,
} from './useModEventList'
import { AGE_ASSURANCE_STATES, MOD_EVENTS, MOD_EVENT_TITLES } from './constants'
import { addDays } from 'date-fns'
import { Checkbox, FormLabel, Input } from '@/common/forms'
import {
  reasonTypeOptions,
  groupedReasonTypes,
} from '@/reports/helpers/getType'
import Select from 'react-tailwindcss-select'
import { classNames } from '@/lib/util'
import { LabelSelector } from '@/common/labels/Selector'
import { ReasonBadgeButton } from '@/reports/ReasonBadge'
import { CreateMacroForm } from './CreateMacroForm'
import { useFilterMacroUpsertMutation } from './useFilterMacrosList'
import { MacroList } from './MacroPicker'
import { useState } from 'react'

const selectClassNames = {
  menuButton: ({ isDisabled }: { isDisabled?: boolean } = {}) =>
    classNames(
      isDisabled ? 'bg-gray-200' : 'bg-white hover:border-gray-400 focus:ring',
      'flex text-sm text-gray-500 border border-gray-300 rounded shadow-sm transition-all duration-300 focus:outline-none dark:bg-slate-700 dark:text-gray-100',
    ),
  menu: 'absolute z-10 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700 dark:bg-slate-700 dark:text-gray-100',
  searchBox:
    'w-full py-2 pl-8 text-sm text-gray-500 bg-gray-100 border border-gray-200 rounded focus:border-gray-200 focus:ring-0 focus:outline-none dark:bg-slate-800 dark:text-gray-100',
  listGroupLabel:
    'pr-2 py-2 cursor-default select-none truncate text-gray-700 dark:text-gray-100 font-semibold bg-gray-50 dark:bg-slate-600',
  listItem: ({ isSelected }: { isSelected?: boolean } = {}) => {
    const baseClass =
      'block transition duration-200 px-2 py-2 cursor-pointer select-none truncate rounded dark:hover:bg-slate-800 dark:hover:text-gray-200'
    const selectedClass = isSelected
      ? `bg-indigo-600 text-white`
      : `text-gray-500 dark:text-gray-300 hover:bg-gray-100`

    return classNames(baseClass, selectedClass)
  },
  tagItemText: `text-gray-600 text-xs truncate cursor-default select-none`,
  tagItemIconContainer:
    'flex items-center px-1 cursor-pointer rounded-r-sm hover:bg-red-200 hover:text-red-600 dark:text-slate-900',
}
import { RepoFinder } from '@/repositories/Finder'
import { Dropdown } from '@/common/Dropdown'
import {
  ChevronDownIcon,
  ClipboardIcon,
  FolderArrowDownIcon,
} from '@heroicons/react/24/solid'
import { ActionPoliciesSelector } from '@/reports/ModerationForm/ActionPolicySelector'
import { SubjectTypeFilter } from '@/reports/QueueFilter/SubjectType'
import { AgeAssuranceBadgeButton } from './AgeAssuranceStateBadge'
import { toast } from 'react-toastify'
import { ActionButton } from '@/common/buttons'
import { ImportFilterModal } from './ImportFilterModal'
import { copyFiltersToClipboard } from './helpers/macros'
import { Tooltip } from '@/common/Tooltip'

export const EventFilterPanel = ({
  limit,
  types,
  reportTypes,
  addedLabels,
  removedLabels,
  commentFilter,
  createdBy,
  subject,
  batchId,
  oldestFirst,
  createdAfter,
  createdBefore,
  applyFilterMacro,
  toggleCommentFilter,
  setCommentFilterKeyword,
  changeListFilter,
  subjectType,
  selectedCollections,
  ageAssuranceState,
  withStrike,
  isBatchIdFromProp = false,
}: Omit<EventListState, 'includeAllUserRecords' | 'showContentPreview'> & {
  isBatchIdFromProp?: boolean
} & Pick<
    ReturnType<typeof useModEventList>,
    | 'changeListFilter'
    | 'applyFilterMacro'
    | 'commentFilter'
    | 'toggleCommentFilter'
    | 'setCommentFilterKeyword'
  >) => {
  const [selectedMacro, setSelectedMacro] = useState('')
  const allTypes = Object.entries(MOD_EVENT_TITLES)
  const toggleType = (type) => {
    if (type === 'all') {
      if (types.length === allTypes.length) {
        changeListFilter({ field: 'types', value: [] })
      } else {
        changeListFilter({
          field: 'types',
          value: allTypes.map(([type]) => type),
        })
      }
      return
    }
    const newTypes = types.includes(type)
      ? types.filter((t) => t !== type)
      : [...types, type]
    changeListFilter({ field: 'types', value: newTypes })
  }
  const { mutate: upsertMacro, error: upsertMacroError } =
    useFilterMacroUpsertMutation()

  const [isImportOpen, setIsImportOpen] = useState(false)
  const handleCopy = async () => {
    const filters: Partial<EventListState> = {
      types,
      reportTypes,
      addedLabels,
      removedLabels,
      commentFilter,
      createdBy,
      batchId,
      oldestFirst,
      createdAfter,
      createdBefore,
      subjectType,
      selectedCollections,
      ageAssuranceState,
      withStrike,
      limit,
    }
    await copyFiltersToClipboard(filters)
    toast.success(`Copied to clipboard`)
  }

  return (
    <div className="shadow dark:shadow-slate-700 rounded py-3 px-5 bg-white dark:bg-slate-800 mt-2">
      <div className="flex flex-row">
        <div className="mr-4">
          <div>
            <h5 className="text-gray-700 dark:text-gray-100 font-medium">
              Event Type
            </h5>
            <div className="flex flex-row items-center mr-2 mt-2">
              <input
                id={`type-all`}
                name={`type-all`}
                type="checkbox"
                value={'all'}
                checked={types.length === allTypes.length}
                onChange={() => toggleType('all')}
                className="h-4 w-4 rounded border-gray-300 dark:border-teal-300 text-indigo-600 dark:text-teal-600 focus:ring-indigo-600 dark:focus:ring-teal-600"
              />
              <label
                htmlFor={`type-all`}
                className="ml-1 text-sm leading-6 text-gray-700 dark:text-gray-100"
              >
                All
              </label>
            </div>
            {allTypes.map(([type, title]) => (
              <div className="flex flex-row items-center mr-2" key={type}>
                <input
                  id={`type-${type}`}
                  name={`type-${type}`}
                  type="checkbox"
                  value={type}
                  checked={types.includes(type)}
                  onChange={() => toggleType(type)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-teal-300 text-indigo-600 dark:text-teal-600 focus:ring-indigo-600 dark:focus:ring-teal-600"
                />
                <label
                  htmlFor={`type-${type}`}
                  className="ml-1 text-sm leading-6 text-gray-700 dark:text-gray-100"
                >
                  {title}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="pb-2">
            <h5 className="text-gray-700 dark:text-gray-100 font-medium mb-1">
              Filter Using Macro
            </h5>
            <MacroList
              selectedMacro={selectedMacro}
              setSelectedMacro={(name, filters) => {
                setSelectedMacro(name)
                applyFilterMacro(filters)
              }}
            />
          </div>

          <h5 className="text-gray-700 dark:text-gray-100 font-medium">
            Comment/Note
          </h5>

          <div className="flex flex-row items-center mr-2 mt-2">
            <input
              id={`comment-filter`}
              name={`comment-filter`}
              type="checkbox"
              value={`true`}
              checked={commentFilter.enabled}
              onChange={() => toggleCommentFilter()}
              className="h-4 w-4 rounded border-gray-300 dark:border-teal-300 text-indigo-600 dark:text-teal-600 focus:ring-indigo-600 dark:focus:ring-teal-600"
            />
            <label
              htmlFor={`comment-filter`}
              className="ml-1 text-sm leading-6 text-gray-700 dark:text-gray-100"
            >
              Events with comments
            </label>
          </div>
          {commentFilter?.enabled && (
            <FormLabel
              label="Comment Keyword"
              htmlFor="keyword"
              className="flex-1 mt-2"
            >
              <Input
                type="text"
                id="keyword"
                name="keyword"
                required
                placeholder="trim, later, soon etc."
                className="block w-full"
                value={commentFilter.keyword}
                onChange={(ev) => setCommentFilterKeyword(ev.target.value)}
                autoComplete="off"
              />
            </FormLabel>
          )}

          <div className="pt-2">
            <SubjectTypeFilter
              hasSubjectTypeFilter={!!subjectType}
              isSubjectTypeAccount={subjectType === 'account'}
              selectedCollections={selectedCollections}
              isSubjectTypeRecord={subjectType === 'record'}
              toggleCollection={(collectionId) => {
                const newCollections = new Set(selectedCollections)
                if (newCollections.has(collectionId)) {
                  newCollections.delete(collectionId)
                } else {
                  newCollections.add(collectionId)
                }
                changeListFilter({
                  field: 'selectedCollections',
                  value: Array.from(newCollections),
                })
              }}
              toggleSubjectType={(newSubjectType) => {
                changeListFilter({
                  field: 'subjectType',
                  value:
                    newSubjectType === subjectType ? undefined : newSubjectType,
                })
              }}
              clearSubjectType={() => {
                changeListFilter({
                  field: 'subjectType',
                  value: undefined,
                })
              }}
            />
          </div>

          <FormLabel label="Page Size" htmlFor="limit" className="flex-1 mt-2">
            <Dropdown
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
              items={[25, 50, 75, 100].map((size) => ({
                id: `${size}`,
                text: `${size} per page`,
                onClick: () =>
                  changeListFilter({ field: 'limit', value: size }),
              }))}
            >
              {limit} per page
              <ChevronDownIcon
                className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
                aria-hidden="true"
              />
            </Dropdown>
          </FormLabel>

          <Checkbox
            id="withStrike"
            name="withStrike"
            className="flex items-center"
            checked={withStrike}
            onChange={() =>
              changeListFilter({
                field: 'withStrike',
                value: withStrike ? undefined : true,
              })
            }
            label="Show events with strikes"
          />

          <FormLabel
            label="Event Author DID"
            htmlFor="createdBy"
            className="flex-1 mt-2"
          >
            <RepoFinder
              inputProps={{
                className: 'w-full',
                type: 'text',
                id: 'createdBy',
                name: 'createdBy',
                placeholder: 'DID of the author of the event',
              }}
              onChange={(value) =>
                changeListFilter({
                  field: 'createdBy',
                  value,
                })
              }
            />
          </FormLabel>

          <FormLabel label="Subject" htmlFor="subject" className="flex-1 mt-2">
            <Input
              type="text"
              id="subject"
              name="subject"
              placeholder="DID or AT-URI"
              className="block w-full"
              value={subject || ''}
              onChange={(ev) =>
                changeListFilter({
                  field: 'subject',
                  value: ev.target.value,
                })
              }
              autoComplete="off"
            />
          </FormLabel>

          <FormLabel
            label="Events Created After"
            htmlFor="createdAfter"
            className="flex-1 mt-2"
          >
            <Input
              type="datetime-local"
              id="createdAfter"
              name="createdAfter"
              className="block w-full dark:[color-scheme:dark]"
              value={createdAfter}
              onChange={(ev) =>
                changeListFilter({
                  field: 'createdAfter',
                  value: ev.target.value,
                })
              }
              autoComplete="off"
              min={FIRST_EVENT_TIMESTAMP}
              max={formatDateForInput(addDays(new Date(), 1))}
            />
          </FormLabel>

          <FormLabel
            label="Events Created Before"
            htmlFor="createdBefore"
            className="flex-1 mt-2"
          >
            <Input
              type="datetime-local"
              id="createdBefore"
              name="createdBefore"
              className="block w-full dark:[color-scheme:dark]"
              value={createdBefore}
              onChange={(ev) =>
                changeListFilter({
                  field: 'createdBefore',
                  value: ev.target.value,
                })
              }
              autoComplete="off"
              min={FIRST_EVENT_TIMESTAMP}
              max={formatDateForInput(new Date())}
            />
          </FormLabel>
          <div className="mt-5 flex gap-1 items-center">
            <ActionButton
              appearance="outlined"
              size="sm"
              type="button"
              onClick={handleCopy}
            >
              <ClipboardIcon className="h-3 w-3" />
              Copy Filters
            </ActionButton>
            <ActionButton
              appearance="outlined"
              size="sm"
              type="button"
              onClick={() => setIsImportOpen(true)}
            >
              <FolderArrowDownIcon className="h-4 w-4 mr-1" />
              Import Filters
            </ActionButton>
            <Tooltip
              title="Filter Sharing"
              description={`This is for sharing configs between team members.

1. The sharer should click 'Copy Filters' and paste the output to their team member.
2. The team member should click 'Import Filters' and paste the config.`}
              anchor="right start"
            />
          </div>
        </div>
      </div>
      <FormLabel label="Batch ID" htmlFor="batchId" className="flex-1 mt-2">
        <Input
          type="text"
          id="batchId"
          name="batchId"
          placeholder="Batch identifier"
          className="block w-full"
          value={batchId}
          onChange={(ev) =>
            changeListFilter({
              field: 'batchId',
              value: ev.target.value,
            })
          }
          disabled={isBatchIdFromProp}
          autoComplete="off"
        />
      </FormLabel>

      {types.includes(MOD_EVENTS.TAKEDOWN) && (
        <div className="flex flex-row gap-2 mt-2">
          <FormLabel label="Policy" className="flex-1">
            <ActionPoliciesSelector
              onSelect={(policies) => {
                changeListFilter({ field: 'policies', value: policies })
              }}
            />
          </FormLabel>
        </div>
      )}
      {types.includes(MOD_EVENTS.TAG) && (
        <div className="flex flex-row gap-2 mt-2">
          <FormLabel label="Added Tags" className="flex-1 max-w-sm">
            <Input
              type="text"
              id="addedTags"
              name="addedTags"
              placeholder="comma separated tags"
              className="block w-full"
              onChange={(e) =>
                changeListFilter({ field: 'addedTags', value: e.target.value })
              }
            />
          </FormLabel>

          <FormLabel label="Removed Tags" className="flex-1 max-w-sm">
            <Input
              type="text"
              id="removedTags"
              name="removedTags"
              placeholder="comma separated tags"
              className="block w-full"
              onChange={(e) =>
                changeListFilter({
                  field: 'removedTags',
                  value: e.target.value,
                })
              }
            />
          </FormLabel>
        </div>
      )}
      <div className="mt-2">
        {types.includes(MOD_EVENTS.LABEL) && (
          <>
            <FormLabel label="Added Labels" className="w-full mt-2">
              <LabelSelector
                id="addedLabels"
                name="addedLabels"
                form=""
                defaultLabels={[]}
                onChange={(value) =>
                  changeListFilter({ field: 'addedLabels', value })
                }
              />
            </FormLabel>

            <FormLabel label="Removed Labels" className="w-full mt-2">
              <LabelSelector
                id="removedLabels"
                name="removedLabels"
                form=""
                defaultLabels={[]}
                onChange={(value) =>
                  changeListFilter({ field: 'removedLabels', value })
                }
              />
            </FormLabel>
          </>
        )}

        {types.includes(MOD_EVENTS.REPORT) && (
          <FormLabel
            label="Report Reason"
            htmlFor="reasonType"
            className="mt-2"
          >
            <Select
              primaryColor="indigo"
              isMultiple
              isSearchable
              isClearable
              classNames={selectClassNames}
              placeholder="Select report reasons..."
              value={reportTypes.map((reasonType) => ({
                label: reasonTypeOptions[reasonType] || reasonType,
                value: reasonType,
              }))}
              onChange={(selections) => {
                const selectedValues = Array.isArray(selections)
                  ? selections.map((s) => s.value)
                  : []
                changeListFilter({
                  field: 'reportTypes',
                  value: selectedValues,
                })
              }}
              options={Object.entries(groupedReasonTypes).map(
                ([categoryName, reasonTypes]) => ({
                  label: categoryName,
                  options: reasonTypes.map((reasonType) => ({
                    label: reasonTypeOptions[reasonType] || reasonType,
                    value: reasonType,
                    isSelected: reportTypes.includes(reasonType),
                  })),
                }),
              )}
            />
          </FormLabel>
        )}

        {types.includes(MOD_EVENTS.AGE_ASSURANCE) && (
          <FormLabel
            label="Age Assurance Status"
            htmlFor="ageAssuranceState"
            className="mt-2"
          >
            {Object.values(AGE_ASSURANCE_STATES).map((state) => {
              const isSelected = ageAssuranceState === state
              return (
                <AgeAssuranceBadgeButton
                  key={state}
                  ageAssuranceState={state}
                  className={`mr-1 ${isSelected ? 'font-bold' : ''}`}
                  isHighlighted={isSelected}
                  onClick={(e) => {
                    e.preventDefault()
                    const value = isSelected ? undefined : state
                    changeListFilter({
                      field: 'ageAssuranceState',
                      value,
                    })
                  }}
                />
              )
            })}
          </FormLabel>
        )}
      </div>
      <div>
        <h5 className="text-gray-700 dark:text-gray-100 font-medium my-2">
          Sort Direction
        </h5>

        <Checkbox
          id="sortDirection"
          name="sortDirection"
          className="flex items-center"
          checked={oldestFirst}
          onChange={() =>
            changeListFilter({ field: 'oldestFirst', value: !oldestFirst })
          }
          label="Show oldest events first (default: newest first)"
        />
      </div>
      <div className="mt-3 pt-3 border-t dark:border-gray-700 border-gray-200">
        <CreateMacroForm
          error={upsertMacroError?.['message']}
          onCreate={async (name) => {
            try {
              await upsertMacro({
                name,
                filters: {
                  types,
                  reportTypes,
                  addedLabels,
                  removedLabels,
                  commentFilter,
                  createdBy,
                  batchId,
                  oldestFirst,
                  createdAfter,
                  createdBefore,
                  subjectType,
                  selectedCollections,
                  ageAssuranceState,
                  withStrike,
                  limit,
                },
              })
              return true
            } catch (e) {
              return false
            }
          }}
        />
      </div>
      <ImportFilterModal
        isOpen={isImportOpen}
        setIsDialogOpen={setIsImportOpen}
        onSubmit={applyFilterMacro}
      />
    </div>
  )
}
