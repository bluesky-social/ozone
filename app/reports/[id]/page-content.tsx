'use client'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query'
import {
  ToolsOzoneReportDefs,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { ButtonSecondary } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Select, Textarea } from '@/common/forms'
import { PreviewCard } from '@/common/PreviewCard'
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
import { SubjectReviewStateBadge } from '@/subject/ReviewStateMarker'
import { getProfileUriForDid } from '@/reports/helpers/subject'
import { SubjectSwitchButton } from '@/common/SubjectSwitchButton'
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
import { ButtonPrimary } from '@/common/buttons'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

const FORM_ID = 'report-detail-action-panel'

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

export function ReportDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const reportId = Number(params.id)
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const emitEvent = useEmitEvent()

  const cachedReport = useMemo(
    () => findReportInCache(queryClient, reportId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reportId],
  )

  const { data: fetchedReport, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.report.getReport({
        id: reportId,
      })
      return data
    },
    enabled: !cachedReport,
  })

  const report = cachedReport ?? fetchedReport
  const [subject, setSubject] = useState(report?.subject.subject ?? '')

  useEffect(() => {
    if (report?.subject.subject && !subject) {
      setSubject(report.subject.subject)
    }
  }, [report, subject])

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
        <ButtonSecondary
          className="px-2 py-1 flex items-center gap-1 text-sm"
          onClick={() => router.push('/reports')}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Reports
        </ButtonSecondary>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Report #{reportId}
        </h1>
      </div>
      {subject && (
        <ReportDetailForm
          subject={subject}
          setSubject={setSubject}
          subjectOptions={[subject]}
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

function ReportDetailForm(props: {
  subject: string
  setSubject: (subject: string) => void
  subjectOptions: string[]
  onSubmit: (vals: ToolsOzoneModerationEmitEvent.InputSchema) => Promise<void>
  onCancel: () => void
}) {
  const { subject, setSubject, subjectOptions, onSubmit, onCancel } = props

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
  } = useQuickAction({ onCancel, onSubmit, subject, setSubject, subjectOptions })

  let emailTemplateLabel = `Template`
  if (recipientLanguages.languages.length > 1) {
    emailTemplateLabel = `Template (account languages: ${recipientLanguages.languages.join(', ')})`
  }

  return (
    <div className="max-w-2xl">
      <form id={FORM_ID} onSubmit={onFormSubmit}>
        <div className="flex flex-col">
          <div className="flex flex-row items-end mb-3">
            <FormLabel
              label="Subject"
              htmlFor="subject"
              className="flex-1"
              copyButton={{ text: subject, label: 'Copy subject' }}
              extraLabel={
                <SubjectSwitchButton subject={subject} setSubject={setSubject} />
              }
            >
              <Input
                type="text"
                id="subject"
                name="subject"
                required
                list="subject-suggestions"
                placeholder="Subject"
                className="block w-full"
                value={subject}
                onChange={(ev) => setSubject(ev.target.value)}
                autoComplete="off"
              />
              <datalist id="subject-suggestions">
                {subjectOptions?.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </FormLabel>
          </div>

          <div className="max-w-xl">
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

          {!!subjectStatus && (
            <div className="pb-4">
              <p className="flex flex-row items-center">
                {!!subjectStatus?.priorityScore && (
                  <PriorityScore priorityScore={subjectStatus.priorityScore} />
                )}
                {!!subjectStatus?.ageAssuranceState &&
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

          {!!record?.blobs?.length && (
            <BlobListFormField
              blobs={record.blobs}
              authorDid={record.repo.did}
              className="mb-2"
            />
          )}

          {isSubjectDid && canManageChat && (
            <div className="mb-2">
              <MessageActorMeta did={subject} />
            </div>
          )}

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

          <div className="px-1">
            {profile && (
              <div className="mb-2">
                <HighProfileWarning profile={profile} />
              </div>
            )}
            {!!strikeDataError && (isTakedownEvent || isEmailEvent || isReverseTakedownEvent) && (
              <div className="mb-2">
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

            <div className="relative flex flex-row gap-3 items-center">
              <ModEventSelectorButton
                isSubjectDid={isSubjectDid}
                subjectStatus={subjectStatus}
                selectedAction={modEventType}
                hasBlobs={!!record?.blobs?.length}
                setSelectedAction={(action) => setModEventType(action)}
              />
              <ModEventDetailsPopover modEventType={modEventType} />
              {isSubjectDid && profile && (
                <VerificationActionButton did={subject} profile={profile} />
              )}
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
                    onChange={(e) =>
                      setSelectedAgeAssuranceState(e.target.value)
                    }
                  >
                    <option value="">Select status...</option>
                    {Object.values(AGE_ASSURANCE_OVERRIDE_STATES).map(
                      (state) => (
                        <option key={state} value={state}>
                          {capitalize(state)}
                        </option>
                      ),
                    )}
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
                    const isEditableLabel = allLabels.some((l) => {
                      return l.val === label && l.src === config.did
                    })
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

            {isLabelEvent && isSubjectDid && (
              <p className="mb-3 text-xs">
                NOTE: Applying labels to an account overall is a strong
                intervention. You may want to apply the labels to the user&apos;s
                profile record instead.{' '}
                <a
                  href="#"
                  className="underline"
                  onClick={() => setSubject(getProfileUriForDid(subject))}
                >
                  Click here to switch the subject from account to profile
                  record.
                </a>
              </p>
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
                label={<span className="leading-4">Resolve appeal from the user</span>}
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
                  onClick={onCancel}
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
          </div>
        </div>
      </form>

      {isEmailEvent && isSubjectDid && (
        <div className="mt-2">
          <EmailComposer did={subject} handleSubmit={handleEmailSubmit} />
        </div>
      )}
    </div>
  )
}
