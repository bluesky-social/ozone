import { useMemo, useState } from 'react'

import { unique } from '@/lib/util'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { useLabelGroups, type LabelGroup } from '@/config/useLabelGroups'
import { Input } from '../forms'
import { ALL_LABELS } from './util'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/solid'
import { LabelChip } from './LabelChip'

const EMPTY_ARR = []

export const LabelSelector = (props: LabelsProps) => {
  const {
    id,
    form,
    name,
    defaultLabels = EMPTY_ARR,
    disabled,
    onChange,
  } = props
  const { config } = useConfigurationContext()
  const [query, setQuery] = useState<string>('')
  const [selectedLabels, setSelectedLabels] = useState<string[]>(defaultLabels)
  const labelGroups = useLabelGroups()

  const selectorOptions = useMemo(
    () =>
      unique([
        ...(config?.labeler?.policies.labelValues || []),
        ...Object.values(ALL_LABELS).map(({ identifier }) => identifier),
        ...selectedLabels,
      ])
        // If there's a query string, filter to only show the labels that match the query
        // this is also used to show a message when no labels are found to allow the user
        // add the custom input as a label
        .filter((label) => {
          if (!query) return true
          return label.toLowerCase().includes(query.toLowerCase())
        })
        .sort((prev, next) => prev.localeCompare(next)),
    [config, query, selectedLabels],
  )

  const organizedLabels = useMemo(() => {
    if (!labelGroups || !selectorOptions.length) {
      return { Ungrouped: selectorOptions }
    }

    const grouped: Record<string, string[]> = {}
    const groupedLabels = new Set<string>()

    // show labels in configured groups
    Object.entries(labelGroups).forEach(([groupName, groupData]) => {
      const groupLabels = selectorOptions.filter((label) =>
        (groupData as LabelGroup).labels.includes(label),
      )
      if (groupLabels.length > 0) {
        grouped[groupName] = groupLabels
        groupLabels.forEach((label) => groupedLabels.add(label))
      }
    })

    // when grouping exists, put remaining labels to "Ungrouped" option
    const remainingLabels = selectorOptions.filter(
      (label) => !groupedLabels.has(label),
    )
    if (remainingLabels.length > 0) {
      grouped['Ungrouped'] = remainingLabels
    }

    return grouped
  }, [labelGroups, selectorOptions])

  const toggleLabel = (label: string) => {
    const isSelected = selectedLabels.some((l) => l === label)
    let newSelectedLabels: string[] = []
    if (isSelected) {
      newSelectedLabels = selectedLabels.filter((l) => l !== label)
    } else {
      newSelectedLabels = [...selectedLabels, label]
    }
    // Update the label list and call the onChange function to allow the parent component know about the change
    setSelectedLabels(newSelectedLabels)
    onChange?.(newSelectedLabels)
  }

  return (
    <>
      <input
        type="hidden"
        name={name}
        {...{ id, form, disabled }}
        value={Array.isArray(selectedLabels) ? selectedLabels.join(',') : ''}
      />
      <Input
        type="text"
        value={query}
        name="searchLabel"
        className="block w-full mb-2"
        placeholder="Search or add your own label"
        onChange={(e) => setQuery(e.currentTarget.value)}
      />
      <div data-cy="label-selector-buttons">
        {selectorOptions?.length ? (
          Object.entries(organizedLabels).map(([groupName, groupLabels]) => (
            <div key={groupName} className="mb-2">
              <div className="mb-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-100">
                  {groupName}

                  {labelGroups?.[groupName]?.note && (
                    <button
                      type="button"
                      title={labelGroups[groupName].note}
                    >
                      <QuestionMarkCircleIcon className="inline-block ml-1 h-4 w-4 text-gray-700 dark:text-gray-300" />
                    </button>
                  )}
                </h3>
              </div>
              <div className="flex flex-wrap">
                {groupLabels.map((label) => {
                  const isSelected = selectedLabels.some((l) => l === label)

                  return (
                    <LabelChip
                      key={label}
                      labelValue={label}
                      labelGroups={labelGroups}
                      isSelected={isSelected}
                      interactive={true}
                      onClick={() => toggleLabel(label)}
                    />
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500 dark:text-gray-400">
            No labels found.{' '}
            {query && (
              <button
                type="button"
                className="underline"
                onClick={(e) => {
                  e.preventDefault()
                  toggleLabel(query)
                  setQuery('')
                }}
              >
                Click here to add {query} as a label.
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

type LabelsProps = {
  id: string
  form: string
  name: string
  disabled?: boolean
  defaultLabels?: string[]
  options?: string[]
  onChange?: (labels: string[]) => void
}
