import {
  ComAtprotoAdminRepo as AdminRepo,
  ComAtprotoAdminRecord as AdminRecord,
  ComAtprotoAdminModerationAction as ModAction,
} from '@atproto/api'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { ModActionFormValues } from '../../../app/actions/ModActionPanel'
import client from '../../../lib/client'
import { createSubjectFromId } from './createSubjectFromId'
import { isIdRecord } from './isIdRecord'

export const takeActionAndResolveReports = async (
  vals: ModActionFormValues,
) => {
  const isRecord = isIdRecord(vals.subject)
  const subject = createSubjectFromId(vals.subject)

  const takeModerationActionAsync = async () =>
    client.api.com.atproto.admin.takeModerationAction(
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

  const { data: action } = await toast.promise(takeModerationActionAsync, {
    pending: 'Taking action...',
    error: {
      render({ data }: any) {
        const errorMessage = data?.message ?? ''
        return `Error taking action: ${errorMessage}`
      },
    },
    success: {
      render({ data }) {
        const newAction = data?.data
        const actionId = newAction?.id

        const actionType = newAction?.action
        const actionTypeString = actionType && actionOptions[actionType]
        const title = `${isRecord ? 'Record' : 'Repo'} was ${actionTypeString}`

        return (
          <div>
            {title} -{' '}
            <Link
              href={`actions/${actionId}`}
              className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
            >
              View #{actionId}
            </Link>
          </div>
        )
      },
    },
  })
  if (vals.resolveReportIds.length) {
    await client.api.com.atproto.admin.resolveModerationReports(
      {
        actionId: action.id,
        reportIds: vals.resolveReportIds,
        createdBy: client.session.did,
      },
      { headers: client.adminHeaders(), encoding: 'application/json' },
    )
  }
}

const actionOptions = {
  [ModAction.ACKNOWLEDGE]: 'acknowledged',
  [ModAction.FLAG]: 'flagged',
  [ModAction.TAKEDOWN]: 'taken-down',
}
