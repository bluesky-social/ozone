import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageList } from '../posts/ImageList'
import { ExternalRecordEnhancedView } from './ExternalRecordEnhancedView'

const state = vi.hoisted(() => ({
  query: {} as { data?: unknown; error?: unknown; isLoading?: boolean },
  filterLabels: [] as string[][],
}))

vi.mock('./useAtmosphereRecordView', () => ({
  useAtmosphereRecordView: () => state.query,
}))
vi.mock('@/config/useLocalPreferences', () => ({
  useGraphicMediaPreferences: () => ({
    getMediaFiltersForLabels: (labels: string[]) => {
      state.filterLabels.push(labels)
      return {
        blur: labels.includes('blur-me'),
        grayscale: false,
        translucent: false,
      }
    },
  }),
}))
vi.mock('../posts/ImageList', () => ({ ImageList: vi.fn(() => null) }))

const cid = 'bafyrecord'
const uri = 'at://did:plc:author/site.standard.document/3k'
const publicationUri = 'at://did:plc:author/site.standard.publication/3k'
const type = (name: string) => `app.bsky.embed.external#${name}`
const image = (n: number, extra: object = {}) => ({
  $type: type('viewGalleryImage'),
  thumbnail: `https://cdn.test/thumb-${n}.jpg`,
  fullsize: `https://cdn.test/full-${n}.jpg`,
  alt: `alt ${n}`,
  ...extra,
})
const gallery = (items: unknown[], extra: object = {}) => ({
  $type: type('viewGallery'),
  uri: 'https://grain.test/gallery/3k',
  title: 'Gallery',
  description: '',
  items,
  ...extra,
})

function render(
  collection: string,
  view: unknown,
  props: { isSnapshot?: boolean; value?: unknown; labels?: string[] } = {},
) {
  state.query = { data: view === undefined ? {} : { view } }
  return renderToStaticMarkup(
    <ExternalRecordEnhancedView
      uri={uri}
      cid={cid}
      value={props.value ?? {}}
      labels={props.labels}
      collection={collection}
      isSnapshot={!!props.isSnapshot}
    />,
  )
}

beforeEach(() => {
  state.query = {}
  state.filterLabels = []
  vi.mocked(ImageList).mockClear()
})

describe('ExternalRecordEnhancedView unavailable snapshots', () => {
  it.each([
    ['empty response', undefined],
    ['unknown view', { $type: 'app.bsky.embed.external#other', uri: 'x' }],
    ['mismatched view', { $type: type('viewLivestream'), uri: 'https://a.test' }],
  ])('does not substitute a different view for an %s', (_name, view) => {
    expect(
      render('site.standard.document', view, { isSnapshot: true }),
    ).toContain('Appview context unavailable for this snapshot')
  })

  it('identifies unavailable snapshot context when the request fails', () => {
    state.query = { error: new Error('boom') }
    const html = renderToStaticMarkup(
      <ExternalRecordEnhancedView
        uri={uri}
        cid={cid}
        value={{}}
        collection="site.standard.document"
        isSnapshot
      />,
    )
    expect(html).toContain('Appview context unavailable for this snapshot')
  })
})

describe('ExternalRecordEnhancedView links', () => {
  it('uses the resolved article and publication destinations', () => {
    const html = render('site.standard.document', {
      $type: type('viewArticle'),
      uri: 'https://blog.test/post',
      title: 'Post',
      description: '',
      publisher: { uri: 'https://blog.test', title: 'Blog', description: '' },
    })
    expect(html).toContain('href="https://blog.test/post"')
    expect(html).toContain('href="https://blog.test/"')
    expect(html).toContain('Blog')
  })

  it.each([
    ['site.standard.publication', 'viewArticlePublication', 'https://blog.test/'],
    ['place.stream.livestream', 'viewLivestream', 'https://stream.test/live'],
  ])(
    'links %s without a related-data warning on snapshots',
    (collection, viewType, url) => {
      const html = render(
        collection,
        {
          $type: type(viewType),
          uri: url,
          title: 'Title',
          description: '',
          active: true,
        },
        { isSnapshot: true },
      )
      expect(html).toContain(`href="${url}"`)
      expect(html).not.toContain('reflect current Appview data')
    },
  )

  it('keeps an unsafe page URL visible but not clickable', () => {
    const html = render('place.stream.livestream', {
      $type: type('viewLivestream'),
      uri: 'javascript:alert(1)',
      title: 'Live',
      description: '',
      active: true,
    })
    expect(html).toContain('javascript:alert(1)')
    expect(html).not.toContain('href=')
  })
})

