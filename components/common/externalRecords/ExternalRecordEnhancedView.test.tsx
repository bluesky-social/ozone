import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
vi.mock('../posts/ImageList', () => ({
  ImageList: ({
    images,
    imageClassName,
  }: {
    images: { thumb: string; fullsize: string; alt: string }[]
    imageClassName: string
  }) => (
    <>
      {images.map((image, i) => (
        <figure key={i}>
          <img
            className={imageClassName}
            src={image.thumb}
            data-fullsize={image.fullsize}
            alt={image.alt}
          />
        </figure>
      ))}
    </>
  ),
}))

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
})

describe('ExternalRecordEnhancedView states', () => {
  it('shows only a compact loading line while loading', () => {
    state.query = { isLoading: true }
    const html = renderToStaticMarkup(
      <ExternalRecordEnhancedView
        uri={uri}
        cid={cid}
        value={{}}
        collection="site.standard.document"
        isSnapshot={false}
      />,
    )
    expect(html).toContain('Appview')
    expect(html).toContain('Loading Appview context')
  })

  it.each([
    ['empty response', undefined],
    ['unknown view', { $type: 'app.bsky.embed.external#other', uri: 'x' }],
    [
      'mismatched view',
      { $type: type('viewLivestream'), uri: 'https://a.test' },
    ],
  ])('treats %s as unavailable', (_name, view) => {
    expect(render('site.standard.document', view)).toContain(
      'Appview context unavailable',
    )
    expect(
      render('site.standard.document', view, { isSnapshot: true }),
    ).toContain('Appview context unavailable for this snapshot')
  })

  it('shows a compact error for live records and the snapshot message for snapshots', () => {
    state.query = { error: new Error('boom') }
    const props = { uri, cid, value: {}, collection: 'place.stream.livestream' }
    expect(
      renderToStaticMarkup(
        <ExternalRecordEnhancedView {...props} isSnapshot={false} />,
      ),
    ).toContain('Appview context unavailable: boom')
    const snapshot = renderToStaticMarkup(
      <ExternalRecordEnhancedView {...props} isSnapshot />,
    )
    expect(snapshot).toContain('Appview context unavailable for this snapshot')
    expect(snapshot).not.toContain('boom')
  })
})

describe('ExternalRecordEnhancedView views', () => {
  it('links the article and publisher, escaping publisher text', () => {
    const html = render(
      'site.standard.document',
      {
        $type: type('viewArticle'),
        uri: 'https://blog.test/post',
        title: 'Duplicated title',
        description: 'Duplicated description',
        publisher: {
          uri: 'https://blog.test',
          title: '<b>Blog</b>',
          description: '',
        },
      },
      { value: { site: publicationUri } },
    )
    expect(html).toContain('href="https://blog.test/post"')
    expect(html).toContain('href="https://blog.test/"')
    expect(html).toContain('&lt;b&gt;Blog&lt;/b&gt;')
    expect(html).not.toContain('Duplicated')
    expect(html).not.toContain('reflect current Appview data')
  })

  it('links a publication and a livestream viewing URL', () => {
    expect(
      render('site.standard.publication', {
        $type: type('viewArticlePublication'),
        uri: 'https://blog.test',
        title: 'Blog',
        description: '',
      }),
    ).toContain('href="https://blog.test/"')
    const html = render(
      'place.stream.livestream',
      {
        $type: type('viewLivestream'),
        uri: 'https://stream.test/live',
        title: 'Live',
        description: '',
        active: true,
      },
      { isSnapshot: true },
    )
    expect(html).toContain('href="https://stream.test/live"')
    expect(html).not.toContain('reflect current Appview data')
  })

  it('does not link an unsafe page URL', () => {
    const html = render('place.stream.livestream', {
      $type: type('viewLivestream'),
      uri: 'javascript:alert(1)',
      title: 'Live',
      description: '',
      active: true,
    })
    expect(html).not.toContain('href=')
  })
})

