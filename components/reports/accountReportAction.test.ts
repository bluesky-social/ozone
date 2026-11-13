import type {
  ToolsOzoneModerationEmitEvent,
  ToolsOzoneReportDefs,
} from '@atproto/api'
import { describe, expect, it, vi } from 'vitest'
import { MOD_EVENTS } from '../mod-event/constants'
import {
  canCloseOwnedRecordReport,
  getAccountReportAction,
  linksReportToEvent,
  submitAccountReportAction,
} from './accountReportAction'

const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
const subject: ToolsOzoneModerationEmitEvent.InputSchema['subject'] = {
  $type: 'com.atproto.admin.defs#repoRef',
  did,
}
const recordSubject = {
  $type: 'com.atproto.repo.strongRef' as const,
  uri: `at://${did}/app.bsky.feed.post/example`,
  cid: 'bafyreicfgnscgpcd7ltdejjy3t3akaadmxxykhz5zixakhj4dqx7s7ax3y',
}
const createdAt = '2026-11-13T00:00:00.000Z'
const report: Pick<
  ToolsOzoneReportDefs.ReportView,
  'id' | 'subject' | 'status'
> = {
  id: 123,
  status: 'open',
  subject: {
    type: 'record',
    subject: recordSubject.uri,
    record: {
      uri: recordSubject.uri,
      cid: recordSubject.cid,
      value: {},
      blobs: [],
      indexedAt: createdAt,
      moderation: {},
      repo: {
        did,
        handle: 'example.test',
        relatedRecords: [],
        indexedAt: createdAt,
        moderation: {},
      },
    },
  },
}
const options = {
  report,
  subject,
  eventType: MOD_EVENTS.TAKEDOWN,
  scope: 'current' as const,
}

