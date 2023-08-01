'use client'
import { AccountView } from '@/repositories/AccountView'
import { createReport } from '@/repositories/createReport'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'

export default function Repository({ params }: { params: { id: string } }) {
  const { id: rawId } = params
  const id = decodeURIComponent(rawId)
  const {
    error,
    data: { repo, profile } = {},
    refetch,
  } = useRepoAndProfile({ id })

  return (
    <AccountView
      repo={repo}
      profile={profile}
      onSubmit={async (vals) => {
        await createReport(vals)
        refetch()
      }}
      error={error}
      id={id}
    />
  )
}
