'use client'
import {
  manageSettings,
  settingsQueryKey,
  useCustomActionSettings,
} from './useSettings'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Textarea } from '@/common/forms'
import { useConfigurationContext } from '../shell/ConfigurationContext'
import {
  ADMIN_ROLE,
  EMPTY_SETTINGS,
  importSettings,
  validateJson,
} from './validation'
import type { Settings } from './types'
import { CustomActionSettingsHelp } from './SettingsHelp'

export function CustomActionSettingsEditor() {
  const { config, labelerAgent, serverConfig } = useConfigurationContext()
  if (serverConfig.role !== ADMIN_ROLE) return null
  return <Editor key={`${config.did}:${labelerAgent.did}`} />
}
function Editor() {
  const { config, labelerAgent, serverConfig } = useConfigurationContext()
  const query = useCustomActionSettings()
  const client = useQueryClient()
  const [text, setText] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const source = text ?? JSON.stringify(query.data || EMPTY_SETTINGS, null, 2)
  const parsed = useMemo(() => {
    try {
      return { value: importSettings(source), error: '' }
    } catch (e) {
      return { value: null, error: (e as Error).message }
    }
  }, [source])
  async function save(value: Settings) {
    setBusy(true)
    setMessage('')
    try {
      await manageSettings(labelerAgent, serverConfig.role, 'save', value)
      await client.invalidateQueries({
        queryKey: settingsQueryKey(config.did, labelerAgent.did!),
      })
      setMessage('Custom actions saved.')
    } catch {
      setMessage(
        'Could not update custom actions. Check your access and connection; your edits are preserved.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section id="configure-custom-actions" aria-label="Custom action settings">
      <div className="flex flex-row items-center justify-between my-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Custom Actions
        </h4>
      </div>
      {helpOpen && (
        <CustomActionSettingsHelp onClose={() => setHelpOpen(false)} />
      )}
      <Card className="mb-4 pb-4">
        <div className="p-2">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-sm">
              Paste or edit workflows for this service. Saving replaces the full
              configuration.
            </p>
            <ActionButton
              appearance="outlined"
              size="sm"
              className="shrink-0"
              onClick={() => setHelpOpen(true)}
            >
              Help
            </ActionButton>
          </div>
          {query.isLoading && (
            <p role="status" className="text-sm mb-3">
              Loading custom actions…
            </p>
          )}
          {query.isError && (
            <p
              role="alert"
              className="text-sm mb-3 text-red-600 dark:text-red-400"
            >
              The stored setting is invalid or unavailable. Custom execution is
              disabled.
            </p>
          )}
          <FormLabel
            label="Custom actions JSON"
            htmlFor="custom-actions-json"
            className="mb-3"
          >
            <Textarea
              id="custom-actions-json"
              className="block w-full h-80 font-mono"
              value={source}
              onChange={(e) => setText(e.target.value)}
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
          <div className="mt-3 mb-2 flex flex-row flex-wrap justify-end gap-2">
            <ActionButton
              appearance="outlined"
              size="sm"
              disabled={busy || query.isLoading}
              onClick={() => {
                try {
                  setText(JSON.stringify(validateJson(source), null, 2))
                  setMessage('JSON formatted.')
                } catch {
                  setMessage(
                    'Could not format invalid JSON. Your edits are unchanged.',
                  )
                }
              }}
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
              onClick={() => save(parsed.value!)}
            >
              Save replacement
            </ActionButton>
          </div>
          {message && (
            <p role="status" className="text-sm">
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