describe('closing a record report with an account action', () => {
  it.each([
    MOD_EVENTS.LABEL,
    MOD_EVENTS.TAKEDOWN,
    MOD_EVENTS.REVERSE_TAKEDOWN,
    MOD_EVENTS.ACKNOWLEDGE,
    MOD_EVENTS.COMMENT,
  ])('links only the current report for %s', (eventType) => {
    expect(canCloseOwnedRecordReport('record', eventType)).toBe(true)
    expect(getAccountReportAction({ ...options, eventType })).toEqual({
      ids: [123],
    })
  })

  it('leaves all reports open when no closure is selected', () => {
    expect(
      getAccountReportAction({ ...options, scope: 'none' }),
    ).toBeUndefined()
  })

  it('allows closing other owned reports only when explicitly selected', () => {
    expect(getAccountReportAction({ ...options, scope: 'allOwned' })).toEqual({
      ids: [123],
      allOwned: true,
    })
  })

  it('rejects the removed all-account scope', () => {
    expect(() => getAccountReportAction({ ...options, scope: 'all' })).toThrow(
      'Choose a report closure scope',
    )
  })

  it('targets matching report types on the account and the original record in one event', () => {
    expect(
      getAccountReportAction({
        ...options,
        scope: 'types',
        reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
      }),
    ).toEqual({
      ids: [123],
      types: ['com.atproto.moderation.defs#reasonSpam'],
      subjects: [recordSubject],
    })
  })

  it('uses the moderation status reference when the record is unavailable', () => {
    expect(
      getAccountReportAction({
        ...options,
        scope: 'types',
        reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
        report: {
          ...report,
          subject: {
            ...report.subject,
            record: undefined,
            status: {
              id: 1,
              subject: recordSubject,
              reviewState: 'tools.ozone.moderation.defs#reviewOpen',
              createdAt,
              updatedAt: createdAt,
            },
          },
        },
      }),
    ).toEqual({
      ids: [123],
      types: ['com.atproto.moderation.defs#reasonSpam'],
      subjects: [recordSubject],
    })
  })

  it('rejects a status reference for a different record', () => {
    expect(() =>
      getAccountReportAction({
        ...options,
        scope: 'types',
        reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
        report: {
          ...report,
          subject: {
            ...report.subject,
            record: undefined,
            status: {
              id: 1,
              subject: { ...recordSubject, uri: `${recordSubject.uri}-other` },
              reviewState: 'tools.ozone.moderation.defs#reviewOpen',
              createdAt,
              updatedAt: createdAt,
            },
          },
        },
      }),
    ).toThrow('Cannot determine the reported record')
  })

  it.each([undefined, []])(
    'closes only the current report when no report types are selected (%j)',
    (reportTypes) => {
      expect(
        getAccountReportAction({ ...options, scope: 'types', reportTypes }),
      ).toEqual({ ids: [123] })
    },
  )

  it.each(['none', 'current', 'allOwned'] as const)(
    'does not send stale report type filters for the %s scope',
    (scope) => {
      const action = getAccountReportAction({
        ...options,
        scope,
        reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
      })
      expect(action?.types).toBeUndefined()
      expect(action?.subjects).toBeUndefined()
    },
  )

  it('can close only the current report without record details', () => {
    expect(
      getAccountReportAction({
        ...options,
        report: {
          ...report,
          subject: { ...report.subject, record: undefined },
        },
      }),
    ).toEqual({ ids: [123] })
  })

  it.each(['current', 'allOwned'] as const)(
    'rejects an action targeting a different account for %s closure',
    (scope) => {
      expect(() =>
        getAccountReportAction({
          ...options,
          scope,
          subject: {
            $type: 'com.atproto.admin.defs#repoRef',
            did: 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb',
          },
        }),
      ).toThrow('must target the reported record’s owner')
    },
  )

  it('rejects a record event passed as an account action', () => {
    expect(() =>
      getAccountReportAction({
        ...options,
        subject: {
          $type: 'com.atproto.repo.strongRef',
          uri: report.subject.subject,
          cid: 'bafyexample',
        },
      }),
    ).toThrow('must target the reported record’s owner')
  })

  it.each(['account', 'message', 'conversation'])(
    'does not enable this closure path for a %s report',
    (type) => {
      expect(canCloseOwnedRecordReport(type, MOD_EVENTS.TAKEDOWN)).toBe(false)
      expect(() =>
        getAccountReportAction({
          ...options,
          report: { ...report, subject: { ...report.subject, type } },
        }),
      ).toThrow('cannot close the current report')
    },
  )

  it.each([MOD_EVENTS.ESCALATE, MOD_EVENTS.RESOLVE_APPEAL, MOD_EVENTS.EMAIL])(
    'does not offer closure for %s',
    (eventType) => {
      expect(canCloseOwnedRecordReport('record', eventType)).toBe(false)
      expect(() => getAccountReportAction({ ...options, eventType })).toThrow(
        'cannot close the current report',
      )
    },
  )

  it.each([MOD_EVENTS.COMMENT, MOD_EVENTS.ACKNOWLEDGE])(
    'does not broaden %s to all owned reports',
    (eventType) => {
      expect(() =>
        getAccountReportAction({ ...options, eventType, scope: 'allOwned' }),
      ).toThrow(
        'requires an account label change, takedown, or takedown reversal',
      )
    },
  )

  it.each([MOD_EVENTS.LABEL, MOD_EVENTS.TAKEDOWN, MOD_EVENTS.REVERSE_TAKEDOWN])(
    'allows explicit all-owned closure for an account %s event',
    (eventType) => {
      expect(
        getAccountReportAction({
          ...options,
          eventType,
          scope: 'allOwned',
        }),
      ).toEqual({ ids: [123], allOwned: true })
    },
  )

  it.each(['open', 'assigned', 'escalated', 'queued'])(
    'allows deliberate closure from %s',
    (status) => {
      expect(
        getAccountReportAction({ ...options, report: { ...report, status } }),
      ).toEqual({ ids: [123] })
    },
  )

  it('does not attach a closure to an already closed report', () => {
    expect(
      getAccountReportAction({
        ...options,
        report: { ...report, status: 'closed' },
      }),
    ).toBeUndefined()
  })
})

