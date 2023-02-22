'use client'
import { ReportView } from '../../../components/repositories/ReportView'

export default function Report({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  return <ReportView id={id} />
}
