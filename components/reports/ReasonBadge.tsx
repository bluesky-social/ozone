import { ComAtprotoReportReasonType } from '@atproto/api'

export function ReasonBadge(props: { reasonType: string }) {
  const { reasonType } = props
  const readable = reasonType.replace('com.atproto.report.reasonType#', '')
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
  [ComAtprotoReportReasonType.SPAM]: 'bg-pink-100 text-pink-800',
  [ComAtprotoReportReasonType.OTHER]: 'bg-indigo-100 text-indigo-800',
  default: 'bg-gray-100 text-gray-800',
}