describe('submitting account actions from a report', () => {
  const input: ToolsOzoneModerationEmitEvent.InputSchema = {
    subject,
    createdBy: 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb',
    event: {
      $type: MOD_EVENTS.TAKEDOWN,
      policies: ['example-policy'],
      durationInHours: 24,
      comment: 'Reviewed account',
    },
  }
  const submission = () => ({
    report,
    input,
    scope: 'current' as const,
    reportActionStarted: { current: false },
    onSubmit: vi.fn().mockResolvedValue(1001),
    onLinked: vi.fn().mockResolvedValue(undefined),
  })

  it('submits the account event and current report ID in the same request', async () => {
    const props = submission()
    await submitAccountReportAction(props)
    expect(props.onSubmit).toHaveBeenCalledOnce()
    expect(props.onSubmit).toHaveBeenCalledWith({
      ...input,
      reportAction: { ids: [123] },
    })
    expect(props.onLinked).toHaveBeenCalledOnce()
  })

  it('does not close or resolve an appeal when keeping all reports open', async () => {
    const props = { ...submission(), scope: 'none' as const }
    await submitAccountReportAction(props)
    expect(props.onSubmit).toHaveBeenCalledOnce()
    expect(props.onSubmit).toHaveBeenCalledWith({
      ...input,
      reportAction: undefined,
    })
    expect(props.onLinked).not.toHaveBeenCalled()
  })

  it('closes the current report and matching account/record reports in a single request', async () => {
    const props = {
      ...submission(),
      scope: 'types' as const,
      reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
    }
    await submitAccountReportAction(props)
    expect(props.onSubmit).toHaveBeenCalledOnce()
    expect(props.onSubmit).toHaveBeenCalledWith({
      ...input,
      reportAction: {
        ids: [123],
        types: ['com.atproto.moderation.defs#reasonSpam'],
        subjects: [recordSubject],
      },
    })
    expect(props.onLinked).toHaveBeenCalledOnce()
  })

  it.each([undefined, []])(
    'does not broaden an empty report-type selection into closing all subject reports (%j)',
    async (reportTypes) => {
      const props = { ...submission(), scope: 'types' as const, reportTypes }
      await submitAccountReportAction(props)
      expect(props.onSubmit).toHaveBeenCalledWith({
        ...input,
        reportAction: { ids: [123] },
      })
    },
  )

  it('propagates an account action failure without running follow-up writes', async () => {
    const props = {
      ...submission(),
      scope: 'types' as const,
      reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
    }
    props.onSubmit.mockRejectedValueOnce(new Error('Account action failed'))
    await expect(submitAccountReportAction(props)).rejects.toThrow(
      'Account action failed',
    )
    expect(props.onSubmit).toHaveBeenCalledOnce()
    expect(props.onLinked).not.toHaveBeenCalled()
    expect(props.reportActionStarted.current).toBe(false)
  })

  it('rejects missing record details before submitting the account action', async () => {
    const props = {
      ...submission(),
      scope: 'types' as const,
      reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
      report: {
        ...report,
        subject: { ...report.subject, record: undefined },
      },
    }
    await expect(submitAccountReportAction(props)).rejects.toThrow(
      'Cannot determine the reported record',
    )
    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(props.onLinked).not.toHaveBeenCalled()
    expect(props.reportActionStarted.current).toBe(false)
  })

  describe.each(['current', 'types', 'allOwned'] as const)(
    '%s closure requires a successful account event',
    (scope) => {
      it('stops when the account already has an active takedown', async () => {
        const props = {
          ...submission(),
          scope,
          reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
        }
        const error = Object.assign(
          new Error('Subject is already taken down'),
          { error: 'InvalidRequest' },
        )
        props.onSubmit.mockRejectedValueOnce(error)
        await expect(submitAccountReportAction(props)).rejects.toBe(error)
        expect(props.onSubmit).toHaveBeenCalledOnce()
        expect(props.onLinked).not.toHaveBeenCalled()
        expect(props.reportActionStarted.current).toBe(false)
      })

      it.each([undefined, 0])(
        'stops follow-up writes when no event ID is returned (%s)',
        async (eventId) => {
          const props = {
            ...submission(),
            scope,
            reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
          }
          props.onSubmit.mockResolvedValueOnce(eventId)
          await expect(submitAccountReportAction(props)).rejects.toThrow(
            'did not return an event ID',
          )
          expect(props.onSubmit).toHaveBeenCalledOnce()
          expect(props.onLinked).not.toHaveBeenCalled()
          expect(props.reportActionStarted.current).toBe(false)
        },
      )
    },
  )

  it('includes matching report closure only once for concurrent label events', async () => {
    const props = {
      ...submission(),
      scope: 'types' as const,
      reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
    }
    await Promise.all([
      submitAccountReportAction(props),
      submitAccountReportAction(props),
    ])
    expect(props.onSubmit.mock.calls).toEqual([
      [
        {
          ...input,
          reportAction: {
            ids: [123],
            types: ['com.atproto.moderation.defs#reasonSpam'],
            subjects: [recordSubject],
          },
        },
      ],
      [{ ...input, reportAction: undefined }],
    ])
    expect(props.onLinked).toHaveBeenCalledOnce()
  })

  it('rejects an unsupported account event before sending an all-owned closure', async () => {
    const props = {
      ...submission(),
      scope: 'allOwned' as const,
      input: { ...input, event: { $type: MOD_EVENTS.ACKNOWLEDGE } },
    }
    await expect(submitAccountReportAction(props)).rejects.toThrow(
      'requires an account label change, takedown, or takedown reversal',
    )
    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(props.onLinked).not.toHaveBeenCalled()
    expect(props.reportActionStarted.current).toBe(false)
  })

  it.each([undefined, 0, 24, 168])(
    'links owned reports to an account takedown with duration %s',
    async (durationInHours) => {
      const props = {
        ...submission(),
        scope: 'allOwned' as const,
        input: {
          ...input,
          event: {
            $type: MOD_EVENTS.TAKEDOWN,
            policies: ['example-policy'],
            durationInHours,
          },
        },
      }
      await submitAccountReportAction(props)
      expect(props.onSubmit).toHaveBeenCalledWith({
        ...props.input,
        reportAction: { ids: [123], allOwned: true },
      })
      expect(props.onLinked).toHaveBeenCalledOnce()
    },
  )

  it.each<ToolsOzoneModerationEmitEvent.InputSchema['event']>([
    {
      $type: MOD_EVENTS.LABEL,
      createLabelVals: ['spam'],
      negateLabelVals: [],
      durationInHours: 24,
    },
    {
      $type: MOD_EVENTS.LABEL,
      createLabelVals: [],
      negateLabelVals: ['spam'],
    },
    { $type: MOD_EVENTS.REVERSE_TAKEDOWN },
  ])('links owned reports to an account $type event', async (event) => {
    const props = {
      ...submission(),
      scope: 'allOwned' as const,
      input: { ...input, event },
    }
    await submitAccountReportAction(props)
    expect(props.onSubmit).toHaveBeenCalledOnce()
    expect(props.onSubmit).toHaveBeenCalledWith({
      ...props.input,
      reportAction: { ids: [123], allOwned: true },
    })
    expect(props.onLinked).toHaveBeenCalledOnce()
  })

  it('links only the first of multiple concurrent account events', async () => {
    const props = submission()
    await Promise.all([
      submitAccountReportAction(props),
      submitAccountReportAction(props),
    ])
    expect(props.onSubmit.mock.calls).toEqual([
      [{ ...input, reportAction: { ids: [123] } }],
      [{ ...input, reportAction: undefined }],
    ])
    expect(props.onLinked).toHaveBeenCalledOnce()
  })

  it('allows retrying a failed event with its report link', async () => {
    const props = submission()
    props.onSubmit.mockRejectedValueOnce(new Error('Action failed'))
    await expect(submitAccountReportAction(props)).rejects.toThrow(
      'Action failed',
    )
    expect(props.onLinked).not.toHaveBeenCalled()
    await submitAccountReportAction(props)
    expect(props.onSubmit).toHaveBeenLastCalledWith({
      ...input,
      reportAction: { ids: [123] },
    })
    expect(props.onLinked).toHaveBeenCalledOnce()
  })

  it('retains the link if a later appeal-resolution step fails', async () => {
    const props = submission()
    props.onLinked.mockRejectedValueOnce(new Error('Appeal resolution failed'))
    await expect(submitAccountReportAction(props)).rejects.toThrow(
      'Appeal resolution failed',
    )
    await submitAccountReportAction(props)
    expect(props.onSubmit).toHaveBeenLastCalledWith({
      ...input,
      reportAction: undefined,
    })
    expect(props.onLinked).toHaveBeenCalledOnce()
  })
})

describe('account event attribution in report history', () => {
  it('uses the linked event instead of a separate note for an explicit report ID', () => {
    expect(linksReportToEvent(123, { ids: [123] })).toBe(true)
    expect(linksReportToEvent(123, { allOwned: true })).toBe(true)
  })

  it('retains the account action note when the current report is not linked', () => {
    expect(linksReportToEvent(123)).toBe(false)
    expect(linksReportToEvent(123, { ids: [456] })).toBe(false)
    expect(linksReportToEvent(123, { all: true })).toBe(false)
  })
})
