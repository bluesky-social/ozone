import { ToolsOzoneServerGetConfig } from '@atproto/api'

export type ServerConfig = {
  pds?: string
  appview?: string
  blobDivert?: string
  chat?: string
  permissions: {
    canManageTemplates: boolean
    canTakedown: boolean
    canLabel: boolean
    canManageChat: boolean
    canSendEmail: boolean
  }
}

export const parseServerConfig = (
  config: ToolsOzoneServerGetConfig.Response['data'],
): ServerConfig => {
  const isAdmin =
    config.viewer?.role === 'tools.ozone.moderator.defs#modRoleAdmin'
  const isModerator =
    isAdmin ||
    config.viewer?.role === 'tools.ozone.moderator.defs#modRoleModerator'

  return {
    pds: config.pds?.url,
    blobDivert: config.blobDivert?.url,
    appview: config.appview?.url,
    chat: config.chat?.url,
    permissions: {
      canManageTemplates: isModerator,
      canTakedown: !!config.pds?.url && isModerator,
      canLabel: isModerator,
      canManageChat: !!config.chat?.url && isModerator,
      canSendEmail: !!config.pds?.url && isModerator,
    },
  }
}
