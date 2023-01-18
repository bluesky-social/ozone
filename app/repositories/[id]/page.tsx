import { SectionHeader } from '../../../components/SectionHeader'
import { AccountView } from '../../../components/repositories/AccountView'

const TABS = [
  { key: 'overview', name: 'Overview', href: '/repositories/x' },
  { key: 'account', name: 'Account', href: '/repositories/x/account' },
]

export default function Repository({ params }: { params: { id: string } }) {
  return (
    <>
      <SectionHeader title="Repository" tabs={TABS} current="account" />
      <AccountView id={params.id} />
    </>
  )
}
