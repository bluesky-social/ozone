import React, { useState } from 'react'
import { usePolicyListEditor } from './usePolicyList'
import { FormLabel, Input, Textarea } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import { DocumentCheckIcon } from '@heroicons/react/24/solid'
import { useSeverityLevelSetting } from '@/setting/severity-level/useSeverityLevel'
import { XMarkIcon } from '@heroicons/react/24/outline'

export const PolicyEditor = ({
  onCancel,
  onSuccess,
}: {
  onSuccess: () => void
  onCancel: () => void
}) => {
  const { onSubmit, mutation } = usePolicyListEditor()
  const { data: severityLevelSetting } = useSeverityLevelSetting()
  const [selectedSeverityLevels, setSelectedSeverityLevels] = useState<
    string[]
  >([])

  const availableSeverityLevels = severityLevelSetting?.value
    ? Object.entries(severityLevelSetting.value).map(([key, value]) => ({
        key,
        name: value.name,
      }))
    : []

  const addSeverityLevel = (key: string) => {
    if (!selectedSeverityLevels.includes(key)) {
      setSelectedSeverityLevels([...selectedSeverityLevels, key])
    }
  }

  const removeSeverityLevel = (key: string) => {
    setSelectedSeverityLevels(
      selectedSeverityLevels.filter((level) => level !== key),
    )
  }

  return (
    <form
      onSubmit={(e) => {
        onSubmit(e, selectedSeverityLevels).then(onSuccess).catch(onCancel)
      }}
    >
      <FormLabel label="Name" htmlFor="name" className="flex-1 mb-3">
        <Input
          type="text"
          id="name"
          name="name"
          required
          placeholder="Name of the policy. Only alphabetic characters are allowed."
          className="block w-full"
          pattern="[A-Za-z ]+"
        />
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
        />
      </FormLabel>
      <FormLabel label="URL" htmlFor="url" className="flex-1 mb-3">
        <Input
          type="url"
          id="url"
          name="url"
          placeholder="Full URL for the policy (optional)"
          className="block w-full"
        />
      </FormLabel>
      <FormLabel
        label="Severity Levels"
        htmlFor="severityLevel"
        className="flex-1 mb-3"
      >
        <div className="mb-2">
          <select
            id="severityLevel"
            className="block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2"
            onChange={(e) => {
              if (e.target.value) {
                addSeverityLevel(e.target.value)
                e.target.value = ''
              }
            }}
          >
            <option value="">Select a severity level to add...</option>
            {availableSeverityLevels.map((level) => (
              <option
                key={level.key}
                value={level.key}
                disabled={selectedSeverityLevels.includes(level.key)}
              >
                {level.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage severity level configuration
          </p>
        </div>
        {selectedSeverityLevels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSeverityLevels.map((key) => {
              const level = availableSeverityLevels.find((l) => l.key === key)
              return (
                <div
                  key={key}
                  className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                >
                  <span>{level?.name || key}</span>
                  <button
                    type="button"
                    onClick={() => removeSeverityLevel(key)}
                    className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </FormLabel>

      <div className="flex flex-row items-center gap-2">
        <ActionButton
          size="sm"
          appearance="primary"
          type="submit"
          disabled={mutation.isLoading}
        >
          <DocumentCheckIcon className="h-4 w-4 mr-2" />
          Save Policy
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
