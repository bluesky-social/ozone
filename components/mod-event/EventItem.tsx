import client from '@/lib/client'
import { Card } from '@/common/Card'
import { LabelChip, LabelList, ModerationLabel } from '@/common/labels'
import { ReasonBadge } from '@/reports/ReasonBadge'
import {
  ToolsOzoneModerationDefs,
  ComAtprotoModerationDefs,
  ChatBskyConvoDefs,
} from '@atproto/api'
import { ItemTitle } from './ItemTitle'
import { MessageContext } from '@/dms/MessageContext'
import { PreviewCard } from '@/common/PreviewCard'

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
  modEvent: ToolsOzoneModerationDefs.ModEventView & {
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
      {modEvent.event.comment && <p>{modEvent.event.comment}</p>}
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

function isMessageSubject(
  subject: ToolsOzoneModerationDefs.ModEventView['subject'],
): subject is ChatBskyConvoDefs.MessageRef {
  return subject.messageId !== undefined
}

const Report = ({
  modEvent,
}: {
  modEvent: {
    event: ToolsOzoneModerationDefs.ModEventReport
  } & ToolsOzoneModerationDefs.ModEventView
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
        <p className="mt-1">{modEvent.event.comment}</p>
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
        <p className="mt-1">Until {dateFormatter.format(expiresAt)}</p>
      )}
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
  if (!labels?.length) return null
  return (
    <LabelList>
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
              src: client.getServiceDid() || '',
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
  modEvent: {
    event: ToolsOzoneModerationDefs.ModEventLabel
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
      <EventLabels header="Added: " labels={modEvent.event.createLabelVals} />
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
  modEvent: ToolsOzoneModerationDefs.ModEventView
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
  if (ToolsOzoneModerationDefs.isModEventReport(modEvent.event)) {
    // @ts-ignore
    eventItem = <Report modEvent={modEvent} />
  }
  if (ToolsOzoneModerationDefs.isModEventLabel(modEvent.event)) {
    //@ts-ignore
    eventItem = <Label modEvent={modEvent} />
  }
  if (ToolsOzoneModerationDefs.isModEventTag(modEvent.event)) {
    //@ts-ignore
    eventItem = <Tag modEvent={modEvent} />
  }
  if (ToolsOzoneModerationDefs.isModEventEmail(modEvent.event)) {
    //@ts-ignore
    eventItem = <Email modEvent={modEvent} />
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
