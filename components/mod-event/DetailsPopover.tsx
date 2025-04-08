import { Fragment } from 'react'
import {
  Popover,
  Transition,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/solid'
import { MOD_EVENTS, MOD_EVENT_TITLES } from './constants'

export const ModEventDetailsPopover = ({
  modEventType,
}: {
  modEventType: string
}) => {
  return (
    <Popover className="relative">
      {() => (
        <>
          <PopoverButton className="ring-none">
            <QuestionMarkCircleIcon className="h-6 w-6 ml-2 dark:fill-teal-500" />
          </PopoverButton>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel className="absolute left-2 z-20 mt-3 w-72 transform lg:max-w-3xl max-w-sm">
              <div className="overflow-hidden rounded-lg shadow-lg">
                <div className="relative bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-50">
                  <div className="px-4 py-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-100 flex flex-row items-center">
                      {MOD_EVENT_TITLES[modEventType]}
                    </h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-600 px-4 py-3">
                    <ModEventDetails modEventType={modEventType} />
                  </div>
                </div>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

const ModEventDetails = ({ modEventType }: { modEventType: string }) => {
  if (modEventType === MOD_EVENTS.REPORT) {
    return (
      <p>
        This event will create a report on the subject. Unless the reporter is
        muted, this event will change the subject{"'"}s status to `Review
        Required`.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.ACKNOWLEDGE) {
    return (
      <p>
        This event will change the subject{"'"}s review state to <b>Reviewed</b>
        .
        <br />
        As a result, the subject will no longer be shown in the{' '}
        <b>Unresolved Queue</b>.
        <br />
        <br />
        Acknowledge event does not have any impact on the review state of a
        subject that{"'"}s already in <b>Reviewed</b> state.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.DIVERT) {
    return (
      <p>
        This event will send any and all attached images/blobs to the record to
        an external service to be scanned for policy breaking content.
        <br />
        Besides diverting the blobs, it will also emit a takedown event on the
        same subject.
        <br />
        <br />
        Divert event is only available on records that have at least one blob
        attached and you must select at least one blob before emitting the
        event.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.ESCALATE) {
    return (
      <p>
        This event will change the review state of the subject to{' '}
        <b>Escalated</b>.
        <br />
        As a result, the subject will be moved shown under the `Escalated`
        queue.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.LABEL) {
    return (
      <p>
        This event will <b>not</b> change the review state of the subject.
        <br />
        Based on your selections, it will add and/or remove labels on the
        subject.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.TAG) {
    return (
      <p>
        This event will <b>not</b> change the review state of the subject.
        <br />
        Based on your selections, it will add and/or remove tags on the subject.
        <br />
        <br />
        Tags are entirely <b>private and isolated</b> to your ozone instance.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.TAKEDOWN) {
    return (
      <p>
        This event changes the review state of the subject to <b>Takendown</b>.
        <br />
        The takedown event will be communicated with the PDS of the user and the
        Appview (if configured). However, it{"'"}s entirely upto those
        individual infrastructures to respect your action
        <br />
        <br />
        Optionally, you can choose the duration for which the takedown will
        last. If a limited period is selected, there will be a{' '}
        <b>Reverse Takedown</b> event emitted on the subject after the
        determined period.
        <br />
        <br />
        Takedown event is only available on subjects that are not already in
        taken down state.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.REVERSE_TAKEDOWN) {
    return (
      <p>
        This event changes the review state of a Takendown subject to Reviewed.
        <br />
        The reversal will be communicated with the PDS of the user and the
        Appview (if configured). However, it{"'"}s entirely upto those
        individual infrastructures to respect your action
        <br />
        <br />
        This is only available on subjects that are already in takendown state.
        state.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.MUTE) {
    return (
      <p>
        This event does <b>not</b> change the review state of the subject. It
        will simply hide the subject from all queues.
        <br />
        <br />
        Mutes are only applicable for a limited duration. After the selected
        duration, there will be a <b>Unmute</b> event emitted on the subject.
        <br />
        <br />
        All incoming events on the subject will still work as usual. You can
        always choose to see muted subjects in the queue.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.UNMUTE) {
    return (
      <p>
        This event does <b>not</b> change the review state of the subject. It
        simply unmutes a previously muted subject.
        <br />
        <br />
        This is only available on subjects that are already muted.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.MUTE_REPORTER) {
    return (
      <p>
        This event does <b>not</b> change the review state of the subject. It
        simply marks a user{"'"}s reports to be muted.
        <br />
        <br />
        All incoming reports from muted reporter will be logged but will not be
        allowed to change the review state of the subject being reported.
        <br />
        <br />
        This is only available on repo/DID subjects that are not already muted
        from reporting. Reporters can only be muted for a limited period of
        time.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.UNMUTE_REPORTER) {
    return (
      <p>
        This event does <b>not</b> change the review state of the subject. It
        simply unmutes a previously muted reporter.
        <br />
        <br />
        This is only available on repo/DID subjects that are already muted from
        reporting.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.APPEAL) {
    return (
      <p>
        This event appeals a previously made moderation decision on a subject.
        <br />
        Behind the scenes, appeals are just a Report event with a special reason
        type.
        <br />
        <br />
        Appeals will need to be explicitly resolved via a <b>
          Resolve Appeal
        </b>{' '}
        event
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.RESOLVE_APPEAL) {
    return (
      <p>
        This event resolves appeal on a subject. This is only available on
        subjects that received at least one appeal report event.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.DISABLE_DMS) {
    return (
      <p>
        This event requests the configured DM service on your ozone instance to
        <b> disable DM</b> feature for a user.
        <br />
        <br />
        This is only available on repo/DID subject that are not already marked
        to disable DMs.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.ENABLE_DMS) {
    return (
      <p>
        This event requests the configured DM service on your ozone instance to
        <b>enable DM</b> feature for a user.
        <br />
        <br />
        This is only available on repo/DID subjects that were already marked to
        disable DMs.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.DISABLE_VIDEO_UPLOAD) {
    return (
      <p>
        This event requests the configured video service on your ozone instance
        to
        <b> disable video upload</b> feature for a user.
        <br />
        <br />
        This is only available on repo/DID subject that are not already marked
        to disable video upload.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.ENABLE_VIDEO_UPLOAD) {
    return (
      <p>
        This event requests the configured video service on your ozone instance
        to
        <b>enable video upload</b> feature for a user.
        <br />
        <br />
        This is only available on repo/DID subjects that were already marked to
        disable video upload.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.COMMENT) {
    return (
      <p>
        This event adds a comment to the subject and does <b>not</b> change the
        review state.
        <br />
        <br />
        Optionally, you can choose to make the comment sticky and sticky
        comments are shown in various places in the UI along with the subject.
      </p>
    )
  }

  if (modEventType === MOD_EVENTS.EMAIL) {
    return (
      <p>
        This event sends email to users. Sending the email depends on PDS
        implementation and your labeler configuration. Not all labelers can send
        emails to all users on the network.
      </p>
    )
  }

  return (
    <p>
      Sorry, this event is not well defined and probably will not have any
      impact
    </p>
  )
}