describe('ExternalRecordEnhancedView snapshot notes', () => {
  it('warns about publication data only for snapshots with a referenced, hydrated publication', () => {
    const article = {
      $type: type('viewArticle'),
      uri: 'https://blog.test/post',
      title: 'Post',
      description: '',
    }
    const publisher = { uri: 'https://blog.test', title: 'Blog', description: '' }
    const note = 'Publication details reflect current Appview data'
    expect(
      render(
        'site.standard.document',
        { ...article, publisher },
        { isSnapshot: true, value: { site: publicationUri } },
      ),
    ).toContain(note)
    // Direct HTTP(S) document, no hydrated publisher, or a live view: no note.
    expect(
      render(
        'site.standard.document',
        { ...article, publisher },
        { isSnapshot: true, value: { site: 'https://blog.test' } },
      ),
    ).not.toContain(note)
    expect(
      render('site.standard.document', article, {
        isSnapshot: true,
        value: { site: publicationUri },
      }),
    ).not.toContain(note)
    expect(
      render(
        'site.standard.document',
        { ...article, publisher },
        { value: { site: publicationUri } },
      ),
    ).not.toContain(note)
  })
})

describe('ExternalRecordEnhancedView gallery', () => {
  it('passes all ten photos to the viewer in response order, with full-size URLs, alt text and aspect ratio', () => {
    const items = [
      image(2, { aspectRatio: { width: 4, height: 3 } }),
      image(1),
      ...Array.from({ length: 7 }, (_, i) => image(i + 3)),
      image(10, { alt: undefined }),
    ]
    const html = render('social.grain.gallery', gallery(items))
    const { images } = vi.mocked(ImageList).mock.calls[0][0]
    expect(images.map(({ thumb }) => thumb)).toEqual(
      items.map(({ thumbnail }) => thumbnail),
    )
    expect(images[0]).toEqual({
      thumb: 'https://cdn.test/thumb-2.jpg',
      fullsize: 'https://cdn.test/full-2.jpg',
      alt: 'alt 2',
      aspectRatio: { width: 4, height: 3 },
    })
    expect(images[9].alt).toBe('')
    expect(html).toContain('href="https://grain.test/gallery/3k"')
    expect(html).toContain('10 photos returned by Appview; up to 10')
    expect(html).not.toContain('Photos reflect current Appview data')
  })

  it('keeps an empty snapshot gallery available and notes that the photo set is current', () => {
    const html = render('social.grain.gallery', gallery([]), { isSnapshot: true })
    expect(html).toContain('0 photos returned by Appview; up to 10')
    expect(html).toContain('Photos reflect current Appview data')
    expect(html).not.toContain('Appview context unavailable')
    expect(ImageList).not.toHaveBeenCalled()
  })

  it('skips unsupported, malformed and unsafe items and counts only what is shown', () => {
    const html = render(
      'social.grain.gallery',
      gallery([
        { $type: 'app.bsky.embed.external#viewGalleryVideo', thumbnail: 'x' },
        image(1, { thumbnail: 'javascript:alert(1)' }),
        image(2, { fullsize: 'https://user:pw@cdn.test/full.jpg' }),
        image(3, { thumbnail: undefined }),
        null,
        image(4),
      ]),
    )
    expect(vi.mocked(ImageList).mock.calls[0][0].images).toEqual([
      expect.objectContaining({ thumb: 'https://cdn.test/thumb-4.jpg' }),
    ])
    expect(html).toContain('1 photo returned')
  })

  it('filters media using record and related-photo labels, ignoring negations', () => {
    render(
      'social.grain.gallery',
      gallery([image(1)], {
        labels: [
          { val: 'from-related-photo' },
          { val: 'blur-me' },
          { val: 'negated', neg: true },
        ],
      }),
      { labels: ['from-record'] },
    )
    expect(new Set(state.filterLabels.at(-1))).toEqual(
      new Set(['from-record', 'from-related-photo', 'blur-me']),
    )
    expect(vi.mocked(ImageList).mock.calls[0][0].imageClassName).toContain(
      'blur-sm',
    )
  })
})
