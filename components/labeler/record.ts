import type { AppBskyLabelerService } from '@atproto/api'
import { reasonTypeOptions } from '@/reports/helpers/getType'

export function createInitialLabelerRecord(): AppBskyLabelerService.Record {
  return {
    $type: 'app.bsky.labeler.service',
    createdAt: new Date().toISOString(),
    policies: { labelValues: [] },
    subjectTypes: ['account', 'record'],
    subjectCollections: ['app.bsky.feed.post', 'app.bsky.actor.profile'],
    reasonTypes: Object.keys(reasonTypeOptions),
  }
}

export function getEditableLabelerFields(
  record: AppBskyLabelerService.Record,
): Partial<AppBskyLabelerService.Record> {
  return {
    policies: record.policies,
    reasonTypes: record.reasonTypes,
    subjectTypes: record.subjectTypes,
    subjectCollections: record.subjectCollections,
  }
}
