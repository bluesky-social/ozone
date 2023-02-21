'use client'
import { useQuery } from '@tanstack/react-query'
import { ReportView } from '../../../components/repositories/ReportView'
import client from '../../../lib/client'

export default function Report({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  // Just some temp UI!
  return <ReportView id={id} />
}
