import {
  labelsRequiringMediaFilter,
  GraphicMediaFilter,
  GraphicMediaFilterOptions,
} from '@/common/labels'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'

export type GraphicMediaFilterPreference = Record<GraphicMediaFilter, boolean>
export type LabelPreferences = {
  graphicMedia?: GraphicMediaFilterPreference
  color?: string
}

export const useLabelPreferences = () => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['setting-label-preferences'],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.setting.listOptions({
        scope: 'instance',
        keys: ['tools.ozone.setting.client.label.preferences'],
      })

      if (!data.options[0]) {
        const defaultPreferences = {}
        labelsRequiringMediaFilter.forEach((label) => {
          if (!defaultPreferences[label]) {
            defaultPreferences[label] = {
              graphicMedia: {
                blur: true,
                grayscale: true,
                translucent: true,
              },
            }
          }
        })
        return defaultPreferences
      }

      return data.options[0].value as Record<string, LabelPreferences>
    },
    refetchOnWindowFocus: false,
  })
}

export const useGraphicMediaPreferences = () => {
  const { localPreferences, setLocalPreferences } = useLabelPreferences()
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
