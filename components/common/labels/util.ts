type LabelGroupInfoRecord = {
  title: string
  color: string
}

type GroupedLabelList = Partial<
  Record<LabelGroup, LabelGroupInfoRecord & { labels: string[] }>
>

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

export enum LabelGroup {
  Sexuality,
  Other,
  DirectAction,
  Violence,
  Intolerance,
  Violations,
  UnCategorized,
}

export const LabelGroupInfo = {
  [LabelGroup.Sexuality]: {
    title: 'Sexuality',
    color: '#d45722',
  },
  [LabelGroup.Violence]: {
    title: 'Violence',
    color: '#d42222',
  },
  [LabelGroup.Intolerance]: {
    title: 'Intolerance',
    color: '#d422bc',
  },
  [LabelGroup.Violations]: {
    title: 'Violations/Illegal',
    color: '#3502cc',
  },
  [LabelGroup.Other]: {
    title: 'Other/Policy Issues',
    color: '#ccb802',
  },
  [LabelGroup.DirectAction]: {
    title: 'Direct Action',
    color: '#ff0303',
  },
  [LabelGroup.UnCategorized]: {
    title: 'Uncategorzied',
    color: '',
  },
}

export const labelToGroupMap = {
  // sexuality
  porn: LabelGroup.Sexuality,
  nudity: LabelGroup.Sexuality,
  sexual: LabelGroup.Sexuality,

  // violence/graphic
  gore: LabelGroup.Violence,
  'self-harm': LabelGroup.Violence,
  torture: LabelGroup.Violence,
  nsfl: LabelGroup.Violence,

  // intolerance
  'icon-kkk': LabelGroup.Intolerance,
  'icon-nazi': LabelGroup.Intolerance,
  'icon-intolerant': LabelGroup.Intolerance,

  // bad behavior ("subjective")
  //'troll',
  //'threat',

  // violations/illegal
  csam: LabelGroup.Violations,
  'dmca-violation': LabelGroup.Violations,
  'nudity-nonconsensual': LabelGroup.Violations,

  // other policy/behavior issues
  spam: LabelGroup.Other,
  impersonation: LabelGroup.Other,
  misleading: LabelGroup.Other,
  //'scam',
  //'account-security',

  // direct action
  '!no-promote': LabelGroup.DirectAction,
  '!filter': LabelGroup.DirectAction,
  '!warn': LabelGroup.DirectAction,
}

export const groupLabelList = (labels: string[]): GroupedLabelList => {
  const groupedList: GroupedLabelList = {}

  labels.forEach((label) => {
    // We need to check the property's existence because the value may be simply 0 in which case it will be falsy
    // even though it's a valid value
    const group = labelToGroupMap.hasOwnProperty(label)
      ? labelToGroupMap[label]
      : LabelGroup.UnCategorized


    if (!groupedList[group]) {
      groupedList[group] = { ...LabelGroupInfo[group], labels: [label] }
    } else {
      groupedList[group].labels.push(label)
    }
  })

  return groupedList
}

export const getLabelGroupInfo = (label: string): LabelGroupInfoRecord => {
  // We need to check the property's existence because the value may be simply 0 
  // in which case it will be falsy even though it's a valid value
  const group = labelToGroupMap.hasOwnProperty(label)
    ? labelToGroupMap[label]
    : LabelGroup.UnCategorized

  return LabelGroupInfo[group]
}
