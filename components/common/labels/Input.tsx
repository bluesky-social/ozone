import { Fragment } from 'react'
import { Popover, Transition } from '@headlessui/react'
import { useSyncedState } from '../../../lib/useSyncedState'
import { LabelChip, LabelList, LabelListEmpty } from './List'
import { labelOptions, displayLabel } from './util'

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
  const allOptions = unique([...defaultLabels, ...options]).sort()
  const [packedCurrent, setPackedCurrent] = useSyncedState(
    packMemo(defaultLabels),
  )
  const current = unpackMemo<string[]>(packedCurrent)
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
        {current.map((label) => (
          <LabelChip key={label}>
            {displayLabel(label)}
            <input type="hidden" name={name} value={label} />
          </LabelChip>
        ))}
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
            <div className="space-y-1" id={`${id}-staged-container`}>
              {allOptions.map((opt, i) => {
                return (
                  <div key={opt} className="relative flex items-start">
                    <div className="flex h-6 items-center">
                      <input
                        id={`${id}-opt-${i}`}
                        name={`${name}-staged`}
                        type="checkbox"
                        value={opt}
                        defaultChecked={current.includes(opt)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      />
                    </div>
                    <label
                      htmlFor={`${id}-opt-${i}`}
                      className="ml-3 text-sm leading-6 font-medium text-gray-900"
                    >
                      {displayLabel(opt)}
                    </label>
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

function unique<T>(arr: T[]) {
  const set = new Set(arr)
  return [...set]
}

function packMemo(val: unknown) {
  return JSON.stringify(val)
}

function unpackMemo<T>(memo: string) {
  return JSON.parse(memo) as T
}
