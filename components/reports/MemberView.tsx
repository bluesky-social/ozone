import { ToolsOzoneTeamDefs } from '@atproto/api'
import { formatDistanceToNow } from 'date-fns'

const ROLE_LABELS: Record<string, string> = {
  'tools.ozone.team.defs#roleAdmin': 'Admin',
  'tools.ozone.team.defs#roleModerator': 'Moderator',
  'tools.ozone.team.defs#roleTriage': 'Triage',
  'tools.ozone.team.defs#roleVerifier': 'Verifier',
}

const ROLE_COLORS: Record<string, string> = {
  'tools.ozone.team.defs#roleAdmin':
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'tools.ozone.team.defs#roleModerator':
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'tools.ozone.team.defs#roleTriage':
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'tools.ozone.team.defs#roleVerifier':
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role] ?? role.split('#').pop() ?? role
  const color =
    ROLE_COLORS[role] ??
    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span
      className={`${color} inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium`}
    >
      {label}
    </span>
  )
}

export function MemberView({
  member,
  assignedAt,
  sinceLabel = 'Assigned',
  onClickDid,
}: {
  member: ToolsOzoneTeamDefs.Member
  assignedAt?: string
  sinceLabel?: string
  onClickDid?: (did: string) => void
}) {
  const profile = member.profile
  const handle = profile?.handle
  const displayName = profile?.displayName
  const avatar = profile?.avatar

  const assignedDate = assignedAt ? new Date(assignedAt) : null

  return (
    <div className="flex flex-row items-center gap-3">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={handle ?? member.did}
          className="h-7 w-7 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-semibold">
          {(displayName ?? handle ?? '?')[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-row items-center gap-1.5 flex-wrap">
          {onClickDid ? (
            <button
              type="button"
              className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate hover:underline hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => onClickDid(member.did)}
            >
              {displayName ?? (handle ? `@${handle}` : member.did)}
            </button>
          ) : (
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {displayName ?? (handle ? `@${handle}` : member.did)}
            </p>
          )}
          <RoleBadge role={member.role} />
          {member.disabled && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
              Disabled
            </span>
          )}
        </div>
        {handle && displayName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            @{handle}
          </p>
        )}
        {assignedDate && !isNaN(assignedDate.getTime()) && (
          <p
            className="text-xs text-gray-500 dark:text-gray-400"
            title={assignedDate.toLocaleString()}
          >
            {sinceLabel} {formatDistanceToNow(assignedDate, { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  )
}
