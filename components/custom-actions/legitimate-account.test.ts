import { describe, expect, it } from 'vitest'
import { parseServerConfig } from '../../lib/server-config'
import { accountRef, prepare } from './compile'
import example from './fixtures/mark-account-legitimate.json'
import type { Snapshot } from './types'
import { ADMIN_ROLE, validateSettings } from './validation'

const action = validateSettings(example).customActions[0]
const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
function snapshot(spam: boolean, review: boolean, appealed: boolean): Snapshot {
  return {
    context: {
      serviceDid: did,
      uiOrigin: 'https://ozone.example',
      subject: accountRef(did),
      owningAccountDid: did,
      moderator: { did },
      report: {
        id: 1,
        queueId: 7,
        url: 'https://ozone.example/reports/1',
        reportType: 'tools.ozone.report.defs#reasonAppeal',
        status: 'assigned',
      },
      confirmedInputs: {},
    },
    config: parseServerConfig({ viewer: { role: ADMIN_ROLE } }),
    protectedTags: {},
    policies: {},
    subjectTags: [],
    accountTags: review ? ['needs-review'] : [],
    subjectLabels: [],
    accountLabels: [
      ...(spam ? ['spam'] : []),
      ...(review ? ['needs-review'] : []),
    ],
    subjectAppealed: appealed,
    accountAppealed: appealed,
  }
}

describe('mark account legitimate example', () => {
  it.each([true, false])(
    'closes all eligible account appeals with spam=%s',
    (spam) => {
      for (const review of [true, false]) {
        for (const appealed of [true, false]) {
          const state = snapshot(spam, review, appealed)
          // The same account workflow works from an account, a record, or without a report.
          for (const record of [true, false]) {
            if (record)
              state.context.subject = {
                $type: 'com.atproto.repo.strongRef',
                uri: `at://${did}/app.bsky.feed.post/example`,
                cid: 'bafyexample',
              }
            else {
              state.context.subject = accountRef(did)
              state.context.report = null
            }
            const operations = prepare(action, state)
            const selected = operations.filter((op) => op.status !== 'skipped')
            expect(selected.map((op) => op.stepId)).toEqual([
              ...(review
                ? ['remove-needs-review-label', 'remove-needs-review-tag']
                : []),
              ...(spam ? ['remove-spam-and-approve-appeals'] : []),
              ...(appealed ? ['resolve-account-appeal'] : []),
              ...(!spam ? ['close-appeals-without-spam'] : []),
            ])
            for (const op of selected) {
              expect(op.subject).toEqual(accountRef(did))
              if (op.request.endpoint === 'tools.ozone.moderation.emitEvent') {
                expect(op.request.body).not.toHaveProperty('reportAction.ids')
                if (op.stepId === 'remove-spam-and-approve-appeals') {
                  expect(op.continueOnError).toBeUndefined()
                  expect(op.request.body.reportAction).toEqual({
                    types: ['tools.ozone.report.defs#reasonAppeal'],
                    note: 'Account reviewed and determined legitimate.',
                  })
                } else {
                  expect(op.request.body).not.toHaveProperty('reportAction')
                }
              } else {
                expect(op.request.endpoint).toBe(
                  'tools.ozone.report.closeReports',
                )
                expect(op.request.body).toEqual({
                  subject: did,
                  reportTypes: ['tools.ozone.report.defs#reasonAppeal'],
                  isAutomated: false,
                  internalNote: 'Account reviewed and determined legitimate.',
                })
              }
            }
          }
        }
      }
    },
  )
})
