'use client'
import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ToolsOzoneReportDefs } from '@atproto/api'
import { ActionButton } from '@/common/buttons'
import { LabelList, ModerationLabel } from '@/common/labels/List'
import { SubjectTag } from '../tags/SubjectTag'
import { useConfigurationContext } from '../shell/ConfigurationContext'
import { useCustomActionSettings } from './useSettings'
import { useCustomActionRun } from './useRun'
import { readSnapshot, subjectId } from './compile'
import type { CustomAction, Subject, Step } from './types'

export function useCustomActionPanel(
  subject: string | Subject,
  report?: Pick<ToolsOzoneReportDefs.ReportView, 'id'>,
) {
  const reportId = report?.id
  const { config, labelerAgent, serverConfig } = useConfigurationContext()
  const settings = useCustomActionSettings()
  const [selectionId, setLocalSelection] = useState<string | null>(null)
  const helpId = useId()
  const id = typeof subject === 'string' ? subject : subjectId(subject)
  const cid =
    typeof subject !== 'string' && 'cid' in subject ? subject.cid : undefined
  const subjectKey = JSON.stringify([id, cid])
  const progress = useCustomActionRun(JSON.stringify([subjectKey, reportId]))
  useEffect(() => {
    setLocalSelection(null)
  }, [subjectKey, reportId, config.did, labelerAgent.did])
  const state = useQuery({
    queryKey: [
      'custom-action-snapshot',
      config.did,
      labelerAgent.did,
      serverConfig.role,
      subjectKey,
      reportId,
      settings.dataUpdatedAt,
    ],
    enabled: settings.actions.length > 0,
    queryFn: () =>
      readSnapshot(
        labelerAgent,
        config.did,
        window.location.origin,
        subject,
        reportId,
        settings.actions.some((a) =>
          a.actions.some((s) => s.type === 'verify'),
        ),
      ),
    retry: false,
    cacheTime: 0,
    staleTime: 0,
  })
  const run =
    progress.run &&
    subjectId(progress.run.context.subject) === id &&
    (!cid ||
      ('cid' in progress.run.context.subject &&
        progress.run.context.subject.cid === cid)) &&
    progress.run.context.report?.id === reportId
      ? progress.run
      : null
  const choices = settings.actions.filter(
    (a) =>
      a.enabled !== false &&
      !!serverConfig.role &&
      a.allowedRoles.includes(serverConfig.role) &&
      a.subjectTypes.includes(id.startsWith('did:') ? 'account' : 'record') &&
      (!a.collections || a.collections.includes(id.split('/')[3])),
  )
  const selection = choices.find((action) => action.id === selectionId) ?? null
  const selected = run?.action || selection
  function setSelection(action: CustomAction | null) {
    // An explicit choice dismisses the displayed run.
    progress.dismiss()
    setLocalSelection(action?.id ?? null)
  }
  return {
    settings,
    state,
    subject: id,
    reportId,
    progress,
    run,
    selected,
    selection,
    choices,
    helpId,
    setSelection,
  }
}
export type PanelModel = ReturnType<typeof useCustomActionPanel>
export function customMenuItems(model: PanelModel, clearBuiltin: () => void) {
  return model.choices.map((action) => ({
    id: `custom:${action.id}`,
    group: 'Custom actions',
    text: action.name,
    onClick: () => {
      clearBuiltin()
      model.setSelection(action)
    },
  }))
}
export function CustomActionPanel({ model }: { model: PanelModel }) {
  const { selected, progress, run } = model
  const [error, setError] = useState('')
  useEffect(() => {
    setError('')
  }, [selected?.id, run?.id])
  async function invoke(task: () => Promise<void>) {
    setError('')
    try {
      await task()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not complete this request.',
      )
    }
  }
  if (!selected)
    return (
      <>
        {model.settings.isLoading && (
          <p role="status" className="text-sm">
            Loading custom actions…
          </p>
        )}
        {model.settings.isError && (
          <p role="status" className="text-sm">
            Custom actions are unavailable. Built-in actions remain available.{' '}
            <button
              type="button"
              className="underline"
              disabled={model.settings.isFetching}
              onClick={() => void model.settings.refetch()}
            >
              Retry loading
            </button>
          </p>
        )}
      </>
    )
  return (
    <section
      className="mt-2 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 p-2.5 space-y-2 text-sm break-words"
      aria-label="Custom action progress"
      data-cy="custom-action-panel"
    >
      <p className="font-medium text-gray-700 dark:text-gray-100">
        {selected.name}
      </p>
      {selected.helpText && (
        <p
          id={model.helpId}
          className="whitespace-pre-wrap text-gray-500 dark:text-gray-400"
        >
          {selected.helpText}
        </p>
      )}
      {selected.description && <p>{selected.description}</p>}
      <ol className="space-y-2 list-decimal pl-5">
        {selected.actions.map((step, index) => {
          const op = run?.operations[index]
          return (
            <li key={step.id}>
              <div className="font-medium">
                {describeStep(step, model.subject, model.reportId)}
              </div>
              <StepEffects step={step} />
              {op && (
                <p
                  className="text-xs text-gray-500 dark:text-gray-400"
                  data-cy="custom-operation-status"
                >
                  {op.status}
                  {op.receipt?.kind === 'moderation-event' && (
                    <>
                      {' • '}
                      <a
                        className="underline"
                        href={op.receipt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        event {op.receipt.eventId}
                      </a>
                    </>
                  )}
                  {op.receipt?.kind === 'report-activity' &&
                    ` • activity ${op.receipt.activityId}`}
                  {op.receipt?.kind === 'verification' &&
                    ` • ${op.receipt.uri}`}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      {!run && (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
            onClick={() => model.setSelection(null)}
          >
            Cancel
          </button>
          <ActionButton
            appearance="primary"
            size="sm"
            disabled={
              !model.state.data || model.state.isError || model.settings.isError
            }
            onClick={() =>
              invoke(() => progress.start(selected, model.state.data!))
            }
          >
            Confirm and run
          </ActionButton>
        </div>
      )}
      {run && (
        <>
          <p role="status" aria-live="polite">
            {run.status === 'succeeded'
              ? 'Custom action completed.'
              : run.status === 'timed-out'
                ? 'Custom action timed out. Remaining steps were skipped.'
                : run.status === 'failed'
                  ? 'Custom action stopped after an error. Remaining steps were skipped.'
                  : run.status === 'cancelled'
                    ? 'Custom action cancelled. Remaining steps were skipped.'
                    : 'Running custom action…'}
          </p>
          {['failed', 'timed-out', 'cancelled'].includes(run.status) && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Completed steps were kept. A request already sent may still
              complete on the server. Review history or escalate if needed.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {run.status === 'running' && (
              <ActionButton
                appearance="outlined"
                size="sm"
                onClick={progress.cancel}
              >
                Cancel
              </ActionButton>
            )}
            <a
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline px-1"
              href={`${run.context.uiOrigin}/events/batch/${encodeURIComponent(run.batchId)}`}
              target="_blank"
              rel="noreferrer"
            >
              View history
            </a>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}

function StepEffects({ step }: { step: Step }) {
  const { config } = useConfigurationContext()
  const notes: string[] = []
  const effects: string[] = []
  let changes: { text: string; values: string[]; isTag?: boolean }[] = []
  if (step.type === 'event') {
    const event = step.event
    if (event.comment) notes.push(event.comment)
    if (step.reportAction?.note)
      notes.push(`Report note: ${step.reportAction.note}`)
    if (event.$type === 'tools.ozone.moderation.defs#modEventTag')
      changes = [
        { text: 'Add tags:', values: event.add, isTag: true },
        { text: 'Remove tags:', values: event.remove, isTag: true },
      ]
    if (event.$type === 'tools.ozone.moderation.defs#modEventLabel')
      changes = [
        { text: 'Add labels:', values: event.createLabelVals },
        { text: 'Remove labels:', values: event.negateLabelVals },
      ]
    if ('durationInHours' in event && event.durationInHours)
      effects.push(`Duration: ${event.durationInHours} hours`)
    if (event.$type === 'tools.ozone.moderation.defs#modEventTakedown') {
      effects.push(
        `Services: ${event.targetServices?.join(', ') || 'service defaults'}`,
      )
      if (event.policies?.length)
        effects.push(`Policies: ${event.policies.join(', ')}`)
      if (event.severityLevel) effects.push(`Severity: ${event.severityLevel}`)
      if (event.strikeCount !== undefined)
        effects.push(`Strikes: ${event.strikeCount}`)
      if (event.strikeExpiresAt)
        effects.push(`Strike expiry: ${event.strikeExpiresAt}`)
    }
    if (
      event.$type === 'tools.ozone.moderation.defs#modEventComment' &&
      event.sticky
    )
      effects.push('Replace the persistent subject note')
  } else if (step.type === 'activity') {
    if (step.internalNote) notes.push(`Internal note: ${step.internalNote}`)
    if (step.publicNote) notes.push(`Public note: ${step.publicNote}`)
  }
  return (
    <div className="text-sm whitespace-pre-wrap">
      {changes
        .filter(({ values }) => values.length > 0)
        .map(({ text, values, isTag }) => (
          <LabelList key={text} className="flex-wrap gap-y-1">
            <span className="text-gray-500 dark:text-gray-400">{text}</span>
            {values.map((value) =>
              isTag ? (
                <SubjectTag key={value} tag={value} />
              ) : (
                <ModerationLabel
                  key={value}
                  label={{ val: value, src: config.did, uri: '', cts: '' }}
                />
              ),
            )}
          </LabelList>
        ))}
      {effects.map((effect) => (
        <p key={effect}>{effect}</p>
      ))}
      {notes.map((note, index) => (
        <p key={index}>{note}</p>
      ))}
    </div>
  )
}

function describeStep(step: Step, subject: string, reportId?: number) {
  if (step.type === 'activity') {
    const labels = {
      closeActivity: 'Acknowledge report',
      reopenActivity: 'Reopen report',
      escalationActivity: 'Escalate report',
      noteActivity: 'Add report note',
    }
    return `${labels[step.activity.$type.split('#')[1]]}${reportId ? ` #${reportId}` : ''}`
  }
  const target =
    step.target === 'account' && subject.startsWith('at://')
      ? subject.split('/')[2]
      : subject
  if (step.type === 'verify') return `Verify account: ${target}`
  const labels = {
    modEventTag: 'Update tags',
    modEventLabel: 'Update labels',
    modEventTakedown: 'Take down',
    modEventAcknowledge: 'Acknowledge',
    modEventComment: 'Add comment',
    modEventEscalate: 'Escalate',
  }
  const event = step.event
  const duration = event.$type.endsWith('#modEventTakedown')
    ? 'durationInHours' in event && event.durationInHours
      ? ` for ${event.durationInHours} hours`
      : ' — PERMANENT'
    : ''
  const reportOutcome = step.reportAction
    ? event.$type.endsWith('#modEventEscalate')
      ? ' • escalate current report'
      : event.$type.endsWith('#modEventLabel') ||
          event.$type.endsWith('#modEventTakedown')
        ? ' • close current report as actioned'
        : ' • close current report as acknowledged'
    : ''
  return `${labels[event.$type.split('#')[1]]}: ${target}${duration}${reportOutcome}`
}
