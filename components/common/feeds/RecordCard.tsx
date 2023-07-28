import { AppBskyGraphDefs, ComAtprotoAdminDefs } from '@atproto/api'
import Link from 'next/link'

export const ListRecordCard = ({
  record,
  did,
}: {
  did?: string
  record: ComAtprotoAdminDefs.RecordViewDetail
}) => {
  const { description, name, avatar, createdAt, purpose } =
    record.value as AppBskyGraphDefs.ListView
  const meta: string[] = [purpose.split('#')[1]]

  if (createdAt) {
    meta.push(new Date(createdAt as string).toLocaleString())
  }

  return (
    <div className="bg-white">
      <div className="flex w-full space-x-4">
        <div className="flex-shrink-0">
          <img
            className="h-6 w-6 rounded-full"
            src={avatar || '/img/default-avatar.jpg'}
            alt=""
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">
            <>
              <Link
                href={`/repositories/${record.uri?.replace('at://', '')}`}
                className="hover:underline"
              >
                <span className="font-bold">{name}</span>
              </Link>
              <span className="ml-1">by</span>
              <Link href={`/repositories/${record.repo.handle}`}>
                <span className="ml-1 text-gray-500">
                  @{record.repo.handle}
                </span>
              </Link>
            </>{' '}
            &nbsp;&middot;&nbsp;
            <a
              href={`https://bsky.app/profile/${did}`}
              target="_blank"
              rel="noreferrer"
            >
              Peek
            </a>
          </p>
        </div>
      </div>
      {description && (
        <p className="text-sm text-gray-500 pl-10 pb-2">{description}</p>
      )}
      {!!createdAt && (
        <p className="text-sm text-gray-500 pl-10 pb-2">{meta.join(' | ')}</p>
      )}
    </div>
  )
}
