import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import queues from '../../cypress/fixtures/queues.json'
import { QueueCard } from './QueueCard'

vi.mock('@/assignments/useAssignments', () => ({
  useQueueAssignments: () => ({ data: [] }),
}))
vi.mock('@/assignments/QueueAssignControls', () => ({
  QueueAssignControls: () => null,
}))
vi.mock('@/assignments/QueueAssigneeStatus', () => ({
  QueueAssigneeStatus: () => null,
}))
vi.mock('@/common/profileStatus/ModeratorBadge', () => ({
  ModeratorBadge: () => null,
}))
vi.mock('@/reports/stats/OverviewStats', () => ({ OverviewStats: () => null }))

describe('strict queue card', () => {
  it('provides a focusable lock with an accessible explanation only for strict queues', () => {
    const markup = renderToStaticMarkup(
      <QueueCard queue={{ ...queues.spamQueue, strictAccess: true }} />,
    )
    expect(markup).toContain('aria-label="Strict access"')
    expect(markup).toContain('aria-describedby=')
    expect(markup).toContain('role="tooltip"')
    expect(markup).toContain(
      'Strict access: visible to admins and assigned queue members.',
    )
    for (const strictAccess of [false, undefined]) {
      const unrestricted = renderToStaticMarkup(
        <QueueCard queue={{ ...queues.spamQueue, strictAccess }} />,
      )
      expect(unrestricted).not.toContain('aria-label="Strict access"')
    }
  })
})
