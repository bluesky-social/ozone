'use client'
import { ReactNode } from 'react'
import { ExclamationCircleIcon } from '@heroicons/react/20/solid'

export const Header = ({
  titleIcon,
  headerTitle,
  subHeaderTitle,
  action,
}: {
  titleIcon: ReactNode
  headerTitle: string
  subHeaderTitle: string
  action: {
    title: string
    onClick: () => void
  }
}) => {
  const { title: buttonTitle, onClick: buttonOnClick } = action
  return (
    <div className="flex flex-col sm:flex-row mx-auto space-y-6 sm:space-x-4 sm:space-y-0 max-w-5xl px-4 sm:px-6 lg:px-8 justify-between">
      <div>
        <h1 className="flex text-2xl font-bold text-gray-900 align-middle">
          {titleIcon}
          <span className="ml-1">{headerTitle}</span>
        </h1>
        <h2 className="flex-1 text-l text-gray-700">{subHeaderTitle}</h2>
      </div>
      <div>
        <button
          type="button"
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
          onClick={buttonOnClick}
        >
          <ExclamationCircleIcon
            className="-ml-1 mr-2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
          <span>{buttonTitle}</span>
        </button>
      </div>
    </div>
  )
}
