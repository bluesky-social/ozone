'use client'
import { ModActionFormValues } from '../../app/actions/ModActionPanel'
import client from '../../lib/client'

export const takeActionAndResolveReports = async (
  vals: ModActionFormValues,
) => {
  const { data: action } =
    await client.api.com.atproto.admin.takeModerationAction(
      {
        subject: vals.subject.startsWith('at://')
          ? {
              $type: 'com.atproto.repo.recordRef',
              uri: vals.subject,
            }
          : {
              $type: 'com.atproto.repo.repoRef',
              did: vals.subject,
            },
        action: vals.action,
        reason: vals.reason,
        subjectBlobCids: vals.subjectBlobCids.length
          ? vals.subjectBlobCids
          : undefined,
        createdBy: client.session.did,
      },
      { headers: client.adminHeaders(), encoding: 'application/json' },
    )
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
