import { Fragment, useState } from 'react'
import { ALL_LABELS, getCustomLabels } from './util'
import { ClockIcon } from '@heroicons/react/24/outline'

import { Popover, Transition } from '@headlessui/react'
import { Checkbox } from '../forms'

const EMPTY_ARR = []

export const LabelSelector = (props: LabelsProps) => {
  const {
    id,
    formId,
    name,
    defaultLabels = EMPTY_ARR,
    options = Object.keys(ALL_LABELS),
    disabled,
    onChange,
  } = props
  const [selectedLabels, setSelectedLabels] = useState<
    { label: string; duration: number | null }[]
  >(defaultLabels.map((label) => ({ label, duration: null })))
  const selectorOptions = Array.from(
    new Set([
      ...getCustomLabels(),
      ...Object.values(ALL_LABELS).map(({ identifier }) => identifier),
    ]),
  ).sort((prev, next) => prev.localeCompare(next))

  // Function to set duration for a label
  const setDuration = (label, duration) => {
    setSelectedLabels((prev) =>
      prev.map((item) => (item.label === label ? { ...item, duration } : item)),
    )
  }

  // Function to toggle label selection
  const toggleLabel = (label) => {
    const isSelected = selectedLabels.some((item) => item.label === label)
    if (isSelected) {
      // Unselect the label
      setSelectedLabels(selectedLabels.filter((item) => item.label !== label))
    } else {
      // Select the label and open the popover for duration selection
      setSelectedLabels([...selectedLabels, { label, duration: null }])
    }
  }

  // TODO: selected label text doesn't feel very nice here
  return (
    <>
      <input
        type="hidden"
        name={name}
        {...{ id, formId, disabled }}
        value={
          Array.isArray(selectedLabels)
            ? selectedLabels
                .map(({ label, duration }) => `${label}:${duration}`)
                .join(',')
            : ''
        }
      />

      <div className="flex flex-wrap">
        {selectorOptions.map((label) => {
          const isSelected = selectedLabels.some((item) => item.label === label)
          const selectedLabel = selectedLabels.find(
            (item) => item.label === label,
          )

          return (
            <Popover key={label} className="relative">
              {({ open }) => (
                <>
                  <Popover.Button
                    className={`mr-1 my-1 px-2 py-0.5 text-xs rounded-md ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white dark:bg-teal-600 dark:border-teal-500'
                        : 'bg-white dark:bg-gray-600 dark:border-slate-500'
                    } inline-flex items-center border`}
                    onClick={() => toggleLabel(label)}
                  >
                    {selectedLabel?.duration && (
                      <ClockIcon className="h-3 w-3 mr-1" />
                    )}
                    {label}
                  </Popover.Button>
                  {isSelected && selectedLabel?.duration === null && (
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="opacity-0 translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 translate-y-1"
                    >
                      <Popover.Panel className="absolute z-10 w-64 mt-2 transform -translate-x-0 left-0 sm:px-0 lg:max-w-3xl">
                        <div className="overflow-hidden rounded-lg shadow-lg">
                          <div className="relative bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-50">
                            <div className="px-4 py-3">
                              <h3 className="font-semibold text-gray-700 dark:text-gray-100 pb-1 flex flex-row items-center">
                                Label Expiry
                              </h3>
                              <p className="leading-4 pb-3">
                                Optionally, you can choose an expiry duration
                                for the label. After that, the label will be
                                removed from the subject.
                              </p>
                              {getLabelDurationOptions().map((option) => (
                                <LabelDurationPicker
                                  key={option.text}
                                  text={option.text}
                                  onSelect={() =>
                                    setDuration(label, option.value)
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </Popover.Panel>
                    </Transition>
                  )}
                </>
              )}
            </Popover>
          )
        })}
      </div>
    </>
  )
}

const getLabelDurationOptions = () => {
  const day = 24 * 60 * 60 * 1000
  return [
    { text: '1 day', value: Date.now() + day },
    { text: '3 days', value: Date.now() + 3 * day },
    { text: '7 days', value: Date.now() + 7 * day },
  ]
}

const LabelDurationPicker = ({
  text,
  onSelect,
}: {
  text: string
  onSelect: () => void
}) => {
  return (
    <Checkbox
      value={text}
      label={text}
      onChange={onSelect}
      id={`label-${text}`}
      name={`label-${text}`}
      className="mb-1 flex items-center"
    />
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
