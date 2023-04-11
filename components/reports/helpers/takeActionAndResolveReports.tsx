import { ComAtprotoAdminDefs } from '@atproto/api'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { ModActionFormValues } from '../../../app/actions/ModActionPanel'
import client from '../../../lib/client'
import { createSubjectFromId } from './createSubjectFromId'
import { isIdRecord } from './isIdRecord'

export const takeActionAndResolveReports = async (
  vals: ModActionFormValues,
) => {
  const takeModerationActionAsync = async () => {
    let actionId: number
    let action: ComAtprotoAdminDefs.ActionView | undefined
    if (vals.currentActionId) {
      actionId = vals.currentActionId
    } else {
      const subject = await createSubjectFromId(vals.subject)
      const result = await client.api.com.atproto.admin.takeModerationAction(
        {
          subject,
          action: vals.action,
          reason: vals.reason,
          subjectBlobCids: vals.subjectBlobCids.length
            ? vals.subjectBlobCids
            : undefined,
          createdBy: client.session.did,
        },
        { headers: client.adminHeaders(), encoding: 'application/json' },
      )
      action = result.data
      actionId = action.id
    }
    if (vals.resolveReportIds.length) {
      const result =
        await client.api.com.atproto.admin.resolveModerationReports(
          {
            actionId: actionId,
            reportIds: vals.resolveReportIds,
            createdBy: client.session.did,
          },
          { headers: client.adminHeaders(), encoding: 'application/json' },
        )
      action = result.data
    }
    return action
  }

  return await toast.promise(takeModerationActionAsync, {
    pending: 'Taking action...',
    error: {
      render({ data }: any) {
        const errorMessage = data?.message ?? ''
        return `Error taking action: ${errorMessage}`
      },
    },
    success: {
      render({ data: newAction }) {
        const actionId = newAction?.id
        const actionType = newAction?.action
        const actionTypeString = actionType && actionOptions[actionType]

        const isRecord = isIdRecord(vals.subject)
        const title = `${isRecord ? 'Record' : 'Repo'} was ${actionTypeString}`

        return (
          <div>
            {title} -{' '}
            <Link
              href={`/actions/${actionId}`}
              className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
            >
              View #{actionId}
            </Link>
          </div>
        )
      },
    },
  })
}

const actionOptions = {
  [ComAtprotoAdminDefs.ACKNOWLEDGE]: 'acknowledged',
  [ComAtprotoAdminDefs.FLAG]: 'flagged',
  [ComAtprotoAdminDefs.TAKEDOWN]: 'taken-down',
  // Legacy
  'com.atproto.admin.moderationAction#acknowledge': 'acknowledged',
  'com.atproto.admin.moderationAction#flag': 'flagged',
  'com.atproto.admin.moderationAction#takedown': 'taken-down',
}
