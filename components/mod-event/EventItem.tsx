import {
  $Typed,
  asPredicate,
  ChatBskyConvoDefs,
  ComAtprotoAdminDefs,
  ComAtprotoModerationDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
} from '@atproto/api'

import { Card } from '@/common/Card'
import { LabelChip, LabelList, ModerationLabel } from '@/common/labels/List'
import { MessageContext } from '@/dms/MessageContext'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { ItemTitle } from './ItemTitle'
import { PreviewCard } from '@/common/PreviewCard'
import { ModEventViewWithDetails } from './useModEventList'
import { ClockIcon, DocumentTextIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { pluralize } from '@/lib/util'
import { TextWithLinks } from '@/common/TextWithLinks'
import { ModToolInfo } from './ModToolInfo'
import { AgeAssuranceBadge } from './AgeAssuranceStateBadge'
import { CopyButton } from '@/common/CopyButton'

import type { JSX } from 'react'
import { UserAgent } from '@/common/UserAgent'

const LinkToAuthor = ({
  creatorHandle,
  createdBy,
}: {
  creatorHandle?: string
  createdBy: string
}) => {
  return (
    <a
      target="_blank"
      href={`/repositories/${createdBy}?quickOpen=${createdBy}`}
      className="underline"
    >
      {creatorHandle ? `@${creatorHandle}` : createdBy}
    </a>
  )
}

const Comment = ({
  modEvent,
}: {
  modEvent: Omit<ModEventViewWithDetails, 'event'> & {
    event:
      | $Typed<ToolsOzoneModerationDefs.ModEventAcknowledge>
      | $Typed<ToolsOzoneModerationDefs.ModEventEscalate>
      | $Typed<ToolsOzoneModerationDefs.ModEventComment>
      | $Typed<ToolsOzoneModerationDefs.ModEventUnmute>
      | $Typed<ToolsOzoneModerationDefs.ModEventUnmuteReporter>
      | $Typed<ToolsOzoneModerationDefs.ModEventResolveAppeal>
      | $Typed<ToolsOzoneModerationDefs.ModEventReverseTakedown>
      | $Typed<ToolsOzoneModerationDefs.ModEventDivert>
  }
}) => {
  return (
    <>
      <div className="flex justify-between text-gray-500">
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
        <div>
          {ToolsOzoneModerationDefs.isModEventComment(modEvent.event) &&
            !!modEvent.event.sticky && (
              <span className="bg-gray-100 text-gray-800 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ">
                Sticky
              </span>
            )}
        </div>
      </div>
      {modEvent.event.comment && (
        <TextWithLinks text={modEvent.event.comment} />
      )}
      <EventLabels
        header="Added: "
        // @ts-expect-error - legacy support for data that is more than a yr old
        labels={modEvent.event.createLabelVals}
      />
      <EventLabels
        header="Removed: "
        // @ts-expect-error - legacy support for data that is more than a yr old
        labels={modEvent.event.negateLabelVals}
      />
    </>
  )
}

const Email = ({
  modEvent,
}: {
  modEvent: ModEventType<ToolsOzoneModerationDefs.ModEventEmail>
}) => {
  return (
    <>
      <p className="text-gray-500">
        By{' '}
        {modEvent.creatorHandle
          ? `@${modEvent.creatorHandle}`
          : `${modEvent.createdBy}`}
      </p>
      {modEvent.event.subjectLine && (
        <p>Subject: {modEvent.event.subjectLine}</p>
      )}
      {modEvent.event.comment && <p>{modEvent.event.comment}</p>}
    </>
  )
}

const PriorityScore = ({
  modEvent,
}: {
  modEvent: ToolsOzoneModerationDefs.ModEventView & {
    event: ToolsOzoneModerationDefs.ModEventPriorityScore
  }
}) => {
  return (
    <>
      <p>
        Set to <b>{modEvent.event.score}</b> By{' '}
        <LinkToAuthor
          createdBy={modEvent.createdBy}
          creatorHandle={modEvent.creatorHandle}
        />
      </p>

      {modEvent.event.comment && <p>{modEvent.event.comment}</p>}
    </>
  )
}

const RevokeAccountCredentials = ({
  modEvent,
}: {
  modEvent: ToolsOzoneModerationDefs.ModEventView & {
    event: ToolsOzoneModerationDefs.RevokeAccountCredentialsEvent
  }
}) => {
  return (
    <>
      <p>
        Account Credentials Revoked By{' '}
        <LinkToAuthor
          createdBy={modEvent.createdBy}
          creatorHandle={modEvent.creatorHandle}
        />
      </p>

      {modEvent.event.comment && <p>{modEvent.event.comment}</p>}
    </>
  )
}

const AgeAssurance = ({
  modEvent,
}: {
  modEvent: ToolsOzoneModerationDefs.ModEventView & {
    event: ToolsOzoneModerationDefs.AgeAssuranceEvent
  }
}) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <span>
          By{' '}
          <LinkToAuthor
            createdBy={modEvent.createdBy}
            creatorHandle={modEvent.creatorHandle}
          />
        </span>
        <div className="flex items-center gap-2">
          <AgeAssuranceBadge ageAssuranceState={modEvent.event.status} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-1 mt-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Attempt ID:
        </span>
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
          {modEvent.event.attemptId}
          <CopyButton text={modEvent.event.attemptId} label="Copy attempt ID" />
        </code>
      </div>

      {modEvent.event.initIp && modEvent.event.initUa && (
        <div className="flex flex-col md:flex-row items-start md:items-center gap-1 mt-1 ">
          <code>{modEvent.event.initIp}</code>
          <CopyButton text={modEvent.event.initIp} label="Copy IP address" />
          <UserAgent userAgent={modEvent.event.initUa} />
        </div>
      )}

      {modEvent.event.completeIp && modEvent.event.completeUa && (
        <div className="flex flex-col md:flex-row items-start md:items-center gap-1 mt-1 ">
          <code>{modEvent.event.completeIp}</code>
          <CopyButton
            text={modEvent.event.completeIp}
            label="Copy IP address"
          />
          <UserAgent userAgent={modEvent.event.completeUa} />
        </div>
      )}
    </>
  )
}

