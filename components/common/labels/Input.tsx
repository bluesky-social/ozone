import { Fragment } from 'react'
import { Popover, Transition } from '@headlessui/react'
import { useSyncedState } from '@/lib/useSyncedState'
import { LabelChip, LabelList, LabelListEmpty } from './List'
import {
  labelOptions,
  displayLabel,
  groupLabelList,
  getLabelGroupInfo,
  buildAllLabelOptions,
  isSelfLabel,
  unFlagSelfLabel,
} from './util'
import { classNames } from '@/lib/util'

const EMPTY_ARR = []

export function LabelsInput(props: LabelsProps) {
  const {
    id,
    formId,
    name,
    className = '',
    defaultLabels = EMPTY_ARR,
    options = labelOptions,
    disabled,
    ...others
  } = props
  const allOptions = buildAllLabelOptions(defaultLabels, options)
  const [packedCurrent, setPackedCurrent] = useSyncedState(
    packMemo(defaultLabels),
  )
  const current = unpackMemo<string[]>(packedCurrent)
  const groupedLabelList = groupLabelList(allOptions)
  
  return (
    <Popover className="relative">
      <Popover.Button
        as={LabelList}
        // @ts-ignore
        disabled={disabled}
        className={`${disabled ? '' : 'cursor-pointer'}	${className}`}
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
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
        beforeLeave={() => {
          const form = document.getElementById(formId) as HTMLFormElement
          if (!form) throw new Error(`Form with id ${formId} doesn't exist`)
          const nextLabels = new FormData(form)
            .getAll(`${name}-staged`)
            .map((val) => String(val))
          setPackedCurrent(packMemo(nextLabels))
        }}
      >
        <Popover.Panel className="absolute left-1/2 z-10 mt-1 flex w-screen max-w-max -translate-x-1/2 px-4">
          <div className="w-screen max-w-sm flex-auto rounded bg-white p-4 text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
            <div
              className="space-y-1 flex flex-row flex-wrap justify-between"
              id={`${id}-staged-container`}
            >
              {Object.values(groupedLabelList).map((group, groupIndex) => {
                const groupTitle = group.strings.settings.en.name
                return (
                  <div
                    key={`label_group_${groupTitle}`}
                    className={`w-1/2 ${
                      [0, 1].includes(groupIndex) ? '' : 'pt-2'
                    }`}
                  >
                    <p className="pb-1" style={{ color: group.color }}>
                      {groupTitle}
                    </p>
                    <div className="flex flex-col">
                      {group.labels.map((opt, i) => {
                        const labelText = typeof opt === 'string' ? opt : opt.id
                        const cantChange = isSelfLabel(labelText)
                        return (
                          <div
                            key={labelText}
                            className={classNames(
                              `relative flex items-start mr-2`,
                              cantChange ? 'opacity-75' : '',
                            )}
                          >
                            <div className="flex h-6 items-center">
                              <input
                                id={`${groupIndex}-${id}-opt-${i}`}
                                name={`${name}-staged`}
                                type="checkbox"
                                disabled={cantChange}
                                value={labelText}
                                defaultChecked={current.includes(labelText)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                              />
                            </div>
                            <label
                              htmlFor={`${groupIndex}-${id}-opt-${i}`}
                              className="ml-3 text-sm leading-6 font-medium text-gray-900"
                            >
                              {displayLabel(labelText)}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
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
}

function packMemo(val: unknown) {
  return JSON.stringify(val)
}

function unpackMemo<T>(memo: string) {
  return JSON.parse(memo) as T
}
