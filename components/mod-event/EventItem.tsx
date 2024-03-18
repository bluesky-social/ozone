import { Card } from '@/common/Card'
import {
  LabelChip,
  LabelList,
  displayLabel,
  getLabelGroupInfo,
  unFlagSelfLabel,
  ModerationLabel,
} from '@/common/labels'
import { OZONE_SERVICE_DID } from '@/lib/constants'
import { ReasonBadge } from '@/reports/ReasonBadge'
import {
  ToolsOzoneModerationDefs,
  ComAtprotoModerationDefs,
} from '@atproto/api'
import { MOD_EVENTS } from './constants'
import { ItemTitle } from './ItemTitle'

const Comment = ({
  modEvent,
}: {
  modEvent: ToolsOzoneModerationDefs.ModEventView & {
    event:
      | ToolsOzoneModerationDefs.ModEventEscalate
      | ToolsOzoneModerationDefs.ModEventAcknowledge
      | ToolsOzoneModerationDefs.ModEventComment
  }
}) => {
  return (
    <Card>
      <p className="flex justify-between text-gray-500">
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
        {!!modEvent.event.sticky && (
          <span className="bg-gray-100 text-gray-800 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ">
            Sticky
          </span>
        )}
      </p>
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
    </Card>
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
    <Card>
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
    </Card>
  )
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
    <Card>
      <p className="flex justify-between">
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
        {modEvent.event.reportType && !isAppeal && (
          <ReasonBadge reasonType={modEvent.event.reportType} />
        )}
      </p>
      {modEvent.event.comment && (
        <p className="mt-1">{modEvent.event.comment}</p>
      )}
    </Card>
  )
}

const TakedownOrMute = ({
  modEvent,
}: {
  modEvent: {
    event:
      | ToolsOzoneModerationDefs.ModEventTakedown
      | ToolsOzoneModerationDefs.ModEventMute
  } & ToolsOzoneModerationDefs.ModEventView
}) => {
  const expiresAt = getExpiresAtFromEvent(modEvent)
  return (
    <Card>
      <p className="flex justify-between">
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
        {!!modEvent.event.durationInHours && (
          <span className="bg-gray-100 text-gray-800 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ">
            {modEvent.event.durationInHours}hrs
          </span>
        )}
      </p>
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
    </Card>
  )
}

const EventLabels = ({
  header,
  labels,
}: {
  header: string
  labels?: string[]
}) => {
  if (!labels?.length) return null
  return (
    <LabelList>
      <span className="text-gray-500 dark:text-gray-50">{header}</span>
      {labels.map((label) => {
        return (
          <ModerationLabel
            key={label}
            label={{ val: label, src: OZONE_SERVICE_DID, uri: '', cts: '' }}
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
    <Card>
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
    </Card>
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
    <Card>
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
      <EventLabels header="Added: " labels={modEvent.event.add} />
      <EventLabels header="Removed: " labels={modEvent.event.remove} />
    </Card>
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
}: {
  modEvent: ToolsOzoneModerationDefs.ModEventView
  showContentDetails: boolean
  showContentAuthor: boolean
}) => {
  let eventItem: JSX.Element = <p>{modEvent.event.$type as string}</p>
  if (
    ToolsOzoneModerationDefs.isModEventAcknowledge(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventEscalate(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventComment(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventUnmute(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventResolveAppeal(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventReverseTakedown(modEvent.event) ||
    // This is temporary since the api package with this new type check is not yet published
    modEvent.event.$type === 'tools.ozone.moderation.defs#modEventDivert'
  ) {
    eventItem = <Comment modEvent={modEvent} />
  }
  if (
    ToolsOzoneModerationDefs.isModEventTakedown(modEvent.event) ||
    ToolsOzoneModerationDefs.isModEventMute(modEvent.event)
  ) {
    eventItem = <TakedownOrMute modEvent={modEvent} />
  }
  if (modEvent.event.$type === MOD_EVENTS.REPORT) {
    //@ts-ignore
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
  return (
    <div className="mt-4">
      <ItemTitle {...{ modEvent, showContentDetails, showContentAuthor }} />
      {eventItem}
    </div>
  )
}
