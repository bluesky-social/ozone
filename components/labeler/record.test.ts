import { AppBskyLabelerService, ToolsOzoneReportDefs } from '@atproto/api'
import { describe, expect, it } from 'vitest'
import { createInitialLabelerRecord, getEditableLabelerFields } from './record'

describe('labeler service records', () => {
  it('initializes a valid record with modern and legacy report reasons', () => {
    const record = createInitialLabelerRecord()
    expect(AppBskyLabelerService.validateRecord(record).success).toBe(true)
    expect(record.reasonTypes).toContain(
      ToolsOzoneReportDefs.REASONCHILDSAFETYCSAM,
    )
    expect(record.reasonTypes).toContain(
      ToolsOzoneReportDefs.REASONMISLEADINGSPAM,
    )
    expect(record.reasonTypes).toContain(
      'com.atproto.moderation.defs#reasonViolation',
    )
  })

  it.each([
    undefined,
    [],
    [
      ToolsOzoneReportDefs.REASONHARASSMENTTROLL,
      'example.report.defs#customReason',
    ],
  ])('preserves reason-list semantics through JSON: %j', (reasonTypes) => {
    const record = { ...createInitialLabelerRecord(), reasonTypes }
    const json = JSON.stringify(getEditableLabelerFields(record))
    const roundTrip = {
      ...record,
      ...getEditableLabelerFields(JSON.parse(json)),
    }
    expect(roundTrip.reasonTypes).toEqual(reasonTypes)
    expect(roundTrip.createdAt).toBe(record.createdAt)
    expect(AppBskyLabelerService.validateRecord(roundTrip).success).toBe(true)
  })

  it('removes a configured allowlist when the field is omitted in JSON', () => {
    const record = createInitialLabelerRecord()
    const edited = JSON.parse(JSON.stringify(getEditableLabelerFields(record)))
    delete edited.reasonTypes
    const updated = { ...record, ...getEditableLabelerFields(edited) }
    expect(updated.reasonTypes).toBeUndefined()
    expect(JSON.stringify(updated)).not.toContain('reasonTypes')
  })
})
