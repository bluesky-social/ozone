'use client'
import { AccountView } from '../../../components/repositories/AccountView'

export default function Repository({ params }: { params: { id: string } }) {
  return <AccountView id={params.id} />
}
