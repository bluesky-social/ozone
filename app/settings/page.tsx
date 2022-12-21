import { SectionHeader } from '../../components/SectionHeader'

const TABS = [{ key: 'server', name: 'Server', href: '/settings' }]

export default function Settings() {
  return (
    <>
      <SectionHeader title="Settings" tabs={TABS} current="server" />
    </>
  )
}
