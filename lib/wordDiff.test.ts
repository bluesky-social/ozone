import { describe, expect, it } from 'vitest'

import { diffWords } from './wordDiff'

function render(before: string, after: string) {
  return diffWords(before, after)
    .map((part) =>
      part.type === 'same'
        ? part.text
        : part.type === 'added'
          ? `[+${part.text}]`
          : `[-${part.text}]`,
    )
    .join('')
}

describe('diffWords', () => {
  it('returns one unchanged part for equal strings', () => {
    expect(diffWords('same text', 'same text')).toEqual([
      { type: 'same', text: 'same text' },
    ])
  })

  it('marks replaced words', () => {
    expect(render('coming at 5pm today', 'coming at 6pm today')).toBe(
      'coming at [-5pm][+6pm] today',
    )
  })

  it('treats punctuation as its own token', () => {
    expect(render('first 100 only', 'first 50 only. Hurry!')).toBe(
      'first [-100][+50] only[+. Hurry!]',
    )
  })

  it('handles empty strings', () => {
    expect(render('', 'new alt text')).toBe('[+new alt text]')
    expect(render('old alt text', '')).toBe('[-old alt text]')
  })
})
