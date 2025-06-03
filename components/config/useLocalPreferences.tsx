import {
  buildGraphicPreferenceKeyForLabel,
  labelsRequiringMediaFilter,
  GraphicMediaFilter,
  GraphicMediaFilterOptions,
} from '@/common/labels/util'
import { useLocalStorage } from 'react-use'

export type GraphicMediaFilterPreference = Record<GraphicMediaFilter, boolean>

// This is the container hook for interfacing on top of localstorage and storing device level preferences
// There may be various types of preferences that can be stored here and ideally each preference category
// will have its own hook that will utilize this
export const useLocalPreferences = () => {
  const initialValue: Record<string, Record<string, boolean>> = {
    graphicMediaPrefs: {},
  }

  labelsRequiringMediaFilter.forEach((label) => {
    GraphicMediaFilterOptions.forEach((filter) => {
      initialValue.graphicMediaPrefs[
        buildGraphicPreferenceKeyForLabel(label, filter)
      ] = true
    })
  })

  const [localPreferences, setLocalPreferences] = useLocalStorage(
    'ozoneLocalPreferences',
    initialValue,
    {
      raw: false,
      serializer: JSON.stringify,
      deserializer: (value) => {
        try {
          return JSON.parse(value)
        } catch {
          return {}
        }
      },
    },
  )

  return { localPreferences, setLocalPreferences }
}

export const useGraphicMediaPreferences = () => {
  const { localPreferences, setLocalPreferences } = useLocalPreferences()
  return {
    setPreferences: (graphicMediaPrefs: Record<string, boolean>) => {
      setLocalPreferences({ ...localPreferences, graphicMediaPrefs })
    },
    getPreference: (key: string): boolean =>
      !!localPreferences.graphicMediaPrefs?.[key],
    getMediaFiltersForLabels: (
      labels?: string[],
    ): GraphicMediaFilterPreference => {
      const filters = { blur: false, grayscale: false, translucent: false }

      if (!labels?.length) {
        return filters
      }

      // In case the preference key is not found, meaning something went wrong with storing/fetching the preferences from localstorage
      // we want to make sure we apply the blur effect by default for labels that require media filter
      if (!localPreferences?.graphicMediaPrefs) {
        filters.blur = labels.some((label) =>
          labelsRequiringMediaFilter.includes(label),
        )
        return filters
      }

      labels.forEach((label) => {
        GraphicMediaFilterOptions.forEach((filter) => {
          if (
            !!localPreferences.graphicMediaPrefs?.[
              buildGraphicPreferenceKeyForLabel(label, filter)
            ]
          ) {
            filters[filter] = true
          }
        })
      })

      return filters
    },
  }
}
