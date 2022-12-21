import { SectionHeader } from '../../components/SectionHeader'
import { AccountsTable } from '../../components/accounts/AccountsTable'

const TABS = [
  { key: 'active', name: 'Active Accounts', href: '/accounts' },
  { key: 'invites', name: 'Invite Codes', href: '/accounts/invite-codes' },
]

export default function Accounts() {
  return (
    <>
      <SectionHeader title="Accounts" tabs={TABS} current="active" />
      <AccountsTable />
    </>
  )
}
