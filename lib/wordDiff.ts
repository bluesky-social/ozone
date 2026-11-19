export type DiffPart = {
  type: 'same' | 'added' | 'removed'
  text: string
}

/**
 * Word-level diff of two strings, keeping whitespace. Posts are short, so a
 * plain longest-common-subsequence table is fast enough.
 */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before)
  const b = tokenize(after)

  // lcs[i][j] = length of the LCS of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  )
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const parts: DiffPart[] = []
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts.at(-1)
    if (last?.type === type) {
      last.text += text
    } else {
      parts.push({ type, text })
    }
  }

  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('same', a[i])
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push('removed', a[i])
      i++
    } else {
      push('added', b[j])
      j++
    }
  }
  while (i < a.length) push('removed', a[i++])
  while (j < b.length) push('added', b[j++])
  return parts
}

/**
 * Splits into words, whitespace runs and single punctuation marks, so that
 * "only" -> "only." shows just the added ".".
 */
function tokenize(text: string) {
  return text.split(/(\s+|[\p{P}\p{S}])/u).filter(Boolean)
}
