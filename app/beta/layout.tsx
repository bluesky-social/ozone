'use client'

import { AssignmentsProvider } from '@/assignments/AssignmentsContext'

export default function BetaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AssignmentsProvider>{children}</AssignmentsProvider>
}
