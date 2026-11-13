import type { Agent, ComAtprotoLabelDefs } from '@atproto/api'
import Ajv from 'ajv'
import { DM_DISABLE_TAG } from '../../lib/constants'
import { parseServerConfig } from '../../lib/server-config'
import type { ProtectedTagSetting } from '../setting/protected-tag/types'
import type { PolicyListSetting } from '../setting/policy/types'
import type {
  CustomAction,
  Operation,
  Request,
  Snapshot,
  Subject,
} from './types'
import { validateSettings } from './validation'
import { scopeError } from './scope'
import { conditionError } from './conditions'

const permissionValidator = new Ajv().compile({
  type: 'object',
  additionalProperties: {
    type: 'object',
    additionalProperties: false,
    properties: {
      roles: { type: 'array', items: { type: 'string' } },
      moderators: { type: 'array', items: { type: 'string' } },
    },
  },
})

export const subjectId = (subject: Subject) =>
  'did' in subject ? subject.did : subject.uri
export const ownerDid = (subject: Subject) =>
  'did' in subject ? subject.did : subject.uri.split('/')[2]
export const accountRef = (did: string): Subject => ({
  $type: 'com.atproto.admin.defs#repoRef',
  did,
})

/**
 * Read custom action setting
 */
export async function readSnapshot(
  agent: Agent,
  serviceDid: string,
  uiOrigin: string,
  subject: string | Subject,
  reportId?: number,
  needsProfile = false,
  signal?: AbortSignal,
): Promise<Snapshot> {
  signal?.throwIfAborted()
  const id = typeof subject === 'string' ? subject : subjectId(subject)
  if (!id.startsWith('did:') && !/^at:\/\/did:[^/]+\/[^/]+\/[^/]+$/.test(id))
    throw new Error('Custom actions support account and record subjects only')
  const isAccount = id.startsWith('did:')
  const did = isAccount ? id : id.split('/')[2]
  const [server, repo, record, settings, report] = await Promise.all([
    agent.tools.ozone.server.getConfig({}, { signal }),
    agent.tools.ozone.moderation.getRepo({ did }, { signal }),
    isAccount
      ? null
      : agent.tools.ozone.moderation.getRecord({ uri: id }, { signal }),
    agent.tools.ozone.setting.listOptions(
      {
        scope: 'instance',
        keys: [
          'tools.ozone.setting.protectedTags',
          'tools.ozone.setting.policyList',
        ],
      },
      { signal },
    ),
    reportId
      ? agent.tools.ozone.report.getReport({ id: reportId }, { signal })
      : null,
  ])
  const ref: Subject = record
    ? {
        $type: 'com.atproto.repo.strongRef',
        uri: record.data.uri,
        cid: record.data.cid,
      }
    : accountRef(did)
  if (
    typeof subject !== 'string' &&
    (subjectId(subject) !== subjectId(ref) ||
      ('cid' in subject && (!('cid' in ref) || subject.cid !== ref.cid)))
  )
    throw new Error('The subject reference changed; review it again')
  if (report && report.data.subject.subject !== id)
    throw new Error('The report does not belong to this subject')
  const config = parseServerConfig(server.data)
  const protectedTags =
    settings.data.options.find(
      (o) => o.key === 'tools.ozone.setting.protectedTags',
    )?.value || {}
  if (!permissionValidator(protectedTags))
    throw new Error('Protected-tag settings are invalid')
  const policies =
    settings.data.options.find(
      (o) => o.key === 'tools.ozone.setting.policyList',
    )?.value || {}
  let profile: Snapshot['profile']
  if (needsProfile) {
    signal?.throwIfAborted()
    const { data } = await agent.app.bsky.actor.getProfile(
      { actor: did },
      { signal },
    )
    if (data.did !== did) throw new Error('Profile does not match the account')
    profile = { handle: data.handle, displayName: data.displayName || '' }
  }
  const accountStatus = repo.data.moderation.subjectStatus
  const status = record ? record.data.moderation.subjectStatus : accountStatus
  const labelerDid = serviceDid.split('#')[0]
  const now = Date.now()
  const activeLabels = (
    labels: ComAtprotoLabelDefs.Label[] | undefined,
    subjectId: string,
    cid?: string,
  ) => [
    ...new Set(
      (labels || [])
        .filter(
          (label) =>
            label.src === labelerDid &&
            label.uri === subjectId &&
            !label.neg &&
            (!label.cid || label.cid === cid) &&
            (!label.exp || Date.parse(label.exp) > now),
        )
        .map((label) => label.val),
    ),
  ]
  return {
    context: {
      serviceDid,
      uiOrigin,
      report: report
        ? {
            id: report.data.id,
            url: `${uiOrigin}/reports/${report.data.id}`,
            queueId: report.data.queue?.id ?? -1,
            reportType: report.data.reportType,
            status: report.data.status,
          }
        : null,
      moderator: { did: agent.did! },
      subject: ref,
      owningAccountDid: ownerDid(ref),
      confirmedInputs: {},
    },
    config,
    protectedTags: protectedTags as ProtectedTagSetting,
    policies: policies as PolicyListSetting,
    profile,
    subjectTags: status?.tags || [],
    accountTags: accountStatus?.tags || [],
    subjectLabels: activeLabels(
      record ? record.data.labels : repo.data.labels,
      id,
      'cid' in ref ? ref.cid : undefined,
    ),
    accountLabels: activeLabels(repo.data.labels, did),
    subjectAppealed: !!status?.appealed,
    accountAppealed: !!accountStatus?.appealed,
  }
}

