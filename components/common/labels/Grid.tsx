import { Fragment } from 'react'
import { Disclosure, Transition } from '@headlessui/react'
import { useSyncedState } from '../../../lib/useSyncedState'
import { LabelChip, LabelList, LabelListEmpty } from './List'
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
    <Disclosure as="div">
      <Disclosure.Button
        as={"div"}
        className={`${disabled ? '' : 'cursor-pointer'}	${className}`}
        {...others}
      >
        {!current.length && <button>(click to add)</button>}
        {current.map((label) => (
          <LabelChip key={label}> 
            {displayLabel(label)}
            <input type="hidden" name={name} value={label} />
          </LabelChip>
        ))}
      </Disclosure.Button>
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
        <Disclosure.Panel>
          <div
            className="flex flex-wrap flex-row gap-3"
            id={`${id}-staged-container`}
          >
            {allOptions.map((opt, i) => {
              return (
                <div key={opt} className="flex flex-row">
                  <div className="flex h-6 items-center">
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
                  </div>
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
