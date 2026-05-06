'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { classNames } from '@/lib/util'
import { ReassignQueueModal } from './ReassignQueueModal'

type Props = {
  reportId: number
  queue?: { id: number; name: string }
}

export function QueueBadge({ reportId, queue }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <Menu as="div" className="relative inline-block">
        <MenuButton className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
          {queue ? queue.name : 'No queue'}
          <ChevronDownIcon className="h-3 w-3" />
        </MenuButton>
        <MenuItems className="absolute z-50 mt-1 w-48 origin-top-left rounded-md bg-white dark:bg-slate-800 py-1 shadow-lg dark:shadow-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none">
          {queue && (
            <MenuItem>
              {({ focus }) => (
                <Link
                  href={`/reports/beta?queueId=${queue.id}`}
                  className={classNames(
                    focus ? 'bg-gray-100 dark:bg-slate-700' : '',
                    'block px-4 py-2 text-sm text-gray-700 dark:text-gray-100',
                  )}
                >
                  View queue
                </Link>
              )}
            </MenuItem>
          )}
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className={classNames(
                  focus ? 'bg-gray-100 dark:bg-slate-700' : '',
                  'block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-100',
                )}
              >
                Route to another queue
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Menu>

      <ReassignQueueModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        reportId={reportId}
        currentQueueId={queue?.id}
      />
    </>
  )
}