/**
 * Check if the provided tags are allowed
 */
function assertTags(tags: string[], state: Snapshot) {
  for (const tag of tags) {
    const rule = Object.hasOwn(state.protectedTags, tag)
      ? state.protectedTags[tag]
      : undefined
    if (!rule) continue
    if (
      (rule.moderators &&
        !rule.moderators.includes(state.context.moderator.did)) ||
      (rule.roles && !rule.roles.includes(state.config.role!))
    )
      throw new Error(`Permission required for protected tag: ${tag}`)
  }
}

/** Validate the action before preparing it for execution. */
function assertExecutable(action: CustomAction, state: Snapshot) {
  validateSettings({ version: 1, customActions: [action] })
  const { context, config } = state
  const type = 'did' in context.subject ? 'account' : 'record'
  if (
    action.enabled === false ||
    !config.role ||
    !action.allowedRoles.includes(config.role)
  )
    throw new Error('This custom action is not enabled for your role')
  const restriction = scopeError(action, {
    moderatorDid: context.moderator.did,
    queueId: context.report?.queueId,
  })
  if (restriction) throw new Error(restriction)
  if (!action.subjectTypes.includes(type))
    throw new Error('This custom action does not support this subject type')
  const collection =
    'uri' in context.subject ? context.subject.uri.split('/')[3] : undefined
  if (
    action.collections &&
    (!collection || !action.collections.includes(collection))
  )
    throw new Error('This record collection is not supported')
  const unmetCondition = conditionError(action.when, state)
  if (unmetCondition)
    throw new Error(`Action conditions are not met: ${unmetCondition}`)
  for (const step of action.actions) {
    if ('when' in step && conditionError(step.when, state)) continue
    if (step.type === 'activity') {
      if (!context.report)
        throw new Error('This workflow requires a current report')
    } else if (step.type === 'closeReports') {
      if (!config.permissions.canLabel)
        throw new Error(
          'Moderator permission required to close matching reports',
        )
    } else if (step.type === 'verify') {
      if (
        !config.permissions.canVerify ||
        !config.verifierDid ||
        !state.profile?.handle ||
        state.profile.handle === 'handle.invalid'
      )
        throw new Error(
          'Verification requires permission and a current profile',
        )
    } else {
      const subject =
        step.target === 'account'
          ? accountRef(context.owningAccountDid)
          : context.subject
      const tags =
        step.target === 'account' ? state.accountTags : state.subjectTags
      const event = step.event
      if (
        event.$type === 'tools.ozone.moderation.defs#modEventResolveAppeal' &&
        !config.permissions.canLabel
      )
        throw new Error('Moderator permission required to resolve appeals')
      if (event.$type === 'tools.ozone.moderation.defs#modEventTag') {
        const changed = [...event.add, ...event.remove]
        assertTags(changed, state)
        if (
          changed.includes(DM_DISABLE_TAG) &&
          (!config.permissions.canManageChat || !('did' in subject))
        )
          throw new Error(
            'Changing DM restrictions requires an account and chat permission',
          )
      }
      if (event.$type === 'tools.ozone.moderation.defs#modEventLabel') {
        if (!config.permissions.canLabel)
          throw new Error('Label permission required')
        assertTags(tags, state)
      }
      if (event.$type === 'tools.ozone.moderation.defs#modEventTakedown') {
        if (!config.permissions.canTakedown)
          throw new Error('Takedown permission required')
        if (
          'uri' in subject &&
          subject.uri.split('/')[3] === 'app.bsky.feed.generator' &&
          !config.permissions.canTakedownFeedGenerators
        )
          throw new Error(
            'Admin permission required to take down a feed generator',
          )
        assertTags(tags, state)
        for (const policy of event.policies || []) {
          if (!Object.hasOwn(state.policies, policy))
            throw new Error('The workflow references an unknown policy')
          if (
            event.severityLevel &&
            !Object.hasOwn(
              state.policies[policy].severityLevels || {},
              event.severityLevel,
            )
          )
            throw new Error('The workflow references an unknown severity level')
        }
        if (event.severityLevel && !event.policies?.length)
          throw new Error('A severity level requires a policy')
      }
      const reportAction = step.type === 'event' ? step.reportAction : undefined
      if (
        reportAction?.scope === 'current' &&
        (!context.report || subjectId(subject) !== subjectId(context.subject))
      )
        throw new Error(
          'Report action requires the current report on the same subject',
        )
    }
  }
}

