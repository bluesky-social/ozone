import { ActionButton, ButtonGroup } from '@/common/buttons'
import { Input, Select, Textarea } from '@/common/forms'
import { getReasonLabel } from '@/reports/helpers/getType'
import { ReasonTypeCombobox } from '@/reports/ReasonTypeCombobox'
import { useServerConfig } from '@/shell/ConfigurationContext'
import type {
  PriorityLevel,
  PriorityLevels,
} from '@/setting/report-priority/types'
import {
  type PrioritySettingChange,
  useReportPrioritySettings,
  useSaveReportPrioritySettings,
} from '@/setting/report-priority/useReportPriority'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { useState, type ReactNode } from 'react'
import { toast } from 'react-toastify'

type LevelDraft = Partial<Omit<PriorityLevel, 'name'>>

export function ReportPrioritiesConfig() {
  const { role } = useServerConfig()
  const canManage = role === ToolsOzoneTeamDefs.ROLEADMIN
  const { data, isLoading, isError, refetch } = useReportPrioritySettings()
  const save = useSaveReportPrioritySettings()
  const levels = data?.levels ?? {}
  const mappings = data?.mappings ?? {}
  const [view, setView] = useState<'levels' | 'assignments'>('levels')
  const [drafts, setDrafts] = useState<Record<string, LevelDraft>>({})
  const [newLevelName, setNewLevelName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTargetMinutes, setNewTargetMinutes] = useState(30)
  const [newScore, setNewScore] = useState<number | null>(null)
  const [newReason, setNewReason] = useState('')
  const [reasonQuery, setReasonQuery] = useState('')
  const [pendingReasons, setPendingReasons] = useState<string[]>([])
  const [failure, setFailure] = useState<{
    change: PrioritySettingChange
    message: string
  } | null>(null)
  const editingDisabled = !canManage || save.isLoading
  const sortedLevels = Object.entries(levels).sort(
    ([, a], [, b]) => b.score - a.score,
  )
  const lowestScore = Math.min(
    101,
    ...Object.values(levels).map((level) => level.score),
  )
  const newLevel: PriorityLevel = {
    name: newLevelName.trim(),
    description: newDescription,
    targetResolutionMinutes: newTargetMinutes,
    score: newScore ?? (lowestScore > 0 ? lowestScore - 1 : NaN),
  }
  const newLevelError = getLevelError(newLevel.name, newLevel, levels)
  const reasons = [...new Set([...Object.keys(mappings), ...pendingReasons])]
  const retryChange: PrioritySettingChange | undefined =
    failure?.change.type === 'addLevel'
      ? { type: 'addLevel', id: newLevel.name, level: newLevel }
      : failure?.change.type === 'updateLevel'
        ? {
            ...failure.change,
            patch: { ...failure.change.patch, ...drafts[failure.change.id] },
          }
        : failure?.change
  const retryError =
    retryChange?.type === 'addLevel'
      ? newLevelError
      : retryChange?.type === 'updateLevel'
        ? !Object.hasOwn(levels, retryChange.id) ||
          getLevelError(
            retryChange.id,
            { ...levels[retryChange.id], ...retryChange.patch },
            levels,
            retryChange.id,
          )
        : null

  const persist = async (change: PrioritySettingChange) => {
    setFailure(null)
    try {
      await save.mutateAsync(change)
      if (change.type === 'addLevel') {
        setNewLevelName('')
        setNewDescription('')
        setNewTargetMinutes(30)
        setNewScore(null)
      } else if (change.type === 'updateLevel') {
        setDrafts((current) => {
          const remaining = Object.fromEntries(
            Object.entries(current[change.id] ?? {}).filter(
              ([field, value]) => value !== change.patch[field],
            ),
          )
          return { ...current, [change.id]: remaining }
        })
      } else if (change.type === 'removeLevel') {
        setDrafts((current) => {
          const next = { ...current }
          delete next[change.id]
          return next
        })
      } else {
        setPendingReasons((current) =>
          current.filter((reason) => reason !== change.reason),
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed'
      setFailure({ change, message })
      toast.error(`Could not save priority changes: ${message}`)
    }
  }

  const addReason = () => {
    const reason = newReason.trim()
    if (!reason || reasons.includes(reason)) return
    setPendingReasons((current) => [...current, reason])
    setNewReason('')
    setReasonQuery('')
  }

  if (isError)
    return (
      <p role="alert" className="pt-4 text-sm">
        Could not load report priorities.{' '}
        <button type="button" onClick={() => refetch()} className="underline">
          Retry
        </button>
      </p>
    )
  if (isLoading) return <p className="pt-4 text-sm">Loading priorities…</p>

  return (
    <div className="space-y-4 pt-4 pb-64">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h4
          id={
            view === 'levels'
              ? 'priority-definitions-heading'
              : 'priority-assignments-heading'
          }
          className="font-medium"
        >
          {view === 'levels' ? 'Priority Levels' : 'Assignments'}
        </h4>
        <div
          role="group"
          aria-label="Priority configuration view"
          className="self-end sm:self-auto"
        >
          <ButtonGroup
            appearance="primary"
            size="sm"
            leftAligned
            items={[
              {
                id: 'priority-levels',
                text: 'Priority Levels',
                isActive: view === 'levels',
                'aria-pressed': view === 'levels',
                onClick: () => setView('levels'),
              },
              {
                id: 'priority-assignments',
                text: 'Assignments',
                isActive: view === 'assignments',
                'aria-pressed': view === 'assignments',
                onClick: () => setView('assignments'),
              },
            ]}
          />
        </div>
      </div>
      {failure && (
        <div role="alert" className="text-sm text-red-600">
          Could not save priority changes: {failure.message}{' '}
          <button
            type="button"
            className="underline"
            disabled={save.isLoading || !!retryError}
            onClick={() => retryChange && void persist(retryChange)}
          >
            Retry
          </button>
        </div>
      )}
      {view === 'levels' ? (
        <section aria-labelledby="priority-definitions-heading">
          <div className="mb-4">
            <p className="text-xs text-gray-500">
              Higher scores have higher priority. Add saves a new level
              immediately. Changes to existing levels save when you leave a
              field.
            </p>
          </div>
          {sortedLevels.length === 0 && (
            <p className="mb-2 rounded border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-slate-600">
              No priority levels defined yet.
            </p>
          )}
          <div className="space-y-2">
            {sortedLevels.map(([key, savedLevel]) => {
              const level = { ...savedLevel, ...drafts[key] }
              const error = getLevelError(key, level, levels, key)
              return (
                <LevelEditor
                  key={key}
                  name={key}
                  level={level}
                  disabled={editingDisabled}
                  error={error}
                  onChange={(patch) =>
                    setDrafts((current) => ({
                      ...current,
                      [key]: { ...current[key], ...patch },
                    }))
                  }
                  onBlur={() => {
                    const patch = Object.fromEntries(
                      Object.entries(drafts[key] ?? {}).filter(
                        ([field, value]) => value !== savedLevel[field],
                      ),
                    )
                    if (
                      !editingDisabled &&
                      !error &&
                      Object.keys(patch).length
                    ) {
                      void persist({ type: 'updateLevel', id: key, patch })
                    }
                  }}
                >
                  {canManage && (
                    <ActionButton
                      appearance="negative"
                      size="sm"
                      onClick={() =>
                        void persist({ type: 'removeLevel', id: key })
                      }
                      disabled={editingDisabled}
                    >
                      Remove
                    </ActionButton>
                  )}
                </LevelEditor>
              )
            })}
            {canManage && (
              <LevelEditor
                name={newLevelName}
                level={newLevel}
                disabled={editingDisabled}
                isNew
                error={newLevelName.trim() ? newLevelError : null}
                onNameChange={setNewLevelName}
                onChange={(patch) => {
                  if ('description' in patch)
                    setNewDescription(patch.description ?? '')
                  if ('targetResolutionMinutes' in patch)
                    setNewTargetMinutes(patch.targetResolutionMinutes!)
                  if ('score' in patch) setNewScore(patch.score!)
                }}
              >
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  aria-label="Add priority level"
                  onClick={() =>
                    void persist({
                      type: 'addLevel',
                      id: newLevel.name,
                      level: newLevel,
                    })
                  }
                  disabled={editingDisabled || !!newLevelError}
                >
                  Add
                </ActionButton>
              </LevelEditor>
            )}
          </div>
        </section>
      ) : (
        <section aria-labelledby="priority-assignments-heading">
          <p className="mb-3 text-xs text-gray-500">
            Add report reasons and choose a priority level for each. Assignments
            save when you select a level. Reasons not listed have no priority or
            closure target.
          </p>
          {canManage && (
            <div className="mb-4">
              <label
                htmlFor="priority-report-reason"
                className="text-sm font-medium"
              >
                Add report reason
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <ReasonTypeCombobox
                    id="priority-report-reason"
                    selectedReason={newReason}
                    onSelect={setNewReason}
                    query={reasonQuery}
                    onQueryChange={setReasonQuery}
                    excludedReasons={reasons}
                    disabled={editingDisabled || sortedLevels.length === 0}
                    allowCustom
                  />
                </div>
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  onClick={addReason}
                  disabled={
                    editingDisabled ||
                    sortedLevels.length === 0 ||
                    !newReason.trim() ||
                    reasons.includes(newReason.trim())
                  }
                >
                  Add reason
                </ActionButton>
              </div>
              {sortedLevels.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Define a priority level above to start assigning report
                  reasons.
                </p>
              )}
            </div>
          )}
          {reasons.length === 0 && (
            <p className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-slate-600">
              No report reasons assigned yet.
            </p>
          )}
          <div className="space-y-2">
            {reasons.map((reason) => {
              const level = Object.hasOwn(mappings, reason)
                ? mappings[reason]
                : ''
              return (
                <div
                  key={reason}
                  data-cy="priority-assignment"
                  className="grid grid-cols-1 items-center gap-3 rounded border border-gray-200 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)_auto] dark:border-slate-700"
                >
                  <div className="min-w-0">
                    <span className="block break-words text-sm">
                      {getReasonLabel(reason)}
                    </span>
                    {getReasonLabel(reason) !== reason && (
                      <span className="block break-all text-xs text-gray-500 dark:text-gray-400">
                        {reason}
                      </span>
                    )}
                    {!level && (
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        Choose a level to save this assignment.
                      </span>
                    )}
                  </div>
                  <Select
                    aria-label={`Priority for ${getReasonLabel(reason)} (${reason})`}
                    value={level}
                    disabled={editingDisabled}
                    onChange={(event) =>
                      void persist({
                        type: 'assignReason',
                        reason,
                        level: event.target.value,
                      })
                    }
                  >
                    <option value="" disabled>
                      Select priority level
                    </option>
                    {level && !Object.hasOwn(levels, level) && (
                      <option value={level}>Unavailable level ({level})</option>
                    )}
                    {sortedLevels.map(([key]) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </Select>
                  {canManage && (
                    <ActionButton
                      appearance="outlined"
                      size="sm"
                      aria-label={`Remove reason ${reason}`}
                      disabled={editingDisabled}
                      onClick={() => {
                        if (level)
                          void persist({ type: 'removeReason', reason })
                        else
                          setPendingReasons((current) =>
                            current.filter((item) => item !== reason),
                          )
                      }}
                    >
                      Remove
                    </ActionButton>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function getLevelError(
  name: string,
  level: PriorityLevel,
  levels: PriorityLevels,
  existingKey?: string,
) {
  if (!name) return 'Enter a name for this level.'
  if (name !== existingKey && Object.hasOwn(levels, name))
    return 'A level with this name already exists.'
  if (!Number.isInteger(level.score) || level.score < 0 || level.score > 100)
    return 'Priority scores must be whole numbers from 0 to 100.'
  if (
    Object.entries(levels).some(
      ([key, value]) => key !== existingKey && value.score === level.score,
    )
  )
    return 'This priority score is already in use.'
  if (
    !Number.isInteger(level.targetResolutionMinutes) ||
    level.targetResolutionMinutes < 1 ||
    level.targetResolutionMinutes > 2_147_483_647
  )
    return 'Targets must be positive whole minutes, no greater than 2147483647.'
  return null
}

function LevelEditor({
  name,
  level,
  disabled,
  isNew = false,
  error,
  onNameChange,
  onChange,
  onBlur,
  children,
}: {
  name: string
  level: PriorityLevel
  disabled: boolean
  isNew?: boolean
  error: string | null
  onNameChange?: (name: string) => void
  onChange: (patch: LevelDraft) => void
  onBlur?: () => void
  children: ReactNode
}) {
  return (
    <div
      data-cy={isNew ? 'new-priority-level' : 'priority-level'}
      className={`grid grid-cols-1 items-end gap-2 rounded border p-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_5rem] ${isNew ? 'border-dashed border-gray-300 dark:border-slate-600' : 'border-gray-200 dark:border-slate-700'}`}
    >
      <Field label="Name">
        <Input
          value={name}
          placeholder="e.g. urgent"
          aria-label={isNew ? 'New priority level name' : undefined}
          disabled={disabled || !onNameChange}
          onChange={(event) => onNameChange?.(event.target.value)}
          className="w-full"
        />
      </Field>
      <Field label="Target minutes">
        <Input
          type="number"
          min={1}
          max={2_147_483_647}
          step={1}
          value={
            Number.isNaN(level.targetResolutionMinutes)
              ? ''
              : level.targetResolutionMinutes
          }
          disabled={disabled}
          onChange={(event) =>
            onChange({ targetResolutionMinutes: event.target.valueAsNumber })
          }
          onBlur={onBlur}
          className="w-full"
        />
      </Field>
      <Field label="Priority score">
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          placeholder="0–100"
          value={Number.isNaN(level.score) ? '' : level.score}
          disabled={disabled}
          onChange={(event) => onChange({ score: event.target.valueAsNumber })}
          onBlur={onBlur}
          className="w-full"
        />
      </Field>
      {children || <div />}
      <div className="sm:col-span-4">
        <Field label="Description (optional)">
          <Textarea
            rows={4}
            value={level.description ?? ''}
            placeholder="Describe when to use this priority level."
            disabled={disabled}
            onChange={(event) => onChange({ description: event.target.value })}
            onBlur={onBlur}
            className="w-full resize-y"
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-4">
          {error}
        </p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-xs text-gray-500">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}
