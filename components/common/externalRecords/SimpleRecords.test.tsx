import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageList } from '../posts/ImageList'
import { SiteStandardDocument } from './SiteStandardDocument'
import { SocialGrainGallery } from './SocialGrainGallery'
import { PlaceStreamLivestream } from './PlaceStreamLivestream'
import { SocialGrainPhoto } from './SocialGrainPhoto'
import { SiteStandardPublication } from './SiteStandardPublication'
import { RecordDate } from './SimpleRecord'

const mediaFilters = vi.hoisted(() => ({ labels: [] as string[][] }))

vi.mock('../CopyButton', () => ({
  CopyButton: ({ text }: { text: string }) => <button data-copy-text={text} />,
}))
vi.mock('../BlobListLightbox', () => ({
  useBlobUrl:
    ({ authorDid }: { authorDid: string }) =>
    ({ cid }: { cid: string }) =>
      `https://cdn.example/${authorDid}/${cid}`,
}))
vi.mock('@/config/useLocalPreferences', () => ({
  useGraphicMediaPreferences: () => ({
    getMediaFiltersForLabels: (labels: string[]) => {
      mediaFilters.labels.push(labels)
      return {
        blur: labels.includes('blur-me'),
        grayscale: labels.includes('gray-me'),
        translucent: false,
      }
    },
  }),
}))
vi.mock('../posts/ImageList', () => ({ ImageList: vi.fn(() => null) }))

const cid = 'bafkreigs2iqxve4g42tt5hqkdjcwjxc3fkf5yty74kmx42yugozk4kx3ny'
const authorDid = 'did:plc:author'
const blob = {
  $type: 'blob',
  ref: { $link: cid },
  mimeType: 'image/jpeg',
  size: 100,
}
const base = (collection: string) => ({
  uri: `at://${authorDid}/${collection}/3k`,
  cid: 'bafyrecord',
  authorDid,
})
const render = (element: React.ReactElement) => renderToStaticMarkup(element)

beforeEach(() => {
  mediaFilters.labels = []
  vi.mocked(ImageList).mockClear()
})

describe('simple record shell', () => {
  it('keeps copyable record identifiers and raw fields not covered by the renderer', () => {
    const props = base('social.grain.gallery')
    const html = render(
      <SocialGrainGallery
        {...props}
        value={{ title: 'Hello', extension: 'review evidence' }}
      />,
    )
    expect(html).toContain('Simple record')
    expect(html).toContain(`data-copy-text="${props.uri}"`)
    expect(html).toContain(`data-copy-text="${props.cid}"`)
    expect(html).toContain('Raw record')
    expect(html).toContain('review evidence')
  })
})

describe('RecordDate', () => {
  it.each(['2026-01-01T12:30:00Z', '2026-01-01T12:30:00-06:00'])(
    'retains the original protocol timestamp in the time element: %s',
    (value) => {
      const html = render(<RecordDate label="Created" value={value} />)
      expect(html).toContain(`dateTime="${value}"`)
      expect(html).toContain(`title="${value}"`)
    },
  )

  it.each(['2026-01-01', '2026-01-01T12:30:00'])(
    'keeps a non-protocol date visible without interpreting it: %s',
    (value) => {
      const html = render(<RecordDate label="Created" value={value} />)
      expect(html).toContain(`Created: ${value}`)
      expect(html).not.toContain('<time')
    },
  )

  it('handles a missing timestamp', () => {
    const html = render(<RecordDate label="Created" value={undefined} />)
    expect(html).toContain('Not provided')
    expect(html).not.toContain('<time')
  })
})

describe('SiteStandardDocument', () => {
  it('links a publication reference without guessing a resolved article URL', () => {
    const html = render(
      <SiteStandardDocument
        {...base('site.standard.document')}
        value={{
          site: `at://${authorDid}/site.standard.publication/pub1`,
          path: '/post',
          title: 'Title',
          bskyPostRef: { uri: `at://${authorDid}/app.bsky.feed.post/1` },
        }}
      />,
    )
    expect(html).toContain(
      `/repositories/${encodeURIComponent(authorDid)}/site.standard.publication/pub1`,
    )
    expect(html).toContain(
      `/repositories/${encodeURIComponent(authorDid)}/app.bsky.feed.post/1`,
    )
    expect(html).not.toContain('Source URL')
  })

  it('builds a source URL locally from an HTTP(S) site and path', () => {
    const html = render(
      <SiteStandardDocument
        {...base('site.standard.document')}
        value={{ site: 'https://example.com/blog', path: '/a', title: 'T' }}
      />,
    )
    expect(html).toContain('href="https://example.com/blog/a"')
  })
})

describe('SiteStandardPublication', () => {
  it('keeps a credential-bearing URL visible but not clickable', () => {
    const url = 'https://user:pw@example.com'
    const html = render(
      <SiteStandardPublication
        {...base('site.standard.publication')}
        value={{ name: 'P', url }}
      />,
    )
    expect(html).not.toContain('href=')
    expect(html).toContain(url)
  })
})

describe('SocialGrainPhoto', () => {
  it('passes a raw snapshot photo and alt text to the viewer, with supplied and self-label filters', () => {
    const html = render(
      <SocialGrainPhoto
        {...base('social.grain.photo')}
        labels={['blur-me']}
        value={{
          photo: blob,
          alt: 'A cat',
          aspectRatio: { width: 4, height: 3 },
          labels: { values: [{ val: 'gray-me' }] },
        }}
      />,
    )
    const { images, imageClassName } = vi.mocked(ImageList).mock.calls[0][0]
    expect(images).toEqual([
      {
        thumb: `https://cdn.example/${authorDid}/${cid}`,
        fullsize: `https://cdn.example/${authorDid}/${cid}`,
        alt: 'A cat',
      },
    ])
    expect(new Set(mediaFilters.labels[0])).toEqual(
      new Set(['blur-me', 'gray-me']),
    )
    expect(imageClassName).toContain('blur-sm')
    expect(imageClassName).toContain('grayscale')
    expect(html).toContain('4 × 3')
  })

  it('keeps malformed photo records inspectable without loading a non-image blob', () => {
    const html = render(
      <SocialGrainPhoto
        {...base('social.grain.photo')}
        value={{ photo: { ...blob, mimeType: 'text/html' }, aspectRatio: 'wide' }}
      />,
    )
    expect(ImageList).not.toHaveBeenCalled()
    expect(html).toContain('Photo image is missing or invalid.')
    expect(html).toContain('Raw record')
    expect(html).not.toContain('Aspect ratio')
  })
})

describe('PlaceStreamLivestream', () => {
  it('distinguishes the viewing URL from the replication URL', () => {
    const html = render(
      <PlaceStreamLivestream
        {...base('place.stream.livestream')}
        value={{
          title: 'Live!',
          url: 'https://replicate.example/stream',
          canonicalUrl: 'https://watch.example/me',
        }}
      />,
    )
    expect(html).toContain('Canonical (viewing) URL')
    expect(html).toContain('href="https://watch.example/me"')
    expect(html).toContain('Replication URL')
    expect(html).toContain('href="https://replicate.example/stream"')
  })
})
