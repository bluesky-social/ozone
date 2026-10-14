/// <reference types="cypress" />
import React from 'react'
import '../../../styles/globals.css'
import { StandardDocumentCardView } from '../../../components/common/standardDocuments/StandardDocumentCard'
import { ImageList } from '../../../components/common/posts/ImageList'

const uri = 'at://did:plc:example/site.standard.document/article'
const cid = 'document-cid'
const value = {
  $type: 'site.standard.document',
  site: 'https://example.com/',
  path: '/posts/article',
  title: 'An example document',
  description: 'An introduction to this article.',
  textContent: 'The first paragraph.\n\nThe second paragraph.',
  publishedAt: '2026-10-14T06:53:48.000Z',
  updatedAt: '2026-10-14T09:00:00.000Z',
  tags: ['atproto', 'long-form'],
  bskyPostRef: {
    uri: 'at://did:plc:example/app.bsky.feed.post/discussion',
    cid: 'post-cid',
  },
}

describe('<StandardDocumentCardView />', () => {
  it('shows an article with complete text, metadata, source, discussion, and raw evidence', () => {
    cy.viewport(640, 1200)
    cy.fixture('document-cover.svg').then((svg) => {
      const coverUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`
      cy.mount(
        <StandardDocumentCardView
          uri={uri}
          cid={cid}
          value={value}
          cover={
            <ImageList
              images={[
                {
                  thumb: coverUrl,
                  fullsize: coverUrl,
                  alt: 'Document cover image',
                },
              ]}
              imageClassName="max-h-72 max-w-full rounded object-contain"
            />
          }
        />,
      )
    })
    cy.contains('h3', value.title)
    cy.contains(value.description)
    cy.get('[aria-label="Document text"]').should(
      'have.text',
      value.textContent,
    )
    cy.get('[aria-label="Tags"]')
      .should('contain', 'atproto')
      .and('contain', 'long-form')
    cy.get('time').first().should('have.attr', 'datetime', value.publishedAt)
    cy.get('time').last().should('have.attr', 'datetime', value.updatedAt)
    cy.contains('a', 'https://example.com/posts/article')
      .should('have.attr', 'href', 'https://example.com/posts/article')
      .and('have.attr', 'target', '_blank')
      .and('have.attr', 'rel', 'noopener noreferrer')
    cy.contains('a', 'View associated post').should(
      'have.attr',
      'href',
      '/repositories/did%3Aplc%3Aexample/app.bsky.feed.post/discussion',
    )
    cy.contains('dd', uri)
    cy.contains('dd', cid)
    if (Cypress.env('captureStandardDocuments')) {
      cy.get('article')
        .should('be.visible')
        .screenshot('standard-document-light')
      cy.document().then((doc) => doc.documentElement.classList.add('dark'))
      cy.get('article')
        .should('be.visible')
        .screenshot('standard-document-dark')
      cy.document().then((doc) => doc.documentElement.classList.remove('dark'))
    }
    cy.contains('summary', 'Raw record').click()
    cy.get('pre').should('have.text', JSON.stringify(value, null, 2))
  })

  it('uses the publication URL including its base path', () => {
    cy.mount(
      <StandardDocumentCardView
        uri={uri}
        cid={cid}
        value={{
          ...value,
          site: 'at://did:plc:example/site.standard.publication/self',
        }}
        publication={{
          name: 'Example publication',
          url: 'https://example.com/blog/',
        }}
      />,
    )
    cy.contains('Example publication')
    cy.contains('a', 'https://example.com/blog/posts/article')
    cy.contains('a', 'View publication')
  })

  it('keeps unsupported structured content reviewable without interpreting it', () => {
    const textContent = '<img src=x onerror="alert(1)">\n**plain text**'
    cy.mount(
      <StandardDocumentCardView
        uri={uri}
        cid={cid}
        value={{ ...value, textContent }}
      />,
    )
    cy.get('[aria-label="Document text"]').should('have.text', textContent)
    cy.get('article').find('img, iframe, script').should('not.exist')
  })

  it('explains missing text and unresolved publications', () => {
    cy.mount(
      <StandardDocumentCardView
        uri={uri}
        cid={cid}
        value={{
          ...value,
          site: 'at://did:plc:example/site.standard.publication/self',
          textContent: undefined,
          content: {
            $type: 'custom.content',
            html: '<script>alert(1)</script>',
          },
        }}
        publicationStatus="unavailable"
      />,
    )
    cy.contains('No plain-text content provided.')
    cy.contains('Structured content is available in the raw record.')
    cy.contains('Publication unavailable.')
    cy.contains('dt', 'Source URL').should('not.exist')
  })

  for (const malformed of [
    null,
    [],
    {
      title: {},
      site: 'javascript:alert(1)',
      textContent: [],
      publishedAt: 'invalid',
      tags: [null, {}, 'valid tag'],
      bskyPostRef: { uri: 'javascript:alert(1)' },
    },
  ]) {
    it(`keeps malformed records reviewable: ${JSON.stringify(malformed)}`, () => {
      cy.mount(
        <StandardDocumentCardView uri={uri} cid={cid} value={malformed} />,
      )
      cy.contains('Untitled document')
      cy.contains('summary', 'Raw record').click()
      cy.get('pre').should('have.text', JSON.stringify(malformed, null, 2))
      cy.get('a').should('not.exist')
    })
  }
})