const AgeAssuranceOverride = ({
  modEvent,
}: {
  modEvent: ToolsOzoneModerationDefs.ModEventView & {
    event: ToolsOzoneModerationDefs.AgeAssuranceOverrideEvent
  }
}) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <span>
          By{' '}
          <LinkToAuthor
            createdBy={modEvent.createdBy}
            creatorHandle={modEvent.creatorHandle}
          />
        </span>
        <div className="flex items-center gap-2">
          <AgeAssuranceBadge ageAssuranceState={modEvent.event.status} />
        </div>
      </div>

      {modEvent.event.comment && (
        <div className="mt-2">
          <TextWithLinks text={modEvent.event.comment} />
        </div>
      )}
    </>
  )
}

type ModEventType<T> = Omit<ToolsOzoneModerationDefs.ModEventView, 'event'> & {
  event: $Typed<T>
}

const Report = ({
  modEvent,
}: {
  modEvent: ModEventType<ToolsOzoneModerationDefs.ModEventReport>
}) => {
  const isAppeal =
    modEvent.event.reportType === ComAtprotoModerationDefs.REASONAPPEAL
  return (
    <>
      <div className="flex justify-between">
        <span>
          By{' '}
          <LinkToAuthor
            createdBy={modEvent.createdBy}
            creatorHandle={modEvent.creatorHandle}
          />
        </span>
        <div>
          {modEvent.event.reportType && !isAppeal && (
            <ReasonBadge reasonType={modEvent.event.reportType} />
          )}
          {modEvent.event.isReporterMuted && (
            <LabelChip className="bg-violet-100 text-violet-800">
              Muted Report
            </LabelChip>
          )}
        </div>
      </div>
      {modEvent.event.comment && (
        <TextWithLinks text={modEvent.event.comment} />
      )}

      {ChatBskyConvoDefs.isMessageRef(modEvent.subject) && (
        <MessageContext className="mt-3" subject={modEvent.subject} />
      )}
    </>
  )
}