/**
 * Prepare a custom action for execution
 */
export function prepare(action: CustomAction, state: Snapshot): Operation[] {
  assertExecutable(action, state)
  const { context } = state
  return action.actions.map((step): Operation => {
    const skipReason =
      'when' in step ? conditionError(step.when, state) : undefined
    const subject =
      step.target === 'account'
        ? accountRef(context.owningAccountDid)
        : context.subject
    let request: Request
    if (step.type === 'activity') {
      request = {
        endpoint: 'tools.ozone.report.createActivity',
        body: {
          reportId: context.report!.id,
          activity: step.activity,
          isAutomated: false,
          ...(step.internalNote && { internalNote: step.internalNote }),
          ...(step.publicNote && { publicNote: step.publicNote }),
        },
      }
    } else if (step.type === 'closeReports') {
      request = {
        endpoint: 'tools.ozone.report.closeReports',
        body: {
          subject: subjectId(subject),
          reportTypes: step.reportTypes,
          isAutomated: false,
          ...(step.internalNote && { internalNote: step.internalNote }),
        },
      }
    } else if (step.type === 'verify') {
      request = {
        endpoint: 'tools.ozone.verification.grantVerifications',
        body: {
          verifications: [
            { subject: context.owningAccountDid, ...state.profile! },
          ],
        },
      }
    } else {
      const reportAction = step.type === 'event' ? step.reportAction : undefined
      request = {
        endpoint: 'tools.ozone.moderation.emitEvent',
        body: {
          subject,
          createdBy: context.moderator.did,
          event: step.event,
          ...(reportAction &&
            !skipReason && {
              reportAction: {
                ...(reportAction.scope === 'current'
                  ? { ids: [context.report!.id] }
                  : {
                      types: reportAction.types,
                      ...(reportAction.includeCurrent &&
                        context.report?.reportType &&
                        context.report.status !== 'closed' &&
                        reportAction.types.includes(
                          context.report.reportType,
                        ) &&
                        subjectId(subject) === subjectId(context.subject) && {
                          ids: [context.report.id],
                        }),
                    }),
                ...(reportAction.note && { note: reportAction.note }),
              },
            }),
        },
      }
    }
    return {
      id: step.id,
      stepId: step.id,
      target: step.target,
      subject,
      request,
      status: skipReason ? 'skipped' : 'pending',
      ...(skipReason && { skipReason }),
      ...(step.type === 'event' &&
        step.continueOnError !== undefined && {
          continueOnError: step.continueOnError,
        }),
    }
  })
}

/** Require another confirmation when refreshed state selects different steps. */
export function prepareConfirmed(
  action: CustomAction,
  confirmed: Snapshot,
  fresh: Snapshot,
): Operation[] {
  const previous = prepare(action, confirmed)
  const next = prepare(action, fresh)
  if (previous.some((op, index) => op.skipReason !== next[index]?.skipReason))
    throw new Error(
      'Account or subject state changed. Select the action again to review its preview and confirm again.',
    )
  return next
}
