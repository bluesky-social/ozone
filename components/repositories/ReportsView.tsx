import {
  ExclamationCircleIcon,
  UserCircleIcon,
} from '@heroicons/react/20/solid'
import { useState } from 'react'
import { ButtonGroup } from '../common/buttons'
import { ModEventList } from '@/mod-event/EventList'

enum ReportViews {
  ByUser,
  ForUser,
}

export const EventsView = ({ did }: { did: string }) => {
  // We show reports loaded from repo view so separately showing loading state here is not necessary
  const [currentView, setCurrentView] = useState(ReportViews.ForUser)

  return (
    <>
      <div className="bg-white border-b border-gray-200 py-2 px-4 sm:flex sm:items-center sm:justify-between sticky top-0">
        <div />

        <div className="sm:flex mt-3 sm:mt-0 sm:ml-4">
          <ButtonGroup
            size="xs"
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
      <ModEventList subject={did} />
    </>
  )
}