const TakedownOrMute = ({
  modEvent,
}: {
  modEvent: {
    event:
      | $Typed<ToolsOzoneModerationDefs.ModEventTakedown>
      | $Typed<ToolsOzoneModerationDefs.ModEventMute>
      | $Typed<ToolsOzoneModerationDefs.ModEventMuteReporter>
  } & ToolsOzoneModerationDefs.ModEventView
}) => {
  const expiresAt = getExpiresAtFromEvent(modEvent)
  return (
    <>
      <div className="flex justify-between">
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
        <div>
          {!!modEvent.event.durationInHours && (
            <span className="bg-gray-100 text-gray-800 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ">
              {modEvent.event.durationInHours}hrs
            </span>
          )}
          {ToolsOzoneModerationDefs.isModEventMuteReporter(modEvent.event) && (
            <LabelChip className="bg-violet-100 text-violet-800">
              Muted Reporter
            </LabelChip>
          )}
        </div>
      </div>
      {expiresAt && (
        <p className="mt-1 flex flex-row items-center">
          <ClockIcon className="h-3 w-3 inline-block mr-1" />
          Until {dateFormatter.format(expiresAt)}
        </p>
      )}
      {ToolsOzoneModerationDefs.isModEventTakedown(modEvent.event) &&
      modEvent.event.policies?.length ? (
        <p className="pb-1 flex flex-row items-center">
          <DocumentTextIcon className="h-3 w-3 inline-block mr-1" />
          <i>
            Under{' '}
            {modEvent.event.policies.map((policy) => {
              return (
                <Link
                  key={policy}
                  prefetch={false}
                  href={`/configure?tab=policies&search=${policy}`}
                >
                  <u>{`${policy}`}</u>{' '}
                </Link>
              )
            })}
            {pluralize(modEvent.event.policies.length, 'policy', {
              plural: 'policies',
            })}
          </i>
        </p>
      ) : null}
      {modEvent.event.comment ? (
        <p className="pb-1">{`${modEvent.event.comment}`}</p>
      ) : null}
      {/* This is only for legacy actions, new actions won't have these properties for these events */}
      <EventLabels
        header="Added: "
        // @ts-ignore
        labels={modEvent.event.createLabelVals as string[] | undefined}
      />
      <EventLabels
        header="Removed: "
        // @ts-ignore
        labels={modEvent.event.negateLabelVals as string[] | undefined}
      />
    </>
  )
}

const EventLabels = ({
  header,
  labels,
  isTag = false,
}: {
  header: string
  labels?: string[]
  isTag?: boolean
}) => {
  const { config } = useConfigurationContext()

  if (!labels?.length) return null

  return (
    <LabelList className="flex-wrap">
      <span className="text-gray-500 dark:text-gray-50">{header}</span>
      {labels.map((label) => {
        if (isTag) {
          return <LabelChip key={label}>{label}</LabelChip>
        }
        // Moderation events being displayed means that these events were added by the current service
        // so we can assume that the src is the same as the configured ozone service DID
        return (
          <ModerationLabel
            key={label}
            label={{
              val: label,
              src: config.did,
              uri: '',
              cts: '',
            }}
          />
        )
      })}
    </LabelList>
  )
}

const Label = ({
  modEvent,
}: {
  modEvent: ModEventType<ToolsOzoneModerationDefs.ModEventLabel>
}) => {
  const expiresAt = getExpiresAtFromEvent(modEvent)

  return (
    <>
      <p>
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
      </p>{' '}
      {modEvent.event.comment ? (
        <p className="pb-1">{`${modEvent.event.comment}`}</p>
      ) : null}
      <div className="flex flex-row items-center">
        <EventLabels header="Added: " labels={modEvent.event.createLabelVals} />
        {expiresAt && (
          <p className="flex flex-row items-center">
            <ClockIcon className="h-3 w-3 inline-block mr-1" />
            Until {dateFormatter.format(expiresAt)}
          </p>
        )}
      </div>
      <EventLabels header="Removed: " labels={modEvent.event.negateLabelVals} />
    </>
  )
}

