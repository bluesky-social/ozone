import { ComAtprotoModerationDefs } from '@atproto/api'

export function ReasonBadge(props: { reasonType: string }) {
  const { reasonType } = props
  const readable = reasonType.replace('com.atproto.moderation.defs#reason', '')
  const color = reasonColors[reasonType] ?? reasonColors.default
  return (
    <span
      className={`${color} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium`}
    >
      {readable}
    </span>
  )
}
const reasonColors: Record<string, string> = {
  [ComAtprotoModerationDefs.REASONSPAM]: 'bg-pink-100 text-pink-800',
  [ComAtprotoModerationDefs.REASONOTHER]: 'bg-indigo-100 text-indigo-800',
  [ComAtprotoModerationDefs.REASONVIOLATION]: 'bg-red-100 text-red-800',
  //[ComAtprotoModerationDefs.REASONMISLEADING]: '',
  //[ComAtprotoModerationDefs.REASONSEXUAL]: '',
  //[ComAtprotoModerationDefs.REASONRUDE]: '',
  default: 'bg-gray-100 text-gray-800',
}
