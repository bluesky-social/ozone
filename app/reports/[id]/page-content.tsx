'use client'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query'
import {
  ToolsOzoneReportDefs,
  ToolsOzoneModerationEmitEvent,
  ComAtprotoModerationDefs,
} from '@atproto/api'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-toastify'
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { ActionButton, ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import { Checkbox, FormLabel, Select, Textarea } from '@/common/forms'
import { PreviewCard } from '@/common/PreviewCard'
import { ModEventList } from '@/mod-event/EventList'
import { ModEventItem } from '@/mod-event/EventItem'
import { ModToolProvider } from '@/mod-event/ModToolContext'
import {
  LabelList,
  LabelListEmpty,
  ModerationLabel,
} from '@/common/labels/List'
import { isSelfLabel } from '@/common/labels/util'
import { LabelSelector } from '@/common/labels/Selector'
import { getDidFromUri } from '@/lib/util'
import { Loading } from '@/common/Loader'
import { BlobListFormField } from 'app/actions/ModActionPanel/BlobList'
import { ActionDurationSelector } from '@/reports/ModerationForm/ActionDurationSelector'
import {
  ReviewStateIcon,
  SubjectReviewStateBadge,
} from '@/subject/ReviewStateMarker'
import { ActionError } from '@/reports/ModerationForm/ActionError'
import { MessageActorMeta } from '@/dms/MessageActorMeta'
import { ModEventDetailsPopover } from '@/mod-event/DetailsPopover'
import { LastReviewedTimestamp } from '@/subject/LastReviewedTimestamp'
import { RecordAuthorStatus } from '@/subject/RecordAuthorStatus'
import { SubjectTag } from 'components/tags/SubjectTag'
import { HighProfileWarning } from '@/repositories/HighProfileWarning'
import { PriorityScore } from '@/subject/PriorityScore'
import { Alert } from '@/common/Alert'
import { TextWithLinks } from '@/common/TextWithLinks'
import { AgeAssuranceBadge } from '@/mod-event/AgeAssuranceStateBadge'
import { useQuickAction } from 'app/actions/ModActionPanel/useQuickAction'
import { PolicySeveritySelector } from 'app/actions/ModActionPanel/PolicySeveritySelector'
import { EmailComposerFields } from 'components/email/Composer'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ReasonBadge } from 'components/reports/ReasonBadge'
import { useAssignModerator, useUnassignModerator } from 'components/reports/hooks'
import { ConfirmationModal } from '@/common/modals/confirmation'
import {
  ReportActionsBar,
  ActivityTimeline,
  ReportActionType,
} from 'components/reports/ReportActions'
import { MemberView } from 'components/reports/MemberView'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import { MOD_EVENTS } from '@/mod-event/constants'
import { ReportStatusBadge } from 'components/reports/ReportStatusBadge'
import { MutedBadge } from 'components/reports/MutedBadge'
import { QueueBadge } from 'components/reports/QueueBadge'
import {
  ViewersIndicator,
  AssignmentViewWithModerator,
} from 'components/reports/ViewersIndicator'
import { getHandleFromSubjectView } from 'components/reports/utils'
import { useAssignmentPolling } from 'components/reports/useAssignmentPolling'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { WorkspacePanel } from 'components/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'

const FORM_ID = 'report-detail-action-panel'

const REPORT_STATUS_EVENT_TYPES = new Set([
  MOD_EVENTS.ACKNOWLEDGE,
  MOD_EVENTS.TAKEDOWN,
  MOD_EVENTS.LABEL,
  MOD_EVENTS.COMMENT,
  MOD_EVENTS.ESCALATE,
  MOD_EVENTS.REVERSE_TAKEDOWN,
  MOD_EVENTS.RESOLVE_APPEAL,
])

function isAppealReport(reportType?: string): boolean {
  return (
    reportType === ComAtprotoModerationDefs.REASONAPPEAL ||
    reportType === 'tools.ozone.report.defs#reasonAppeal'
  )
}

function getReportsFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
): ToolsOzoneReportDefs.ReportView[] {
  const allReports: ToolsOzoneReportDefs.ReportView[] = []
  for (const key of ['events', 'betaReports']) {
    const allQueriesData = queryClient.getQueriesData<
      InfiniteData<{ reports: ToolsOzoneReportDefs.ReportView[] }>
    >({ queryKey: [key] })

    for (const [, data] of allQueriesData) {
      if (!data?.pages) continue
      for (const page of data.pages) {
        if (page.reports) allReports.push(...page.reports)
      }
    }
  }
  return allReports
}

function findAdjacentReportsInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  reportId: number,
): { prevId: number | null; nextId: number | null } {
  const allReports = getReportsFromCache(queryClient)

  if (allReports.length === 0) return { prevId: null, nextId: null }

  const index = allReports.findIndex((r) => r.id === reportId)
  if (index === -1) return { prevId: null, nextId: null }

  return {
    prevId: index > 0 ? allReports[index - 1].id : null,
    nextId: index < allReports.length - 1 ? allReports[index + 1].id : null,
  }
}

function findReportInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  reportId: number,
): ToolsOzoneReportDefs.ReportView | null {
  const allReports = getReportsFromCache(queryClient)
  return allReports.find((r) => r.id === reportId) ?? null
}

