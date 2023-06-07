'use client'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { useState } from 'react'
import { ActionView } from '@/reports/ActionView'
import { ReverseActionPanel } from '@/reports/ReverseActionPanel'
import client from '@/lib/client'
import { actionOptions } from '../ModActionPanel'
import { Loading, LoadingFailed } from '@/common/Loader'
import { getSubjectString } from '@/reports/ActionView/getSubjectString'

export default function Action({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const [reverseActionPanelOpen, setReverseActionPanelOpen] = useState(false)

  const {
    data: action,
    error,
    refetch,
  } = useQuery({
    queryKey: ['action', { id }],
    queryFn: async () => {
      const { data } = await client.api.com.atproto.admin.getModerationAction(
        { id: parseInt(id, 10) },
        { headers: client.adminHeaders() },
      )
      return data
    },
  })
  if (error) {
    return <LoadingFailed error={error} />
  }
  if (!action) {
    return <Loading />
  }
  return (
    <>
      <ReverseActionPanel
        open={reverseActionPanelOpen}
        onClose={() => setReverseActionPanelOpen(false)}
        subject={getSubjectString(action.subject)}
        onSubmit={async (vals) => {
          await toast.promise(
            client.api.com.atproto.admin.reverseModerationAction(
              {
                id: action.id,
                reason: vals.reason || '',
                createdBy: client.session.did,
              },
              { headers: client.adminHeaders(), encoding: 'application/json' },
            ),
            {
              pending: 'Reversing action...',
              success: {
                render({ data }) {
                  const newAction = data?.data
                  const actionType = newAction?.action
                  const actionTypeString =
                    actionType && actionOptions[actionType]

                  const title = `${actionTypeString} on ${
                    ComAtprotoAdminDefs.isRecordView(action.subject)
                      ? 'record'
                      : 'repo'
                  } has been reversed`

                  return title
                },
              },
              error: {
                render({ data }: any) {
                  const errorMessage = data?.message ?? ''
                  return `Action could not be reversed: ${errorMessage}`
                },
              },
            },
          )
          refetch()
        }}
      />

      <ActionView
        action={action}
        setReverseActionPanelOpen={setReverseActionPanelOpen}
      />
    </>
  )
}
