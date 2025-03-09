import { ToolsOzoneTeamDefs } from '@atproto/api'

export const MemberRoleNames = {
  [ToolsOzoneTeamDefs.ROLETRIAGE]: 'Triage',
  [ToolsOzoneTeamDefs.ROLEMODERATOR]: 'Moderator',
  [ToolsOzoneTeamDefs.ROLEADMIN]: 'Admin',
}

export const getRoleText = (role: ToolsOzoneTeamDefs.Member['role']) => {
  if (role === ToolsOzoneTeamDefs.ROLEADMIN) {
    return MemberRoleNames[ToolsOzoneTeamDefs.ROLEADMIN]
  }
  if (role === ToolsOzoneTeamDefs.ROLEMODERATOR) {
    return MemberRoleNames[ToolsOzoneTeamDefs.ROLEMODERATOR]
  }
  if (role === ToolsOzoneTeamDefs.ROLETRIAGE) {
    return MemberRoleNames[ToolsOzoneTeamDefs.ROLETRIAGE]
  }
  return 'Unknown'
}

export const isRoleSuperiorOrSame = (manager: string, target: string) => {
  if (manager === ToolsOzoneTeamDefs.ROLEADMIN) {
    return true
  }

  if (manager === ToolsOzoneTeamDefs.ROLEMODERATOR) {
    return [
      ToolsOzoneTeamDefs.ROLEMODERATOR,
      ToolsOzoneTeamDefs.ROLETRIAGE,
    ].includes(target)
  }

  if (manager === ToolsOzoneTeamDefs.ROLETRIAGE) {
    return target === ToolsOzoneTeamDefs.ROLETRIAGE
  }

  return false
}

export const createTeamPageLink = (queryParams: Record<string, string>) => {
  const url = new URL(window.location.href.replace(window.location.search, ''))

  Object.entries({ tab: 'members', ...queryParams }).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url.toString()
}