const Tag = ({
  modEvent,
}: {
  modEvent: ModEventType<ToolsOzoneModerationDefs.ModEventTag>
}) => {
  return (
    <>
      <p>
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
      </p>{' '}
      {modEvent.event.comment ? (
        <p className="pb-1">{`${modEvent.event.comment}`}</p>
      ) : null}
      <EventLabels isTag header="Added: " labels={modEvent.event.add} />
      <EventLabels isTag header="Removed: " labels={modEvent.event.remove} />
    </>
  )
}

const ScheduleTakedown = ({
  modEvent,
}: {
  modEvent: ModEventType<ToolsOzoneModerationDefs.ScheduleTakedownEvent>
}) => {
  const scheduledActionLink = `/scheduled-actions?subjects=${modEvent.subject['did']}`
  return (
    <>
      <p>
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
      </p>
      {modEvent.event.comment && (
        <TextWithLinks text={modEvent.event.comment} />
      )}
      {modEvent.event.executeAt && (
        <p className="dark:text-gray-300 text-gray-600">
          Execute At:{' '}
          <a
            className="underline"
            href={scheduledActionLink}
            target="_blank"
          >
            {dateFormatter.format(new Date(modEvent.event.executeAt))}
          </a>
        </p>
      )}
      {modEvent.event.executeAfter && (
        <p className="dark:text-gray-300 text-gray-600">
          Execute After:{' '}
          <a
            className="underline"
            href={scheduledActionLink}
            target="_blank"
          >
            {dateFormatter.format(new Date(modEvent.event.executeAfter))}
          </a>
        </p>
      )}
      {modEvent.event.executeUntil && (
        <p className="dark:text-gray-300 text-gray-600">
          Execute Before:{' '}
          <a
            className="underline"
            href={scheduledActionLink}
            target="_blank"
          >
            {dateFormatter.format(new Date(modEvent.event.executeUntil))}
          </a>
        </p>
      )}
    </>
  )
}

