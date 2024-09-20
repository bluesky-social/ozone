import {
  buildGraphicPreferenceKeyForLabel,
  labelsRequiringBlur,
  GraphicMediaFilter,
} from '@/common/labels'
import { useLocalStorage } from 'react-use'

export type GraphicMediaFilterPreference = Record<GraphicMediaFilter, boolean>

// This is the container hook for interfacing on top of localstorage and storing device level preferences
// There may be various types of preferences that can be stored here and ideally each preference category
// will have its own hook that will utilize this
export const useLocalPreferences = () => {
  const initialValue: Record<string, Record<string, boolean>> = {
    graphicMediaPrefs: {},
  }

  labelsRequiringBlur.forEach((label) => {
    ;(['blur', 'grayscale', 'translucent'] as GraphicMediaFilter[]).forEach(
      (filter) => {
        initialValue.graphicMediaPrefs[
          buildGraphicPreferenceKeyForLabel(label, filter)
        ] = true
      },
    )
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

      labels.forEach((label) => {
        ;(['blur', 'grayscale', 'translucent'] as GraphicMediaFilter[]).forEach(
          (filter) => {
            if (
              !!localPreferences.graphicMediaPrefs?.[
                buildGraphicPreferenceKeyForLabel(label, filter)
              ]
            ) {
              filters[filter] = true
            }
          },
        )
      })

      return filters
    },
  }
}
