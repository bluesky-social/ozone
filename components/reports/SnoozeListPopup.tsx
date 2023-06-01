import { ComAtprotoAdminDefs } from '@atproto/api'
import { Popover, Transition } from '@headlessui/react'
import { BellSnoozeIcon } from '@heroicons/react/20/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { addHours, format, formatRelative } from 'date-fns'
import Link from 'next/link'
import { Fragment, useState } from 'react'
import {
  getSnoozedSubjectList,
  removeSnoozedSubject,
  SnoozeLocalStorageRecord,
} from './helpers/snoozeSubject'

export const SnoozeListPopup = ({ onChange }: { onChange: () => void }) => {
  const [snoozedSubjects, setSnoozedSubjects] =
    useState<SnoozeLocalStorageRecord>({})

  const snoozedSubjectKeys = Object.keys(snoozedSubjects)
  const refreshSnoozedSubjects = () =>
    setSnoozedSubjects(getSnoozedSubjectList())

  return (
    <Popover className="relative inline-block">
      <Popover.Button className="flex-1 text-gray-500 hover:text-amber-600 whitespace-nowrap font-medium text-sm align-text-bottom mr-4">
        Snoozed{' '}
        <BellSnoozeIcon className="inline-block h-4 w-4 align-text-bottom" />
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
        beforeEnter={refreshSnoozedSubjects}
      >
        <Popover.Panel className="absolute left-1/2 z-10 mt-1 flex w-screen max-w-max px-4 -translate-x-1/2">
          <div className="w-screen max-w-sm flex-auto rounded bg-white p-4 text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
            <div className="space-y-1 text-left">
              <h4 className="pb-2 font-medium text-gray-600">
                <BellSnoozeIcon className="inline-block h-4 w-4 align-text-bottom" />{' '}
                Snoozed Subjects
              </h4>
              {snoozedSubjectKeys.length > 0 ? (
                <div>
                  <p>
                    Removing a subject from snooze will cause all reports for
                    that subject to start showing up on the reports panel
                  </p>
                  {snoozedSubjectKeys.map((subject, i) => {
                    const isAtUri = subject.startsWith('at://')
                    const { at, duration } = snoozedSubjects[subject]
                    const snoozedTil = formatRelative(
                      addHours(new Date(at), duration),
                      new Date(),
                    )
                    const subjectUrl = isAtUri
                      ? subject.replace('at://', '')
                      : subject

                    return (
                      <div
                        className={`pt-2 mt-2 flex flex-row justify-between ${
                          i === 0 ? '' : 'border-t border-gray-200'
                        }`}
                        key={subject}
                      >
                        <div className="overflow-hidden pr-3">
                          <Link
                            target="_blank"
                            href={`/repositories/${subjectUrl}`}
                            className="text-gray-700 hover:text-gray-700 text-ellipsis overflow-hidden block"
                          >
                            {subject}
                          </Link>
                          <p className="text-gray-400">
                            Snoozed till {snoozedTil}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeSnoozedSubject(subject)
                            onChange()
                            refreshSnoozedSubjects()
                          }}
                        >
                          <span className="sr-only">Remove snooze</span>
                          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p>You have not snoozed any subject yet.</p>
              )}
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
