import client from '@/lib/client'
import { unique } from '@/lib/util'
import {
  AppBskyActorDefs,
  ComAtprotoLabelDefs,
  LABELS,
  ToolsOzoneModerationDefs,
} from '@atproto/api'

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

export const ALL_LABELS = LABELS

export const LabelGroupInfo: Record<string, { color: string }> = {
  [LABELS.sexual.identifier]: {
    color: '#d45722',
  },
  [LABELS.gore.identifier]: {
    color: '#d42222',
  },
  [LABELS.porn.identifier]: {
    color: '#d422bc',
  },
  [LABELS.nudity.identifier]: {
    color: '#3502cc',
  },
  [LABELS.doxxing.identifier]: {
    color: '#ccb802',
  },
}

const labelsRequiring = [
  LABELS.gore.identifier,
  LABELS.porn.identifier,
  LABELS.nudity.identifier,
  LABELS.sexual.identifier,
]

export const doesLabelNeedBlur = (labels?: string[]): boolean =>
  !!labels?.find((label) => labelsRequiring.includes(label))

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
  return (record?.labels ??
    repo?.labels ??
    []) as Partial<ComAtprotoLabelDefs.Label>[]
}

const getCustomLabels = () =>
  client.session?.config.labeler?.policies.labelValues

export const buildAllLabelOptions = (
  defaultLabels: string[],
  options: string[],
) => {
  const customLabels = getCustomLabels()
  return unique([...defaultLabels, ...options, ...(customLabels || [])]).sort()
}
