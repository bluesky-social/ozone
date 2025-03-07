import { Popover, Transition } from '@headlessui/react'
import { ActionButton } from '@/common/buttons'
import { CheckIcon } from '@heroicons/react/24/outline'
import { Checkbox, FormLabel, Input } from '@/common/forms'
import { useState } from 'react'
import { WorkspaceListData } from './useWorkspaceListData'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { getSubjectStatusFromItemData } from './utils'
import { getProfileFromRepo } from '@/repositories/helpers'
import { Dropdown } from '@/common/Dropdown'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { differenceInDays, differenceInHours } from 'date-fns'

const toggleItemCheck = (item: string, select: boolean = true) => {
  const checkbox = document?.querySelector<HTMLInputElement>(
    `#mod-workspace input[type="checkbox"][name="workspaceItem"][value="${item}"]`,
  )
  if (checkbox) {
    checkbox.checked = select
  }
}

const matchMinimumAccountAge = (
  minAccountAgeUnit: string,
  profileCreatedAt?: string,
  minAccountAge?: number,
) => {
  if (!profileCreatedAt || !minAccountAge) return false
  const createdAt = new Date(profileCreatedAt)
  const now = new Date()
  const diff =
    minAccountAgeUnit === 'days'
      ? differenceInDays(now, createdAt)
      : differenceInHours(now, createdAt)

  return diff >= minAccountAge
}

const AccountFilterOptions = {
  accountReviewOpen: {
    label: 'Accounts in unresolved review state',
  },
  accountReviewAppealed: {
    label: 'Accounts in appealed state',
  },
  accountReviewEscalated: {
    label: 'Accounts in escalated state',
  },
  accountTakendown: {
    label: 'Accounts that have been taken down',
  },
  accountDeactivated: {
    label: 'Deactivated accounts',
  },
  accountEmailUnConfirmed: {
    label: 'Accounts that have not confirmed their email address',
  },
}

const ContentFilterOptions = {
  contentReviewOpen: { label: 'Content in unresolved review state' },
  contentReviewAppealed: { label: 'Content in appealed state' },
  contentReviewEscalated: { label: 'Content in escalated state' },
  contentTakendown: { label: 'Content that have been taken down' },
  contentAuthorDeactivated: { label: 'Content from deactivated accounts' },
  contentWithImageEmbed: { label: 'Content with image embed' },
  contentWithVideoEmbed: { label: 'Content with video embed' },
}

const matchKeyword = (keyword?: string, subject?: string) => {
  if (!keyword || !subject) return false
  const keywords = keyword.split('||')
  return keywords.some((k) =>
    subject.toLowerCase().includes(k.trim().toLowerCase()),
  )
}