function ReportInfoPanel({
  report,
  assignment,
  onClickDid,
}: {
  report: ToolsOzoneReportDefs.ReportView
  assignment?: ToolsOzoneReportDefs.ReportAssignment
  onClickDid?: (did: string) => void
}) {
  const labelerAgent = useLabelerAgent()
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false)

  const {
    mutate: assignToMe,
    isPending,
    error,
  } = useAssignModerator({
    onSuccess: () => toast.success('Report assigned to you'),
  })

  const {
    mutate: unassignFromMe,
    isPending: isUnassigning,
    error: unassignError,
  } = useUnassignModerator({
    onSuccess: () => {
      toast.success('You have been unassigned from this report')
      setUnassignConfirmOpen(false)
    },
  })

  const reporterHandle = getHandleFromSubjectView(report.reporter)
  const createdAt = new Date(report.createdAt)

  const moderator = assignment?.moderator
  const isAssignedToMe = !!assignment && assignment.did === labelerAgent.did

  return (
    <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4">
      {/* Report metadata */}
      <div className="flex flex-row flex-wrap items-center gap-2 mb-3">
        <ReasonBadge reasonType={report.reportType} />
        <ReportStatusBadge status={report.status} />
        <MutedBadge isMuted={report.isMuted} />
        <QueueBadge reportId={report.id} queue={report.queue} />
        <span
          className="text-xs text-gray-500 dark:text-gray-400"
          title={createdAt.toLocaleString()}
        >
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </span>
      </div>

      {/* Reporter */}
      <div className="flex flex-row items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
          Reporter:
        </span>
        {report.reporter.status && (
          <ReviewStateIcon
            subjectStatus={report.reporter.status}
            className="h-4 w-4 shrink-0"
          />
        )}
        {onClickDid ? (
          <button
            type="button"
            className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate hover:underline hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => onClickDid(report.reporter.subject)}
          >
            {reporterHandle ? `@${reporterHandle}` : report.reporter.subject}
          </button>
        ) : (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
            {reporterHandle ? `@${reporterHandle}` : report.reporter.subject}
          </span>
        )}
      </div>

      {/* Comment */}
      {!!report.comment && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Comment
          </p>
          <TextWithLinks
            text={report.comment}
            className="text-sm text-gray-700 dark:text-gray-200 break-words"
          />
        </div>
      )}

      {/* Assignment */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {assignment ? (
          <div className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {moderator ? (
                <MemberView
                  member={moderator}
                  assignedAt={assignment.assignedAt}
                  onClickDid={onClickDid}
                />
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Assigned to{' '}
                  {onClickDid ? (
                    <button
                      type="button"
                      className="hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => onClickDid(assignment.did)}
                    >
                      {assignment.did}
                    </button>
                  ) : (
                    assignment.did
                  )}
                </div>
              )}
            </div>
            {isAssignedToMe && (
              <ActionButton
                size="sm"
                appearance="outlined"
                onClick={() => setUnassignConfirmOpen(true)}
              >
                Unassign
              </ActionButton>
            )}
          </div>
        ) : (
          <div className="flex flex-row items-center gap-3">
            <ActionButton
              size="sm"
              appearance="outlined"
              disabled={isPending}
              onClick={() => assignToMe(report.id)}
            >
              {isPending ? 'Assigning…' : 'Assign to me'}
            </ActionButton>
            {!!error && (
              <span className="text-xs text-red-500 dark:text-red-400">
                {(error as any)?.message ?? 'Failed to assign'}
              </span>
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={unassignConfirmOpen}
        setIsOpen={setUnassignConfirmOpen}
        title="Unassign yourself?"
        description={
          <>
            Are you sure you want to unassign yourself from this report? You
            will no longer be the moderator handling it.
          </>
        }
        confirmButtonText={isUnassigning ? 'Unassigning…' : 'Unassign'}
        confirmButtonDisabled={isUnassigning}
        error={
          unassignError
            ? (unassignError as any)?.message ?? 'Failed to unassign'
            : undefined
        }
        onConfirm={() => unassignFromMe(report.id)}
      />
    </div>
  )
}

export function ReportDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const reportId = Number(params.id)
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const emitEvent = useEmitEvent()
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()

  const quickOpenParam = searchParams.get('quickOpen') ?? ''
  const setQuickActionPanelSubject = (subject: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (!subject) {
      nextParams.delete('quickOpen')
    } else {
      nextParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + nextParams.toString())
  }

  const cachedReport = useMemo(
    () => findReportInCache(queryClient, reportId),
    [reportId],
  )

  const { prevId, nextId } = useMemo(
    () => findAdjacentReportsInCache(queryClient, reportId),
    [reportId],
  )

  // Register this session as a viewer (temporary, non-permanent assignment).
  useEffect(() => {
    labelerAgent.tools.ozone.report
      .assignModerator({ reportId })
      .catch(() => {})
  }, [reportId])

  // If no cached report exists, getReport will be called and returns fresh assignment data.
  // In that case we skip the initial assignment poll and start it after the first interval.
  const calledGetReport = !cachedReport

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.report.getReport({
        id: reportId,
      })
      return data
    },
    initialData: cachedReport ?? undefined,
  })

  const [subject, setSubject] = useState(report?.subject.subject ?? '')

  const reportSubject = report?.subject.subject
  useEffect(() => {
    if (reportSubject && !subject) {
      setSubject(reportSubject)
    }
  }, [reportSubject, subject])

  const { viewers } = useAssignmentPolling({
    reportId,
    hasReport: !!report,
    initialAssigneeDid: report?.assignment?.did,
    skipInitialPoll: calledGetReport,
  })

  if (!report && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loading />
        <p className="text-gray-400 dark:text-gray-100 mt-2">
          Loading report...
        </p>
      </div>
    )
  }

  if (!report && !isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        <p className="text-gray-500">Report not found.</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <ActionButton
          size="xs"
          appearance="primary"
          onClick={() => {
            const savedUrl = sessionStorage.getItem('ozone:reportsListUrl')
            router.push(savedUrl ?? '/reports/beta')
          }}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Reports
        </ActionButton>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Report #{reportId}
        </h1>
        {(prevId !== null || nextId !== null) && (
          <div className="ml-auto flex items-center gap-1">
            <ActionButton
              size="xs"
              appearance="primary"
              disabled={prevId === null}
              onClick={() =>
                prevId !== null && router.push(`/reports/${prevId}`)
              }
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Prev
            </ActionButton>
            <ActionButton
              size="xs"
              appearance="primary"
              disabled={nextId === null}
              onClick={() =>
                nextId !== null && router.push(`/reports/${nextId}`)
              }
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </ActionButton>
          </div>
        )}
      </div>

      {subject && report && (
        <ReportDetailLayout
          report={report}
          subject={subject}
          setSubject={setSubject}
          assignment={report.assignment}
          viewers={viewers}
          onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
            await emitEvent(
              hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
            )
            queryClient.invalidateQueries({ queryKey: ['report', reportId] })
            queryClient.invalidateQueries({ queryKey: ['reportActivities', reportId] })
          }}
          onCancel={() => router.push('/reports')}
          onClickDid={setQuickActionPanelSubject}
        />
      )}
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam}
        subjectOptions={subject ? [subject] : [quickOpenParam]}
        isInitialLoading={isLoading}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(
            hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
          )
          queryClient.invalidateQueries({ queryKey: ['report', reportId] })
          queryClient.invalidateQueries({ queryKey: ['reportActivities', reportId] })
        }}
      />
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
    </div>
  )
}

