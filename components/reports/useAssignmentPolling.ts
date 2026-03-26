import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useAuthDid } from '@/shell/AuthContext'
import { AssignmentViewWithModerator } from 'components/reports/ViewersIndicator'

const ASSIGNMENT_POLL_INTERVAL = 30_000

export function useAssignmentPolling({
  reportId,
  hasReport,
  initialAssigneeDid,
  skipInitialPoll,
}: {
  reportId: number
  hasReport: boolean
  initialAssigneeDid?: string
  skipInitialPoll: boolean
}) {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const currentUserDid = useAuthDid()

  const lastKnownAssigneeDid = useRef<string | undefined>(initialAssigneeDid)
  const hasPolledOnce = useRef(false)

  const [pollEnabled, setPollEnabled] = useState(!skipInitialPoll)
  useEffect(() => {
    if (skipInitialPoll) {
      const timer = setTimeout(
        () => setPollEnabled(true),
        ASSIGNMENT_POLL_INTERVAL,
      )
      return () => clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [viewers, setViewers] = useState<AssignmentViewWithModerator[]>([])

  const { data: assignmentResponse } = useQuery({
    queryKey: ['report-assignments', reportId],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.report.getAssignments({
        reportIds: [reportId],
      })
      return data
    },
    enabled: hasReport && pollEnabled,
    refetchInterval: ASSIGNMENT_POLL_INTERVAL,
  })

  useEffect(() => {
    if (!assignmentResponse) return

    const allForReport = ((assignmentResponse as any).assignments ?? []).filter(
      (a: AssignmentViewWithModerator) => a.reportId === reportId,
    ) as AssignmentViewWithModerator[]

    const permanentAssignment = allForReport.find((a) => !a.endAt)
    const viewersByDid = new Map<string, AssignmentViewWithModerator>()
    for (const a of allForReport) {
      if (!a.endAt || a.did === currentUserDid) continue
      const existing = viewersByDid.get(a.did)
      if (!existing || a.startAt > existing.startAt) {
        viewersByDid.set(a.did, a)
      }
    }
    const currentViewers = Array.from(viewersByDid.values())

    setViewers(currentViewers)

    const newDid = permanentAssignment?.did

    if (!hasPolledOnce.current) {
      lastKnownAssigneeDid.current = newDid
      hasPolledOnce.current = true
    } else if (newDid !== lastKnownAssigneeDid.current) {
      if (permanentAssignment && newDid !== currentUserDid) {
        toast.info('This report has been assigned to another moderator')
      } else if (!permanentAssignment) {
        toast.info('This report has been unassigned')
      }
      queryClient.invalidateQueries({ queryKey: ['report', reportId] })
      lastKnownAssigneeDid.current = newDid
    }
  }, [assignmentResponse, reportId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { viewers }
}
