import { Popover, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'

import { ActionButton } from '../common/buttons'

const snoozeOptions = [
  { duration: 1, text: '1 Hour' },
  { duration: 2, text: '2 Hours' },
  { duration: 6, text: '6 Hours' },
  { duration: 12, text: '12 Hours' },
]

export const SnoozeAction = ({
  onConfirm,
  panelClassName = 'mt-1 px-4',
}: {
  onConfirm: (snoozeDuration: number) => void
  panelClassName?: string
}) => {
  const [snoozeDuration, setSnoozeDuration] = useState(0)

  return (
    <Popover className="relative">
      <Popover.Button as={ActionButton} appearance="outlined">
        Snooze
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
        beforeEnter={() => setSnoozeDuration(snoozeOptions[0].duration)}
      >
        <Popover.Panel
          className={`absolute z-10 flex w-screen max-w-max ${panelClassName}`}
        >
          <div className="w-screen max-w-sm flex-auto rounded bg-white p-4 text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
            <div className="space-y-1">
              <h4 className="pb-2 font-medium text-gray-600">
                Snooze Subject?
              </h4>
              <p>
                Once snoozed, any report for this subject will not be shown for
                the selected duration
              </p>
              <div className="py-2">
                {snoozeOptions.map((snoozeOption) => {
                  return (
                    <div
                      className="flex h-6 items-center"
                      key={snoozeOption.text}
                    >
                      <input
                        id={`snooze-duration-${snoozeOption.duration}`}
                        name="snooze-duration"
                        type="radio"
                        value={snoozeOption.duration}
                        checked={snoozeDuration === snoozeOption.duration}
                        onChange={() =>
                          setSnoozeDuration(snoozeOption.duration)
                        }
                        className="h-4 w-4 rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault() // make sure we don't submit the form
                            e.currentTarget.click() // simulate a click on the input
                          }
                        }}
                      />
                      <label
                        htmlFor={`snooze-duration-${snoozeOption.duration}`}
                        className="ml-2 text-sm leading-6 font-medium text-gray-900"
                      >
                        {snoozeOption.text}
                      </label>
                    </div>
                  )
                })}
              </div>
              <ActionButton
                appearance="primary"
                onClick={() => onConfirm(snoozeDuration)}
              >
                Confirm
              </ActionButton>
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
