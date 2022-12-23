import { AccountView as AccountViewCom } from '../../../../components/accounts/AccountView'

export default function AccountView({ params }: { params: { id: string } }) {
  return <AccountViewCom id={params.id} />
}
