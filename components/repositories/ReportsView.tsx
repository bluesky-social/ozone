import { ComAtprotoAdminGetRepo } from '@atproto/api'
import {
  ExclamationCircleIcon,
  UserCircleIcon,
} from '@heroicons/react/20/solid'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ButtonGroup } from '../common/buttons'
import { ReportsTable } from '../reports/ReportsTable'
import client from '../../lib/client'

enum ReportViews {
  ByUser,
  ForUser,
}

const useUserReports = ({ view, did }: { view: ReportViews; did: string }) => {
  const { data, fetchNextPage, hasNextPage, isInitialLoading } =
    useInfiniteQuery({
      queryKey: [`user-reports`, did, view],
      queryFn: async ({ pageParam }) => {
        const { data } =
          await client.api.com.atproto.admin.getModerationReports(
            view === ReportViews.ByUser
              ? { reporters: [did], cursor: pageParam, limit: 25 }
              : { subject: did, cursor: pageParam, limit: 25 },
            { headers: client.adminHeaders() },
          )
        return data
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
    })

  const reports = data?.pages.flatMap((page) => page.reports) ?? []
  return { fetchNextPage, reports, hasNextPage, isInitialLoading }
}

export const ReportsView = ({
  did,
  preloadedReports,
}: {
  did: string
  preloadedReports: ComAtprotoAdminGetRepo.OutputSchema['moderation']['reports']
}) => {
  // We show reports loaded from repo view so separately showing loading state here is not necessary
  const [currentView, setCurrentView] = useState(ReportViews.ForUser)
  const { fetchNextPage, reports, hasNextPage, isInitialLoading } =
    useUserReports({ view: currentView, did })

  return (
    <>
      <div className="bg-white border-b border-gray-200 py-2 px-4 sm:flex sm:items-center sm:justify-between sticky top-0">
        <div />

        <div className="sm:flex mt-3 sm:mt-0 sm:ml-4">
          <ButtonGroup
            appearance="primary"
            items={[
              {
                id: 'By User',
                text: 'By User',
                Icon: UserCircleIcon,
                isActive: currentView === ReportViews.ByUser,
                onClick: () => setCurrentView(ReportViews.ByUser),
              },
              {
                id: 'For User',
                text: 'For User',
                Icon: ExclamationCircleIcon,
                isActive: currentView === ReportViews.ForUser,
                onClick: () => setCurrentView(ReportViews.ForUser),
              },
            ]}
          />
        </div>
      </div>
      <ReportsTable
        reports={isInitialLoading ? preloadedReports : reports}
        showLoadMore={!!hasNextPage}
        onLoadMore={fetchNextPage}
        isInitialLoading={isInitialLoading}
      />
    </>
  )
}
