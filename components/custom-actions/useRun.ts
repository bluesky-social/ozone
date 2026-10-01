'use client'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useConfigurationContext } from '../shell/ConfigurationContext'
import { prepare } from './compile'
import { createRun, dispatch, executeRun } from './execution'
import { readSnapshot } from './compile'
import type { CustomAction, Run, Snapshot } from './types'

type RunTask = { scope: string; controller: AbortController }

export function useCustomActionRun(contextKey: string) {
  const client = useQueryClient()

  // state for the component
  const mounted = useRef(true)

  // environment
  const { config, labelerAgent } = useConfigurationContext()
  const serviceDid = config.did
  const moderatorDid = labelerAgent.did

  // scope for the current run
  const scope = JSON.stringify([serviceDid, moderatorDid, contextKey])
  const latestScope = useRef(scope)
  latestScope.current = scope

  // state for the current run
  const [run, setRun] = useState<Run | null>(null)
  const active = useRef<RunTask | null>(null)
  const isCurrent = (task: RunTask) =>
    mounted.current &&
    active.current === task &&
    latestScope.current === task.scope

  useEffect(() => {
    mounted.current = true
    active.current = null
    setRun(null)
    return () => {
      mounted.current = false
      active.current = null
    }
  }, [scope])

  return {
    run: active.current?.scope === scope ? run : null,
    start: async (action: CustomAction, snapshot: Snapshot) => {
      if (active.current) return
      const initial = createRun(action, snapshot)
      const task = { scope, controller: new AbortController() }
      active.current = task
      try {
        await executeRun(
          initial,
          {
            prepare: async (signal) => {
              const fresh = await readSnapshot(
                labelerAgent,
                config.did,
                snapshot.context.uiOrigin,
                snapshot.context.subject,
                snapshot.context.report?.id,
                action.actions.some((step) => step.type === 'verify'),
                signal,
              )
              signal.throwIfAborted()
              initial.operations = prepare(action, fresh)
              initial.verifierDid = fresh.config.verifierDid
              if (!isCurrent(task)) task.controller.abort()
            },
            changed: (current) => {
              if (isCurrent(task)) setRun(current)
            },
            dispatch: (current, op, signal) =>
              dispatch(labelerAgent, current, op, signal),
          },
          task.controller,
        )
      } finally {
        // Refresh the page after execution without making completed writes depend on read availability.
        void client
          .invalidateQueries({
            predicate: (q) =>
              [
                'report',
                'reportActivities',
                'betaReports',
                'events',
                'modEventList',
                'modActionSubject',
                'modSubjectStatus',
                'verification-list',
                'custom-action-snapshot',
              ].includes(String(q.queryKey[0])),
          })
          .catch(() => {})
      }
    },
    cancel: () => active.current?.controller.abort(),
    dismiss: () => {
      active.current = null
      setRun(null)
    },
  }
}
