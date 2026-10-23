import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToolsOzoneModerationDefs, ToolsOzoneTeamDefs } from '@atproto/api'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useWorkspaceExport } from './hooks'

const state = vi.hoisted(() => ({
  role: 'tools.ozone.team.defs#roleAdmin',
  columns: undefined as string[] | undefined,
  download: vi.fn(),
}))

vi.mock('@/shell/ConfigurationContext', () => ({
  useServerConfig: () => ({ role: state.role }),
}))
vi.mock('@/repositories/helpers', () => import('../repositories/helpers'))
vi.mock('@/lib/constants', () => ({ SOCIAL_APP_URL: 'https://bsky.app' }))
vi.mock('@/reports/helpers/subject', () => ({
  CollectionId: {
    Post: 'app.bsky.feed.post',
    Profile: 'app.bsky.actor.profile',
  },
}))
vi.mock('@/lib/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/csv')>()),
  downloadCSV: state.download,
}))
vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn }) => ({ mutateAsync: mutationFn }),
}))

const did = 'did:plc:example'
const uri = `at://${did}/app.bsky.feed.post/example`
const createdAt = '2026-01-01T00:00:00.000Z'
const repo = {
  did,
  handle: 'example.test',
  relatedRecords: [],
  indexedAt: createdAt,
  moderation: {},
} satisfies ToolsOzoneModerationDefs.RepoViewDetail
const record: ToolsOzoneModerationDefs.RecordViewDetail = {
  uri,
  cid: 'bafkreigs2iqxve4g42tt5hqkdjcwjxc3fkf5yty74kmx42yugozk4kx3ny',
  value: { text: 'Example post', langs: ['en'], createdAt },
  blobs: [],
  indexedAt: createdAt,
  moderation: {},
  repo,
}

async function exportSubjects(
  subjects: ToolsOzoneModerationDefs.SubjectView[],
) {
  let exporter: ReturnType<typeof useWorkspaceExport> | undefined
  function CaptureExport() {
    exporter = useWorkspaceExport()
    if (state.columns && exporter.selectedColumns !== state.columns) {
      exporter.setSelectedColumns(state.columns)
    }
    return null
  }
  renderToStaticMarkup(createElement(CaptureExport))
  await exporter!.mutateAsync(
    Object.fromEntries(subjects.map((subject) => [subject.subject, subject])),
  )
  return state.download.mock.calls[0][0] as {
    headerRow: string
    body: string
  }
}

beforeEach(() => {
  state.role = ToolsOzoneTeamDefs.ROLEADMIN
  state.columns = undefined
  state.download.mockClear()
})

describe('workspace CSV export', () => {
  it('exports available record data without repo or moderation status details', async () => {
    state.columns = ['did', 'uri', 'createdAt', 'text', 'langs', 'bskyUrl']
    const csv = await exportSubjects([{ type: 'record', subject: uri, record }])
    expect(csv.headerRow).toBe('did,uri,bskyUrl,createdAt,text,langs\n')
    expect(csv.body).toBe(
      `${did},${uri},https://bsky.app/profile/${did}/post/example,${createdAt},Example post,en`,
    )
  })

  it('retains subjects when only their identifiers are available', async () => {
    state.columns = ['did', 'uri', 'handle', 'text']
    const csv = await exportSubjects([
      { type: 'account', subject: did },
      { type: 'record', subject: uri },
    ])
    expect(csv.body.split('\n')).toEqual([
      `${did},${did},,`,
      `${did},${uri},,`,
    ])
  })

  it('keeps empty optional fields aligned with the full header row', async () => {
    const csv = await exportSubjects([{ type: 'account', subject: did, repo }])
    const headers = csv.headerRow.trim().split(',')
    const cells = csv.body.split(',')
    expect(cells).toHaveLength(headers.length)
    expect(
      Object.fromEntries(headers.map((header, i) => [header, cells[i]])),
    ).toMatchObject({
      did,
      uri: did,
      handle: 'example.test',
      email: '',
      text: '',
      langs: '',
      embeds: '',
    })
  })

  it('preserves status metadata when record and repo details are unavailable', async () => {
    state.columns = ['did', 'uri', 'handle', 'tags', 'text']
    const csv = await exportSubjects([
      {
        type: 'record',
        subject: uri,
        status: {
          id: 1,
          subject: { $type: 'com.atproto.repo.strongRef', uri, cid: record.cid },
          subjectRepoHandle: 'example.test',
          tags: ['example-tag'],
          reviewState: ToolsOzoneModerationDefs.REVIEWOPEN,
          createdAt,
          updatedAt: createdAt,
        },
      },
    ])
    expect(csv.body).toBe(`${did},${uri},example.test,example-tag,`)
  })

  it('retains record identity when only author repo details are available', async () => {
    state.columns = ['did', 'uri', 'handle', 'ozoneUrl', 'text']
    const csv = await exportSubjects([{ type: 'record', subject: uri, repo }])
    expect(csv.body).toBe(
      `${did},${uri},example.test,/reports?quickOpen=${encodeURIComponent(uri)},`,
    )
  })

  it('preserves CSV escaping for selected post text', async () => {
    state.columns = ['uri', 'text']
    const csv = await exportSubjects([
      {
        type: 'record',
        subject: uri,
        repo,
        record: { ...record, value: { text: 'Hello, "world"\nAgain' } },
      },
    ])
    expect(csv.body).toBe(`${uri},"Hello, ""world""\nAgain"`)
  })

  it.each([ToolsOzoneTeamDefs.ROLEMODERATOR, ToolsOzoneTeamDefs.ROLEADMIN])(
    'preserves the permitted fields for %s',
    async (role) => {
      state.role = role
      state.columns = ['did', 'email', 'ip', 'text']
      const account = {
        ...repo,
        email: 'example@example.test',
        ip: '192.0.2.1',
      }
      const csv = await exportSubjects([
        { type: 'account', subject: did, repo: account },
      ])
      if (role === ToolsOzoneTeamDefs.ROLEADMIN) {
        expect(csv.headerRow).toBe('did,email,ip,text\n')
        expect(csv.body).toBe(`${did},example@example.test,192.0.2.1,`)
      } else {
        expect(csv.headerRow).toBe('did,text\n')
        expect(csv.body).toBe(`${did},`)
      }
    },
  )

  it('retains every row in a large record-only export', async () => {
    state.columns = ['did', 'uri']
    const subjects = Array.from({ length: 401 }, (_, i) => ({
      type: 'record' as const,
      subject: `${uri}${i}`,
      record: { ...record, uri: `${uri}${i}` },
    }))
    const csv = await exportSubjects(subjects)
    const lines = csv.body.split('\n')
    expect(lines).toHaveLength(subjects.length)
    subjects.forEach((subject, i) => {
      expect(lines[i]).toBe(`${did},${subject.subject}`)
    })
  })
})
