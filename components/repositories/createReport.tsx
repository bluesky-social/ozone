import client from '../../lib/client'
import { ReportFormValues } from '../reports/ReportPanel'

export async function createReport(vals: ReportFormValues) {
  await client.api.com.atproto.report.create({
    ...vals,
    subject: vals.subject.startsWith('at://')
      ? {
          $type: 'com.atproto.repo.recordRef',
          uri: vals.subject,
        }
      : {
          $type: 'com.atproto.repo.repoRef',
          did: vals.subject,
        },
  })
}
