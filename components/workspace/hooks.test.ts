import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  jsonToLex,
  ToolsOzoneModerationDefs,
  ToolsOzoneTeamDefs,
} from '@atproto/api'
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
    expect(csv.body.split('\n')).toEqual([`${did},${did},,`, `${did},${uri},,`])
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
          subject: {
            $type: 'com.atproto.repo.strongRef',
            uri,
            cid: record.cid,
          },
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
      state.columns = ['did', 'email', 'ip', 'text', 'altText']
      const account = {
        ...repo,
        email: 'example@example.test',
        ip: '192.0.2.1',
      }
      const csv = await exportSubjects([
        { type: 'account', subject: did, repo: account },
      ])
      if (role === ToolsOzoneTeamDefs.ROLEADMIN) {
        expect(csv.headerRow).toBe('did,email,ip,text,altText\n')
        expect(csv.body).toBe(`${did},example@example.test,192.0.2.1,,`)
      } else {
        expect(csv.headerRow).toBe('did,text,altText\n')
        expect(csv.body).toBe(`${did},,`)
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

describe('workspace alt text CSV export', () => {
  const image = jsonToLex({
    $type: 'blob',
    ref: { $link: record.cid },
    mimeType: 'image/jpeg',
    size: 100,
  })
  const videoBlob = jsonToLex({
    $type: 'blob',
    ref: { $link: record.cid },
    mimeType: 'video/mp4',
    size: 100,
  })
  const images = {
    $type: 'app.bsky.embed.images',
    images: [
      { image, alt: 'First, "image"\r\ndescription' },
      { image, alt: '' },
      { image, alt: 'Second image' },
    ],
  }
  const gallery = {
    $type: 'app.bsky.embed.gallery',
    items: [
      {
        $type: 'app.bsky.embed.gallery#image',
        image,
        alt: 'First gallery image',
        aspectRatio: { width: 1, height: 1 },
      },
      { $type: 'example.gallery#other' },
      {
        $type: 'app.bsky.embed.gallery#image',
        image,
        alt: 'Second gallery image',
        aspectRatio: { width: 1, height: 1 },
      },
    ],
  }
  const video = {
    $type: 'app.bsky.embed.video',
    video: videoBlob,
    alt: 'A video description',
  }
  const quoteWithMedia = (media: unknown) => ({
    $type: 'app.bsky.embed.recordWithMedia',
    record: {
      $type: 'app.bsky.embed.record',
      record: { uri, cid: record.cid },
    },
    media,
  })

  it.each([
    ['images', images, 'First, "image"\r\ndescription\nSecond image'],
    ['gallery', gallery, 'First gallery image\nSecond gallery image'],
    ['video', video, 'A video description'],
    [
      'quoted post with images',
      quoteWithMedia(images),
      'First, "image"\r\ndescription\nSecond image',
    ],
    [
      'quoted post with gallery',
      quoteWithMedia(gallery),
      'First gallery image\nSecond gallery image',
    ],
    ['quoted post with video', quoteWithMedia(video), 'A video description'],
  ])(
    'exports alt text for %s with correct escaping',
    async (_, embed, expected) => {
      state.columns = ['uri', 'createdAt', 'text', 'altText']
      const csv = await exportSubjects([
        {
          type: 'record',
          subject: uri,
          record: { ...record, value: { ...record.value, embed } },
        },
      ])
      expect(csv.headerRow).toBe('uri,createdAt,text,altText\n')
      const cell = expected.includes('\n')
        ? `"${expected.replaceAll('"', '""')}"`
        : expected
      expect(csv.body).toBe(`${uri},${createdAt},Example post,${cell}`)
    },
  )

  it.each([
    ['no embed', undefined],
    ['unknown embed', { $type: 'example.embed' }],
    ['invalid images', { $type: 'app.bsky.embed.images' }],
    [
      'external link',
      {
        $type: 'app.bsky.embed.external',
        external: {
          uri: 'https://example.test',
          title: 'Example',
          description: 'Not alt text',
        },
      },
    ],
    [
      'quoted record only',
      { $type: 'app.bsky.embed.record', record: { uri, cid: record.cid } },
    ],
    [
      'video without alt text',
      { $type: 'app.bsky.embed.video', video: videoBlob },
    ],
    [
      'empty image alts',
      {
        ...images,
        images: [
          { image, alt: '' },
          { image, alt: '' },
        ],
      },
    ],
  ])('leaves alt text empty for %s', async (_, embed) => {
    state.columns = ['uri', 'altText']
    const csv = await exportSubjects([
      {
        type: 'record',
        subject: uri,
        record: { ...record, value: { ...record.value, embed } },
      },
    ])
    expect(csv.headerRow).toBe('uri,altText\n')
    expect(csv.body).toBe(`${uri},`)
  })

  it('keeps accounts and missing record details aligned', async () => {
    state.columns = ['uri', 'altText']
    const csv = await exportSubjects([
      { type: 'account', subject: did, repo },
      { type: 'record', subject: uri, repo },
      { type: 'record', subject: `${uri}2` },
    ])
    expect(csv.body).toBe(`${did},\n${uri},\n${uri}2,`)
  })

  it.each([ToolsOzoneTeamDefs.ROLEMODERATOR, ToolsOzoneTeamDefs.ROLEADMIN])(
    'includes altText by default for %s',
    async (role) => {
      state.role = role
      const csv = await exportSubjects([
        {
          type: 'record',
          subject: uri,
          record: { ...record, value: { ...record.value, embed: video } },
        },
      ])
      const headers = csv.headerRow.trim().split(',')
      expect(headers.at(-1)).toBe('altText')
      expect(headers).not.toContain('copyInfo')
      expect(csv.body.endsWith(',A video description')).toBe(true)
      expect(headers.includes('email')).toBe(
        role === ToolsOzoneTeamDefs.ROLEADMIN,
      )
      expect(headers.includes('ip')).toBe(role === ToolsOzoneTeamDefs.ROLEADMIN)
    },
  )

  it('allows exporting only the altText column', async () => {
    state.columns = ['altText']
    const csv = await exportSubjects([
      {
        type: 'record',
        subject: uri,
        record: { ...record, value: { ...record.value, embed: video } },
      },
    ])
    expect(csv.headerRow).toBe('altText\n')
    expect(csv.body).toBe('A video description')
  })
})
