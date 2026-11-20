import { describe, expect, it } from 'vitest'
import { parseServerConfig } from '../../lib/server-config'
import { accountRef, prepare } from './compile'
import type { CustomAction, Snapshot } from './types'
import { ADMIN_ROLE, validateSettings } from './validation'

const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
const appeal = 'tools.ozone.report.defs#reasonAppeal'
function fixture() {
  const state: Snapshot = {
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
        reportType: appeal,
        status: 'assigned',
      },
      confirmedInputs: {},
    },
    config: parseServerConfig({ viewer: { role: ADMIN_ROLE } }),
    protectedTags: {},
    policies: {},
    subjectTags: [],
    accountTags: [],
    subjectLabels: [],
    accountLabels: [],
    subjectAppealed: false,
    accountAppealed: false,
  }
  const action: CustomAction = {
    id: 'remove-spam',
    name: 'Remove spam',
    allowedRoles: [ADMIN_ROLE],
    subjectTypes: ['account', 'record'],
    actions: [
      {
        id: 'remove',
        type: 'event',
        target: 'account',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventLabel',
          createLabelVals: [],
          negateLabelVals: ['spam'],
        },
        reportAction: {
          scope: 'matching',
          types: [appeal],
          includeCurrent: true,
          note: 'Reviewed.',
        },
      },
    ],
  }
  return { action, state }
}

describe('matching report actions', () => {
  it('includes the current report explicitly only when its exact subject and type match', () => {
    const { action, state } = fixture()
    expect(prepare(action, state)[0].request.body).toMatchObject({
      reportAction: { ids: [1], types: [appeal], note: 'Reviewed.' },
    })
    for (const report of [
      { ...state.context.report!, status: 'closed' },
      {
        ...state.context.report!,
        reportType: 'tools.ozone.report.defs#reasonSpam',
      },
    ]) {
      state.context.report = report
      expect(prepare(action, state)[0].request.body).not.toHaveProperty(
        'reportAction.ids',
      )
    }
  })
  it('targets account reports from a record context without including that record report', () => {
    const { action, state } = fixture()
    state.context.subject = {
      $type: 'com.atproto.repo.strongRef',
      uri: `at://${did}/app.bsky.feed.post/example`,
      cid: 'bafyexample',
    }
    expect(prepare(action, state)[0].request.body).toMatchObject({
      subject: accountRef(did),
      reportAction: { types: [appeal] },
    })
    expect(prepare(action, state)[0].request.body).not.toHaveProperty(
      'reportAction.ids',
    )
    state.context.report = null
    expect(prepare(action, state)[0].request.body).toMatchObject({
      reportAction: { types: [appeal] },
    })
  })
  it('does not include the current report when includeCurrent is omitted', () => {
    const { action, state } = fixture()
    const step = action.actions[0]
    if (step.type === 'event' && step.reportAction?.scope === 'matching')
      delete step.reportAction.includeCurrent
    expect(prepare(action, state)[0].request.body).not.toHaveProperty(
      'reportAction.ids',
    )
  })
  it('rejects empty, duplicate, and unsupported selectors', () => {
    const { action } = fixture()
    for (const reportAction of [
      { scope: 'matching' },
      { scope: 'matching', types: [] },
      { scope: 'matching', types: [appeal, appeal] },
      { scope: 'matching', types: [appeal], all: true },
      { scope: 'matching', types: [appeal], includeCurrent: 'true' },
    ]) {
      Object.assign(action.actions[0], { reportAction })
      expect(() =>
        validateSettings({ version: 1, customActions: [action] }),
      ).toThrow()
    }
  })
})
