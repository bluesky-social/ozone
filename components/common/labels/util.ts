import client from '@/lib/client'
import { unique } from '@/lib/util'
import {
  AppBskyActorDefs,
  AppBskyLabelerDefs,
  ComAtprotoLabelDefs,
  ToolsOzoneModerationDefs,
} from '@atproto/api'
import {
  LabelDefinition,
  LabelGroupDefinition,
  LABELS,
  LABEL_GROUPS,
} from './data'

export type LabelGroupInfoRecord = {
  color: string
  labels: Array<string | LabelDefinition>
}

type GroupedLabelList = Record<
  string,
  LabelGroupInfoRecord & Omit<LabelGroupDefinition, 'labels'>
>

export type ExtendedLabelerServiceDef =
  | (AppBskyLabelerDefs.LabelerViewDetailed & {
      policies: AppBskyLabelerDefs.LabelerViewDetailed['policies'] & {
        definitionById: Record<string, ComAtprotoLabelDefs.LabelValueDefinition>
      }
    })
  | null

export function diffLabels(current: string[], next: string[]) {
  return {
    createLabelVals: next
      .filter((label) => !current.includes(label))
      // Make sure we don't let empty strings or falsy values through
      .filter(Boolean),
    negateLabelVals: current
      .filter((label) => !next.includes(label))
      // Make sure we don't let empty strings or falsy values through
      .filter(Boolean),
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

export const labelOptions = Object.keys(LABELS)

export const LabelGroupInfo: Record<
  string,
  Partial<LabelGroupDefinition> & { color: string }
> = {
  [LABEL_GROUPS.system.id]: {
    color: '#c45722',
  },
  [LABEL_GROUPS.sexual.id]: {
    color: '#d45722',
  },
  [LABEL_GROUPS.violence.id]: {
    color: '#d42222',
  },
  [LABEL_GROUPS.intolerance.id]: {
    color: '#d422bc',
  },
  [LABEL_GROUPS.legal.id]: {
    color: '#3502cc',
  },
  [LABEL_GROUPS.rude.id]: {
    color: '#ccb802',
  },
  [LABEL_GROUPS.curation.id]: {
    color: '#ff0303',
  },
  [LABEL_GROUPS.misinfo.id]: {
    color: '#530303',
  },
  custom: {
    color: '#218734',
    strings: {
      settings: {
        en: {
          name: 'Custom Labels',
          description: 'Labels from labeler service',
        },
      },
    },
  },
  uncategorized: {
    strings: {
      settings: {
        en: {
          name: 'Uncategorzied',
          description: 'Labels that have not been categorized yet',
        },
      },
    },
    color: '',
    labels: [],
  },
}

const labelGroupsRequiringBlur = [
  LABEL_GROUPS.violence.id,
  LABEL_GROUPS.sexual.id,
]

export const groupLabelList = (labels: string[]): GroupedLabelList => {
  const groupedList: GroupedLabelList = {}
  const customLabels = getCustomLabels()

  labels.forEach((label) => {
    // SELF_FLAG is embedded in the label value so when grouping, we have to take it out of the value
    const cleanedLabel = unFlagSelfLabel(label)
    const group = LABELS[cleanedLabel]
    let groupId = 'uncategorized'

    if (group?.groupId) {
      groupId = group.groupId
    } else if (customLabels?.includes(cleanedLabel)) {
      groupId = 'custom'
    }

    if (groupedList[groupId]) {
      groupedList[groupId].labels.push(label)
    } else {
      groupedList[groupId] = {
        ...(LabelGroupInfo[groupId] || LabelGroupInfo.uncategorized),
        ...(LABEL_GROUPS[groupId] || {}),
        labels: [label],
      }
    }
  })

  return groupedList
}

const getCustomLabels = () =>
  client.session?.config.labeler?.policies.labelValues

export const getLabelGroupInfo = (label: string): LabelGroupInfoRecord => {
  const customLabels = getCustomLabels()
  const group = LABELS[label]
  const groupId =
    group?.groupId ||
    (customLabels?.includes(label) ? 'custom' : 'uncategorized')

  return {
    // TODO: We shouldn't have to do this, there's a weird type def somewhere that's causing this
    labels: [],
    ...LabelGroupInfo.uncategorized,
    ...(LabelGroupInfo[groupId] || {}),
    ...(group || {}),
  }
}

export const doesLabelNeedBlur = (labels?: string[]): boolean =>
  !!labels?.find((label) =>
    labelGroupsRequiringBlur.includes(LABELS[label]?.groupId),
  )

export const doesProfileNeedBlur = ({
  profile,
  repo,
}: {
  profile?: AppBskyActorDefs.ProfileViewBasic
  repo?: ToolsOzoneModerationDefs.RepoView
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
  repo?: ToolsOzoneModerationDefs.RepoViewDetail
  record?: ToolsOzoneModerationDefs.RecordViewDetail
}) => {
  return record?.labels ?? repo?.labels ?? []
}

export const buildAllLabelOptions = (
  defaultLabels: string[],
  options: string[],
) => {
  const customLabels = getCustomLabels()
  return unique([...defaultLabels, ...options, ...(customLabels || [])]).sort()
}
