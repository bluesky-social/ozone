import { useQuery } from '@tanstack/react-query'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

// Fetches the moderation event that created a report (ReportView.eventId).
// That event is where an external intake tool's `modTool` ({ name, meta })
// lives — ReportView itself doesn't carry modTool — so this is how the report
// detail page recovers the originating tool's context.
//
// Lazily enabled and cached: it only fires when an eventId is present, and a
// failure is non-fatal (the caller treats a missing event as "no context").
export const useReportCreationEvent = (eventId?: number) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    enabled: !!eventId,
    queryKey: ['modEvent', eventId],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ToolsOzoneModerationDefs.ModEventViewDetail> => {
      const { data } = await labelerAgent.tools.ozone.moderation.getEvent({
        id: eventId!,
      })
      return data
    },
  })
}
