'use client'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { ComAtprotoAdminRecord as AdminRecord } from '@atproto/api'
import { useState } from 'react'
import { ActionView } from '../../../components/reports/ActionView'
import { getSubjectString } from '../../../components/reports/ActionView/getSubjectString'
import { ReverseActionPanel } from '../../../components/reports/ReverseActionPanel'
import client from '../../../lib/client'
import { actionOptions } from '../ModActionPanel'

export default function Action({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const [reverseActionPanelOpen, setReverseActionPanelOpen] = useState(false)

  const { data: action, refetch } = useQuery({
    queryKey: ['action', { id }],
    queryFn: async () => {
      const { data } = await client.api.com.atproto.admin.getModerationAction(
        { id: parseInt(id, 10) },
        { headers: client.adminHeaders() },
      )
      return data
    },
  })
  if (!action) {
    return null
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
                    AdminRecord.isView(action.subject) ? 'record' : 'repo'
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
