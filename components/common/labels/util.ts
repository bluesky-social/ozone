export function diffLabels(current: string[], next: string[]) {
  return {
    createLabelVals: next.filter((label) => !current.includes(label)),
    negateLabelVals: current.filter((label) => !next.includes(label)),
  }
}

export function displayLabel(label: string) {
  return label
}

export function toLabelVal(label: { val: string }): string {
  return label.val
}

// @NOTE not deduped
export const labelOptions = [
  // sexuality
  'porn',
  'nudity',
  'sexual',

  // violence/graphic
  'gore',
  'self-harm',
  'torture',
  'nsfl',

  // intolerance
  'icon-kkk',
  'icon-nazi',
  'icon-intolerant',

  // bad behavior ("subjective")
  //'troll',
  //'threat',

  // violations/illegal
  'csam',
  'dmca-violation',
  'nudity-nonconsensual',

  // other policy/behavior issues
  'spam',
  'impersonation',
  'misleading',
  //'scam',
  //'account-security',

  // direct action
  '!no-promote',
  '!filter',
  '!warn',
]
