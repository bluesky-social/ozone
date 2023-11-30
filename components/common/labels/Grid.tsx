import { Fragment, useState, useEffect } from 'react'
import Select from 'react-tailwindcss-select'
import { Disclosure, Transition } from '@headlessui/react'
import { LabelChip, LabelListEmpty } from './List'
import {
  labelOptions,
  displayLabel,
  groupLabelList,
  getLabelGroupInfo,
  isSelfLabel,
  buildAllLabelOptions,
  unFlagSelfLabel,
} from './util'
import { classNames } from '@/lib/util'

const EMPTY_ARR = []
type SelectProps = React.ComponentProps<typeof Select>

// TODO: Probably redundant
export function LabelsGrid(props: LabelsProps) {
  const {
    id,
    formId,
    name,
    className = '',
    defaultLabels = EMPTY_ARR,
    options = labelOptions,
    disabled,
    subject,
    ...others
  } = props
  const allOptions = buildAllLabelOptions(defaultLabels, options)
  const [current, setCurrent] = useState<string[]>(defaultLabels)

  // update the current list when the current labels prop changes
  // default labels are an array of strings so passing that as dependency to the useEffect hook will
  // cause the current state to change everytime some other prop changes. the string conversion shields
  // us from that. only caveat is that it won't work when the labels don't change just their order is changed
  const defaultLabelsKey = defaultLabels.join('_')
  useEffect(() => {
    setCurrent(defaultLabels)
  }, [defaultLabelsKey, subject])

  const handleCheckboxChange = (opt: string) => {
    // don't allow self labels to be changed
    if (isSelfLabel(opt)) return
    setCurrent((prev) => {
      if (prev.includes(opt)) {
        return prev.filter((item) => item !== opt)
      } else {
        return [...prev, opt]
      }
    })
  }

  const groupedLabelList = groupLabelList(allOptions)
  // Sort by number of labels in each group so that the lists of labels take less vertical space in the UI
  const sortedLabelList = Object.values(groupedLabelList).sort(
    (a, b) => b.labels?.length - a.labels?.length,
  )

  return (
    <Disclosure as="div">
      <Disclosure.Button
        className={`${disabled ? '' : 'cursor-pointer'}	${className}`}
        disabled={disabled}
        {...others}
      >
        {!current.length && <LabelListEmpty>(click to add)</LabelListEmpty>}
        {current.map((label) => {
          const labelGroup = getLabelGroupInfo(unFlagSelfLabel(label))
          return (
            <LabelChip key={label} style={{ color: labelGroup.color }}>
              {displayLabel(label)}
              <input type="hidden" name={name} value={label} />
            </LabelChip>
          )
        })}
      </Disclosure.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Disclosure.Panel>
          <div
            className="flex flex-wrap flex-row gap-x-8 py-3 shadow-sm"
            id={`${id}-staged-container`}
          >
            {sortedLabelList.map((group) => {
              const groupTitle = group.strings.settings.en.name
              return (
                <div
                  key={`label_group_${groupTitle}`}
                  className={classNames('flex flex-col py-1 min-w-1/6')}
                >
                  <p style={{ color: group.color }}>{groupTitle}</p>
                  {group.labels.map((opt, i) => {
                    const labelText = typeof opt === 'string' ? opt : opt.id
                    const cantChange = isSelfLabel(labelText)
                    return (
                      <div
                        className={classNames(
                          `flex flex-row pl-1`,
                          cantChange ? 'opacity-75' : '',
                        )}
                        key={`label_${labelText}`}
                      >
                        <div className="flex h-6 items-center">
                          <input
                            id={`${id}-${groupTitle}-opt-${i}`}
                            name={`${name}-staged`}
                            type="checkbox"
                            value={labelText}
                            disabled={cantChange}
                            checked={current.includes(labelText)}
                            onChange={() => handleCheckboxChange(labelText)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault() // make sure we don't submit the form
                                e.currentTarget.click() // simulate a click on the input
                              }
                            }}
                          />
                        </div>
                        <label
                          htmlFor={`${id}-${groupTitle}-opt-${i}`}
                          className="ml-1 text-sm leading-6 font-medium text-gray-900"
                        >
                          {displayLabel(labelText)}
                        </label>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </Disclosure.Panel>
      </Transition>
    </Disclosure>
  )
}

export const LabelSelector = (props: LabelsProps) => {
  const {
    id,
    formId,
    name,
    className = '',
    defaultLabels = EMPTY_ARR,
    options = labelOptions,
    disabled,
    subject,
    ...others
  } = props
  const [selectedLabels, setSelectedLabels] = useState<SelectProps['value']>(
    defaultLabels.map((label) => ({
      label,
      value: label,
    })),
  )
  const allOptions = buildAllLabelOptions(defaultLabels, options)
  const groupedLabelList = groupLabelList(allOptions)
  const selectorOptions = Object.entries(groupedLabelList).map(
    ([group, groupInfo]) => ({
      label: group,
      options: groupInfo.labels.map((label) => {
        const labelText = typeof label === 'string' ? label : label.id
        return {
          label: labelText,
          value: labelText,
        }
      }),
    }),
  )

  // TODO: selected label text doesn't feel very nice here
  return (
    <>
      <input
        type="hidden"
        name={name}
        value={
          Array.isArray(selectedLabels)
            ? selectedLabels.map(({ label }) => label).join(',')
            : ''
        }
      />
      <Select
        isMultiple
        isSearchable
        primaryColor=""
        value={selectedLabels}
        options={selectorOptions}
        formatOptionLabel={(data) => {
          const labelGroup = getLabelGroupInfo(data.label)
          return (
            <li
              className={`block transition duration-200 py-1 cursor-pointer select-none truncate`}
              style={{ color: labelGroup.color }}
            >
              {data.label}
            </li>
          )
        }}
        onChange={(value) => setSelectedLabels(value)}
      />
    </>
  )
}

type LabelsProps = {
  id: string
  formId: string
  name: string
  disabled?: boolean
  className?: string
  defaultLabels?: string[]
  options?: string[]
  subject?: string
}
