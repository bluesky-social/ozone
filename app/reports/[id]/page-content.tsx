'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query'
import {
  ToolsOzoneReportDefs,
  ToolsOzoneModerationEmitEvent,
  ToolsOzoneTeamDefs,
} from '@atproto/api'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-toastify'
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { ActionButton, ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Select, Textarea } from '@/common/forms'
import { PreviewCard } from '@/common/PreviewCard'
import { ModEventList } from '@/mod-event/EventList'
import {
  LabelList,
  LabelListEmpty,
  ModerationLabel,
} from '@/common/labels/List'
import { isSelfLabel } from '@/common/labels/util'
import { LabelSelector } from '@/common/labels/Selector'
import { capitalize } from '@/lib/util'
import { Loading } from '@/common/Loader'
import { BlobListFormField } from 'app/actions/ModActionPanel/BlobList'
import { ActionDurationSelector } from '@/reports/ModerationForm/ActionDurationSelector'
import {
  AGE_ASSURANCE_OVERRIDE_STATES,
  AGE_ASSURANCE_ACCESS_STATES,
} from '@/mod-event/constants'
import { ModEventSelectorButton } from '@/mod-event/SelectorButton'
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
import { EmailComposer, EmailComposerFields } from 'components/email/Composer'
import { PriorityScore } from '@/subject/PriorityScore'
import { Alert } from '@/common/Alert'
import { TextWithLinks } from '@/common/TextWithLinks'
import { VerificationActionButton } from 'components/verification/ActionButton'
import { AgeAssuranceBadge } from '@/mod-event/AgeAssuranceStateBadge'
import { useQuickAction } from 'app/actions/ModActionPanel/useQuickAction'
import { PolicySeveritySelector } from 'app/actions/ModActionPanel/PolicySeveritySelector'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useAuthDid } from '@/shell/AuthContext'
import { ReasonBadge } from 'components/reports/ReasonBadge'
import { useAssignModerator } from 'components/reports/hooks'
import { ReportActionsBar, ActivityTimeline, ReportActionType } from 'components/reports/ReportActions'
import { MemberView } from 'components/reports/MemberView'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import { MOD_EVENTS } from '@/mod-event/constants'
import { ActionForm } from '@/reports/ModerationForm/ActionForm'

const FORM_ID = 'report-detail-action-panel'
const ASSIGNMENT_POLL_INTERVAL = 30_000

const REPORT_STATUS_EVENT_TYPES = new Set([
  MOD_EVENTS.ACKNOWLEDGE,
  MOD_EVENTS.TAKEDOWN,
  MOD_EVENTS.LABEL,
  MOD_EVENTS.COMMENT,
  MOD_EVENTS.ESCALATE,
])

function findAdjacentReportsInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  reportId: number,
): { prevId: number | null; nextId: number | null } {
  const allQueriesData = queryClient.getQueriesData<
    InfiniteData<{ reports: ToolsOzoneReportDefs.ReportView[] }>
  >({ queryKey: ['events'] })

  const allReports: ToolsOzoneReportDefs.ReportView[] = []
  for (const [, data] of allQueriesData) {
    if (!data?.pages) continue
    for (const page of data.pages) {
      if (page.reports) allReports.push(...page.reports)
    }
  }

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
  const allQueriesData = queryClient.getQueriesData<
    InfiniteData<{ reports: ToolsOzoneReportDefs.ReportView[] }>
  >({ queryKey: ['events'] })

  for (const [, data] of allQueriesData) {
    if (!data?.pages) continue
    for (const page of data.pages) {
      const found = page.reports?.find((r) => r.id === reportId)
      if (found) return found
    }
  }
  return null
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  escalated:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

function ReportStatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? statusColors.open
  return (
    <span
      className={`${color} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize`}
    >
      {status}
    </span>
  )
}

type AssignmentViewWithModerator = ToolsOzoneReportDefs.AssignmentView & {
  moderator?: ToolsOzoneTeamDefs.Member
}

