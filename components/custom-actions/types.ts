import type {
  $Typed,
  ComAtprotoAdminDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs as M,
} from '@atproto/api'
import type { ServerConfig } from '../../lib/server-config'
import type { ProtectedTagSetting } from '../setting/protected-tag/types'
import type { PolicyListSetting } from '../setting/policy/types'

export type ModerationEvent =
  | (M.ModEventTag & { $type: NonNullable<M.ModEventTag['$type']> })
  | (M.ModEventLabel & { $type: NonNullable<M.ModEventLabel['$type']> })
  | (M.ModEventTakedown & {
      $type: NonNullable<M.ModEventTakedown['$type']>
    })
  | (M.ModEventAcknowledge & {
      $type: NonNullable<M.ModEventAcknowledge['$type']>
    })
  | (M.ModEventComment & { $type: NonNullable<M.ModEventComment['$type']> })
  | (M.ModEventEscalate & { $type: NonNullable<M.ModEventEscalate['$type']> })
export type ReportActivity = {
  // narrowed to supported activity types 
  $type: `tools.ozone.report.defs#${'closeActivity' | 'reopenActivity' | 'escalationActivity' | 'noteActivity'}`
}
export type Subject =
  | $Typed<ComAtprotoAdminDefs.RepoRef>
  | $Typed<ComAtprotoRepoStrongRef.Main>
export type Step = { id: string } & (
  | {
      type: 'event'
      target: 'subject' | 'account'
      event: ModerationEvent
      reportAction?: { scope: 'current'; note?: string }
    }
  | {
      type: 'activity'
      target: 'report'
      activity: ReportActivity
      internalNote?: string
      publicNote?: string
    }
  | { type: 'verify'; target: 'account' }
)
export type CustomAction = {
  id: string
  name: string
  helpText?: string
  description?: string
  enabled?: boolean
  allowedRoles: NonNullable<ServerConfig['role']>[]
  subjectTypes: ('account' | 'record')[]
  collections?: string[]
  when?: {
    target: 'subject' | 'account'
    requiredTags?: string[]
    absentTags?: string[]
  }[]
  actions: Step[]
}
export type Settings = { version: 1; customActions: CustomAction[] }
export type Request =
  | {
      endpoint: 'tools.ozone.moderation.emitEvent'
      body: {
        subject: Subject
        createdBy: string
        event: ModerationEvent
        reportAction?: { ids: number[]; note?: string }
      }
    }
  | {
      endpoint: 'tools.ozone.report.createActivity'
      body: {
        reportId: number
        activity: ReportActivity
        isAutomated: false
        internalNote?: string
        publicNote?: string
      }
    }
  | {
      endpoint: 'tools.ozone.verification.grantVerifications'
      body: {
        verifications: {
          subject: string
          handle: string
          displayName: string
        }[]
      }
    }
export type Receipt =
  | { kind: 'moderation-event'; eventId: number; url: string }
  | {
      kind: 'report-activity'
      activityId: number
      reportId: number
      activity: ReportActivity
      createdBy: string
      createdAt: string
      url: string
      previousStatus?: string
      internalNote?: string
      publicNote?: string
    }
  | {
      kind: 'verification'
      uri: string
      issuerDid: string
      subjectDid: string
      handle: string
      displayName: string
    }
export type RunStatus =
  'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed-out'
export type Operation = {
  id: string
  stepId: string
  target: Step['target']
  subject: Subject
  request: Request
  status: RunStatus | 'skipped'
  receipt?: Receipt
}
export type Context = {
  serviceDid: string
  uiOrigin: string
  report: {
    id: number
    url: string
  } | null
  moderator: { did: string }
  subject: Subject
  owningAccountDid: string
  confirmedInputs: { comment?: string }
}
export type Run = {
  id: string
  batchId: string
  startedAt: string
  updatedAt: string
  action: CustomAction
  context: Context
  operations: Operation[]
  status: RunStatus
  verifierDid?: string
}

/**
 * Snapshot of context needed to execute custom actions.
 */
export type Snapshot = {
  context: Context
  config: ServerConfig
  protectedTags: ProtectedTagSetting
  policies: PolicyListSetting
  subjectTags: string[]
  accountTags: string[]
  profile?: { handle: string; displayName: string }
}
