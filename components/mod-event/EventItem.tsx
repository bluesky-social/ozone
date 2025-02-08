import {
  ChatBskyConvoDefs,
  ComAtprotoModerationDefs,
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
  modEvent: ModEventViewWithDetails & {
    event:
      | ToolsOzoneModerationDefs.ModEventEscalate
      | ToolsOzoneModerationDefs.ModEventAcknowledge
      | ToolsOzoneModerationDefs.ModEventComment
      | ToolsOzoneModerationDefs.ModEventUnmute
      | ToolsOzoneModerationDefs.ModEventUnmuteReporter
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
          {!!modEvent.event.sticky && (
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
        labels={modEvent.event.createLabelVals as string[] | undefined}
      />
      <EventLabels
        header="Removed: "
        labels={modEvent.event.negateLabelVals as string[] | undefined}
      />
    </>
  )
}

const Email = ({
  modEvent,
}: {
  modEvent: ToolsOzoneModerationDefs.ModEventView & {
    event: ToolsOzoneModerationDefs.ModEventEmail
  }
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
): subject is ChatBskyConvoDefs.MessageRef {
  return subject.messageId !== undefined
}

type ModEventType<T> = { event: T } & ToolsOzoneModerationDefs.ModEventView

function isModEventType<T>(
  e: ToolsOzoneModerationDefs.ModEventView,
  predicate: (event: unknown) => event is T,
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
      | ToolsOzoneModerationDefs.ModEventTakedown
      | ToolsOzoneModerationDefs.ModEventMute
      | ToolsOzoneModerationDefs.ModEventMuteReporter
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
        labels={modEvent.event.createLabelVals as string[] | undefined}
      />
      <EventLabels
        header="Removed: "
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
  modEvent: {
    event: ToolsOzoneModerationDefs.ModEventTag
  } & ToolsOzoneModerationDefs.ModEventView
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

const getExpiresAtFromEvent = (
  modEvent: ToolsOzoneModerationDefs.ModEventView,
) => {
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
  let eventItem: JSX.Element = <p>{modEvent.event.$type as string}</p>
  if (
    ToolsOzoneModerationDefs.isModEventAcknowledge(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventEscalate(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventComment(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventUnmute(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventUnmuteReporter(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventResolveAppeal(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventReverseTakedown(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventDivert(modEvent.event)
  ) {
    eventItem = <Comment modEvent={modEvent} />
  }
  if (
    ToolsOzoneModerationDefs.isModEventTakedown(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventMute(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventMuteReporter(modEvent.event)
  ) {
    eventItem = <TakedownOrMute modEvent={modEvent} />
  }
  if (isModEventType(modEvent, ToolsOzoneModerationDefs.isModEventReport)) {
    eventItem = <Report modEvent={modEvent} />
  }
  if (isModEventType(modEvent, ToolsOzoneModerationDefs.isModEventLabel)) {
    eventItem = <Label modEvent={modEvent} />
  }
  if (isModEventType(modEvent, ToolsOzoneModerationDefs.isModEventTag)) {
    eventItem = <Tag modEvent={modEvent} />
  }
  if (isModEventType(modEvent, ToolsOzoneModerationDefs.isModEventEmail)) {
    eventItem = <Email modEvent={modEvent} />
  }
  if (
    isModEventType(modEvent, ToolsOzoneModerationDefs.isModEventPriorityScore)
  ) {
    eventItem = <PriorityScore modEvent={modEvent} />
  }
  const previewSubject = modEvent.subject.uri || modEvent.subject.did
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
