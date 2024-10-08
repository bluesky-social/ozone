import { LabelChip } from '@/common/labels'
import { ToolsOzoneTeamDefs } from '@atproto/api'

export const MemberRoleNames = {
  [ToolsOzoneTeamDefs.ROLETRIAGE]: 'Triage',
  [ToolsOzoneTeamDefs.ROLEMODERATOR]: 'Moderator',
  [ToolsOzoneTeamDefs.ROLEADMIN]: 'Admin',
}

const getRoleText = (role: ToolsOzoneTeamDefs.Member['role']) => {
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

export function RoleTag({ role }: { role: ToolsOzoneTeamDefs.Member['role'] }) {
  return <LabelChip>{getRoleText(role)}</LabelChip>
}
