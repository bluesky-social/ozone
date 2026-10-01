import type {
  Agent,
  ToolsOzoneReportDefs,
  ToolsOzoneVerificationDefs,
} from '@atproto/api'
import { prepare } from './compile'
import type { CustomAction, Operation, Receipt, Run, Snapshot } from './types'

export const RUN_TIMEOUT_MS = 60_000

export function eventMetadata(run: Run, op: Operation) {
  return {
    name: `ozone-ui/custom-action/${run.action.id}`,
    meta: {
      batchId: run.batchId,
      workflowId: run.action.id,
      stepId: op.stepId,
      operationId: op.id,
      ...(run.context.report && { reportId: run.context.report.id }),
    },
  }
}

function verificationReceipt(
  v: ToolsOzoneVerificationDefs.VerificationView,
): Receipt {
  return {
    kind: 'verification',
    uri: v.uri,
    issuerDid: v.issuer,
    subjectDid: v.subject,
    handle: v.handle,
    displayName: v.displayName,
  }
}

function matchesVerification(
  v: ToolsOzoneVerificationDefs.VerificationView,
  op: Operation,
  issuer: string,
) {
  if (op.request.endpoint !== 'tools.ozone.verification.grantVerifications')
    return false
  const request = op.request.body.verifications[0]
  return (
    !v.revokedAt &&
    !v.revokeReason &&
    v.issuer === issuer &&
    v.subject === request.subject &&
    v.handle === request.handle &&
    v.displayName === request.displayName &&
    v.uri.startsWith(`at://${issuer}/app.bsky.graph.verification/`)
  )
}

async function findVerification(
  agent: Agent,
  op: Operation,
  issuer: string,
  signal?: AbortSignal,
): Promise<Receipt | undefined> {
  if (op.request.endpoint !== 'tools.ozone.verification.grantVerifications')
    return
  let cursor: string | undefined
  const seen = new Set<string>()
  do {
    signal?.throwIfAborted()
    const { data } = await agent.tools.ozone.verification.listVerifications(
      {
        subjects: [op.request.body.verifications[0].subject],
        issuers: [issuer],
        isRevoked: false,
        limit: 100,
        cursor,
      },
      { signal },
    )
    const match = data.verifications.find((v) =>
      matchesVerification(v, op, issuer),
    )
    if (match) return verificationReceipt(match)
    cursor = data.cursor
    if (cursor && seen.has(cursor)) throw new Error('Repeated history cursor')
    if (cursor) seen.add(cursor)
  } while (cursor)
}

function activityReceipt(
  v: ToolsOzoneReportDefs.ReportActivityView,
  op: Operation,
  origin: string,
): Receipt {
  if (
    op.request.endpoint !== 'tools.ozone.report.createActivity' ||
    v.reportId !== op.request.body.reportId ||
    v.activity.$type !== op.request.body.activity.$type
  )
    throw new Error('Unexpected activity response')
  return {
    kind: 'report-activity',
    activityId: v.id,
    reportId: v.reportId,
    activity: { $type: op.request.body.activity.$type },
    createdBy: v.createdBy,
    createdAt: v.createdAt,
    url: `${origin}/reports/${v.reportId}`,
    ...('previousStatus' in v.activity &&
      typeof v.activity.previousStatus === 'string' && {
        previousStatus: v.activity.previousStatus,
      }),
    ...(v.internalNote !== undefined && { internalNote: v.internalNote }),
    ...(v.publicNote !== undefined && { publicNote: v.publicNote }),
  }
}

/** Dispatch a custom action operation and return its receipt. */
export async function dispatch(
  agent: Agent,
  run: Run,
  op: Operation,
  signal?: AbortSignal,
): Promise<Receipt> {
  signal?.throwIfAborted()
  const { request } = op
  if (request.endpoint === 'tools.ozone.moderation.emitEvent') {
    const { data } = await agent.tools.ozone.moderation.emitEvent(
      {
        ...request.body,
        modTool: eventMetadata(run, op),
      },
      { signal },
    )
    if (!Number.isSafeInteger(data.id) || data.id <= 0)
      throw new Error('No event receipt')
    return {
      kind: 'moderation-event',
      eventId: data.id,
      url: `${run.context.uiOrigin}/events/${data.id}`,
    }
  }
  if (request.endpoint === 'tools.ozone.report.createActivity') {
    const { data } = await agent.tools.ozone.report.createActivity(
      request.body,
      { signal },
    )
    return activityReceipt(data.activity, op, run.context.uiOrigin)
  }
  if (run.verifierDid) {
    const existing = await findVerification(agent, op, run.verifierDid, signal)
    if (existing) return existing
  }
  signal?.throwIfAborted()
  const { data } = await agent.tools.ozone.verification.grantVerifications(
    request.body,
    { signal },
  )
  const receipt = data.verifications.find(
    (v) => run.verifierDid && matchesVerification(v, op, run.verifierDid),
  )
  if (receipt) return verificationReceipt(receipt)
  throw new Error(
    data.failedVerifications.length
      ? 'Verification grant did not yield a confirmed receipt'
      : 'Empty verification result',
  )
}

/**
 * Settle on abort even if the transport ignores its signal; discard late results.
 */
function abortable<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  signal.throwIfAborted()
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    Promise.resolve()
      .then(() => {
        signal.throwIfAborted()
        return work()
      })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort))
  })
}

/**
 * Create executable run from custom action and snapshot context.
 */
export function createRun(action: CustomAction, snapshot: Snapshot): Run {
  const id = crypto.randomUUID()
  const startedAt = new Date().toISOString()
  return structuredClone({
    id,
    batchId: `custom-action:${action.id}:${Date.now()}-${id}`,
    startedAt,
    updatedAt: startedAt,
    action,
    context: snapshot.context,
    operations: prepare(action, snapshot),
    status: 'pending',
    verifierDid: snapshot.config.verifierDid,
  } satisfies Run)
}

/**
 * Execute a run, handling aborts, timeouts, and operation status updates.
 */
export async function executeRun(
  run: Run,
  deps: {
    prepare: (signal: AbortSignal) => Promise<void>
    dispatch: (run: Run, op: Operation, signal: AbortSignal) => Promise<Receipt>
    changed: (run: Run) => void
  },
  controller: AbortController,
) {
  if (run.status !== 'pending') return
  const { signal } = controller
  const timer = setTimeout(
    () =>
      controller.abort(new DOMException('Time limit reached', 'TimeoutError')),
    RUN_TIMEOUT_MS,
  )
  const notify = () => {
    run.updatedAt = new Date().toISOString()
    deps.changed(structuredClone(run))
  }
  let current: Operation | undefined
  run.status = 'running'
  try {
    notify()
    await abortable(signal, () => deps.prepare(signal))
    for (const op of run.operations) {
      signal.throwIfAborted()
      current = op
      op.status = 'running'
      notify()
      op.receipt = await abortable(signal, () => deps.dispatch(run, op, signal))
      op.status = 'succeeded'
      current = undefined
      notify()
    }
    run.status = 'succeeded'
  } catch {
    run.status = signal.aborted
      ? signal.reason?.name === 'TimeoutError'
        ? 'timed-out'
        : 'cancelled'
      : 'failed'
    if (current) current.status = run.status
  } finally {
    clearTimeout(timer)
    for (const op of run.operations) {
      if (op.status === 'pending') op.status = 'skipped'
    }
    notify()
  }
}
