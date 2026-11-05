import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SiteStandardDocument } from './SiteStandardDocument'
import { SocialGrainGallery } from './SocialGrainGallery'
import { PlaceStreamLivestream } from './PlaceStreamLivestream'
import { SocialGrainPhoto } from './SocialGrainPhoto'
import { SiteStandardPublication } from './SiteStandardPublication'
import { safeHttpUrl } from './helpers'
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
vi.mock('../posts/ImageList', () => ({
  ImageList: ({
    images,
    imageClassName,
  }: {
    images: { thumb: string; alt: string }[]
    imageClassName: string
  }) => (
    <>
      {images.map((image) => (
        <figure key={image.thumb}>
          <img className={imageClassName} src={image.thumb} alt={image.alt} />
          <figcaption>{image.alt}</figcaption>
        </figure>
      ))}
    </>
  ),
}))

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

describe('simple record shell', () => {
  it('marks the record as simple and keeps URI, CID and raw JSON', () => {
    const value = { title: 'Hello', createdAt: '2026-01-01T00:00:00Z' }
    const html = render(
      <SocialGrainGallery
        {...base('social.grain.gallery')}
        value={{ ...value, extension: '<script>alert(1)</script>' }}
      />,
    )
    expect(html).toContain('Simple record')
    expect(html).toContain(
      `data-copy-text="${base('social.grain.gallery').uri}"`,
    )
    expect(html).toContain('data-copy-text="bafyrecord"')
    expect(html).toContain('Raw record')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })
})

