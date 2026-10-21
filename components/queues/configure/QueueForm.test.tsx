import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import queues from '../../../cypress/fixtures/queues.json'
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
    expect(adminMarkup).toContain(
      'Enabling this will only allow assigned moderators to access it. Admins can always access it.',
    )
    expect(adminMarkup).not.toContain('About strict access')
    config.role = ToolsOzoneTeamDefs.ROLEMODERATOR
    const moderatorMarkup = renderToStaticMarkup(
      <QueueForm onCancel={() => {}} onSuccess={() => {}} />,
    )
    expect(moderatorMarkup).not.toContain('id="strictAccess"')
    expect(moderatorMarkup).toContain('Only admins can change strict access.')
    config.role = ToolsOzoneTeamDefs.ROLEADMIN
  })
  it('exposes creation controls with legacy defaults', () => {
    const markup = renderToStaticMarkup(
      <QueueForm onCancel={() => {}} onSuccess={() => {}} />,
    )
    expect(markup).toContain('id="reporterTags"')
    expect(markup).toContain('id="accountTags"')
    expect(markup).not.toContain('name="routingPriority"')
    expect(markup).toContain('lowest matching queue ID wins')
    expect(markup).toContain('Select every available type')
    expect(markup).toContain('data-cy="report-types-input"')
    expect(markup).toContain('No reports will match this queue automatically.')
  })

  it('shows existing tag criteria read-only while retaining ordinary edit controls', () => {
    const queue = {
      ...queues.spamQueue,
      reporterTags: ['team:alpha'],
      accountTags: ['needs-review'],
      reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
    }
    const markup = renderToStaticMarkup(
      <QueueForm queue={queue} onCancel={() => {}} onSuccess={() => {}} />,
    )
    for (const field of ['reporterTags', 'accountTags']) {
      expect(markup).not.toContain(`id="${field}"`)
    }
    expect(markup).toContain('Matching criteria are read-only.')
    expect(markup).toContain('team:alpha')
    expect(markup).toContain('needs-review')
    expect(markup).toContain('Both tag conditions must match.')
    expect(markup).toContain('Spam')
    expect(markup).toContain('All configured conditions must match.')
    expect(markup).toContain('Tool destinations take precedence.')
    expect(markup).toContain('id="name"')
    expect(markup).toContain('id="description"')
    expect(markup).toContain('Save Changes')
    expect(markup).toContain('Disable Queue')
  })
})
