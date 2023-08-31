import { unique } from '@/lib/util'
import {
  AppBskyActorDefs,
  ComAtprotoAdminDefs,
  ComAtprotoLabelDefs,
} from '@atproto/api'

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

const SELF_FLAG = '(self)'
export function displayLabel(label: string) {
  return label
}
export const flagSelfLabel = (label: string) => `${label}${SELF_FLAG}`
export const unFlagSelfLabel = (label: string) => label.replace(SELF_FLAG, '')

export const isSelfLabel = (label: string) => label.endsWith(SELF_FLAG)

export function toLabelVal(
  label: Partial<ComAtprotoLabelDefs.Label>,
  authorDid?: string,
): string {
  if (!label.val) return ''
  let val = label.val
  if (authorDid && label.src === authorDid) {
    val = flagSelfLabel(val)
  }
  return val
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
  Self,
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

const labelGroupsRequiringBlur = [LabelGroup.Violence, LabelGroup.Sexuality]

export const groupLabelList = (labels: string[]): GroupedLabelList => {
  const groupedList: GroupedLabelList = {}

  labels.forEach((label) => {
    // SELF_FLAG is embedded in the label value so when grouping, we have to take it out of the value
    const cleanedLabel = unFlagSelfLabel(label)
    // We need to check the property's existence because the value may be simply 0 in which case it will be falsy
    // even though it's a valid value
    const group = labelToGroupMap.hasOwnProperty(cleanedLabel)
      ? labelToGroupMap[cleanedLabel]
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

// If even one of the
export const doesLabelNeedBlur = (labels?: string[]): boolean =>
  !!labels?.find((label) =>
    labelGroupsRequiringBlur.includes(labelToGroupMap[label]),
  )

export const doesProfileNeedBlur = ({
  profile,
  repo,
}: {
  profile?: AppBskyActorDefs.ProfileViewBasic
  repo?: ComAtprotoAdminDefs.RepoView
}) => {
  const labels: string[] = []
  if (profile?.labels) {
    labels.push(...profile.labels?.map(({ val }) => val))
  }
  if (repo?.labels && Array.isArray(repo?.labels)) {
    labels.push(...repo.labels?.map(({ val }) => val))
  }
  return doesLabelNeedBlur(labels)
}

export const getLabelsForSubject = ({
  repo,
  record,
}: {
  repo?: ComAtprotoAdminDefs.RepoViewDetail
  record?: ComAtprotoAdminDefs.RecordViewDetail
}) => {
  return (record?.labels ??
    repo?.labels ??
    []) as Partial<ComAtprotoLabelDefs.Label>[]
}

export const buildAllLabelOptions = (
  defaultLabels: string[],
  options: string[],
) => {
  return unique([...defaultLabels, ...options]).sort()
}
