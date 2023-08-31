import { Fragment, useState, useEffect } from 'react'
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
            className="flex flex-wrap flex-row gap-3 p-3 shadow-sm"
            id={`${id}-staged-container`}
          >
            {Object.values(groupedLabelList).map((group) => {
              return (
                <div
                  key={`label_group_${group.title}`}
                  className="flex flex-col w-1/4 pt-1 pl-2"
                >
                  <p style={{ color: group.color }}>{group.title}</p>
                  {group.labels.map((opt, i) => {
                    const cantChange = isSelfLabel(opt)
                    return (
                      <div
                        className={classNames(
                          `flex flex-row`,
                          cantChange ? 'opacity-75' : '',
                        )}
                        key={`label_${opt}`}
                      >
                        <div className="flex h-6 items-center">
                          <input
                            id={`${id}-${group.title}-opt-${i}`}
                            name={`${name}-staged`}
                            type="checkbox"
                            value={opt}
                            disabled={cantChange}
                            checked={current.includes(opt)}
                            onChange={() => handleCheckboxChange(opt)}
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
                          htmlFor={`${id}-${group.title}-opt-${i}`}
                          className="ml-1 text-sm leading-6 font-medium text-gray-900"
                        >
                          {displayLabel(opt)}
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
