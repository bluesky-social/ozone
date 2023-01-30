'use client'
import { SectionHeader } from '../../../components/SectionHeader'
import { AccountView } from '../../../components/repositories/AccountView'

const TABS = [
  { key: 'overview', name: 'Overview', href: '/repositories/[id]' },
  { key: 'account', name: 'Account', href: '/repositories/[id]/account' },
]

export default function Repository({ params }: { params: { id: string } }) {
  return (
    <>
      <SectionHeader
        title="Repository"
        tabs={TABS.map((tab) => ({
          ...tab,
          href: tab.href.replace('[id]', params.id),
        }))}
        current="account"
      />
      <AccountView id={params.id} />
    </>
  )
}
