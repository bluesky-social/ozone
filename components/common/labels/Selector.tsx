import { useState } from 'react'
import { ALL_LABELS, getCustomLabels } from './util'
import { Input } from '../forms'

const EMPTY_ARR = []

export const LabelSelector = (props: LabelsProps) => {
  const {
    id,
    formId,
    name,
    defaultLabels = EMPTY_ARR,
    disabled,
    onChange,
  } = props
  const [query, setQuery] = useState<string>('')
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    defaultLabels.map((label) => label),
  )
  const selectorOptions = Array.from(
    new Set([
      ...getCustomLabels(),
      ...Object.values(ALL_LABELS).map(({ identifier }) => identifier),
      ...selectedLabels,
    ]),
  )
    // If there's a query string, filter to only show the labels that match the query
    // this is also used to show a message when no labels are found to allow the user
    // add the custom input as a label
    .filter((label) => {
      if (!query) return true
      return label.toLowerCase().includes(query.toLowerCase())
    })
    .sort((prev, next) => prev.localeCompare(next))

  // Function to toggle label selection
  const toggleLabel = (label) => {
    const isSelected = selectedLabels.find((l) => l === label)
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

  // TODO: selected label text doesn't feel very nice here
  return (
    <>
      <input
        type="hidden"
        name={name}
        {...{ id, formId, disabled }}
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
      <div className="flex flex-wrap">
        {selectorOptions?.length ? (
          selectorOptions.map((label) => {
            const selectedLabel = selectedLabels.find((l) => l === label)
            const isSelected = !!selectedLabel

            return (
              <button
                key={label}
                type="button"
                className={`mr-1 my-1 px-2 py-0.5 text-xs rounded-md ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-500 text-white dark:bg-teal-600 dark:border-teal-500'
                    : 'bg-white dark:bg-gray-600 dark:border-slate-500'
                } inline-flex items-center border`}
                onClick={() => toggleLabel(label)}
              >
                {label}
              </button>
            )
          })
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
  formId: string
  name: string
  disabled?: boolean
  defaultLabels?: string[]
  options?: string[]
  onChange?: (labels: string[]) => void
}
