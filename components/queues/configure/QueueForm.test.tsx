import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { QueueForm } from './QueueForm'
import { ToolsOzoneTeamDefs } from '@atproto/api'

const config = vi.hoisted(() => ({ role: 'tools.ozone.team.defs#roleAdmin' }))
vi.mock('@/shell/ConfigurationContext', () => ({
  useServerConfig: () => config,
}))

vi.mock('../useQueues', () => ({
  useCreateQueue: () => ({ isLoading: false }),
  useUpdateQueue: () => ({ isLoading: false }),
}))
vi.mock('@/reports/ModerationForm/ActionPolicySelector', () => ({
  ActionPoliciesSelector: () => null,
}))
vi.mock('@/common/labels/Selector', () => ({
  LabelSelector: () => null,
}))

describe('queue configuration', () => {
  it('limits strict-access configuration to admins', () => {
    config.role = ToolsOzoneTeamDefs.ROLEADMIN
    const adminMarkup = renderToStaticMarkup(
      <QueueForm onCancel={() => {}} onSuccess={() => {}} />,
    )
    expect(adminMarkup).toContain('id="strictAccess"')
    expect(adminMarkup).toContain('aria-describedby="strictAccess-help"')
    config.role = ToolsOzoneTeamDefs.ROLEMODERATOR
    const moderatorMarkup = renderToStaticMarkup(
      <QueueForm onCancel={() => {}} onSuccess={() => {}} />,
    )
    expect(moderatorMarkup).not.toContain('id="strictAccess"')
    expect(moderatorMarkup).toContain('Only admins can change strict access.')
    config.role = ToolsOzoneTeamDefs.ROLEADMIN
  })
})