export const WorkspaceFilterSelector = ({
  listData,
}: {
  listData: WorkspaceListData | undefined
}) => {
  const [filters, setFilters] = useState({
    accountReviewOpen: false,
    accountReviewAppealed: false,
    accountReviewEscalated: false,
    accountTakendown: false,
    accountDeactivated: false,
    accountEmailUnConfirmed: false,
    contentReviewOpen: false,
    contentReviewAppealed: false,
    contentReviewEscalated: false,
    contentTakendown: false,
    contentAuthorDeactivated: false,
    contentWithImageEmbed: false,
    contentWithVideoEmbed: false,
    keyword: '',
    minAccountAge: '',
    minAccountAgeUnit: 'days',
  })

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    const newFilters = { ...filters }
    if (!filters[name]) {
      newFilters[name] = checked
    } else {
      delete newFilters[name]
    }
    setFilters(newFilters)
  }

  const selectAll = () => {
    if (!listData) return
    Object.keys(listData).forEach((uri) => {
      toggleItemCheck(uri)
    })
  }

  const unselectAll = () => {
    if (!listData) return
    Object.keys(listData).forEach((uri) => {
      toggleItemCheck(uri, false)
    })
  }

  const toggleFilteredItems = (select: boolean = true) => {
    if (!listData) return
    Object.entries(listData).forEach(([uri, item]) => {
      const subjectStatus = getSubjectStatusFromItemData(item)
      if (uri.startsWith('did:')) {
        const isRepo = ToolsOzoneModerationDefs.isRepoViewDetail(item)
        const profile = isRepo
          ? getProfileFromRepo(item.relatedRecords)
          : undefined
        if (
          (filters.accountReviewOpen &&
            subjectStatus?.reviewState ===
              ToolsOzoneModerationDefs.REVIEWOPEN) ||
          (filters.accountReviewAppealed && subjectStatus?.appealed) ||
          (filters.accountReviewEscalated &&
            subjectStatus?.reviewState ===
              ToolsOzoneModerationDefs.REVIEWESCALATED) ||
          (filters.accountTakendown && subjectStatus?.takendown) ||
          (filters.accountEmailUnConfirmed &&
            isRepo &&
            !item.emailConfirmedAt) ||
          (filters.accountDeactivated && isRepo && item.deactivatedAt) ||
          (filters.keyword &&
            isRepo &&
            matchKeyword(filters.keyword, profile?.description)) ||
          matchMinimumAccountAge(
            filters.minAccountAgeUnit,
            profile?.createdAt,
            filters.minAccountAge ? Number(filters.minAccountAge) : 0,
          )
        ) {
          toggleItemCheck(uri, select)
        }
      } else {
        const isRecord = ToolsOzoneModerationDefs.isRecordViewDetail(item)
        if (
          (filters.contentReviewOpen &&
            subjectStatus?.reviewState ===
              ToolsOzoneModerationDefs.REVIEWOPEN) ||
          (filters.contentReviewAppealed && subjectStatus?.appealed) ||
          (filters.contentReviewEscalated &&
            subjectStatus?.reviewState ===
              ToolsOzoneModerationDefs.REVIEWESCALATED) ||
          (filters.contentTakendown && subjectStatus?.takendown) ||
          (filters.contentAuthorDeactivated &&
            isRecord &&
            item.repo.deactivatedAt) ||
          (filters.contentWithImageEmbed &&
            subjectStatus?.tags?.includes('embed:image')) ||
          (filters.contentWithVideoEmbed &&
            subjectStatus?.tags?.includes('embed:video')) ||
          (filters.keyword &&
            isRecord &&
            matchKeyword(
              filters.keyword,
              item.value?.['text'] ? `${item.value?.['text']}` : undefined,
            ))
        ) {
          toggleItemCheck(uri, select)
        }
      }
    })
  }

  return (
    <Popover className="relative z-30">
      {({ open }) => (
        <>
          <Popover.Button className="text-sm flex flex-row items-center z-20">
            <ActionButton
              appearance="outlined"
              size="xs"
              type="button"
              title="Select/unselect all items"
            >
              <CheckIcon className="h-4 w-3" />
            </ActionButton>
          </Popover.Button>

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
            <Popover.Panel className="absolute left-0 z-30 mt-1 flex w-screen max-w-max -translate-x-1/5 px-4">
              <div className="w-fit-content flex-auto rounded bg-white dark:bg-slate-800 p-4 text-sm leading-6 shadow-lg dark:shadow-slate-900 ring-1 ring-gray-900/5">
                <div className="flex flex-col md:flex-row md:gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Account filter
                    </h3>

                    {Object.entries(AccountFilterOptions).map(
                      ([key, checkbox]) => {
                        return (
                          <Checkbox
                            key={key}
                            value="true"
                            id={key}
                            name={key}
                            className="mb-2 flex items-center"
                            label={checkbox.label}
                            onChange={handleFilterChange}
                          />
                        )
                      },
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2 md:mt-0">
                      Content filter
                    </h3>

                    {Object.entries(ContentFilterOptions).map(
                      ([key, checkbox]) => {
                        return (
                          <Checkbox
                            key={key}
                            value="true"
                            id={key}
                            name={key}
                            className="mb-2 flex items-center"
                            label={checkbox.label}
                            onChange={handleFilterChange}
                          />
                        )
                      },
                    )}
                  </div>
                </div>
                <div className="mb-2">
                  <FormLabel
                    label="Keyword"
                    htmlFor="keyword"
                    className="flex-1"
                  >
                    <Input
                      type="text"
                      id="keyword"
                      name="keyword"
                      required
                      list="subject-suggestions"
                      placeholder="Keyword"
                      className="block w-full"
                      value={filters.keyword}
                      onChange={(ev) =>
                        setFilters({ ...filters, keyword: ev.target.value })
                      }
                      autoComplete="off"
                    />
                  </FormLabel>
                </div>
                <p className="py-2 block max-w-lg text-gray-500 dark:text-gray-300 text-xs">
                  You can use {'||'} separator in the keyword filter to look for
                  multiple keywords in either {"user's"} profile bio or record
                  content
                </p>
                <div className="mb-2">
                  <FormLabel
                    label="Min. account age"
                    htmlFor="minAccountAge"
                    className="flex-1"
                  >
                    <div className="flex flex-row gap-2">
                      <Input
                        type="number"
                        id="minAccountAge"
                        name="minAccountAge"
                        className="block"
                        value={filters.minAccountAge}
                        onChange={(ev) =>
                          setFilters({
                            ...filters,
                            minAccountAge: ev.target.value,
                          })
                        }
                        autoComplete="off"
                      />
                      <Dropdown
                        className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
                        items={[
                          {
                            id: 'days',
                            text: 'days',
                            onClick: () =>
                              setFilters({
                                ...filters,
                                minAccountAgeUnit: 'days',
                              }),
                          },
                          {
                            id: 'hours',
                            text: 'hours',
                            onClick: () =>
                              setFilters({
                                ...filters,
                                minAccountAgeUnit: 'hours',
                              }),
                          },
                        ]}
                      >
                        {filters.minAccountAgeUnit}
                        <ChevronDownIcon
                          className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
                          aria-hidden="true"
                        />
                      </Dropdown>
                    </div>
                  </FormLabel>
                </div>
                <p className="py-2 block max-w-lg text-gray-500 dark:text-gray-300 text-xs">
                  Account age is computed using profile creation date. Some bots
                  and accounts may not have this set.
                </p>
                <p className="py-2 block max-w-lg text-gray-500 dark:text-gray-300 text-xs border-t border-gray-700">
                  You can select or unselect all items that matches the above
                  configured filters. The configured filters work with OR
                  operator. <br />
                  So, if you select {'"Deactivated accounts"'} and
                  {'"Accounts in appealed state"'}, all accounts that are either
                  deactivated OR in appealed state will be selected. <br />
                </p>
                <div className="flex flex-row mt-2 gap-2">
                  <ActionButton
                    size="xs"
                    appearance="outlined"
                    onClick={() => {
                      toggleFilteredItems()
                    }}
                  >
                    <span className="text-xs">Select Filtered</span>
                  </ActionButton>
                  <ActionButton
                    size="xs"
                    appearance="outlined"
                    onClick={() => {
                      toggleFilteredItems(false)
                    }}
                  >
                    <span className="text-xs">Unselect Filtered</span>
                  </ActionButton>
                  <ActionButton
                    size="xs"
                    appearance="outlined"
                    onClick={() => {
                      unselectAll()
                    }}
                  >
                    <span className="text-xs">Unselect All</span>
                  </ActionButton>
                  <ActionButton
                    size="xs"
                    appearance="outlined"
                    onClick={() => {
                      selectAll()
                    }}
                  >
                    <span className="text-xs">Select All</span>
                  </ActionButton>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
