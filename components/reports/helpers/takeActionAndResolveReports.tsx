import { ComAtprotoAdminDefs } from '@atproto/api'
import Link from 'next/link'
import { toast, Icons } from 'react-toastify'
import { ModActionFormValues } from '../../../app/actions/ModActionPanel'
import client from '@/lib/client'
import { createSubjectFromId } from './subject'
import { isIdRecord } from './subject'
import { displayError } from '../../common/Loader'
import { queryClient } from 'components/QueryClient'

export const takeActionAndResolveReports = async (
  vals: ModActionFormValues,
) => {
  const takeModerationActionAsync = async () => {
    let actionId: number
    let action: ComAtprotoAdminDefs.ActionView | undefined
    let resolveAddlReportIds: number[] = []
    let replacedCreateLabelVals: string[] = []
    let replacedNegateLabelVals: string[] = []

    if (vals.currentActionId && !vals.replacingAction) {
      actionId = vals.currentActionId
    } else {
      const subject = await createSubjectFromId(vals.subject)
      if (vals.currentActionId && vals.replacingAction) {
        const { data: replacedAction } =
          await client.api.com.atproto.admin.reverseModerationAction(
            {
              id: vals.currentActionId,
              reason: 'Replacing action',
              createdBy: client.session.did,
            },
            { headers: client.adminHeaders(), encoding: 'application/json' },
          )
        resolveAddlReportIds = replacedAction.resolvedReportIds
        replacedCreateLabelVals = replacedAction.createLabelVals ?? []
        replacedNegateLabelVals = replacedAction.negateLabelVals ?? []
      }
      const result = await client.api.com.atproto.admin.takeModerationAction(
        {
          subject,
          action: vals.action,
          reason: vals.reason,
          subjectBlobCids: vals.subjectBlobCids.length
            ? vals.subjectBlobCids
            : undefined,
          createdBy: client.session.did,
          ...dedupeLabels({
            // account for label applications from the reversal
            createLabelVals: [
              ...vals.createLabelVals,
              ...replacedCreateLabelVals,
            ],
            negateLabelVals: [
              ...vals.negateLabelVals,
              ...replacedNegateLabelVals,
            ],
          }),
        },
        { headers: client.adminHeaders(), encoding: 'application/json' },
      )
      action = result.data
      actionId = action.id
    }
    const resolveReportIds = [...vals.resolveReportIds, ...resolveAddlReportIds]
    if (resolveReportIds.length) {
      const result =
        await client.api.com.atproto.admin.resolveModerationReports(
          {
            actionId: actionId,
            reportIds: resolveReportIds,
            createdBy: client.session.did,
          },
          { headers: client.adminHeaders(), encoding: 'application/json' },
        )
      action = result.data
    }
    return { id: actionId, ...action }
  }

  try {
    await toast.promise(takeModerationActionAsync, {
      pending: 'Taking action...',
      success: {
        render({ data }) {
          const actionId = data?.id
          const actionType = data?.action
          const actionTypeString = actionType && actionOptions[actionType]

          const isRecord = isIdRecord(vals.subject)
          const title = `${isRecord ? 'Record' : 'Repo'} was ${
            actionTypeString ?? 'actioned'
          }`

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
    if (vals.subject?.startsWith('did')) {
      // This may not be all encompassing because in the accountView query, the id may be a did or a handle
      queryClient.invalidateQueries(['accountView', { id: vals.subject }])
    }
  } catch (err) {
    if (err?.['error'] === 'SubjectHasAction') {
      toast.warn(
        'We found that subject already has a current action. You may proceed by resolving with that action, or replacing it.',
      )
    } else {
      toast.error(`Error taking action: ${displayError(err)}`)
    }
    throw err
  }
}

const actionOptions = {
  [ComAtprotoAdminDefs.ACKNOWLEDGE]: 'acknowledged',
  [ComAtprotoAdminDefs.ESCALATE]: 'escalated',
  [ComAtprotoAdminDefs.FLAG]: 'flagged',
  [ComAtprotoAdminDefs.TAKEDOWN]: 'taken-down',
  // Legacy
  'com.atproto.admin.moderationAction#acknowledge': 'acknowledged',
  'com.atproto.admin.moderationAction#flag': 'flagged',
  'com.atproto.admin.moderationAction#takedown': 'taken-down',
}

// handles cases where same label appears multiple times across both createLabelVals and negateLabelVals.
// this can happen because of the way we coordinate labels when there's an action reversal/replacement.
const dedupeLabels = (labels: {
  createLabelVals: string[]
  negateLabelVals: string[]
}) => {
  return {
    createLabelVals: dedupe(
      minus(labels.createLabelVals, labels.negateLabelVals),
    ),
    negateLabelVals: dedupe(
      minus(labels.negateLabelVals, labels.createLabelVals),
    ),
  }
}

const minus = (a: string[], b: string[]) => {
  return a.filter((item) => !b.includes(item))
}

const dedupe = (list: string[]) => [...new Set(list)]
