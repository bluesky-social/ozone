import type { Agent, ToolsOzoneTeamDefs } from '@atproto/api'

export async function getQueueMembers(
  agent: Agent,
  queueId: number,
  signal?: AbortSignal,
) {
  const members = new Map<string, ToolsOzoneTeamDefs.Member>()
  let cursor: string | undefined
  do {
    const { data } = await agent.tools.ozone.queue.getAssignments(
      { queueIds: [queueId], onlyActive: true, limit: 100, cursor },
      { signal },
    )
    for (const assignment of data.assignments) {
      if (assignment.moderator) {
        members.set(assignment.did, assignment.moderator)
      }
    }
    cursor = data.cursor
  } while (cursor)
  return [...members.values()]
}

export function filterQueueMembers(
  members: ToolsOzoneTeamDefs.Member[],
  { q, roles, disabled }: { q: string; roles: string[]; disabled?: boolean },
) {
  const query = q.toLowerCase()
  return members.filter((member) => {
    if (!roles.includes(member.role)) return false
    if (disabled !== undefined && !!member.disabled !== disabled) return false
    return (
      !query ||
      [member.did, member.profile?.handle, member.profile?.displayName].some(
        (value) => value?.toLowerCase().includes(query),
      )
    )
  })
}