const CancelScheduledTakedown = ({
  modEvent,
}: {
  modEvent: ModEventType<ToolsOzoneModerationDefs.CancelScheduledTakedownEvent>
}) => {
  return (
    <>
      <p>
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
      </p>
      {modEvent.event.comment && (
        <TextWithLinks text={modEvent.event.comment} />
      )}
    </>
  )
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const getExpiresAtFromEvent = (modEvent: {
  event:
    | $Typed<ToolsOzoneModerationDefs.ModEventTakedown>
    | $Typed<ToolsOzoneModerationDefs.ModEventMute>
    | $Typed<ToolsOzoneModerationDefs.ModEventMuteReporter>
    | $Typed<ToolsOzoneModerationDefs.ModEventLabel>
  createdAt: string
}) => {
  if (!modEvent.event.durationInHours) return null
  const createdAt = new Date(modEvent.createdAt)
  createdAt.setHours(
    createdAt.getHours() + Number(modEvent.event.durationInHours),
  )
  return createdAt
}

export const ModEventItem = ({
  modEvent,
  showContentDetails,
  showContentAuthor,
  showContentPreview,
}: {
  modEvent: ModEventViewWithDetails
  showContentDetails: boolean
  showContentAuthor: boolean
  showContentPreview: boolean
}) => {
  let eventItem: JSX.Element = (
    <p>
      {(modEvent.event.$type as string).replace(
        'tools.ozone.moderation.defs',
        '',
      )}
    </p>
  )
  if (
    asPredicate(ToolsOzoneModerationDefs.validateModEventAcknowledge)(
      modEvent.event,
    ) ||
    asPredicate(ToolsOzoneModerationDefs.validateModEventEscalate)(
      modEvent.event,
    ) ||
    asPredicate(ToolsOzoneModerationDefs.validateModEventComment)(
      modEvent.event,
    ) ||
    asPredicate(ToolsOzoneModerationDefs.validateModEventUnmute)(
      modEvent.event,
    ) ||
    asPredicate(ToolsOzoneModerationDefs.validateModEventUnmuteReporter)(
      modEvent.event,
    ) ||
    asPredicate(ToolsOzoneModerationDefs.validateModEventResolveAppeal)(
      modEvent.event,
    ) ||
    asPredicate(ToolsOzoneModerationDefs.validateModEventReverseTakedown)(
      modEvent.event,
    ) ||
    asPredicate(ToolsOzoneModerationDefs.validateModEventDivert)(modEvent.event)
  ) {
    eventItem = <Comment modEvent={{ ...modEvent, event: modEvent.event }} />
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateModEventTakedown)(
      modEvent.event,
    ) ||
    asPredicate(ToolsOzoneModerationDefs.validateModEventMute)(
      modEvent.event,
    ) ||
    asPredicate(ToolsOzoneModerationDefs.validateModEventMuteReporter)(
      modEvent.event,
    )
  ) {
    eventItem = (
      <TakedownOrMute modEvent={{ ...modEvent, event: modEvent.event }} />
    )
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateModEventReport)(modEvent.event)
  ) {
    eventItem = <Report modEvent={{ ...modEvent, event: modEvent.event }} />
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateModEventLabel)(modEvent.event)
  ) {
    eventItem = <Label modEvent={{ ...modEvent, event: modEvent.event }} />
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateModEventTag)(modEvent.event)
  ) {
    eventItem = <Tag modEvent={{ ...modEvent, event: modEvent.event }} />
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateModEventEmail)(modEvent.event)
  ) {
    eventItem = <Email modEvent={{ ...modEvent, event: modEvent.event }} />
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateModEventPriorityScore)(
      modEvent.event,
    )
  ) {
    eventItem = (
      <PriorityScore modEvent={{ ...modEvent, event: modEvent.event }} />
    )
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateRevokeAccountCredentialsEvent)(
      modEvent.event,
    )
  ) {
    eventItem = (
      <RevokeAccountCredentials
        modEvent={{ ...modEvent, event: modEvent.event }}
      />
    )
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateAgeAssuranceEvent)(
      modEvent.event,
    )
  ) {
    eventItem = (
      <AgeAssurance modEvent={{ ...modEvent, event: modEvent.event }} />
    )
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateAgeAssuranceOverrideEvent)(
      modEvent.event,
    )
  ) {
    eventItem = (
      <AgeAssuranceOverride modEvent={{ ...modEvent, event: modEvent.event }} />
    )
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateScheduleTakedownEvent)(
      modEvent.event,
    )
  ) {
    eventItem = (
      <ScheduleTakedown modEvent={{ ...modEvent, event: modEvent.event }} />
    )
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateCancelScheduledTakedownEvent)(
      modEvent.event,
    )
  ) {
    eventItem = (
      <CancelScheduledTakedown
        modEvent={{ ...modEvent, event: modEvent.event }}
      />
    )
  }
  const previewSubject = ComAtprotoRepoStrongRef.isMain(modEvent.subject)
    ? modEvent.subject.uri
    : ComAtprotoAdminDefs.isRepoRef(modEvent.subject) ||
      ChatBskyConvoDefs.isMessageRef(modEvent.subject)
    ? modEvent.subject.did
    : undefined

  return (
    <div className="mt-4">
      <ItemTitle {...{ modEvent, showContentDetails, showContentAuthor }} />
      <Card>
        {eventItem}
        {modEvent.modTool && <ModToolInfo modTool={modEvent.modTool} />}
        {typeof previewSubject === 'string' && showContentPreview && (
          <div className="border-t dark:border-gray-500 mt-2">
            <PreviewCard subject={previewSubject} />
          </div>
        )}
      </Card>
    </div>
  )
}
