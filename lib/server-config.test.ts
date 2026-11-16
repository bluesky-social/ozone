import { describe, expect, it } from 'vitest'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { parseServerConfig } from './server-config'

describe('moderator activity access', () => {
  it('allows admins to view history and statistics', () => {
    expect(
      parseServerConfig({ viewer: { role: ToolsOzoneTeamDefs.ROLEADMIN } })
        .permissions,
    ).toMatchObject({
      canViewModeratorActivity: true,
      canViewModeratorStats: true,
    })
  })
  it('denies other roles and missing viewer roles', () => {
    for (const role of [
      ToolsOzoneTeamDefs.ROLEMODERATOR,
      ToolsOzoneTeamDefs.ROLETRIAGE,
      ToolsOzoneTeamDefs.ROLEVERIFIER,
      undefined,
    ]) {
      expect(parseServerConfig({ viewer: { role } }).permissions).toMatchObject(
        {
          canViewModeratorActivity: false,
          canViewModeratorStats: false,
        },
      )
    }
    expect(parseServerConfig({}).permissions.canViewModeratorActivity).toBe(
      false,
    )
  })
})
