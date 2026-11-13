import {
  Agent,
  ChatBskyConvoDefs,
  ComAtprotoLabelDefs,
  ToolsOzoneModerationDefs,
} from '@atproto/api'
import { getLabelsForSubject } from '@/common/labels/util'
import { parseAtUri } from '@/lib/util'
import { CollectionId } from '@/reports/helpers/subject'

export async function fetchModActionSubject(agent: Agent, subject: string) {
  const getProfile = async (actor: string) => {
    try {
      const { data } = await agent.app.bsky.actor.getProfile({ actor })
      return data
    } catch {
      return undefined
    }
  }

  const isDid = subject.startsWith('did:')
  const parsed = subject.startsWith('at://') ? parseAtUri(subject) : null
  if (
    isDid ||
    parsed?.collection === CollectionId.Convo ||
    parsed?.collection === CollectionId.Message
  ) {
    const did = isDid ? subject : parsed!.did
    const messageLabels =
      parsed?.collection === CollectionId.Message
        ? fetchMessageLabels(agent, subject).catch(() => undefined)
        : Promise.resolve(undefined)
    const [{ data: repo }, profile, labels] = await Promise.all([
      agent.tools.ozone.moderation.getRepo({ did }),
      getProfile(did),
      messageLabels,
    ])
    return { repo, profile, labels }
  }
  if (parsed) {
    const [{ data: record }, profile] = await Promise.all([
      agent.tools.ozone.moderation.getRecord({ uri: subject }),
      getProfile(parsed.did),
    ])
    return { record, profile }
  }
  return {}
}

async function fetchMessageLabels(agent: Agent, subject: string) {
  const labels: ComAtprotoLabelDefs.Label[] = []
  let cursor: string | undefined
  for (let page = 0; page < 10; page++) {
    const { data } = await agent.com.atproto.label.queryLabels({
      uriPatterns: [subject],
      limit: 250,
      cursor,
    })
    labels.push(...data.labels)
    cursor = data.cursor
    if (!cursor) {
      return labels.filter(
        (label) =>
          !label.neg && (!label.exp || Date.parse(label.exp) > Date.now()),
      )
    }
  }
  throw new Error('Too many labels to load for this message')
}

export function findMessageStatus(
  statuses: ToolsOzoneModerationDefs.SubjectStatusView[],
  ref: ChatBskyConvoDefs.MessageRef,
) {
  return (
    statuses.find(
      (status) =>
        ChatBskyConvoDefs.isMessageRef(status.subject) &&
        status.subject.did === ref.did &&
        status.subject.messageId === ref.messageId &&
        status.subject.convoId === ref.convoId,
    ) || null
  )
}

export function getActionLabels({
  applyToAccount,
  isSubjectDid,
  isMessageSubject,
  targetAccount,
  messageLabels,
  repo,
  record,
}: {
  applyToAccount?: boolean
  isSubjectDid: boolean
  isMessageSubject: boolean
  targetAccount?: ToolsOzoneModerationDefs.RepoViewDetail
  messageLabels?: ComAtprotoLabelDefs.Label[]
  repo?: ToolsOzoneModerationDefs.RepoViewDetail
  record?: ToolsOzoneModerationDefs.RecordViewDetail
}) {
  if (applyToAccount && !isSubjectDid) return targetAccount?.labels ?? []
  if (isMessageSubject) return messageLabels ?? []
  return getLabelsForSubject({ repo, record })
}
