import { useState } from 'react'
import { ActionPanel } from '@/common/ActionPanel'
import { ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Select, Textarea } from '@/common/forms'
import { PropsOf } from '@/lib/types'
import { BlobListFormField } from './BlobList'
import {
  LabelList,
  LabelListEmpty,
  ModerationLabel,
} from '@/common/labels/List'
import { isSelfLabel } from '@/common/labels/util'
import { FullScreenActionPanel } from '@/common/FullScreenActionPanel'
import { PreviewCard } from '@/common/PreviewCard'
import { createBreakpoint } from 'react-use'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { LabelSelector } from '@/common/labels/Selector'
import { capitalize } from '@/lib/util'
import { Loading } from '@/common/Loader'
import { ActionDurationSelector } from '@/reports/ModerationForm/ActionDurationSelector'
import { AGE_ASSURANCE_OVERRIDE_STATES, AGE_ASSURANCE_ACCESS_STATES } from '@/mod-event/constants'
import { ModEventList } from '@/mod-event/EventList'
import { ModEventSelectorButton } from '@/mod-event/SelectorButton'
import { SubjectReviewStateBadge } from '@/subject/ReviewStateMarker'
import { getProfileUriForDid } from '@/reports/helpers/subject'
import { DialogTitle } from '@headlessui/react'
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
import { useQuickAction, QuickActionProps } from './useQuickAction'
import { PolicySeveritySelector } from './PolicySeveritySelector'

const FORM_ID = 'mod-action-panel'
const useBreakpoint = createBreakpoint({ xs: 340, sm: 640 })

