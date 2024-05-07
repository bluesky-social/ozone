import { LabelChip } from '@/common/labels'
import { ToolsOzoneModeratorDefs } from '@atproto/api'

export enum ModeratorRoles {
  Admin = 'tools.ozone.moderator.defs#modRoleAdmin',
  Moderator = 'tools.ozone.moderator.defs#modRoleModerator',
  Triage = 'tools.ozone.moderator.defs#modRoleTriage',
}

export const ModeratorRoleNames = {
  [ModeratorRoles.Admin]: 'Admin',
  [ModeratorRoles.Moderator]: 'Moderator',
  [ModeratorRoles.Triage]: 'Triage',
}

const getRoleText = (role: ToolsOzoneModeratorDefs.User['role']) => {
  // TODO: Figure out why these start with lex: and how to handle them
  if (role.endsWith(ModeratorRoles.Admin)) {
    return ModeratorRoleNames[ModeratorRoles.Admin]
  }
  if (role.endsWith(ModeratorRoles.Moderator)) {
    return ModeratorRoleNames[ModeratorRoles.Moderator]
  }
  if (role.endsWith(ModeratorRoles.Triage)) {
    return ModeratorRoleNames[ModeratorRoles.Triage]
  }
  return 'Unknown'
}

export function RoleTag({
  role,
}: {
  role: ToolsOzoneModeratorDefs.User['role']
}) {
  return <LabelChip>{getRoleText(role)}</LabelChip>
}
