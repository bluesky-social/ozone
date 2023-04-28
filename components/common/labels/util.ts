export function diffLabels(current: string[], next: string[]) {
  return {
    createLabelVals: next.filter((label) => !current.includes(label)),
    negateLabelVals: current.filter((label) => !next.includes(label)),
  }
}

export function displayLabel(label: string) {
  const words = label.split('-')
  return words
    .map((word) => word.replace(/^./, (x) => x.toUpperCase()))
    .join(' ')
}

export function toLabelVal(label: { val: string }): string {
  return label.val
}

// @NOTE not deduped
export const labelOptions = [
  // bsky-calm
  'porn',
  'nudity',
  'sexual',
  'gore',
  'self-harm',
  'torture',
  'icon-kkk',
  'icon-nazi',
  'icon-confederate',
  'spam',
  'impersonation',
  // bsky-default
  'porn',
  'nudity',
  'gore',
  'self-harm',
  'torture',
  'spam',
  // base
  'csam',
  'dmca-violation',
  'nudity-nonconsentual',
  '!no-promote',
]
