'use client'
import { REPORT_CATEGORIES } from '@/reports/stats'
import { LiveStatsCards } from '@/reports/stats/LiveStats'
import { StatsCard } from '@/reports/stats/Stats'
import { useTitle } from 'react-use'

export function AnalyticsPageContent() {
  useTitle('Analytics')

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Analytics
      </h1>

      <div className="mb-6">
        <LiveStatsCards />
      </div>

      <div className="mb-6">
        <h2 className="font-medium text-gray-500 dark:text-gray-400 mb-2">
          Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {REPORT_CATEGORIES.map((group) => (
            <StatsCard key={group.title} group={group} />
          ))}
        </div>
      </div>
    </div>
  )
}
