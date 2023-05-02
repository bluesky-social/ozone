import { Disclosure } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { RecordCard, RepoCard } from '../../../components/common/RecordCard'
import { ReasonBadge } from '../../../components/reports/ReasonBadge'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { PreviewCard } from '../../../components/common/PreviewCard'

interface Props {
  shortCollection?: string
  resolved: boolean
  report: ComAtprotoAdminDefs.ReportView
  name?: string
  summary: {
    did: string
    collection: string | null
    rkey: string | null
  } | null
}

export function ReportItemAccordian(props: Props) {
  const { shortCollection, resolved, report, name, summary } = props
  return (
    <Disclosure as="div" className="w-full">
      {({ open }) => (
        <>
          <Disclosure.Button className="flex justify-between w-full px-4 py-2 text-sm font-medium text-left text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75">
            <div className="flex items-center">
              <input
                id={`report-${report.id}`}
                name={name}
                value={report.id}
                aria-describedby={`report-${report.id}-description`}
                type="checkbox"
                defaultChecked
                className="h-4 w-4 mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                onClick={(e) => e.stopPropagation()} // Stop the event propagation here
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault() // make sure we don't submit the form
                    e.currentTarget.click() // simulate a click on the input
                  }
                }}
              />
              <ReasonBadge reasonType={report.reasonType} /> {report.reason}
              <p className="ml-2 font-medium text-gray-700">
                <span
                  className={`font-bold ${
                    resolved ? 'text-green-500' : 'text-yellow-500'
                  }`}
                >
                  #{report.id}
                </span>{' '}
                {shortCollection &&
                  `${shortCollection} record by ${summary?.did} reported by ${report.reportedBy}`}
                {!shortCollection &&
                  `repo ${summary?.did} reported by ${report.reportedBy}`}
              </p>
            </div>
            <ChevronDownIcon
              className={`${
                open ? 'transform rotate-180' : ''
              } w-5 h-5 text-gray-500`}
            />
          </Disclosure.Button>
          <Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500">
            {/* Record that was reported (either user or post) */}
            <PreviewCard
              did={
                report.subject.uri
                  ? (report.subject.uri as string)
                  : (report.subject.did as string)
              }
            />
            {/* User who reported  */}
            <PreviewCard did={report.reportedBy} title="Reported by user" />
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}
