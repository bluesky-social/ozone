import {
  LabelChip,
  LabelList,
  displayLabel,
  getLabelGroupInfo,
  unFlagSelfLabel,
} from '@/common/labels'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { MOD_EVENTS } from './constants'
import { ItemTitle } from './ItemTitle'

const Comment = ({
  modEvent,
}: {
  modEvent: ComAtprotoAdminDefs.ModEventView & {
    event:
      | ComAtprotoAdminDefs.ModEventEscalate
      | ComAtprotoAdminDefs.ModEventAcknowledge
      | ComAtprotoAdminDefs.ModEventComment
  }
}) => {
  return (
    <div className="shadow bg-white rounded-sm p-2">
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
    </div>
  )
}

const Email = ({
  modEvent,
}: {
  modEvent: {
    event: ComAtprotoAdminDefs.ModEventEmail
  } & ComAtprotoAdminDefs.ModEventView
}) => {
  return (
    <div className="shadow bg-white rounded-sm p-2">
      <p className="text-gray-500">
        By{' '}
        {modEvent.creatorHandle
          ? `@${modEvent.creatorHandle}`
          : modEvent.createdBy}
      </p>
      {modEvent.event.subjectLine && (
        <p>Subject: {modEvent.event.subjectLine}</p>
      )}
    </div>
  )
}

const Report = ({
  modEvent,
}: {
  modEvent: {
    event: ComAtprotoAdminDefs.ModEventReport
  } & ComAtprotoAdminDefs.ModEventView
}) => {
  return (
    <div className="shadow bg-white rounded-sm p-2">
      <p className="flex justify-between">
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
        {modEvent.event.reportType && (
          <ReasonBadge reasonType={modEvent.event.reportType} />
        )}
      </p>
      {modEvent.event.comment && (
        <p className="mt-1">{modEvent.event.comment}</p>
      )}
    </div>
  )
}

const TakedownOrMute = ({
  modEvent,
}: {
  modEvent: {
    event:
      | ComAtprotoAdminDefs.ModEventTakedown
      | ComAtprotoAdminDefs.ModEventMute
  } & ComAtprotoAdminDefs.ModEventView
}) => {
  const expiresAt = getExpiresAtFromEvent(modEvent)
  return (
    <div className="shadow bg-white rounded-sm p-2">
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
    </div>
  )
}

const Label = ({
  modEvent,
}: {
  modEvent: {
    event: ComAtprotoAdminDefs.ModEventLabel
  } & ComAtprotoAdminDefs.ModEventView
}) => {
  return (
    <div className="shadow-sm bg-white rounded-sm p-2">
      <p>
        <span>
          By{' '}
          {modEvent.creatorHandle
            ? `@${modEvent.creatorHandle}`
            : modEvent.createdBy}
        </span>
      </p>
      {!!modEvent.event.createLabelVals?.length && (
        <LabelList>
          <span>Added: </span>
          {modEvent.event.createLabelVals.map((label) => {
            const labelGroup = getLabelGroupInfo(unFlagSelfLabel(label))
            return (
              <LabelChip key={label} style={{ color: labelGroup.color }}>
                {displayLabel(label)}
              </LabelChip>
            )
          })}
        </LabelList>
      )}
      {!!modEvent.event.negateLabelVals?.length && (
        <LabelList>
          <span>Removed: </span>
          {modEvent.event.negateLabelVals.map((label) => {
            const labelGroup = getLabelGroupInfo(unFlagSelfLabel(label))
            return (
              <LabelChip key={label} style={{ color: labelGroup.color }}>
                {displayLabel(label)}
              </LabelChip>
            )
          })}
        </LabelList>
      )}
    </div>
  )
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const getExpiresAtFromEvent = (modEvent: ComAtprotoAdminDefs.ModEventView) => {
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
}: {
  modEvent: ComAtprotoAdminDefs.ModEventView
  showContentDetails: boolean
}) => {
  let eventItem: JSX.Element = <p>{modEvent.event.$type as string}</p>
  if (
    ComAtprotoAdminDefs.isModEventAcknowledge(modEvent.event) ||
    ComAtprotoAdminDefs.isModEventEscalate(modEvent.event) ||
    ComAtprotoAdminDefs.isModEventComment(modEvent.event) ||
    ComAtprotoAdminDefs.isModEventUnmute(modEvent.event) ||
    ComAtprotoAdminDefs.isModEventReverseTakedown(modEvent.event)
  ) {
    eventItem = <Comment modEvent={modEvent} />
  }
  if (
    ComAtprotoAdminDefs.isModEventTakedown(modEvent.event) ||
    ComAtprotoAdminDefs.isModEventMute(modEvent.event)
  ) {
    eventItem = <TakedownOrMute modEvent={modEvent} />
  }
  if (modEvent.event.$type === MOD_EVENTS.REPORT) {
    //@ts-ignore
    eventItem = <Report modEvent={modEvent} />
  }
  if (ComAtprotoAdminDefs.isModEventLabel(modEvent.event)) {
    //@ts-ignore
    eventItem = <Label modEvent={modEvent} />
  }
  if (ComAtprotoAdminDefs.isModEventEmail(modEvent.event)) {
    //@ts-ignore
    eventItem = <Email modEvent={modEvent} />
  }
  return (
    <div className="mt-4">
      <ItemTitle {...{ modEvent, showContentDetails }} />
      {eventItem}
    </div>
  )
}
