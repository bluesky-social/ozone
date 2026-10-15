/// <reference types="cypress" />
import React from 'react'
import '../../../styles/globals.css'
import { ProfileLinkCard } from '../../../components/common/profileLinks/ProfileLinkCard'

const value = {
  $type: 'app.bsky.actor.link',
  uri: 'https://portfolio.example/projects?source=profile#work',
  title: 'My portfolio',
  createdAt: '2026-10-12T09:00:00Z',
}

describe('<ProfileLinkCard />', () => {
  it('shows compact link details and offers navigation and copy controls', () => {
    cy.mount(<ProfileLinkCard value={value} />)

    cy.contains('My portfolio')
    cy.contains('dd', value.uri)
    cy.contains('dd', 'portfolio.example')
    cy.get('time').should('have.attr', 'datetime', value.createdAt)
    cy.contains('a', 'Open URL')
      .should('have.attr', 'href', value.uri)
      .and('have.attr', 'target', '_blank')
      .and('have.attr', 'rel', 'noopener noreferrer')
    cy.get('button[aria-label="Copy url"]').should('exist')
    cy.get('button[aria-label="Copy hostname"]').should('exist')
    cy.get('img, iframe, video').should('not.exist')
  })

  it('supports an omitted title without truncating evidence', () => {
    const longUrl = `https://portfolio.example/${'path/'.repeat(100)}`
    cy.mount(
      <ProfileLinkCard value={{ ...value, title: undefined, uri: longUrl }} />,
    )
    cy.contains('Untitled link')
    cy.contains('dd', longUrl)
    cy.contains('a', 'Open URL').should('have.attr', 'href', longUrl)
  })

  for (const destination of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    '//portfolio.example',
    'https://',
  ]) {
    it(`keeps an unsafe or malformed URL reviewable: ${destination}`, () => {
      cy.mount(<ProfileLinkCard value={{ ...value, uri: destination }} />)
      cy.contains('Missing or invalid HTTP(S) URL.')
      cy.contains('dd', destination)
      cy.contains('a', 'Open URL').should('not.exist')
    })
  }

  it('highlights the real hostname, credentials, HTTP, and a nonstandard port', () => {
    cy.mount(
      <ProfileLinkCard
        value={{
          ...value,
          uri: 'http://trusted.example:secret@evil.example:8080/path',
        }}
      />,
    )
    cy.contains('dd', 'evil.example')
    cy.contains('dd', '8080')
    cy.contains('Uses unencrypted HTTP.')
    cy.contains('URL contains credentials.')
  })

  it('shows the ASCII hostname for an internationalized domain', () => {
    cy.mount(
      <ProfileLinkCard value={{ ...value, uri: 'https://bücher.example/' }} />,
    )
    cy.contains('dd', 'xn--bcher-kva.example')
    cy.contains('Internationalized domain.')
    cy.contains('a', 'Open URL').should(
      'have.attr',
      'href',
      'https://xn--bcher-kva.example/',
    )
  })

  for (const malformed of [
    null,
    [],
    { uri: 42, title: {}, createdAt: 'not a date' },
  ]) {
    it(`handles malformed records: ${JSON.stringify(malformed)}`, () => {
      cy.mount(<ProfileLinkCard value={malformed} />)
      cy.contains('Missing or invalid HTTP(S) URL.')
      cy.contains('Missing or invalid creation time.')
      cy.contains('a', 'Open URL').should('not.exist')
    })
  }

  for (const createdAt of [
    '2026-10-12',
    '2026-10-12T09:00:00',
    '2026-10-12T09:00:00-00:00',
  ]) {
    it(`flags timestamps outside the AT Protocol datetime format: ${createdAt}`, () => {
      cy.mount(<ProfileLinkCard value={{ ...value, createdAt }} />)
      cy.contains('Missing or invalid creation time.')
      cy.contains('dd', createdAt)
      cy.get('time').should('not.exist')
    })
  }

  it('accepts a datetime with an explicit timezone and fractional seconds', () => {
    const createdAt = '2026-10-12T09:00:00.123456+01:45'
    cy.mount(<ProfileLinkCard value={{ ...value, createdAt }} />)
    cy.get('time').should('have.attr', 'datetime', createdAt)
    cy.contains('Missing or invalid creation time.').should('not.exist')
  })
})
