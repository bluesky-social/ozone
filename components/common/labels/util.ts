import {
  AppBskyActorDefs,
  AppBskyLabelerDefs,
  ComAtprotoLabelDefs,
  LABELS,
  ToolsOzoneModerationDefs,
} from '@atproto/api'

export type ExtendedLabelerServiceDef =
  | AppBskyLabelerDefs.LabelerViewDetailed & {
      policies: AppBskyLabelerDefs.LabelerViewDetailed['policies'] & {
        definitionById: Record<string, ComAtprotoLabelDefs.LabelValueDefinition>
      }
    }

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
  [LABELS['graphic-media'].identifier]: {
    color: '#d42222',
  },
  [LABELS.porn.identifier]: {
    color: '#d422bc',
  },
  [LABELS.nudity.identifier]: {
    color: '#3502cc',
  },
}

const labelsRequiringBlur = [
  LABELS['graphic-media'].identifier,
  LABELS.porn.identifier,
  LABELS.nudity.identifier,
  LABELS.sexual.identifier,
]

export const doesLabelNeedBlur = (labels?: string[]): boolean =>
  !!labels?.find((label) => labelsRequiringBlur.includes(label))

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
