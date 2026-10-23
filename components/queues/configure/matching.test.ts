import { describe, expect, it } from 'vitest'
import { parseQueueTags } from './matching'

describe('queue matching inputs', () => {
  it('keeps tag spelling while trimming and deduplicating comma-separated input', () => {
    expect(
      parseQueueTags(' team:alpha, , Team:Alpha,team:alpha, beta, '),
    ).toEqual(['team:alpha', 'Team:Alpha', 'beta'])
    expect(parseQueueTags(' , , ')).toEqual([])
  })
})
