import { SectionHeader } from '../../components/SectionHeader'
import { RepositoriesTable } from '../../components/repositories/RepositoriesTable'

const TABS: { key: string; name: string; href: string }[] = []

export default function Repositories() {
  return (
    <>
      <SectionHeader title="Repositories" tabs={TABS} current="active" />
      <RepositoriesTable />
    </>
  )
}
