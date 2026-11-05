import { describe, expect, it } from 'vitest'
import { jsonToLex } from '@atproto/api'
import { imageBlobCid, documentUrl, recordReference, safeHttpUrl } from './helpers'

describe('safeHttpUrl', () => {
  it.each([
    'javascript:alert(1)',
    'https://user:pw@example.com',
    'ftp://example.com',
    '//example.com',
    'https://',
    null,
    42,
  ])('rejects unsafe or malformed URLs: %j', (value) => {
    expect(safeHttpUrl(value)).toBeNull()
  })
})

describe('Standard document references', () => {
  it('joins the site and document path without discarding publication base paths', () => {
    expect(
      documentUrl(
        'https://example.com/publication///',
        '/posts/article?x=1#part',
      ),
    ).toBe('https://example.com/publication/posts/article?x=1#part')
    expect(documentUrl('https://example.com/', undefined)).toBe(
      'https://example.com/',
    )
    expect(documentUrl('https://example.com/blog/', undefined)).toBe(
      'https://example.com/blog/',
    )
    expect(documentUrl('https://example.com', '//other.example/article')).toBe(
      'https://example.com//other.example/article',
    )
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    '//example.com',
    'https://',
    null,
  ])('does not create a navigable source from %s', (site) => {
    expect(documentUrl(site, '/article')).toBeNull()
  })

  it('does not guess a source for invalid paths or unresolved publication records', () => {
    expect(
      documentUrl('https://example.com', 'https://other.example'),
    ).toBeNull()
    expect(documentUrl('https://example.com', {})).toBeNull()
    expect(
      documentUrl(
        'at://did:plc:example/site.standard.publication/self',
        '/article',
      ),
    ).toBeNull()
  })

  it('accepts complete references only to the requested record type', () => {
    const uri = 'at://did:plc:example/site.standard.publication/self'
    expect(recordReference(uri, 'site.standard.publication')?.toString()).toBe(
      uri,
    )
    expect(recordReference(uri, 'app.bsky.feed.post')).toBeNull()
    expect(
      recordReference(`${uri}?query=test`, 'site.standard.publication'),
    ).toBeNull()
    expect(
      recordReference(
        'at://did:plc:example/site.standard.publication',
        'site.standard.publication',
      ),
    ).toBeNull()
    expect(
      recordReference('javascript:alert(1)', 'site.standard.publication'),
    ).toBeNull()
    expect(
      recordReference(
        'did:plc:example/site.standard.publication/self',
        'site.standard.publication',
      ),
    ).toBeNull()
  })
})

describe('Standard document covers', () => {
  const cid = 'bafkreigs2iqxve4g42tt5hqkdjcwjxc3fkf5yty74kmx42yugozk4kx3ny'
  const blob = {
    $type: 'blob',
    ref: { $link: cid },
    mimeType: 'image/jpeg',
    size: 41931,
  }

  it('reads both raw snapshot blobs and decoded live XRPC blobs', () => {
    expect(imageBlobCid(blob)).toBe(cid)
    expect(imageBlobCid(jsonToLex(blob))).toBe(cid)
  })

  it.each([
    null,
    {},
    { ...blob, ref: { $link: 'invalid' } },
    { ...blob, mimeType: 'text/html' },
  ])('ignores malformed or non-image blobs: %j', (value) => {
    expect(imageBlobCid(value)).toBeNull()
  })
})
