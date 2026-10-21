import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProfileLinkCard } from './ProfileLinkCard'

vi.mock('../CopyButton', () => ({
  CopyButton: ({ text }: { text: string }) => <button data-copy-text={text} />,
}))

const record = {
  $type: 'app.bsky.actor.link',
  uri: 'at://did:plc:example/app.bsky.actor.link/self',
  title: 'Website',
  createdAt: '2026-10-15T12:00:00Z',
}

describe('ProfileLinkCard', () => {
  it('displays, opens, and copies url rather than the record AT URI', () => {
    const url = 'https://example.com/about'
    const markup = renderToStaticMarkup(
      <ProfileLinkCard value={{ ...record, url }} />,
    )

    expect(markup).toContain(`href="${url}"`)
    expect(markup).toContain(`>${url}</span>`)
    expect(markup).toContain(`data-copy-text="${url}"`)
    expect(markup).toContain('>example.com</span>')
    expect(markup).not.toContain(record.uri)
    expect(markup).not.toContain('Missing or invalid HTTP(S) URL.')
  })

  it.each([undefined, null, 42, 'javascript:alert(1)', 'https://'])(
    'does not fall back to uri when url is invalid: %s',
    (url) => {
      const markup = renderToStaticMarkup(
        <ProfileLinkCard
          value={{ ...record, uri: 'https://wrong.example/', url }}
        />,
      )

      expect(markup).toContain('Missing or invalid HTTP(S) URL.')
      expect(markup).not.toContain('href=')
      expect(markup).not.toContain('wrong.example')
    },
  )
})
