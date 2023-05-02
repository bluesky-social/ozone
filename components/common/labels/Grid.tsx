import { Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useSyncedState } from '../../../lib/useSyncedState'
import { labelOptions, displayLabel } from './util'

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
    ...others
  } = props
  const allOptions = unique([...defaultLabels, ...options]).sort()
  const [packedCurrent, setPackedCurrent] = useSyncedState(
    packMemo(defaultLabels),
  )
  const current = unpackMemo<string[]>(packedCurrent)

  return (
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
      <div
        className={`flex flex-row flex-wrap gap-2 px-2 ${className}`}
        {...others}
      >
        {allOptions.map((opt, i) => {
          return (
            <div key={opt} className="inline">
              <input
                id={`${id}-opt-${i}`}
                name={`${name}-staged`}
                type="checkbox"
                value={opt}
                defaultChecked={current.includes(opt)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault() // make sure we don't submit the form
                    e.currentTarget.click() // simulate a click on the input
                  }
                }}
              />
              <label
                htmlFor={`${id}-opt-${i}`}
                className="ml-1 text-sm leading-6 font-medium text-gray-900"
              >
                {displayLabel(opt)}
              </label>
            </div>
          )
        })}
      </div>
    </Transition>
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
