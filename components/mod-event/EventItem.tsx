import {
  $Typed,
  ChatBskyConvoDefs,
  ComAtprotoAdminDefs,
  ComAtprotoModerationDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
} from '@atproto/api'

import { Card } from '@/common/Card'
import { LabelChip, LabelList, ModerationLabel } from '@/common/labels'
import { MessageContext } from '@/dms/MessageContext'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { ItemTitle } from './ItemTitle'
import { PreviewCard } from '@/common/PreviewCard'
import { ModEventViewWithDetails } from './useModEventList'
import { ClockIcon, DocumentTextIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { pluralize } from '@/lib/util'

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

// Utility function to detect and replace links with <a> tags
const wrapLinksInText = (text: string): JSX.Element[] => {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g

  // Split text into parts, with URLs as matches
  const parts = text.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // If part matches a URL, return it as a link
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all underline"
        >
          {part}
        </a>
      )
    }
    // Otherwise, return it as plain text
    return <span key={index}>{part}</span>
  })
}

const TextWithLinks: React.FC<{ text: string }> = ({ text }) => {
  return <p className="whitespace-pre-wrap">{wrapLinksInText(text)}</p>
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

function isMessageSubject(
  subject: ToolsOzoneModerationDefs.ModEventView['subject'],
): subject is $Typed<ChatBskyConvoDefs.MessageRef> {
  return 'messageId' in subject && subject.messageId !== undefined
}

type ModEventType<T> = Omit<ToolsOzoneModerationDefs.ModEventView, 'event'> & {
  event: $Typed<T>
}

function isModEventType<T>(
  e: ToolsOzoneModerationDefs.ModEventView,
  predicate: (event: unknown) => boolean,
): e is ModEventType<T> {
  return predicate(e.event)
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

      {isMessageSubject(modEvent.subject) && (
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
    isModEventType<ToolsOzoneModerationDefs.ModEventAcknowledge>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventAcknowledge,
    ) ||
    isModEventType<ToolsOzoneModerationDefs.ModEventEscalate>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventEscalate,
    ) ||
    isModEventType<ToolsOzoneModerationDefs.ModEventComment>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventComment,
    ) ||
    isModEventType<ToolsOzoneModerationDefs.ModEventUnmute>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventUnmute,
    ) ||
    isModEventType<ToolsOzoneModerationDefs.ModEventUnmuteReporter>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventUnmuteReporter,
    ) ||
    isModEventType<ToolsOzoneModerationDefs.ModEventResolveAppeal>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventResolveAppeal,
    ) ||
    isModEventType<ToolsOzoneModerationDefs.ModEventReverseTakedown>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventReverseTakedown,
    ) ||
    isModEventType<ToolsOzoneModerationDefs.ModEventDivert>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventDivert,
    )
  ) {
    eventItem = <Comment modEvent={modEvent} />
  }
  if (
    isModEventType<ToolsOzoneModerationDefs.ModEventTakedown>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventTakedown,
    ) ||
    isModEventType<ToolsOzoneModerationDefs.ModEventMute>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventMute,
    ) ||
    isModEventType<ToolsOzoneModerationDefs.ModEventMuteReporter>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventMuteReporter,
    )
  ) {
    eventItem = <TakedownOrMute modEvent={modEvent} />
  }
  if (
    isModEventType<ToolsOzoneModerationDefs.ModEventReport>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventReport,
    )
  ) {
    eventItem = <Report modEvent={modEvent} />
  }
  if (
    isModEventType<ToolsOzoneModerationDefs.ModEventLabel>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventLabel,
    )
  ) {
    eventItem = <Label modEvent={modEvent} />
  }
  if (
    isModEventType<ToolsOzoneModerationDefs.ModEventTag>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventTag,
    )
  ) {
    eventItem = <Tag modEvent={modEvent} />
  }
  if (
    isModEventType<ToolsOzoneModerationDefs.ModEventEmail>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventEmail,
    )
  ) {
    eventItem = <Email modEvent={modEvent} />
  }
  if (
    isModEventType<ToolsOzoneModerationDefs.ModEventPriorityScore>(
      modEvent,
      ToolsOzoneModerationDefs.isModEventPriorityScore,
    )
  ) {
    eventItem = <PriorityScore modEvent={modEvent} />
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
        {typeof previewSubject === 'string' && showContentPreview && (
          <div className="border-t dark:border-gray-500 mt-2">
            <PreviewCard subject={previewSubject} />
          </div>
        )}
      </Card>
    </div>
  )
}
