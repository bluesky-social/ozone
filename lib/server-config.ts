import { ToolsOzoneServerGetConfig, ToolsOzoneTeamDefs } from '@atproto/api'

export type ServerConfig = {
  pds?: string
  appview?: string
  blobDivert?: string
  chat?: string
  role?: ToolsOzoneServerGetConfig.ViewerConfig['role']
  verifierDid?: string
  permissions: {
    canManageTemplates: boolean
    canTakedown: boolean
    canLabel: boolean
    canManageChat: boolean
    canSendEmail: boolean
    canManageTeam: boolean
    canTakedownFeedGenerators: boolean
    canDivertBlob: boolean
    canManageSets: boolean
    canVerify: boolean
  }
}

export type PermissionName = keyof ServerConfig['permissions']

export const parseServerConfig = (
  config: ToolsOzoneServerGetConfig.OutputSchema,
): ServerConfig => {
  const isAdmin = config.viewer?.role === ToolsOzoneTeamDefs.ROLEADMIN
  const isModerator =
    isAdmin || config.viewer?.role === ToolsOzoneTeamDefs.ROLEMODERATOR
  const isVerifier =
    isAdmin || config.viewer?.role === ToolsOzoneTeamDefs.ROLEVERIFIER

  return {
    pds: config.pds?.url,
    blobDivert: config.blobDivert?.url,
    appview: config.appview?.url,
    chat: config.chat?.url,
    role: config.viewer?.role,
    verifierDid: config.verifierDid,
    permissions: {
      canManageTemplates: isModerator,
      canTakedown: !!config.pds?.url && isModerator,
      canLabel: isModerator,
      canManageChat: !!config.chat?.url && isModerator,
      canSendEmail: !!config.pds?.url && isModerator,
      canManageTeam: isAdmin,
      canTakedownFeedGenerators: isAdmin,
      canManageSets: isAdmin,
      canDivertBlob: !!config.blobDivert?.url && isModerator,
      canVerify: !!config.verifierDid && isVerifier,
    },
  }
}
