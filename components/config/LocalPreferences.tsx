import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { Checkbox } from '@/common/forms'
import {
  buildGraphicPreferenceKeyForLabel,
  GraphicMediaFilterOptions,
  labelsRequiringMediaFilter,
} from '@/common/labels/util'
import { LabelChip } from '@/common/labels/List'
import { useGraphicMediaPreferences } from './useLocalPreferences'
import { toast } from 'react-toastify'

const GraphicMediaPreferenceSelectorForLabel = ({
  label,
}: {
  label: string
}) => {
  const { getPreference } = useGraphicMediaPreferences()

  return (
    <div className="my-2">
      <LabelChip className="ml-0 mb-2">{label}</LabelChip>
      {GraphicMediaFilterOptions.map((filter) => {
        const key = buildGraphicPreferenceKeyForLabel(label, filter)
        return (
          <Checkbox
            defaultChecked={getPreference(key)}
            label={filter}
            className="capitalize"
            name={key}
            key={key}
            value="on"
          />
        )
      })}
    </div>
  )
}

export const LocalPreferences = () => {
  const { setPreferences } = useGraphicMediaPreferences()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const preferences: Record<string, boolean> = {}
    Array.from(formData.entries()).forEach(([key, value]) => {
      preferences[key] = value === 'on'
    })

    setPreferences(preferences)
    toast.success('Preferences saved successfully!')
  }

  return (
    <>
      <div className="flex flex-row justify-between my-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Preferences
        </h4>
      </div>
      <Card className="mb-4 pb-4">
        <p className="mb-1">Graphic media display</p>
        <p className="text-sm mb-2">
          You can choose to make media content (video and image) with the
          following labels appear on your screen with your preferred filter.
          <br />
          This is your personal configuration and won{"'"}t be shared with other
          moderators.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-row w-full gap-4 justify-between flex-wrap">
            {labelsRequiringMediaFilter.map((label) => {
              return (
                <GraphicMediaPreferenceSelectorForLabel
                  key={label}
                  label={label}
                />
              )
            })}
          </div>
          <div className="mt-3 mb-2 flex flex-row justify-end">
            <ActionButton appearance="primary" size="sm" type="submit">
              Save Preferences
            </ActionButton>
          </div>
        </form>
      </Card>
    </>
  )
}