export function ModActionPanelQuick(
  props: PropsOf<typeof ActionPanel> &
    QuickActionProps & {
      isInitialLoading: boolean
    },
) {
  const {
    subject,
    setSubject,
    subjectOptions,
    onSubmit,
    onClose,
    isInitialLoading,
    ...others
  } = props
  const [replaceFormWithEvents, setReplaceFormWithEvents] = useState(false)
  const breakpoint = useBreakpoint()
  const isMobileView = breakpoint === 'xs'

  return (
    <FullScreenActionPanel
      title={
        <DialogTitle className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 flex flex-row justify-between pr-8">
          Take moderation action
          {isMobileView && (
            <button
              className={`sm:hidden text-xs rounded px-2 ${
                replaceFormWithEvents
                  ? 'bg-indigo-700 text-white'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
              onClick={() => setReplaceFormWithEvents(!replaceFormWithEvents)}
            >
              Events
            </button>
          )}
        </DialogTitle>
      }
      onClose={onClose}
      {...others}
    >
      {!subjectOptions?.length ? (
        <div className="flex flex-col flex-1 h-full item-center justify-center">
          {isInitialLoading ? (
            <>
              <Loading />{' '}
              <p className="pb-4 text-center text-gray-400 dark:text-gray-50">
                Loading reports...
              </p>
            </>
          ) : (
            <>
              <CheckCircleIcon
                title="No reports"
                className="h-10 w-10 text-green-300 align-text-bottom mx-auto mb-4"
              />
              <p className="pb-4 text-center text-gray-400 dark:text-gray-50">
                No reports found
              </p>
            </>
          )}
        </div>
      ) : (
        <Form
          onCancel={onClose}
          onSubmit={onSubmit}
          subject={subject}
          setSubject={setSubject}
          subjectOptions={subjectOptions}
          replaceFormWithEvents={replaceFormWithEvents && isMobileView}
        />
      )}
    </FullScreenActionPanel>
  )
}

function Form(
  props: {
    onCancel: () => void
    replaceFormWithEvents: boolean
  } & QuickActionProps,
) {
  const {
    replaceFormWithEvents,
    onCancel,
    onSubmit,
    subject,
    setSubject,
    subjectOptions,
    ...others
  } = props
  const [selectedAgeAssuranceState, setSelectedAgeAssuranceState] = useState('')
  const {
    submission,
    navigateQueue,
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
    moveToNextSubjectRef,
    durationSelectorRef,
    submitButton,
    submitAndGoNext,
    handleEmailSubmit,
    handlePolicySelect,
    handleSeverityLevelSelect,
    targetServices,
    setTargetServices,
    config,
    showAutomatedEmailComposer,
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
    onSubmit,
    subject,
    setSubject,
    subjectOptions,
  })

  let emailTemplateLabel = `Template`
  if (recipientLanguages.languages.length > 1) {
    emailTemplateLabel = `Template (account languages: ${recipientLanguages.languages.join(
      ', ',
    )})`
  }

  return (
    <>
      {/* The inline styling is not ideal but there's no easy way to set calc() values in tailwind  */}
      {/* We are basically telling the browser to leave 180px at the bottom of the container to make room for navigation arrows and use the remaining vertical space for the main content where scrolling will be allowed if content overflows */}
      {/* @ts-ignore */}
      <style jsx>{`
        .scrollable-container {
          height: calc(100vh - 100px);
        }
        @supports (-webkit-touch-callout: none) {
          .scrollable-container {
            height: calc(100svh - 100px);
          }
        }
        @media (min-width: 640px) {
          .scrollable-container {
            height: calc(100vh - 180px);
          }
        }
      `}</style>
      <div className="flex overflow-y-auto scrollable-container pt-1">
        <div className="flex sm:w-1/2 flex-col">
          <form id={FORM_ID} onSubmit={onFormSubmit} {...others}>
            <div className="flex flex-col">
              <div className="flex flex-row items-end mb-3">
                <FormLabel
                  label="Subject"
                  htmlFor="subject"
                  className="flex-1"
                  copyButton={{ text: subject, label: 'Copy subject' }}
                  extraLabel={
                    <SubjectSwitchButton
                      subject={subject}
                      setSubject={setSubject}
                    />
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
                    {subjectOptions?.map((subject) => (
                      <option key={subject} value={subject} />
                    ))}
                  </datalist>
                </FormLabel>
              </div>
              {/* PREVIEWS */}
              <div className="max-w-xl">
                <PreviewCard
                  subject={subject}
                  isAuthorDeactivated={!!record?.repo.deactivatedAt}
                  isAuthorTakendown={
                    !!record?.repo.moderation.subjectStatus?.takendown
                  }
                  className="border-2 border-dashed border-gray-300"
                >
                  {!isSubjectDid && record?.repo && (
                    <div className="-ml-1 my-2">
                      <RecordAuthorStatus
                        repo={record.repo}
                        profile={profile}
                      />
                    </div>
                  )}
                </PreviewCard>
              </div>

              {!!subjectStatus && (
                <div className="pb-4">
                  <p className="flex flex-row items-center">
                    {!!subjectStatus?.priorityScore && (
                      <PriorityScore
                        priorityScore={subjectStatus.priorityScore}
                      />
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
              <div className={`mb-2`}>
                <FormLabel
                  label="Labels"
                  className="flex flex-row items-center gap-2"
                >
                  <LabelList className="-ml-1 -mt-1 flex-wrap">
                    {!currentLabels.length && (
                      <LabelListEmpty className="ml-1" />
                    )}
                    {allLabels.map((label) => {
                      return (
                        <ModerationLabel
                          key={label.val}
                          label={label}
                          recordAuthorDid={`${repo?.did || record?.repo.did}`}
                        />
                      )
                    })}
                  </LabelList>
                </FormLabel>
              </div>
              {!!subjectStatus?.tags?.length && (
                <div className={`mb-2`}>
                  <FormLabel
                    label="Tags"
                    className="flex flex-row items-center gap-2"
                  >
                    <LabelList className="-mt-1 -ml-1 flex-wrap gap-1">
                      {subjectStatus.tags.sort().map((tag) => {
                        return <SubjectTag key={tag} tag={tag} />
                      })}
                    </LabelList>
                  </FormLabel>
                </div>
              )}

              {!isSubjectDid && !!profile?.labels?.length && (
                <div className="mb-2">
                  <div className="flex flex-row items-center">
                    <div className="mr-1">Account Labels</div>
                    {profile.labels.map((label) => {
                      return (
                        <ModerationLabel
                          label={label}
                          key={label.val}
                          recordAuthorDid={profile.did}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {!!record?.repo.moderation.subjectStatus?.tags?.length && (
                <div className="mb-2">
                  <div className="flex flex-row items-center">
                    <div className="mr-2">Account Tags</div>
                    <LabelList className="-ml-1 flex-wrap gap-1">
                      {record.repo.moderation.subjectStatus?.tags
                        .sort()
                        .map((tag) => {
                          return <SubjectTag key={tag} tag={tag} />
                        })}
                    </LabelList>
                  </div>
                </div>
              )}

              {/* This is only meant to be switched on in mobile/small screen view */}
              {/* The parent component ensures to toggle this based on the screen size */}
              {replaceFormWithEvents ? (
                <>
                  <ModEventList
                    subject={subject}
                    stats={{
                      accountStrike: subjectStatus?.accountStrike || strikeData,
                      accountStats: subjectStatus?.accountStats,
                      recordsStats: subjectStatus?.recordsStats,
                    }}
                  />
                </>
              ) : (
                <div className="px-1">
                  {profile && (
                    <div className="mb-2">
                      <HighProfileWarning profile={profile} />
                    </div>
                  )}
                  {!!strikeDataError &&
                    (isTakedownEvent ||
                      isEmailEvent ||
                      isReverseTakedownEvent) && (
                      <div className="mb-2">
                        <Alert
                          type="error"
                          title="Error loading strike data!"
                          body={
                            <>
                              Please be cautious when taking actions that
                              require up-to-date strike info.{' '}
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
                      <VerificationActionButton
                        did={subject}
                        profile={profile}
                      />
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
                        className={`mb-1 mt-2`}
                      >
                        <ActionDurationSelector
                          ref={durationSelectorRef}
                          action={modEventType}
                          required={isLabelEvent ? false : true}
                          showPermanent={!isMuteEvent}
                          defaultValue={!isMuteEvent ? 0 : 6}
                          onChange={(e) => {
                            if (e.target.value === '0' && isTakedownEvent) {
                              // When permanent takedown is selected, auto check ack all checkbox
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
                          {Object.values(AGE_ASSURANCE_OVERRIDE_STATES).map(
                            (state) => (
                              <option key={state} value={state}>
                                {capitalize(state)}
                              </option>
                            ),
                          )}
                        </Select>
                      </div>
                      {selectedAgeAssuranceState && selectedAgeAssuranceState !== AGE_ASSURANCE_OVERRIDE_STATES.BLOCKED && (
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
                      When a reporter is muted, that account will still be able
                      to report and their reports will show up in the event log.
                      However, their reports {"won't"} change moderation review
                      state of the subject {"they're"} reporting
                    </p>
                  )}

                  {isLabelEvent && (
                    <div className="mt-2">
                      <LabelSelector
                        id="labels"
                        name="labels"
                        form={FORM_ID}
                        defaultLabels={currentLabels.filter((label) => {
                          // If there's a label where the source is the current labeler, it's editable
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

                  {isCommentEvent && (
                    <Checkbox
                      value="true"
                      id="sticky"
                      name="sticky"
                      className="mb-3 flex items-center"
                      label="Update the subject's persistent note with this comment"
                    />
                  )}

                  {/* Only show this when moderator tries to apply labels to a DID subject */}
                  {isLabelEvent && isSubjectDid && (
                    <p className="mb-3 text-xs">
                      NOTE: Applying labels to an account overall is a strong
                      intervention. You may want to apply the labels to the
                      user&apos;s profile record instead.{' '}
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
                          Acknowledge all open/escalated/appealed reports on
                          subjects created by this user
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
                        <span className="leading-4">
                          Resolve appeal from the user
                        </span>
                      }
                    />
                  )}

                  {submission.error && (
                    <div className="my-2">
                      <ActionError error={submission.error} />
                    </div>
                  )}

                  {!isEmailEvent && (
                    <div className="mt-auto flex flex-row justify-between">
                      <div>
                        <input
                          ref={moveToNextSubjectRef}
                          type="hidden"
                          name="moveToNextSubject"
                          value="0"
                        />
                        <ButtonSecondary
                          className="px-2 sm:px-4 sm:mr-2"
                          disabled={submission.isSubmitting}
                          onClick={onCancel}
                        >
                          <span className="text-sm sm:text-base">(C)ancel</span>
                        </ButtonSecondary>
                      </div>
                      <div>
                        <ButtonPrimary
                          ref={submitButton}
                          type="submit"
                          disabled={submission.isSubmitting}
                          className="mx-1 px-2 sm:px-4"
                        >
                          <span className="text-sm sm:text-base">(S)ubmit</span>
                        </ButtonPrimary>
                        <ButtonPrimary
                          type="button"
                          disabled={submission.isSubmitting}
                          onClick={submitAndGoNext}
                          className="px-2 sm:px-4"
                        >
                          <span className="text-sm sm:text-base">
                            Submit & (N)ext
                          </span>
                        </ButtonPrimary>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
          {/* IMPORTANT: This component has a form so we can't nest it inside the above form */}
          {isEmailEvent && isSubjectDid && (
            <div className="ml-2 mt-2">
              <EmailComposer did={subject} handleSubmit={handleEmailSubmit} />
            </div>
          )}
        </div>
        {!replaceFormWithEvents && (
          <div className="hidden sm:block sm:w-1/2 sm:pl-4">
            <ModEventList
              stats={{
                accountStrike: subjectStatus?.accountStrike || strikeData,
                accountStats: subjectStatus?.accountStats,
                recordsStats: subjectStatus?.recordsStats,
              }}
              subject={subject}
            />
          </div>
        )}
      </div>
      {(subjectOptions?.length || 0) > 1 && (
        <div className="flex justify-between mt-auto">
          <ButtonSecondary
            className="px-2 py-1"
            onClick={() => navigateQueue(-1)}
            disabled={submission.isSubmitting}
          >
            <ArrowLeftIcon className="h-3 w-3 sm:h-4 sm:w-4 inline-block align-text-bottom" />
          </ButtonSecondary>

          <ButtonSecondary
            className="px-2 py-1"
            onClick={() => navigateQueue(1)}
            disabled={submission.isSubmitting}
          >
            <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4 inline-block align-text-bottom" />
          </ButtonSecondary>
        </div>
      )}
    </>
  )
}
