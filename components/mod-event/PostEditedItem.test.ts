import { describe, expect, it } from 'vitest'

import type { PostVersion } from '@/lib/postVersions'
import { mergePostEdits } from './PostEditedItem'
import type { ModEventViewWithDetails } from './useModEventList'

function event(id: number, createdAt: string) {
  return { id, createdAt } as ModEventViewWithDetails
}

function version(cid: string, editedAt?: string) {
  return {
    cid,
    indexedAt: '2026-11-19T10:00:00.000Z',
    editedAt,
  } as PostVersion
}

const versions = [version('v1'), version('v2', '2026-11-19T10:02:00.000Z')]

function kinds(items: ReturnType<typeof mergePostEdits>) {
  return items.map((item) =>
    item.kind === 'edit'
      ? `edit:${item.version.cid}`
      : `event:${item.modEvent.id}`,
  )
}

describe('mergePostEdits', () => {
  it('leaves events alone when the post was not edited', () => {
    const events = [event(2, '2026-11-19T10:03:00.000Z')]
    expect(kinds(mergePostEdits(events, undefined, false))).toEqual(['event:2'])
    expect(kinds(mergePostEdits(events, [version('v1')], false))).toEqual([
      'event:2',
    ])
  })

  it('places the edit by time in newest-first lists', () => {
    const events = [
      event(3, '2026-11-19T10:03:00.000Z'),
      event(1, '2026-11-19T10:01:00.000Z'),
    ]
    expect(kinds(mergePostEdits(events, versions, false))).toEqual([
      'event:3',
      'edit:v2',
      'event:1',
    ])
  })

  it('places the edit by time in oldest-first lists', () => {
    const events = [
      event(1, '2026-11-19T10:01:00.000Z'),
      event(3, '2026-11-19T10:03:00.000Z'),
    ]
    expect(kinds(mergePostEdits(events, versions, false))).toEqual([
      'event:1',
      'edit:v2',
      'event:3',
    ])
  })

  it('holds back edits older than the loaded page while more can load', () => {
    const events = [
      event(4, '2026-11-19T10:04:00.000Z'),
      event(3, '2026-11-19T10:03:00.000Z'),
    ]
    expect(kinds(mergePostEdits(events, versions, true))).toEqual([
      'event:4',
      'event:3',
    ])
    expect(kinds(mergePostEdits(events, versions, false))).toEqual([
      'event:4',
      'event:3',
      'edit:v2',
    ])
  })

  it('shows the edit when there are no events', () => {
    expect(kinds(mergePostEdits([], versions, false))).toEqual(['edit:v2'])
  })
})
