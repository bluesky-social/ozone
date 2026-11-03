import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ToolsOzoneModerationDefs, ToolsOzoneReportDefs } from '@atproto/api'
import { ReportTable } from './table'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/reports/beta',
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../reports/SubjectOverview', () => ({
  SubjectOverview: ({ subject }: { subject: { did?: string } }) => (
    <span>{subject.did}</span>
  ),
}))

vi.mock('../tags/SubjectTagList', () => ({
  SubjectTagList: ({ tags }: { tags?: string[] }) =>
    tags?.length ? <span>Subject tags</span> : null,
}))

const subjectStatus: ToolsOzoneModerationDefs.SubjectStatusView = {
  id: 1,
  subject: { $type: 'com.atproto.admin.defs#repoRef', did: 'did:plc:subject' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  reviewState: ToolsOzoneModerationDefs.REVIEWOPEN,
  accountStrike: { activeStrikeCount: 2 },
  priorityScore: 5,
  tags: ['test'],
}

const report: ToolsOzoneReportDefs.ReportView = {
  id: 1,
  eventId: 2,
  status: 'open',
  subject: {
    type: 'account',
    subject: 'did:plc:subject',
    status: subjectStatus,
  },
  reporter: { type: 'account', subject: 'did:plc:reporter' },
  reportType: 'com.atproto.moderation.defs#reasonSpam',
  reportedBy: 'did:plc:reporter',
  createdAt: '2026-01-01T00:00:00Z',
  relatedReportCount: 3,
  isAutomated: false,
}

function renderTable(reports: ToolsOzoneReportDefs.ReportView[]) {
  return renderToStaticMarkup(
    <ReportTable
      reports={reports}
      showLoadMore={false}
      isInitialLoading={false}
      onLoadMore={() => {}}
    />,
  )
}

describe('report table subject summary', () => {
  it('shows summary details below the subject on desktop and mobile', () => {
    const markup = renderTable([report])
    const cells = markup.match(/<td\b[\s\S]*?<\/td>/g) || []
    const subjectCells = cells.filter((cell) =>
      cell.includes('Active strikes: 2'),
    )

    expect(markup).not.toContain('>Summary<')
    expect(subjectCells).toHaveLength(2)
    for (const cell of subjectCells) {
      expect(cell.indexOf('did:plc:subject')).toBeLessThan(
        cell.indexOf('Active strikes: 2'),
      )
      expect(cell).toContain('priority score is set to 5 out of 100')
      expect(cell).toContain('+3 related reports')
    }
    const desktopCell =
      subjectCells.find((cell) => cell.includes('Subject tags')) || ''
    expect(desktopCell.indexOf('Subject tags')).toBeLessThan(
      desktopCell.indexOf('Active strikes: 2'),
    )
  })

  it('shows related reports without subject status and fits the empty state', () => {
    const markup = renderTable([
      {
        ...report,
        subject: { type: 'account', subject: 'did:plc:subject' },
        relatedReportCount: 1,
      },
    ])
    expect(markup.match(/\+1 related report/g)).toHaveLength(2)
    expect(markup).not.toContain('Active strikes:')
    expect(renderTable([])).toContain('colSpan="4"')
  })

  it('shows only takedowns for subjects and reporters, including appealed takedowns', () => {
    const reporterStatus = {
      ...subjectStatus,
      subject: {
        $type: 'com.atproto.admin.defs#repoRef' as const,
        did: 'did:plc:reporter',
      },
      reviewState: ToolsOzoneModerationDefs.REVIEWESCALATED,
    }
    const withReporter = {
      ...report,
      reporter: { ...report.reporter, status: reporterStatus },
    }
    const reviewed = renderTable([withReporter])
    expect(reviewed).not.toContain('aria-label="Taken Down"')
    expect(reviewed).not.toContain('Requires Review')
    expect(reviewed).not.toContain('Escalated')

    const takenDown = renderTable([
      {
        ...withReporter,
        subject: {
          ...report.subject,
          status: { ...subjectStatus, takendown: true, appealed: true },
        },
        reporter: {
          ...report.reporter,
          status: { ...reporterStatus, takendown: true, appealed: true },
        },
      },
    ])
    expect(takenDown.match(/aria-label="Taken Down"/g)).toHaveLength(4)
    expect(takenDown).not.toContain('Appealed')
  })

  it('keeps deleted hosting indicators', () => {
    const markup = renderTable([
      {
        ...report,
        subject: {
          ...report.subject,
          status: {
            ...subjectStatus,
            hosting: {
              $type: 'tools.ozone.moderation.defs#accountHosting',
              status: 'deleted',
            },
          },
        },
      },
    ])
    expect(markup.match(/aria-label="Deleted"/g)).toHaveLength(2)
  })
})