function ReportDetailLayout(props: {
  report: ToolsOzoneReportDefs.ReportView
  subject: string
  setSubject: (subject: string) => void
  onSubmit: (vals: ToolsOzoneModerationEmitEvent.InputSchema) => Promise<void>
  onCancel: () => void
  assignment?: ToolsOzoneReportDefs.ReportAssignment
  viewers: AssignmentViewWithModerator[]
  onClickDid?: (did: string) => void
}) {
  const {
    report,
    subject,
    setSubject,
    onSubmit,
    onCancel,
    assignment,
    viewers,
    onClickDid,
  } = props
  const subjectOptions = [subject]

  const [reportActionScope, setReportActionScope] = useState<
    'current' | 'all' | 'types'
  >('current')
  const [reportActionTypes, setReportActionTypes] = useState<string[]>(() => {
    // If the queue has report types, default to those
    if (report.queue?.reportTypes && report.queue.reportTypes.length > 0) {
      return report.queue.reportTypes
    }
    // Otherwise, fall back to the current report's type
    return report.reportType ? [report.reportType] : []
  })
  const [selectedAction, setSelectedAction] = useState<ReportActionType>(null)
  const [applyToAccount, setApplyToAccount] = useState(false)
  const isSubjectRecord = subject.startsWith('at://')

  const wrappedOnSubmit = async (
    vals: ToolsOzoneModerationEmitEvent.InputSchema,
  ) => {
    let finalVals = vals

    // When "Apply action to account" is checked, override the subject to be account-level
    if (applyToAccount && isSubjectRecord) {
      const did = getDidFromUri(subject)
      if (did) {
        finalVals = {
          ...vals,
          subject: {
            $type: 'com.atproto.admin.defs#repoRef',
            did,
          },
        }
      }
    }

    const eventType = (finalVals.event as any)?.$type as string | undefined
    if (eventType && REPORT_STATUS_EVENT_TYPES.has(eventType as any)) {
      const reportAction: ToolsOzoneModerationEmitEvent.ReportAction = {}
      if (reportActionScope === 'current') {
        reportAction.ids = [report.id]
      } else if (reportActionScope === 'all') {
        reportAction.all = true
      } else if (reportActionTypes.length > 0) {
        reportAction.types = reportActionTypes
      }
      await onSubmit({ ...finalVals, reportAction })

      // For appeal reports: emit resolveAppeal after the primary action (revert takedown or label)
      if (
        isAppealReport(report.reportType) &&
        eventType !== MOD_EVENTS.RESOLVE_APPEAL
      ) {
        await onSubmit({
          ...finalVals,
          event: {
            $type: MOD_EVENTS.RESOLVE_APPEAL,
            comment: '[RESOLVING_APPEAL]',
          },
          reportAction: { ids: [report.id] },
        })
      }

      setSelectedAction(null) // Reset after successful submission
    } else {
      await onSubmit(finalVals)
    }
  }

  const handleCancelAction = () => {
    setSelectedAction(null)
  }

  // Sync selectedAction with modEventType
  useEffect(() => {
    if (selectedAction === 'label') {
      setModEventType(MOD_EVENTS.LABEL)
    } else if (selectedAction === 'takedown') {
      setModEventType(MOD_EVENTS.TAKEDOWN)
    } else if (selectedAction === 'revert-takedown') {
      setModEventType(MOD_EVENTS.REVERSE_TAKEDOWN)
    }
  }, [selectedAction])

  const {
    submission,
    onFormSubmit,
    record,
    isSubjectDid,
    profile,
    subjectStatus,
    selectedSeverityLevelName,
    canManageChat,
    currentLabels,
    allLabels,
    repo,
    modEventType,
    shouldShowDurationInHoursField,
    isLabelEvent,
    isTakedownEvent,
    isReverseTakedownEvent,
    setModEventType,
    policyDetails,
    strikeData,
    strikeDataError,
    currentStrikes,
    actionRecommendation,
    severityLevelStrikeCount,
    selectedPolicyName,
    durationSelectorRef,
    submitButton,
    handlePolicySelect,
    handleSeverityLevelSelect,
    targetServices,
    setTargetServices,
    config,
    showAutomatedEmailComposer,
    showCantEmailError,
    automatedEmailTemplate,
    communicationTemplates,
    theme,
    recipientLanguages,
    emailContent,
    setEmailContent,
    onEmailTemplateSelect,
    emailSubjectField,
  } = useQuickAction({
    onCancel,
    onSubmit: wrappedOnSubmit,
    subject,
    setSubject,
    subjectOptions,
  })

  const showReportAction = (REPORT_STATUS_EVENT_TYPES as Set<string>).has(
    modEventType,
  )

  return (
    <div className="dark:text-gray-50">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left col */}
        <div className="flex-1 min-w-0">
          {/* Subject preview */}
          <div className="max-w-xl mb-3">
            <PreviewCard
              subject={subject}
              isAuthorDeactivated={!!record?.repo.deactivatedAt}
              isAuthorTakendown={
                !!record?.repo.moderation.subjectStatus?.takendown
              }
            >
              {!isSubjectDid && record?.repo && (
                <div className="-ml-1 my-2">
                  <RecordAuthorStatus repo={record.repo} profile={profile} />
                </div>
              )}
            </PreviewCard>
          </div>

          {/* Subject status */}
          {!!subjectStatus && (
            <div className="pb-4">
              <p className="flex flex-row items-center">
                {!!subjectStatus.priorityScore && (
                  <PriorityScore priorityScore={subjectStatus.priorityScore} />
                )}
                {!!subjectStatus.ageAssuranceState &&
                  subjectStatus.ageAssuranceState !== 'unknown' && (
                    <AgeAssuranceBadge
                      ageAssuranceState={subjectStatus.ageAssuranceState}
                      className="mr-1"
                    />
                  )}
                <SubjectReviewStateBadge subjectStatus={subjectStatus} />
                <LastReviewedTimestamp subjectStatus={subjectStatus} />
              </p>
              {!!subjectStatus.comment && (
                <div className="mt-2">
                  <Alert
                    type="info"
                    title="Note"
                    body={<TextWithLinks text={subjectStatus.comment} />}
                  />
                </div>
              )}
              {!!record?.repo.moderation.subjectStatus?.comment && (
                <div className="mt-2">
                  <Alert
                    type="info"
                    title="Account Note"
                    body={
                      <TextWithLinks
                        text={record.repo.moderation.subjectStatus.comment}
                      />
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Blobs */}
          {!!record?.blobs?.length && (
            <BlobListFormField
              blobs={record.blobs}
              authorDid={record.repo.did}
              className="mb-2"
            />
          )}

          {/* DM meta */}
          {isSubjectDid && canManageChat && (
            <div className="mb-2">
              <MessageActorMeta did={subject} />
            </div>
          )}

          {/* Labels */}
          <div className="mb-2">
            <FormLabel
              label="Labels"
              className="flex flex-row items-center gap-2"
            >
              <LabelList className="-ml-1 -mt-1 flex-wrap">
                {!currentLabels.length && <LabelListEmpty className="ml-1" />}
                {allLabels.map((label) => (
                  <ModerationLabel
                    key={label.val}
                    label={label}
                    recordAuthorDid={`${repo?.did || record?.repo.did}`}
                  />
                ))}
              </LabelList>
            </FormLabel>
          </div>

          {/* Subject tags */}
          {!!subjectStatus?.tags?.length && (
            <div className="mb-2">
              <FormLabel
                label="Tags"
                className="flex flex-row items-center gap-2"
              >
                <LabelList className="-mt-1 -ml-1 flex-wrap gap-1">
                  {subjectStatus.tags.sort().map((tag) => (
                    <SubjectTag key={tag} tag={tag} />
                  ))}
                </LabelList>
              </FormLabel>
            </div>
          )}

          {/* Account labels (records only) */}
          {!isSubjectDid && !!profile?.labels?.length && (
            <div className="mb-2 flex flex-row items-center">
              <div className="mr-1">Account Labels</div>
              {profile.labels.map((label) => (
                <ModerationLabel
                  label={label}
                  key={label.val}
                  recordAuthorDid={profile.did}
                />
              ))}
            </div>
          )}

          {/* Account tags (records only) */}
          {!!record?.repo.moderation.subjectStatus?.tags?.length && (
            <div className="mb-2 flex flex-row items-center">
              <div className="mr-2">Account Tags</div>
              <LabelList className="-ml-1 flex-wrap gap-1">
                {record.repo.moderation.subjectStatus.tags.sort().map((tag) => (
                  <SubjectTag key={tag} tag={tag} />
                ))}
              </LabelList>
            </div>
          )}

          {/* Event stream */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <ModEventList
              subject={subject}
              stats={{
                accountStrike: subjectStatus?.accountStrike ?? strikeData,
                accountStats: subjectStatus?.accountStats,
                recordsStats: subjectStatus?.recordsStats,
              }}
            />
          </div>
        </div>

        {/* Right col */}
        <div className="w-full lg:w-1/2 shrink-0">
          <ReportInfoPanel report={report} assignment={assignment} onClickDid={onClickDid} />

          <ViewersIndicator viewers={viewers} onClickDid={onClickDid} />

          {profile && (
            <div className="mb-3">
              <HighProfileWarning profile={profile} />
            </div>
          )}

          {/* Strike data error - unlikely to happen */}
          {!!strikeDataError && (isTakedownEvent || isReverseTakedownEvent) && (
            <div className="mb-3">
              <Alert
                type="error"
                title="Error loading strike data!"
                body={
                  <>
                    Please be cautious when taking actions that require
                    up-to-date strike info.{' '}
                    <button
                      className="underline"
                      onClick={() => window.location.reload()}
                    >
                      Click here
                    </button>{' '}
                    to reload strike data for this account.
                  </>
                }
              />
            </div>
          )}

          <ReportActionsBar
            report={report}
            selectedAction={selectedAction}
            onActionSelect={setSelectedAction}
            subjectStatus={subjectStatus}
            onResolveAppeal={
              isAppealReport(report.reportType)
                ? async () => {
                    const reportAction: ToolsOzoneModerationEmitEvent.ReportAction = { ids: [report.id] }
                    await onSubmit({
                      subject: { $type: 'com.atproto.admin.defs#repoRef', did: subject.startsWith('at://') ? getDidFromUri(subject)! : subject },
                      createdBy: config.did,
                      event: {
                        $type: MOD_EVENTS.RESOLVE_APPEAL,
                        comment: '[RESOLVING_APPEAL]',
                      },
                      reportAction,
                    })
                  }
                : undefined
            }
          />

          <div className={selectedAction ? '' : 'hidden'}>
            <form id={FORM_ID} onSubmit={onFormSubmit}>
              <div className="relative flex flex-row gap-3 items-center mb-3">
                <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                  {selectedAction === 'label'
                    ? 'Label'
                    : selectedAction === 'takedown'
                      ? 'Takedown'
                      : selectedAction === 'revert-takedown'
                        ? 'Revert Takedown'
                        : 'Action'}
                </span>
                <ModEventDetailsPopover modEventType={modEventType} />
              </div>

              {isSubjectRecord && (
                <Checkbox
                  value="true"
                  id="applyToAccount"
                  name="applyToAccount"
                  className="mb-3 flex items-center"
                  checked={applyToAccount}
                  onChange={(e) => setApplyToAccount(e.target.checked)}
                  label="Apply action to account"
                />
              )}

              {(isTakedownEvent || isReverseTakedownEvent) && (
                <PolicySeveritySelector
                  defaultPolicy={selectedPolicyName}
                  policyDetails={policyDetails}
                  handlePolicySelect={handlePolicySelect}
                  handleSeverityLevelSelect={handleSeverityLevelSelect}
                  severityLevelStrikeCount={severityLevelStrikeCount}
                  defaultSeverityLevel={selectedSeverityLevelName}
                  currentStrikes={currentStrikes}
                  actionRecommendation={actionRecommendation}
                  variant={isReverseTakedownEvent ? 'reverse-takedown' : 'takedown'}
                  targetServices={targetServices}
                  setTargetServices={setTargetServices}
                  isSubjectDid={isSubjectDid}
                />
              )}

              {shouldShowDurationInHoursField && (
                <div className="flex flex-row gap-2">
                  <FormLabel
                    label=""
                    htmlFor="durationInHours"
                    className="mb-1 mt-2"
                  >
                    <ActionDurationSelector
                      ref={durationSelectorRef}
                      action={modEventType}
                      required={!isLabelEvent}
                      showPermanent
                      defaultValue={0}
                      labelText={isLabelEvent ? 'Label duration' : ''}
                    />
                  </FormLabel>
                </div>
              )}

              {isLabelEvent && (
                <div className="mt-2">
                  <LabelSelector
                    id="labels"
                    name="labels"
                    form={FORM_ID}
                    defaultLabels={currentLabels.filter((label) => {
                      const isEditableLabel = allLabels.some(
                        (l) => l.val === label && l.src === config.did,
                      )
                      return !isSelfLabel(label) && isEditableLabel
                    })}
                  />
                </div>
              )}

              <div className="mt-2">
                <Textarea
                  name="comment"
                  placeholder="Reason for action (optional)"
                  className="block w-full mb-3"
                />
              </div>

              {showAutomatedEmailComposer && (
                <EmailComposerFields
                  defaultTemplate={
                    actionRecommendation
                      ? automatedEmailTemplate?.name
                      : undefined
                  }
                  templateLabel={
                    recipientLanguages.languages.length > 1
                      ? `Template (account languages: ${recipientLanguages.languages.join(
                          ', ',
                        )})`
                      : 'Template'
                  }
                  onTemplateSelect={onEmailTemplateSelect}
                  communicationTemplates={communicationTemplates}
                  recipientLanguages={recipientLanguages}
                  subjectField={emailSubjectField}
                  content={emailContent || ''}
                  setContent={setEmailContent}
                  theme={theme}
                  isSending={submission.isSubmitting}
                  requiresConfirmation={false}
                  isConfirmed={true}
                  toggleConfirmation={() => null}
                />
              )}
              {showCantEmailError && (
                <div className="my-2">
                  <Alert
                    showIcon
                    type="warning"
                    title="Cannot send email to this user"
                    body="This user's account is hosted on PDS that does not allow sending emails. Please check the PDS of the user to verify."
                  />
                </div>
              )}

              {showReportAction && (
                <div className="mt-2 mb-3 space-y-2">
                  <Select
                    className="w-full"
                    value={reportActionScope}
                    onChange={(e) =>
                      setReportActionScope(
                        e.target.value as 'current' | 'all' | 'types',
                      )
                    }
                  >
                    <option value="current">Close this report only</option>
                    <option value="all">
                      Close all open reports on subject
                    </option>
                    <option value="types">
                      Close reports of specific types
                    </option>
                  </Select>
                  {reportActionScope === 'types' && (
                    <ReportTypeMultiselect
                      value={reportActionTypes}
                      onChange={setReportActionTypes}
                    />
                  )}
                </div>
              )}

              {submission.error && (
                <div className="my-2">
                  <ActionError error={submission.error} />
                </div>
              )}

              <div className="mt-4 flex flex-row justify-between">
                <ButtonSecondary
                  className="px-4"
                  disabled={submission.isSubmitting}
                  onClick={handleCancelAction}
                >
                  Cancel
                </ButtonSecondary>
                <ButtonPrimary
                  ref={submitButton}
                  type="submit"
                  disabled={submission.isSubmitting}
                  className="px-4"
                >
                  Submit
                </ButtonPrimary>
              </div>
            </form>
          </div>

          {!!report.actions?.length && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                Actions on this report
              </h4>
              <ModToolProvider>
                {report.actions.map((modEvent) => (
                  <ModEventItem
                    key={modEvent.id}
                    modEvent={modEvent}
                    showContentAuthor={false}
                    showContentPreview={false}
                    showContentDetails={false}
                  />
                ))}
              </ModToolProvider>
            </div>
          )}

          <ActivityTimeline reportId={report.id} />
        </div>
      </div>
    </div>
  )
}