describe('ExternalRecordEnhancedView snapshot notes', () => {
  const article = (extra: object = {}) => ({
    $type: type('viewArticle'),
    uri: 'https://blog.test/post',
    title: 'Post',
    description: '',
    ...extra,
  })
  const publisher = { uri: 'https://blog.test', title: 'Blog', description: '' }
  const note = 'Publication details reflect current Appview data'

  it('notes current publication data only for a snapshot with a referenced, hydrated publication', () => {
    const snapshot = { isSnapshot: true }
    expect(
      render('site.standard.document', article({ publisher }), {
        ...snapshot,
        value: { site: publicationUri },
      }),
    ).toContain(`${note}, not the snapshot date.`)
    // Direct HTTP(S) document, no hydrated publisher, or a live view: no note.
    expect(
      render('site.standard.document', article({ publisher }), {
        ...snapshot,
        value: { site: 'https://blog.test' },
      }),
    ).not.toContain(note)
    expect(
      render('site.standard.document', article(), {
        ...snapshot,
        value: { site: publicationUri },
      }),
    ).not.toContain(note)
    expect(
      render('site.standard.document', article({ publisher }), {
        value: { site: publicationUri },
      }),
    ).not.toContain(note)
  })

  const galleryNote = 'Photos reflect current Appview data'
  it.each([[[image(1)]], [[]]])(
    'notes current photo data on snapshot galleries, including empty ones (%j)',
    (items) => {
      expect(
        render('social.grain.gallery', gallery(items), { isSnapshot: true }),
      ).toContain(galleryNote)
      expect(render('social.grain.gallery', gallery(items))).not.toContain(
        galleryNote,
      )
    },
  )
})

describe('ExternalRecordEnhancedView gallery', () => {
  it('shows returned photos in order with alt text, full-size URLs and the count caveat', () => {
    const html = render(
      'social.grain.gallery',
      gallery([image(2), image(1), image(3, { alt: undefined })]),
    )
    expect(html).toContain('href="https://grain.test/gallery/3k"')
    expect(html).toContain('Showing 3 photos returned by Appview; up to 10.')
    expect(html.indexOf('thumb-2')).toBeLessThan(html.indexOf('thumb-1'))
    expect(html).toContain('alt="alt 2"')
    expect(html).toContain('data-fullsize="https://cdn.test/full-2.jpg"')
    expect(html).toContain(
      'thumb-3.jpg" data-fullsize="https://cdn.test/full-3.jpg" alt=""',
    )
  })

  it.each([
    [0, 'Showing 0 photos returned by Appview; up to 10.'],
    [1, 'Showing 1 photo returned by Appview; up to 10.'],
    [10, 'Showing 10 photos returned by Appview; up to 10.'],
  ])('counts %i displayed photos without claiming completeness', (n, text) => {
    const html = render(
      'social.grain.gallery',
      gallery(Array.from({ length: n }, (_, i) => image(i))),
    )
    expect(html).toContain(text)
    expect(html).not.toContain('Appview context unavailable')
    expect(html.match(/<img/g)?.length ?? 0).toBe(n)
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
    expect(html).toContain('Showing 1 photo returned')
    expect(html.match(/<img/g)).toHaveLength(1)
    expect(html).toContain('thumb-4.jpg')
    expect(html).not.toContain('javascript:')
  })

  it('applies media filters from the record and every returned label, ignoring negations', () => {
    const labels = [
      { val: 'from-related-photo' },
      { val: 'blur-me' },
      { val: 'negated', neg: true },
    ]
    const html = render(
      'social.grain.gallery',
      gallery([image(1)], { labels }),
      {
        labels: ['from-record'],
      },
    )
    expect(state.filterLabels.at(-1)).toEqual([
      'from-record',
      'from-related-photo',
      'blur-me',
    ])
    expect(html).toContain('blur-sm hover:blur-none')
  })
})