describe('RecordDate', () => {
  it.each(['2026-01-01T12:30:00Z', '2026-01-01T12:30:00-06:00'])(
    'formats a valid timestamp and keeps its original value: %s',
    (value) => {
      const html = render(<RecordDate label="Created" value={value} />)
      expect(html).toContain(`dateTime="${value}"`)
      expect(html).toContain(`title="${value}"`)
      expect(html).toContain(new Date(value).toLocaleString())
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

  it.each([undefined, null, 42])(
    'handles a missing or non-string date: %s',
    (value) => {
      const html = render(<RecordDate label="Created" value={value} />)
      expect(html).toContain('Created: Not provided')
      expect(html).not.toContain('<time')
    },
  )
})

describe('SiteStandardDocument', () => {
  it('shows an AT-URI site as an unresolved reference with no source URL', () => {
    const publication = `at://${authorDid}/site.standard.publication/pub1`
    const html = render(
      <SiteStandardDocument
        {...base('site.standard.document')}
        value={{
          site: publication,
          path: '/post',
          title: 'Title',
          textContent: 'Body  text',
          publishedAt: '2026-01-01T00:00:00Z',
          bskyPostRef: { uri: `at://${authorDid}/app.bsky.feed.post/1` },
        }}
      />,
    )
    expect(html).toContain(publication)
    expect(html).toContain(
      `/repositories/${encodeURIComponent(authorDid)}/site.standard.publication/pub1`,
    )
    expect(html).toContain('Body  text')
    expect(html).toContain('View associated post')
    expect(html).not.toContain('Source URL')
    expect(html).not.toContain('Publication unavailable')
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
  it('renders name, description, icon and URL', () => {
    const html = render(
      <SiteStandardPublication
        {...base('site.standard.publication')}
        value={{
          name: 'My Pub',
          description: 'About it',
          url: 'https://pub.example',
          icon: blob,
          basicTheme: { background: { r: 0, g: 0, b: 0 } },
        }}
      />,
    )
    expect(html).toContain('My Pub')
    expect(html).toContain('About it')
    expect(html).toContain('href="https://pub.example/"')
    expect(html).toContain(`https://cdn.example/${authorDid}/${cid}`)
    expect(html).not.toContain('style=')
  })

  it.each(['javascript:alert(1)', 'https://user:pw@example.com', 42])(
    'keeps unsafe URL %j visible but not clickable',
    (url) => {
      const html = render(
        <SiteStandardPublication
          {...base('site.standard.publication')}
          value={{ name: 'P', url }}
        />,
      )
      expect(html).not.toContain('href=')
      expect(html).toContain(typeof url === 'string' ? url : 'Invalid URL')
    },
  )
})

describe('SocialGrainGallery', () => {
  it('does not claim photos are assembled', () => {
    const html = render(
      <SocialGrainGallery
        {...base('social.grain.gallery')}
        value={{
          title: 'Trip',
          description: 'Summer',
          createdAt: '2026-01-01T00:00:00Z',
        }}
      />,
    )
    expect(html).toContain('Trip')
    expect(html).toContain('Summer')
    expect(html).toContain('Photos are separate records')
    expect(html).not.toContain('<img')
  })
})

describe('SocialGrainPhoto', () => {
  it('renders the photo, visible alt text and aspect ratio', () => {
    const html = render(
      <SocialGrainPhoto
        {...base('social.grain.photo')}
        value={{
          photo: blob,
          alt: 'A cat',
          aspectRatio: { width: 4, height: 3 },
        }}
      />,
    )
    expect(html).toContain(`src="https://cdn.example/${authorDid}/${cid}"`)
    expect(html).toContain('<figcaption>A cat</figcaption>')
    expect(html).toContain('4 × 3')
  })

  it('applies media filters from supplied and self labels to raw snapshot blobs', () => {
    mediaFilters.labels = []
    const html = render(
      <SocialGrainPhoto
        {...base('social.grain.photo')}
        labels={['blur-me']}
        value={{
          photo: blob,
          alt: 'x',
          labels: { values: [{ val: 'gray-me' }] },
        }}
      />,
    )
    expect(mediaFilters.labels[0]).toEqual(['blur-me', 'gray-me'])
    expect(html).toContain('blur-sm')
    expect(html).toContain('grayscale')
  })

  it('still shows the rest of the record when the photo is malformed', () => {
    const html = render(
      <SocialGrainPhoto
        {...base('social.grain.photo')}
        value={{
          photo: { ...blob, mimeType: 'text/html' },
          createdAt: '2026-01-01T00:00:00Z',
          aspectRatio: 'wide',
        }}
      />,
    )
    expect(html).not.toContain('<img')
    expect(html).toContain('Photo image is missing or invalid.')
    expect(html).toContain('No alt text provided.')
    expect(html).toContain('Raw record')
    expect(html).not.toContain('Aspect ratio')
  })
})

describe('PlaceStreamLivestream', () => {
  const value = {
    title: 'Live!',
    createdAt: '2026-01-01T00:00:00Z',
    lastSeenAt: '2026-01-01T01:00:00Z',
    endedAt: '2026-01-01T02:00:00Z',
    url: 'https://replicate.example/stream',
    canonicalUrl: 'https://watch.example/me',
    thumb: blob,
    tags: ['music', 7],
    agent: 'streamer/1.0',
    post: { uri: `at://${authorDid}/app.bsky.feed.post/1`, cid: 'x' },
  }

  it('shows distinct URLs and timestamps without inferring status', () => {
    const html = render(
      <PlaceStreamLivestream {...base('place.stream.livestream')} value={value} />,
    )
    expect(html).toContain('Canonical (viewing) URL')
    expect(html).toContain('href="https://watch.example/me"')
    expect(html).toContain('Replication URL')
    expect(html).toContain('href="https://replicate.example/stream"')
    expect(html).toContain('Last seen')
    expect(html).toContain('Ended')
    expect(html).toContain('music')
    expect(html).toContain('streamer/1.0')
    expect(html).toContain('View associated post')
    expect(html).toContain('<img')
    expect(html).not.toMatch(/\blive now\b|currently live|<iframe|<video/i)
  })

  it('does not link unsafe stream URLs', () => {
    const html = render(
      <PlaceStreamLivestream
        {...base('place.stream.livestream')}
        value={{ ...value, url: 'javascript:alert(1)', canonicalUrl: 'x' }}
      />,
    )
    expect(html).not.toContain('javascript:alert(1)"')
    expect(html).not.toContain('href="javascript')
    expect(html).not.toContain('href="x"')
  })
})

describe('safeHttpUrl', () => {
  it.each(['ftp://example.com', '//example.com', 'https://', null])(
    'rejects %j',
    (value) => {
      expect(safeHttpUrl(value)).toBeNull()
    },
  )
})
