import { SectionHeader } from '../../components/SectionHeader'
import { ReportsTable } from '../../components/reports/ReportsTable'

const TABS = [
  { key: 'unresolved', name: 'Unresolved', href: '/reports?resolved=false' },
  { key: 'resolved', name: 'Resolved', href: '/reports?resolved=true' },
  { key: 'all', name: 'All', href: '/reports' },
]

export default function Reports() {
  return (
    <>
      <SectionHeader title="Reports" tabs={TABS} current="unresolved" />
      <ReportsTable />
    </>
  )
}
