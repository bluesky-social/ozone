import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AppBskyActorDefs } from '@atproto/api'
import { describe, expect, it } from 'vitest'
import { ProfileLinks } from './ProfileLinks'
import { getSupportProvider } from './providers'

const link: AppBskyActorDefs.ProfileLinkView = {
  uri: 'at://did:plc:example/app.bsky.actor.link/website',
  cid: 'bafyexample',
  url: 'https://example.com/about?a=1&b=2',
  title: 'My website',
  icon: 'https://cdn.bsky.app/img/avatar/plain/example/icon@jpeg',
}

describe('ProfileLinks', () => {
  it('opens the destination through Safelink and reviews the separate link record', () => {
    const markup = renderToStaticMarkup(<ProfileLinks links={[link]} />)
    expect(markup).toContain(
      `href="https://go.bsky.app/redirect?u=${encodeURIComponent(link.url)}"`,
    )
    expect(markup).toContain('rel="noopener noreferrer"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('>My website</bdi>')
    expect(markup).toContain(`src="${link.icon}"`)
    expect(markup).toContain(
      'href="/repositories/did%3Aplc%3Aexample/app.bsky.actor.link/website"',
    )
    expect(markup).not.toContain(`href="${link.uri}"`)
  })

  it('preserves profile order, falls back to hostnames, and keeps labeled links reviewable', () => {
    const markup = renderToStaticMarkup(
      <ProfileLinks
        links={[
          { ...link, title: undefined, icon: undefined },
          {
            ...link,
            uri: link.uri.replace('website', 'support'),
            url: 'https://ko-fi.com/creator',
            title: undefined,
            labels: [
              {
                src: 'did:plc:labeler',
                uri: link.uri,
                val: 'porn',
                cts: '2026-10-20T00:00:00Z',
              },
            ],
          },
        ]}
      />,
    )
    expect(markup.indexOf('>example.com</bdi>')).toBeLessThan(
      markup.indexOf('>Support on Ko-fi</bdi>'),
    )
    expect(markup).toContain('bg-green-100')
    expect(markup).not.toContain('<img')
    expect(markup).toContain('Review link: Support on Ko-fi')
  })

  it.each([undefined, []])('renders nothing without links: %s', (links) => {
    expect(renderToStaticMarkup(<ProfileLinks links={links} />)).toBe('')
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'http://example.com',
    'at://did:plc:example',
    'https://',
  ])('does not open invalid or non-HTTPS destinations: %s', (url) => {
    expect(
      renderToStaticMarkup(<ProfileLinks links={[{ ...link, url }]} />),
    ).toBe('')
  })

  it('does not load invalid icons or create review shortcuts for other record types', () => {
    const markup = renderToStaticMarkup(
      <ProfileLinks
        links={[
          {
            ...link,
            uri: 'https://wrong.example/',
            icon: 'javascript:alert(1)',
          },
        ]}
      />,
    )
    expect(markup).not.toContain('<img')
    expect(markup).not.toContain('Review link:')
    expect(markup).not.toContain('wrong.example')
    expect(markup).toContain('>My website</bdi>')
  })
})

describe('support provider matching', () => {
  it.each([
    ['https://ko-fi.com/creator', 'Ko-fi'],
    ['https://artist.itch.io/', 'itch.io'],
    ['https://paypal.com/paypalme/creator', 'PayPal'],
    ['https://chuffed.org/project/help', 'Chuffed'],
    ['https://ko-fi.com/', undefined],
    ['https://www.patreon.com/', undefined],
    ['https://ko-fi.com.evil.example/creator', undefined],
    ['https://ko-fi.com@evil.example/creator', undefined],
    ['https://paypal.com/unrelated', undefined],
    ['https://chuffed.org/project/', undefined],
  ])('classifies %s as %s', (url, expected) => {
    expect(getSupportProvider(new URL(url))).toBe(expected)
  })
})
