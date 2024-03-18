import client from '@/lib/client'
import { AppBskyLabelerDefs, ComAtprotoLabelDefs } from '@atproto/api'
import { Popover, Transition } from '@headlessui/react'
import { ExclamationCircleIcon } from '@heroicons/react/20/solid'
import { ClockIcon, CogIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { ComponentProps, Fragment } from 'react'
import { useLabelerServiceDef } from './useLabelerDefinition'
import { getLabelGroupInfo, toLabelVal } from './util'

export function LabelList(props: ComponentProps<'div'>) {
  const { className = '', ...others } = props
  return (
    <div
      className={`items-center gap-x-1 text-sm leading-6 text-gray-900 ${className}`}
      {...others}
    />
  )
}

export function LabelListEmpty(props: ComponentProps<'div'>) {
  const { className = '', children, ...others } = props
  return (
    <div className={`text-sm text-gray-400 ${className}`} {...others}>
      None {children}
    </div>
  )
}

export function LabelChip(props: ComponentProps<'span'>) {
  const { className = '', ...others } = props
  return (
    <span
      className={`inline-flex mx-1 items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 font-semibold ${className}`}
      {...others}
    />
  )
}

/*
- Make sure the color coding is right based on labeler service def
- Make sure self labels are flagged
- Make sure expiry is flagged
- Make sure labeler definition is displayed in popover
*/
export const ModerationLabel = ({
  label,
  recordAuthorDid,
  ...props
}: {
  label: ComAtprotoLabelDefs.Label
  recordAuthorDid?: string
} & ComponentProps<'span'>) => {
  const labelerServiceDef = useLabelerServiceDef(label.src)
  const labelGroup = getLabelGroupInfo(label.val)

  const labelVal = toLabelVal(label, recordAuthorDid)
  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={`${open ? 'text-white' : 'text-white/90'}`}
          >
            <LabelChip {...props}>
              {label.exp && <ClockIcon className="h-3 w-3 mr-1" />}
              {labelVal}
            </LabelChip>
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 z-10 mt-3 w-72 max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl">
              <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black/5">
                <div className="relative bg-white">
                  <LabelDefinition
                    labelerServiceDef={labelerServiceDef}
                    label={label}
                  />
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export const LabelDefinition = ({
  labelerServiceDef,
  label,
}: {
  label: ComAtprotoLabelDefs.Label
  labelerServiceDef: AppBskyLabelerDefs.LabelerViewDetailed & {
    policies: AppBskyLabelerDefs.LabelerViewDetailed['policies'] & {
      definitionById: Record<string, ComAtprotoLabelDefs.LabelValueDefinition>
    }
  }
}) => {
  if (!labelerServiceDef) {
    return <h3>Sorry, no details found about the labeler</h3>
  }

  // Get the english language definition
  const labelDef = labelerServiceDef.policies.definitionById[label.val]
  const labelDefInLocale = labelDef?.locales.find(({ lang }) => lang === 'en')
  const hasPreferences =
    labelDef?.blurs || labelDef?.severity || labelDef?.defaultSetting

  const temporaryWarning = label.exp && (
    <div className="flex flex-row items-center leading-4">
      <p className='italic'>This is a temporary label and will expire at {label.exp}</p>
      <ClockIcon className="h-6 w-6 mr-1" />
    </div>
  )

  return (
    <>
      <div className="px-4 py-3">
        <h3 className="font-semibold text-gray-700 pb-1">
          {labelerServiceDef.creator.displayName}
        </h3>
        <p className="leading-4 text-gray-600 pb-3">
          {labelerServiceDef.creator.description}
        </p>
        {temporaryWarning}
      </div>

      <div className="bg-gray-50 px-4 py-3">
        {labelDef ? (
          <>
            <h4 className="font-semibold text-gray-700">
              {labelDefInLocale?.name || label.val}
            </h4>
            {labelDefInLocale?.description && (
              <p className="leading-4 text-gray-600">
                {labelDefInLocale.description}
              </p>
            )}
            {hasPreferences && (
              <ul className="pt-2 text-gray-600">
                {labelDef.blurs && (
                  <li className="flex flex-row items-center">
                    <EyeSlashIcon className="h-4 w-4 mr-1" /> Blurs{' '}
                    {labelDef.blurs}
                  </li>
                )}
                {labelDef.severity && (
                  <li className="flex flex-row items-center">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Severity{' '}
                    {labelDef.severity}
                  </li>
                )}
                {labelDef.defaultSetting && (
                  <li className="flex flex-row items-center">
                    <CogIcon className="h-4 w-4 mr-1" />
                    {`Default setting ${labelDef.defaultSetting}`}
                  </li>
                )}
              </ul>
            )}
          </>
        ) : (
          <h4 className="leading-4">
            <b>{label.val}</b> label does not have a custom definition
          </h4>
        )}
      </div>
    </>
  )
}
