'use client'
import { AccountView } from '@/repositories/AccountView'
import client from '@/lib/client'
import { useQuery } from '@tanstack/react-query'
import { createReport } from '@/repositories/createReport'

export default function Repository({ params }: { params: { id: string } }) {
  const { id: rawId } = params
  const id = decodeURIComponent(rawId)

  const {
    error,
    data: { repo, profile } = {},
    refetch,
  } = useQuery({
    queryKey: ['accountView', { id }],
    queryFn: async () => {
      const getRepo = async () => {
        let did
        if (id.startsWith('did:')) {
          did = id
        } else {
          const { data: resolved } =
            await client.api.com.atproto.identity.resolveHandle({ handle: id })
          did = resolved.did
        }
        const { data: repo } = await client.api.com.atproto.admin.getRepo(
          { did },
          { headers: client.adminHeaders() },
        )
        return repo
      }
      const getProfile = async () => {
        try {
          const { data: profile } = await client.api.app.bsky.actor.getProfile({
            actor: id,
          })
          return profile
        } catch (err) {
          if (err?.['error'] === 'AccountTakedown') {
            return undefined
          }
          throw err
        }
      }
      const [repo, profile] = await Promise.all([getRepo(), getProfile()])
      return { repo, profile }
    },
  })

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
