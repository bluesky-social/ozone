import { OZONE_SERVICE_DID } from '@/lib/constants'
import { buildBlueSkyAppUrl, classNames } from '@/lib/util'
import { AppBskyActorDefs, ComAtprotoLabelDefs } from '@atproto/api'
import { Popover, Transition } from '@headlessui/react'
import { ExclamationCircleIcon } from '@heroicons/react/20/solid'
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  CogIcon,
  EyeSlashIcon,
  HomeIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { ComponentProps, Fragment } from 'react'
import { useLabelerDefinitionQuery } from './useLabelerDefinition'
import { isSelfLabel, toLabelVal } from './util'

export function LabelList(props: ComponentProps<'div'>) {
  const { className = '', ...others } = props
  return (
    <div
      data-cy="label-list"
      className={`flex flex-row items-center gap-x-1 text-sm leading-6 text-gray-900 ${className}`}
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

const getLabelChipClassNames = ({
  label,
  isSelfLabeled = false,
  labelDefFromService,
}: {
  label: ComAtprotoLabelDefs.Label
  isSelfLabeled: boolean
  labelDefFromService?: ComAtprotoLabelDefs.LabelValueDefinition
}) => {
  const wrapper: string[] = []
  const text: string[] = []

  if (isSelfLabeled) {
    wrapper.push('bg-green-200 text-green-700')
    text.push('text-green-700')
  } else if (labelDefFromService) {
    if (labelDefFromService.severity === 'alert') {
      wrapper.push('bg-red-200 text-red-700')
      text.push('text-red-700')
    } else if (labelDefFromService.blurs === 'content') {
      wrapper.push('bg-indigo-200 text-indigo-700')
      text.push('text-indigo-700')
    } else if (labelDefFromService.blurs === 'media') {
      wrapper.push('bg-yellow-200 text-yellow-700')
      text.push('text-yellow-700')
    }
  }

  return { wrapper: classNames(...wrapper), text: classNames(...text) }
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
  className,
  ...props
}: {
  label: ComAtprotoLabelDefs.Label
  recordAuthorDid?: string
} & ComponentProps<'span'>) => {
  const { data: labelerServiceDef } = useLabelerDefinitionQuery(label.src)
  const isFromCurrentService = label.src === OZONE_SERVICE_DID

  const labelVal = toLabelVal(label, recordAuthorDid)
  const isSelfLabeled = isSelfLabel(labelVal)
  const labelDefFromService =
    labelerServiceDef?.policies.definitionById?.[label.val]
  const labelerProfile = labelerServiceDef?.creator
  const labelClassNames = getLabelChipClassNames({
    label,
    isSelfLabeled,
    labelDefFromService,
  })

  return (
    <Popover className="relative z-20">
      {() => (
        <>
          <Popover.Button className="ring-none">
            <LabelChip
              className={classNames(...[labelClassNames.wrapper, className])}
              {...props}
            >
              {isFromCurrentService && (
                <HomeIcon
                  className={classNames(
                    ...['h-3 w-3 mr-1', labelClassNames.text],
                  )}
                />
              )}
              {isSelfLabeled && (
                <TagIcon
                  className={classNames(
                    ...['h-3 w-3 mr-1', labelClassNames.text],
                  )}
                />
              )}
              {label.exp && (
                <ClockIcon
                  className={classNames(
                    ...['h-3 w-3 mr-1', labelClassNames.text],
                  )}
                />
              )}
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
            <Popover.Panel className="absolute left-2 z-20 mt-3 w-72 transform lg:max-w-3xl max-w-sm">
              <div className="overflow-hidden rounded-lg shadow-lg">
                <div className="relative bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-50">
                  <LabelDefinition
                    labelDefFromService={labelDefFromService}
                    isFromCurrentService={isFromCurrentService}
                    labelerProfile={labelerProfile}
                    isSelfLabeled={isSelfLabeled}
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
  labelDefFromService,
  isFromCurrentService,
  isSelfLabeled,
  labelerProfile,
  label,
}: {
  labelerProfile?: AppBskyActorDefs.ProfileView
  isSelfLabeled: boolean
  isFromCurrentService: boolean
  label: ComAtprotoLabelDefs.Label
  labelDefFromService?: ComAtprotoLabelDefs.LabelValueDefinition
}) => {
  if (isSelfLabeled) {
    return (
      <div className="px-4 py-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-100 pb-1 flex flex-row items-center">
          <TagIcon className="h-4 w-4 mr-1" />
          Self label
        </h3>
        <p className="leading-4 pb-3">
          This label was added by the the author of the content. Moderators are
          not allowed to change this.
        </p>
      </div>
    )
  }

  if (!labelDefFromService && !isFromCurrentService) {
    return (
      <div className="px-4 py-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-100 pb-1">
          Sorry, no details found about the labeler
        </h3>
      </div>
    )
  }

  // Get the english language definition
  const labelDefInLocale = labelDefFromService?.locales.find(
    ({ lang }) => lang === 'en',
  )
  const hasPreferences =
    labelDefFromService?.blurs ||
    labelDefFromService?.severity ||
    labelDefFromService?.defaultSetting

  const temporaryWarning = label.exp && (
    <div className="flex flex-row items-start leading-4">
      <ClockIcon className="h-4 w-4 mr-1" />
      <p className="italic">
        This is a temporary label and will expire at {label.exp}
      </p>
    </div>
  )

  const currentServiceReminder = isFromCurrentService && (
    <div className="flex flex-row items-start leading-4">
      <HomeIcon className="h-4 w-4 mr-1" />
      <p className="italic">This label is from your own labeling service</p>
    </div>
  )

  return (
    <>
      <div className="px-4 py-3">
        {labelerProfile && (
          <>
            <h3 className="font-semibold text-gray-700 dark:text-gray-100 pb-1">
              <a
                href={buildBlueSkyAppUrl({ did: labelerProfile.did })}
                target="_blank"
                className="underline flex flex-row items-center"
              >
                {labelerProfile.displayName}
                <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1" />
              </a>
            </h3>
            <p className="leading-4 pb-3">{labelerProfile.description}</p>
          </>
        )}
        {currentServiceReminder}
        {temporaryWarning}
      </div>

      <div className="bg-gray-50 dark:bg-slate-600 px-4 py-3">
        {labelDefFromService ? (
          <>
            <h4 className="font-semibold text-gray-700 dark:text-gray-100">
              {labelDefInLocale?.name || label.val}
            </h4>
            {labelDefInLocale?.description && (
              <p className="leading-4">{labelDefInLocale.description}</p>
            )}
            {hasPreferences && (
              <ul className="pt-2">
                {labelDefFromService.blurs ? (
                  <li className="flex flex-row items-center">
                    <EyeSlashIcon className="h-4 w-4 mr-1" /> Blurs{' '}
                    {labelDefFromService.blurs}
                  </li>
                ) : null}
                {labelDefFromService.severity ? (
                  <li className="flex flex-row items-center">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Severity{' '}
                    {labelDefFromService.severity}
                  </li>
                ) : null}
                {labelDefFromService.defaultSetting ? (
                  <li className="flex flex-row items-center">
                    <CogIcon className="h-4 w-4 mr-1" />
                    {`Default setting ${labelDefFromService.defaultSetting}`}
                  </li>
                ) : null}
              </ul>
            )}
          </>
        ) : (
          <h4 className="leading-4">
            <b>{label.val}</b> label does not have a custom definition. Users
            might be able to configure the behavior of the label in app.
          </h4>
        )}
      </div>
    </>
  )
}
