import { ToolsOzoneServerGetConfig, ToolsOzoneTeamDefs } from '@atproto/api'
import client from './client'

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
    canManageTeam: boolean
    canTakedownFeedGenerators: boolean
    canDivertBlob: boolean
  }
}

export const parseServerConfig = (
  config: ToolsOzoneServerGetConfig.Response['data'],
): ServerConfig => {
  const isAdmin = config.viewer?.role === ToolsOzoneTeamDefs.ROLEADMIN
  const isModerator =
    isAdmin || config.viewer?.role === ToolsOzoneTeamDefs.ROLEMODERATOR

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
      canManageTeam: isAdmin,
      canTakedownFeedGenerators: isAdmin,
      canDivertBlob: !!config.blobDivert?.url && isModerator,
    },
  }
}

export const checkPermission = (
  permission: keyof ServerConfig['permissions'],
) => {
  try {
    return client.session.serverConfig?.permissions[permission]
  } catch (e) {
    // Trying to access client.session while unauthenticated throws an error in which case,
    // we can safely assume the user does not have the permission
    return false
  }
}
