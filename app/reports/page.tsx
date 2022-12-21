import { SectionHeader } from '../../components/SectionHeader'
import { ReportsTable } from '../../components/reports/ReportsTable'

const TABS = [{ key: 'feed', name: 'Recent', href: '/reports' }]

export default function Reports() {
  return (
    <>
      <SectionHeader title="Reports" tabs={TABS} current="feed" />
      <ReportsTable />
    </>
  )
}
