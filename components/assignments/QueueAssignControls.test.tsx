import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { QueueAssignControls } from './QueueAssignControls'

const config = vi.hoisted(() => ({
  role: 'tools.ozone.team.defs#roleModerator',
}))
vi.mock('@/shell/ConfigurationContext', () => ({
  usePermission: () => true,
  useServerConfig: () => config,
  useLabelerAgent: () => ({ did: 'did:plc:moderator' }),
}))
vi.mock('./useAssignments', () => ({
  useAssignQueue: () => ({ mutate: vi.fn() }),
}))
vi.mock('./AssigneeSearchPopover', () => ({
  AssigneeSearchPopover: () => <button>Add member</button>,
}))

describe('queue membership controls', () => {
  it('preserves unrestricted self-assignment and prevents strict self-assignment', () => {
    config.role = ToolsOzoneTeamDefs.ROLEMODERATOR
    const unrestricted = renderToStaticMarkup(
      <QueueAssignControls queueId={1} assignments={[]} />,
    )
    expect(unrestricted).toContain('Assign to me')
    const strict = renderToStaticMarkup(
      <QueueAssignControls queueId={1} strictAccess assignments={[]} />,
    )
    expect(strict).not.toContain('Assign to me')
    expect(strict).not.toContain('Add member')
  })

  it('keeps admin grants available for strict queues', () => {
    config.role = ToolsOzoneTeamDefs.ROLEADMIN
    const markup = renderToStaticMarkup(
      <QueueAssignControls queueId={1} strictAccess assignments={[]} />,
    )
    expect(markup).toContain('Add member')
  })
})
