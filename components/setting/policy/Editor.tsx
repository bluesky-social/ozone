import React, { useState } from 'react'
import { usePolicyListEditor } from './usePolicyList'
import { Checkbox, FormLabel, Input, Textarea } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import { DocumentCheckIcon } from '@heroicons/react/24/solid'
import { useSeverityLevelSetting } from '@/setting/severity-level/useSeverityLevel'
import { PolicyDetail, SeverityLevelConfig } from './types'

export const PolicyEditor = ({
  editingPolicy,
  onCancel,
  onSuccess,
}: {
  editingPolicy?: PolicyDetail
  onSuccess: () => void
  onCancel: () => void
}) => {
  const { onSubmit, mutation } = usePolicyListEditor()
  const { data: severityLevelSetting } = useSeverityLevelSetting()
  const [selectedSeverityLevels, setSelectedSeverityLevels] = useState<
    Record<string, SeverityLevelConfig>
  >(editingPolicy?.severityLevels || {})

  const availableSeverityLevels = severityLevelSetting?.value
    ? Object.entries(severityLevelSetting.value)
    : []

  const toggleSeverityLevel = (key: string, checked: boolean) => {
    if (checked) {
      const updated = {
        ...selectedSeverityLevels,
        [key]: { description: '', isDefault: false },
      }
      // If this is the only selected item, make it default
      if (Object.keys(updated).length === 1) {
        updated[key].isDefault = true
      }
      setSelectedSeverityLevels(updated)
    } else {
      const updated = { ...selectedSeverityLevels }
      delete updated[key]
      // If we removed the default and there's exactly one left, make it default
      if (Object.keys(updated).length === 1) {
        const remainingKey = Object.keys(updated)[0]
        updated[remainingKey].isDefault = true
      }
      setSelectedSeverityLevels(updated)
    }
  }

  const updateSeverityLevelDescription = (key: string, description: string) => {
    setSelectedSeverityLevels({
      ...selectedSeverityLevels,
      [key]: { ...selectedSeverityLevels[key], description },
    })
  }

  const toggleSeverityLevelDefault = (key: string, isDefault: boolean) => {
    // If setting this as default, unset all others
    const updated = { ...selectedSeverityLevels }
    if (isDefault) {
      Object.keys(updated).forEach((k) => {
        updated[k] = { ...updated[k], isDefault: k === key }
      })
    } else {
      updated[key] = { ...updated[key], isDefault: false }
    }
    setSelectedSeverityLevels(updated)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget

    onSubmit(e, selectedSeverityLevels, editingPolicy?.name)
      .then(() => {
        // On success: reset form, clear state, and close editor
        form.reset()
        setSelectedSeverityLevels({})
        onSuccess()
      })
      .catch((error) => {
        // Keep form open with all values preserved on error
        // Error toast is already shown by the mutation
        console.error('Form submission failed:', error)
      })
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormLabel label="Name" htmlFor="name" className="flex-1 mb-3">
        <Input
          type="text"
          id="name"
          name="name"
          required
          placeholder="Name of the policy. Only alphabetic characters are allowed."
          className="block w-full"
          pattern="[A-Za-z ]+"
          defaultValue={editingPolicy?.name || ''}
          readOnly={!!editingPolicy}
        />
        {editingPolicy && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Policy name cannot be changed during edit
          </p>
        )}
      </FormLabel>
      <FormLabel
        required
        label="Description"
        htmlFor="description"
        className="flex-1 mb-3"
      >
        <Textarea
          required
          id="description"
          name="description"
          className="block w-full"
          placeholder="Additional details about the policy"
          defaultValue={editingPolicy?.description || ''}
        />
      </FormLabel>
      <FormLabel label="URL" htmlFor="url" className="flex-1 mb-3">
        <Input
          type="url"
          id="url"
          name="url"
          placeholder="Full URL for the policy (optional)"
          className="block w-full"
          defaultValue={editingPolicy?.url || ''}
        />
      </FormLabel>
      <FormLabel
        label="Severity Levels"
        htmlFor="severityLevel"
        className="flex-1 mb-3"
      >
        <div className="space-y-2">
          {availableSeverityLevels.map(([key, level]) => {
            const isSelected = !!selectedSeverityLevels[key]
            const config = selectedSeverityLevels[key]
            const selectedCount = Object.keys(selectedSeverityLevels).length
            return (
              <div
                key={key}
                className={
                  isSelected ? 'bg-gray-50 dark:bg-gray-800/50 rounded p-2' : ''
                }
              >
                <div className="flex flex-row items-center gap-3">
                  <Checkbox
                    id={`sev-${key}`}
                    name={`sev-${key}`}
                    checked={isSelected}
                    onChange={(e) => toggleSeverityLevel(key, e.target.checked)}
                    label={key}
                  />
                  {isSelected && selectedCount > 1 && (
                    <Checkbox
                      id={`sev-${key}-default`}
                      name={`sev-${key}-default`}
                      checked={config?.isDefault || false}
                      onChange={(e) =>
                        toggleSeverityLevelDefault(key, e.target.checked)
                      }
                      label="Default"
                      className="text-sm text-gray-600 dark:text-gray-400"
                    />
                  )}
                  {isSelected && selectedCount === 1 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                      (default)
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Textarea
                    id={`sev-${key}-desc`}
                    placeholder={`Custom description (optional)`}
                    className="block w-full text-sm mt-2"
                    rows={2}
                    value={config?.description || ''}
                    onChange={(e) =>
                      updateSeverityLevelDescription(key, e.target.value)
                    }
                  />
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Select severity levels for this policy. If multiple are selected, mark
          one as default.
        </p>
      </FormLabel>

      <div className="flex flex-row items-center gap-2">
        <ActionButton
          size="sm"
          appearance="primary"
          type="submit"
          disabled={mutation.isLoading}
        >
          <DocumentCheckIcon className="h-4 w-4 mr-2" />
          {editingPolicy ? 'Update Policy' : 'Save Policy'}
        </ActionButton>
        <ActionButton
          size="sm"
          appearance="outlined"
          type="button"
          disabled={mutation.isLoading}
          onClick={onCancel}
        >
          Cancel
        </ActionButton>
      </div>
    </form>
  )
}
