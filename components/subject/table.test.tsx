import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { SubjectStatus } from '@/lib/types'
import { SubjectTable } from './table'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/reports',
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../reports/SubjectOverview', () => ({
  SubjectOverview: () => <span>Subject</span>,
}))

const status: SubjectStatus = {
  id: 1,
  subject: { $type: 'com.atproto.admin.defs#repoRef', did: 'did:plc:test' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  reviewState: ToolsOzoneModerationDefs.REVIEWOPEN,
}

function renderTable(subjectStatuses: SubjectStatus[]) {
  return renderToStaticMarkup(
    <SubjectTable
      subjectStatuses={subjectStatuses}
      showLoadMore={false}
      isInitialLoading={false}
      onLoadMore={() => {}}
    />,
  )
}

describe('reports subject table', () => {
  it('shows strikes before the takedown icon even when appealed, on both layouts', () => {
    const markup = renderTable([
      {
        ...status,
        takendown: true,
        appealed: true,
        priorityScore: 5,
        accountStrike: { activeStrikeCount: 2, totalStrikeCount: 3 },
      },
    ])

    expect(markup).not.toContain('Summary')
    expect(markup.match(/Active strikes: 2/g)).toHaveLength(2)
    expect(markup.match(/aria-label="Taken Down"/g)).toHaveLength(2)
    expect(
      markup.match(/Active strikes: 2[\s\S]*?aria-label="Taken Down"/g),
    ).toHaveLength(2)
    const cells = markup.match(/<td\b[\s\S]*?<\/td>/g) || []
    const subjectCells = cells.filter((cell) => cell.includes('Active strikes: 2'))
    expect(subjectCells).toHaveLength(2)
    for (const cell of subjectCells) {
      expect(cell.indexOf('priority score is set to 5')).toBeLessThan(
        cell.indexOf('Active strikes: 2'),
      )
      expect(cell.indexOf('aria-label="Taken Down"')).toBeLessThan(
        cell.indexOf('<span>Subject</span>'),
      )
    }
    expect(markup).not.toContain('Appealed')
  })

  it('keeps priority scores and their sorting control', () => {
    const markup = renderTable([{ ...status, priorityScore: 5 }])
    expect(markup.match(/priority score is set to 5 out of 100/g)).toHaveLength(2)
    expect(markup).toMatch(/<button[^>]*>Subject/)
    expect(markup).not.toContain('>Status<')
  })

  it('omits review-state icons for subjects that are not taken down', () => {
    for (const reviewState of [
      ToolsOzoneModerationDefs.REVIEWOPEN,
      ToolsOzoneModerationDefs.REVIEWESCALATED,
      ToolsOzoneModerationDefs.REVIEWCLOSED,
      ToolsOzoneModerationDefs.REVIEWNONE,
    ]) {
      const markup = renderTable([{ ...status, reviewState, appealed: true }])
      expect(markup).not.toContain('aria-label="Taken Down"')
      expect(markup).not.toContain('Appealed')
      expect(markup).not.toContain('Requires Review')
      expect(markup).not.toContain('Escalated')
      expect(markup).not.toContain('Reviewed</title>')
      expect(markup).not.toContain('Review N/A')
    }
  })

  it('keeps the deleted hosting indicator and fits the empty state', () => {
    const markup = renderTable([
      {
        ...status,
        hosting: {
          $type: 'tools.ozone.moderation.defs#accountHosting',
          status: 'deleted',
        },
      },
    ])
    expect(markup.match(/aria-label="Deleted"/g)).toHaveLength(2)
    expect(renderTable([])).toContain('colSpan="3"')
  })
})