function ViewersIndicator({
  viewers,
}: {
  viewers: AssignmentViewWithModerator[]
}) {
  const [expanded, setExpanded] = useState(false)
  if (viewers.length === 0) return null

  return (
    <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 px-4 py-2">
      <button
        className="flex w-full flex-row items-center justify-between text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>
          {viewers.length === 1
            ? '1 moderator viewing'
            : `${viewers.length} moderators viewing`}
        </span>
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="mt-3 flex flex-col gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {viewers.map((v) =>
            v.moderator ? (
              <MemberView
                key={v.did}
                member={v.moderator}
                assignedAt={v.startAt}
                sinceLabel="Viewing since"
              />
            ) : (
              <div key={v.did} className="text-sm text-gray-500 dark:text-gray-400">
                {v.did}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}

function ReportInfoPanel({
  report,
  assignment,
}: {
  report: ToolsOzoneReportDefs.ReportView
  assignment?: ToolsOzoneReportDefs.ReportAssignment
}) {
  const { mutate: assignToMe, isPending, error } = useAssignModerator({
    onSuccess: () => toast.success('Report assigned to you'),
  })

  const reporterHandle =
    report.reporter.status?.subjectRepoHandle ?? report.reporter.repo?.handle
  const createdAt = new Date(report.createdAt)

  const moderator = assignment?.moderator

  return (
    <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4">
      {/* Report metadata */}
      <div className="flex flex-row flex-wrap items-center gap-2 mb-3">
        <ReasonBadge reasonType={report.reportType} />
        <ReportStatusBadge status={report.status} />
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
          {reporterHandle ? `@${reporterHandle}` : report.reporter.subject}
        </span>
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
          moderator ? (
            <MemberView member={moderator} assignedAt={assignment.assignedAt} />
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Assigned to {assignment.did}
            </div>
          )
        ) : (
          <div className="flex flex-row items-center gap-3">
            <span className="text-sm text-gray-400 dark:text-gray-500">
              Unassigned
            </span>
            <ButtonSecondary
              className="text-sm py-1"
              disabled={isPending}
              onClick={() => assignToMe(report.id)}
            >
              {isPending ? 'Assigning…' : 'Assign to me'}
            </ButtonSecondary>
            {!!error && (
              <span className="text-xs text-red-500 dark:text-red-400">
                {(error as any)?.message ?? 'Failed to assign'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ReportDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const reportId = Number(params.id)
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const emitEvent = useEmitEvent()
  const currentUserDid = useAuthDid()

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
    labelerAgent.tools.ozone.report.assignModerator({ reportId }).catch(() => {})
  }, [reportId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    if (report?.subject.subject && !subject) {
      setSubject(report.subject.subject)
    }
  }, [report, subject])

  // --- Assignment polling ---

  // Track the permanent-assignment DID for change detection across polls.
  // Initialized from the report data; once the first poll fires it takes over
  // as the sole source of truth so report re-fetches can't interfere.
  const lastKnownAssigneeDid = useRef<string | undefined>(
    report?.assignment?.did,
  )
  const hasPolledOnce = useRef(false)

  // Delay enabling the poll when getReport was already called (data is fresh).
  const [pollEnabled, setPollEnabled] = useState(!calledGetReport)
  useEffect(() => {
    if (calledGetReport) {
      const timer = setTimeout(
        () => setPollEnabled(true),
        ASSIGNMENT_POLL_INTERVAL,
      )
      return () => clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Moderators currently viewing this report (temporary assignments, i.e. have endAt).
  const [viewers, setViewers] = useState<AssignmentViewWithModerator[]>([])

  const { data: assignmentResponse } = useQuery({
    queryKey: ['report-assignments', reportId],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.report.getAssignments({
        reportIds: [reportId],
      })
      return data
    },
    enabled: !!report && pollEnabled,
    refetchInterval: ASSIGNMENT_POLL_INTERVAL,
  })

  useEffect(() => {
    if (!assignmentResponse) return

    const allForReport = (
      (assignmentResponse as any).assignments ?? []
    ).filter(
      (a: AssignmentViewWithModerator) => a.reportId === reportId,
    ) as AssignmentViewWithModerator[]

    // Permanent assignment = no endAt; viewers = has endAt, excluding the current user.
    const permanentAssignment = allForReport.find((a) => !a.endAt)
    const currentViewers = allForReport.filter(
      (a) => !!a.endAt && a.did !== currentUserDid,
    )

    setViewers(currentViewers)

    const newDid = permanentAssignment?.did

    if (!hasPolledOnce.current) {
      // First poll: establish baseline from actual poll data, no toast.
      lastKnownAssigneeDid.current = newDid
      hasPolledOnce.current = true
    } else if (newDid !== lastKnownAssigneeDid.current) {
      // Permanent assignment changed since last poll — notify and re-fetch.
      if (permanentAssignment) {
        toast.info('This report has been assigned to another moderator')
      } else {
        toast.info('This report has been unassigned')
      }
      queryClient.invalidateQueries({ queryKey: ['report', reportId] })
      lastKnownAssigneeDid.current = newDid
    }
  }, [assignmentResponse, reportId]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- End assignment polling ---

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
          onClick={() => router.push('/reports/beta')}
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
              onClick={() => prevId !== null && router.push(`/reports/${prevId}`)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Prev
            </ActionButton>
            <ActionButton
              size="xs"
              appearance="primary"
              disabled={nextId === null}
              onClick={() => nextId !== null && router.push(`/reports/${nextId}`)}
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
          }}
          onCancel={() => router.push('/reports')}
        />
      )}
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
}) {
  const { report, subject, setSubject, onSubmit, onCancel, assignment, viewers } = props
  const subjectOptions = [subject]

  const [reportActionScope, setReportActionScope] = useState<'current' | 'all' | 'types'>('current')
  const [reportActionTypes, setReportActionTypes] = useState<string[]>(
    report.reportType ? [report.reportType] : [],
  )
  const [reportActionNote, setReportActionNote] = useState('')
  const [showReportActionNote, setShowReportActionNote] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ReportActionType>(null)

  const wrappedOnSubmit = async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
    const eventType = (vals.event as any)?.$type as string | undefined
    if (eventType && REPORT_STATUS_EVENT_TYPES.has(eventType as any)) {
      const reportAction: ToolsOzoneModerationEmitEvent.ReportAction = {}
      if (reportActionScope === 'current') {
        reportAction.ids = [report.id]
      } else if (reportActionScope === 'all') {
        reportAction.all = true
      } else if (reportActionTypes.length > 0) {
        reportAction.types = reportActionTypes
      }
      if (reportActionNote) reportAction.note = reportActionNote
      await onSubmit({ ...vals, reportAction })
      setSelectedAction(null) // Reset after successful submission
    } else {
      await onSubmit(vals)
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
    isMuteEvent,
    isTakedownEvent,
    isPriorityScoreEvent,
    setModEventType,
    policyDetails,
    strikeData,
    strikeDataError,
    currentStrikes,
    actionRecommendation,
    isAgeAssuranceOverrideEvent,
    severityLevelStrikeCount,
    isMuteReporterEvent,
    isAppealed,
    isTagEvent,
    isEmailEvent,
    isReverseTakedownEvent,
    isCommentEvent,
    isReviewClosed,
    isEscalated,
    isAckEvent,
    selectedPolicyName,
    durationSelectorRef,
    submitButton,
    handleEmailSubmit,
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
    selectedAgeAssuranceState,
    setSelectedAgeAssuranceState,
  } = useQuickAction({
    onCancel,
    onSubmit: wrappedOnSubmit,
    subject,
    setSubject,
    subjectOptions,
  })

  const showReportAction = (REPORT_STATUS_EVENT_TYPES as Set<string>).has(modEventType)

  let emailTemplateLabel = `Template`
  if (recipientLanguages.languages.length > 1) {
    emailTemplateLabel = `Template (account languages: ${recipientLanguages.languages.join(', ')})`
  }

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
        <ReportInfoPanel report={report} assignment={assignment} />

        <ViewersIndicator viewers={viewers} />

        {profile && (
          <div className="mb-3">
            <HighProfileWarning profile={profile} />
          </div>
        )}

        {/* Strike data error - unlikely to happen */}
        {!!strikeDataError &&
          (isTakedownEvent || isEmailEvent || isReverseTakedownEvent) && (
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
        />

        <div className={selectedAction ? '' : 'hidden'}>
        <form id={FORM_ID} onSubmit={onFormSubmit}>
          <div className="relative flex flex-row gap-3 items-center mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
              <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                {selectedAction === 'label' ? 'Label' : selectedAction === 'takedown' ? 'Takedown' : 'Action'}
              </span>
            </div>
            <ModEventDetailsPopover modEventType={modEventType} />
          </div>

          {isTakedownEvent && (
            <PolicySeveritySelector
              defaultPolicy={selectedPolicyName}
              policyDetails={policyDetails}
              handlePolicySelect={handlePolicySelect}
              handleSeverityLevelSelect={handleSeverityLevelSelect}
              severityLevelStrikeCount={severityLevelStrikeCount}
              defaultSeverityLevel={selectedSeverityLevelName}
              currentStrikes={currentStrikes}
              actionRecommendation={actionRecommendation}
              variant="takedown"
              targetServices={targetServices}
              setTargetServices={setTargetServices}
              isSubjectDid={isSubjectDid}
            />
          )}

          {shouldShowDurationInHoursField && (
            <div className="flex flex-row gap-2">
              {isPriorityScoreEvent && (
                <FormLabel
                  label=""
                  className="mt-2 w-1/2"
                  htmlFor="priorityScore"
                >
                  <Input
                    type="number"
                    id="priorityScore"
                    name="priorityScore"
                    className="block w-full"
                    placeholder="Score between 0-100"
                    autoFocus
                    min={0}
                    max={100}
                    step={1}
                    required
                  />
                </FormLabel>
              )}
              <FormLabel
                label=""
                htmlFor="durationInHours"
                className="mb-1 mt-2"
              >
                <ActionDurationSelector
                  ref={durationSelectorRef}
                  action={modEventType}
                  required={isLabelEvent ? false : true}
                  showPermanent={!isMuteEvent}
                  defaultValue={!isMuteEvent ? 0 : 6}
                  onChange={(e) => {
                    if (e.target.value === '0' && isTakedownEvent) {
                      const ackAllCheckbox =
                        document.querySelector<HTMLInputElement>(
                          'input[name="acknowledgeAccountSubjects"]',
                        )
                      if (ackAllCheckbox && !ackAllCheckbox.checked) {
                        ackAllCheckbox.checked = true
                      }
                    }
                  }}
                  labelText={
                    isMuteEvent
                      ? 'Mute duration'
                      : isLabelEvent
                        ? 'Label duration'
                        : isPriorityScoreEvent
                          ? 'Score duration'
                          : ''
                  }
                />
              </FormLabel>
            </div>
          )}

          {isAgeAssuranceOverrideEvent && (
            <>
              <div className="mt-2">
                <Select
                  id="ageAssuranceState"
                  name="ageAssuranceState"
                  required
                  onChange={(e) => setSelectedAgeAssuranceState(e.target.value)}
                >
                  <option value="">Select status...</option>
                  {Object.values(AGE_ASSURANCE_OVERRIDE_STATES).map((state) => (
                    <option key={state} value={state}>
                      {capitalize(state)}
                    </option>
                  ))}
                </Select>
              </div>
              {selectedAgeAssuranceState &&
                selectedAgeAssuranceState !==
                  AGE_ASSURANCE_OVERRIDE_STATES.RESET && (
                  <div className="mt-2">
                    <Select
                      id="ageAssuranceAccess"
                      name="ageAssuranceAccess"
                      required
                    >
                      <option value="">Select access...</option>
                      {Object.values(AGE_ASSURANCE_ACCESS_STATES).map(
                        (state) => (
                          <option key={state} value={state}>
                            {capitalize(state)}
                          </option>
                        ),
                      )}
                    </Select>
                  </div>
                )}
            </>
          )}

          {isMuteReporterEvent && (
            <p className="text-xs my-3">
              When a reporter is muted, that account will still be able to
              report and their reports will show up in the event log. However,
              their reports {"won't"} change moderation review state of the
              subject {"they're"} reporting
            </p>
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

          {isTagEvent && (
            <FormLabel label="Tags" className="mt-2">
              <Input
                type="text"
                id="tags"
                name="tags"
                className="block w-full"
                placeholder="Comma separated tags"
                defaultValue={subjectStatus?.tags?.join(',') || ''}
              />
            </FormLabel>
          )}

          {(isEmailEvent || isReverseTakedownEvent) && (
            <PolicySeveritySelector
              policyDetails={policyDetails}
              handlePolicySelect={handlePolicySelect}
              handleSeverityLevelSelect={handleSeverityLevelSelect}
              severityLevelStrikeCount={severityLevelStrikeCount}
              currentStrikes={currentStrikes}
              actionRecommendation={actionRecommendation}
              targetServices={targetServices}
              setTargetServices={setTargetServices}
              selectedSeverityLevel={selectedSeverityLevelName}
              defaultSeverityLevel={selectedSeverityLevelName}
              defaultPolicy={selectedPolicyName}
              isSubjectDid={isSubjectDid}
              variant={isEmailEvent ? 'email' : 'reverse-takedown'}
            />
          )}

          {!isEmailEvent && (
            <div className="mt-2">
              <Textarea
                name="comment"
                placeholder="Reason for action (optional)"
                className="block w-full mb-3"
              />
            </div>
          )}

          {showReportAction && (
            <div className="mt-2 mb-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Close reports
              </p>
              <Select
                className="w-full"
                value={reportActionScope}
                onChange={(e) =>
                  setReportActionScope(
                    e.target.value as 'current' | 'all' | 'types',
                  )
                }
              >
                <option value="current">This report only</option>
                <option value="all">All open reports on subject</option>
                <option value="types">Reports of specific types</option>
              </Select>
              {reportActionScope === 'types' && (
                <ReportTypeMultiselect
                  value={reportActionTypes}
                  onChange={setReportActionTypes}
                />
              )}
              {showReportActionNote ? (
                <div className="space-y-1">
                  <Textarea
                    placeholder="Note to reporter (optional)"
                    className="block w-full"
                    rows={2}
                    autoFocus
                    value={reportActionNote}
                    onChange={(e) => setReportActionNote(e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => { setShowReportActionNote(false); setReportActionNote('') }}
                  >
                    Remove note
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowReportActionNote(true)}
                >
                  + Add note to reporter
                </button>
              )}
            </div>
          )}

          {showAutomatedEmailComposer && (
            <EmailComposerFields
              defaultTemplate={
                !!actionRecommendation
                  ? automatedEmailTemplate?.name
                  : undefined
              }
              templateLabel={emailTemplateLabel}
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

          {isCommentEvent && (
            <Checkbox
              value="true"
              id="sticky"
              name="sticky"
              className="mb-3 flex items-center"
              label="Update the subject's persistent note with this comment"
            />
          )}


          {(isLabelEvent || isTagEvent) && !isReviewClosed && (
            <Checkbox
              value="true"
              defaultChecked
              id="additionalAcknowledgeEvent"
              name="additionalAcknowledgeEvent"
              className="mb-3 flex items-center leading-3"
              label={
                <span className="leading-4">
                  {isEscalated
                    ? `De-escalate the subject and acknowledge all open reports after this action`
                    : `Acknowledge all open reports after this action`}
                </span>
              }
            />
          )}

          {(isTakedownEvent || isAckEvent) && isSubjectDid && (
            <Checkbox
              value="true"
              id="acknowledgeAccountSubjects"
              name="acknowledgeAccountSubjects"
              className="mb-3 flex items-center leading-3"
              label={
                <span className="leading-4">
                  Acknowledge all open/escalated/appealed reports on subjects
                  created by this user
                </span>
              }
            />
          )}

          {isAckEvent && isAppealed && (
            <Checkbox
              defaultChecked
              value="true"
              id="additionalResolveAppealEvent"
              name="additionalResolveAppealEvent"
              className="mb-3 flex items-center leading-3"
              label={
                <span className="leading-4">Resolve appeal from the user</span>
              }
            />
          )}

          {submission.error && (
            <div className="my-2">
              <ActionError error={submission.error} />
            </div>
          )}

          {!isEmailEvent && (
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
          )}
        </form>

        {/* Email composer lives outside the form since it has separate, self-contained submit handler */}
        {isEmailEvent && isSubjectDid && (
          <div className="mt-2">
            <EmailComposer did={subject} handleSubmit={handleEmailSubmit} />
          </div>
        )}
        </div>

        <ActivityTimeline reportId={report.id} />
      </div>
    </div>

    </div>
  )
}
