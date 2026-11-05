'use client'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Textarea } from '@/common/forms'
import { useConfigurationContext } from '../shell/ConfigurationContext'
import {
  saveSettingsDraft,
  settingsQueryKey,
  useCustomActionSettings,
} from './useSettings'
import { ADMIN_ROLE, EMPTY_SETTINGS, validateJson } from './validation'
import {
  initialEditorState,
  newActionDraft,
  openSettingsDraft,
  readSettingsDraft,
  SettingsConflictError,
  settingsEditorReducer,
} from './settings-editor'
import { CustomActionSettingsHelp } from './SettingsHelp'

export function CustomActionSettingsEditor() {
  const { config, labelerAgent, serverConfig } = useConfigurationContext()
  if (serverConfig.role !== ADMIN_ROLE) return null
  return <Editor key={`${config.did}:${labelerAgent.did}`} />
}

function useEditor() {
  const { config, labelerAgent, serverConfig } = useConfigurationContext()
  const query = useCustomActionSettings()
  const client = useQueryClient()
  const [state, dispatch] = useReducer(
    settingsEditorReducer,
    initialEditorState,
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const { draft } = state
  const settings = query.data ?? EMPTY_SETTINGS
  const parsed = useMemo(() => {
    try {
      return { value: draft ? readSettingsDraft(draft) : null, error: '' }
    } catch (e) {
      return { value: null, error: (e as Error).message }
    }
  }, [draft])

  async function save() {
    if (!draft || !parsed.value || busy) return
    setBusy(true)
    setMessage('')
    try {
      const value = await saveSettingsDraft(
        labelerAgent,
        serverConfig.role,
        draft,
      )
      const queryKey = settingsQueryKey(config.did, labelerAgent.did!)
      client.setQueryData(queryKey, value)
      dispatch({ type: 'saved' })
      setMessage('Custom actions saved.')
      // Refresh without presenting a confirmed save as failed if the read fails.
      void client.invalidateQueries({ queryKey }).catch(() => {})
    } catch (error) {
      setMessage(
        error instanceof SettingsConflictError
          ? error.message
          : 'Could not update custom actions. Check your access and connection; your edits are preserved.',
      )
    } finally {
      setBusy(false)
    }
  }

  return {
    query: { isLoading: query.isLoading, isError: query.isError },
    settings,
    state,
    dispatch,
    parsed,
    busy,
    message,
    helpOpen,
    setHelpOpen,
    open: (actionId?: string) => {
      setMessage('')
      dispatch({ type: 'open', draft: openSettingsDraft(settings, actionId) })
    },
    add: () => {
      setMessage('')
      dispatch({ type: 'open', draft: newActionDraft(settings) })
    },
    back: () => {
      setMessage('')
      dispatch({ type: 'back' })
    },
    format: () => {
      if (!draft) return
      try {
        dispatch({
          type: 'change',
          text: JSON.stringify(validateJson(draft.text), null, 2),
        })
        setMessage('JSON formatted.')
      } catch {
        setMessage('Could not format invalid JSON. Your edits are unchanged.')
      }
    },
    save,
  }
}

function Editor() {
  return <CustomActionSettingsContent model={useEditor()} />
}

export function CustomActionSettingsContent({
  model,
}: {
  model: ReturnType<typeof useEditor>
}) {
  const { query, settings, state, dispatch, parsed, busy, message, helpOpen } =
    model
  const { draft } = state
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editing = !!draft
  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing, draft?.actionId])
  const action = draft?.actionId
    ? draft.settings.customActions.find((a) => a.id === draft.actionId)
    : undefined
  return (
    <section id="configure-custom-actions" aria-label="Custom action settings">
      <div className="flex flex-row items-center justify-between my-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Custom Actions
        </h4>
        <ActionButton
          appearance="outlined"
          size="sm"
          onClick={() => model.setHelpOpen(true)}
        >
          Help
        </ActionButton>
      </div>
      {helpOpen && (
        <CustomActionSettingsHelp onClose={() => model.setHelpOpen(false)} />
      )}
      <Card className="mb-4 pb-4">
        <div className="p-2 space-y-3">
          {draft && (
            <div>
              <h5 className="font-medium">
                {draft.isNew
                  ? 'New custom action'
                  : (action?.name ?? 'Raw JSON')}
              </h5>
              <p className="text-sm">
                {draft.isNew
                  ? 'Configure the new action, then save to add it to the list. New actions start disabled.'
                  : action
                    ? 'Edit this custom action. Saving keeps the other workflows.'
                    : 'Edit the full configuration to add, remove, or reorder workflows. Saving replaces the full configuration.'}
              </p>
            </div>
          )}
          {query.isLoading && (
            <p role="status" className="text-sm">
              Loading custom actions…
            </p>
          )}
          {query.isError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              The stored setting is invalid or unavailable. Custom execution is
              disabled.
            </p>
          )}
          {!draft ? (
            <>
              {!query.isLoading &&
                !query.isError &&
                (settings.customActions.length ? (
                  <ul
                    aria-label="Custom actions"
                    className="divide-y divide-gray-200 dark:divide-gray-700 rounded border border-gray-200 dark:border-gray-700"
                  >
                    {settings.customActions.map((customAction) => (
                      <li key={customAction.id}>
                        <button
                          type="button"
                          className="block w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                          disabled={busy}
                          onClick={() => model.open(customAction.id)}
                        >
                          <span className="font-medium">
                            {customAction.name}
                          </span>
                          {customAction.enabled === false && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              Disabled
                            </span>
                          )}
                          <span className="block text-sm text-gray-500 dark:text-gray-400">
                            {customAction.actions.length}{' '}
                            {customAction.actions.length === 1
                              ? 'step'
                              : 'steps'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">
                    No custom actions configured. Choose Add to create one.
                  </p>
                ))}
              <div className="flex flex-wrap justify-end gap-2">
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  disabled={busy || query.isLoading || query.isError}
                  onClick={() =>
                    downloadJson(settings, 'ozone-custom-actions.json')
                  }
                >
                  Export settings
                </ActionButton>
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  disabled={busy || query.isLoading}
                  onClick={() => model.open()}
                >
                  Edit raw JSON
                </ActionButton>
                <ActionButton
                  appearance="primary"
                  size="sm"
                  disabled={busy || query.isLoading || query.isError}
                  onClick={model.add}
                >
                  Add
                </ActionButton>
              </div>
            </>
          ) : (
            <>
              <FormLabel
                label={
                  action || draft.isNew
                    ? 'Custom action JSON'
                    : 'Custom actions JSON'
                }
                htmlFor="custom-actions-json"
                className="mb-3"
              >
                <Textarea
                  id="custom-actions-json"
                  ref={textareaRef}
                  className="block w-full h-80 font-mono"
                  value={draft.text}
                  onChange={(e) =>
                    dispatch({ type: 'change', text: e.target.value })
                  }
                  disabled={busy}
                  spellCheck={false}
                />
              </FormLabel>
              {parsed.error && (
                <p
                  role="alert"
                  className="text-sm break-words text-red-600 dark:text-red-400"
                >
                  {parsed.error}
                </p>
              )}
              {state.discardPending && (
                <div
                  role="group"
                  aria-label="Unsaved custom action changes"
                  className="space-y-2"
                >
                  <p className="text-sm" role="status">
                    You have unsaved changes. Discard them to return to the
                    list?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      appearance="outlined"
                      size="sm"
                      disabled={busy}
                      onClick={() => dispatch({ type: 'keep-editing' })}
                    >
                      Keep editing
                    </ActionButton>
                    <ActionButton
                      appearance="negative"
                      size="sm"
                      disabled={busy}
                      onClick={() => dispatch({ type: 'discard' })}
                    >
                      Discard changes
                    </ActionButton>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  disabled={busy}
                  onClick={model.back}
                >
                  Back to custom actions
                </ActionButton>
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  disabled={busy || query.isLoading}
                  onClick={model.format}
                >
                  Format JSON
                </ActionButton>
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  disabled={!parsed.value}
                  onClick={() =>
                    downloadJson(parsed.value, 'ozone-custom-actions.json')
                  }
                >
                  Export settings
                </ActionButton>
                <ActionButton
                  appearance="primary"
                  size="sm"
                  disabled={busy || !parsed.value || query.isLoading}
                  onClick={() => void model.save()}
                >
                  {action || draft.isNew ? 'Save action' : 'Save replacement'}
                </ActionButton>
              </div>
            </>
          )}
          {message && (
            <p role="status" className="text-sm break-words">
              {message}
            </p>
          )}
        </div>
      </Card>
    </section>
  )
}

function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
