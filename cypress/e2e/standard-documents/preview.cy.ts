/// <reference types="cypress" />
import {
  mockLabelerServiceRecordResponse,
  mockOzoneDidDataResponse,
  mockOzoneMetaResponse,
  mockRecordResponse,
  mockRepoResponse,
  mockProfileResponse,
  SERVER_URL,
} from '../../support/api'

const did = 'did:plc:jttgywq7eusytkmurmjbum6h'
const uri = `at://${did}/site.standard.document/article`
const liveCid = 'bafyreifhjkivvt2r3bpqljq47r2pnouznn4beo2rtxxz6t2z2humv5hege'
const snapshotCid =
  'bafyreihxk6htaharm2dolbq5jmokvo4ghq5emv7nypwtg3wqfg3x3y2ali'
const coverCid = 'bafkreigs2iqxve4g42tt5hqkdjcwjxc3fkf5yty74kmx42yugozk4kx3ny'
const coverImage = {
  $type: 'blob',
  ref: { $link: coverCid },
  mimeType: 'image/jpeg',
  size: 41931,
}
const liveValue = {
  $type: 'site.standard.document',
  site: 'https://current.example',
  path: '/article',
  textContent: 'Live article body.\n\nA second paragraph with more detail.',
  description: 'A document preview for moderation.',
  title: 'Current article',
  publishedAt: '2026-10-12T09:00:00Z',
  coverImage,
  tags: ['atproto', 'A longer tag with\na line break.'],
}
const snapshot = {
  id: 1,
  cid: snapshotCid,
  value: {
    $type: 'site.standard.document',
    site: 'https://old.example',
    path: '/archived',
    textContent: 'Saved article body.',
    title: 'Archived article',
    publishedAt: '2026-10-10T09:00:00Z',
    coverImage,
  },
  ozoneValue: null,
  createdAt: '2026-10-11T09:00:00Z',
}

describe('Standard document previews and snapshots', () => {
  beforeEach(() => {
    cy.viewport(1440, 1200)
    // No test may reach a live moderation service or external link destination.
    const blocked = { statusCode: 503, body: { error: 'UnmockedTestRequest' } }
    cy.intercept('https://**', blocked)
    cy.intercept('**/img/feed_*/plain/**', {
      fixture: 'document-cover.svg',
      headers: { 'content-type': 'image/svg+xml' },
    })
    cy.intercept('**/xrpc/**', blocked)
    cy.intercept('**/api/**', blocked)
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.setting.listOptions*`, {
      options: [],
    })
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.moderation.queryEvents*`, {
      events: [],
    })
    cy.fixture('statuses.json').then((statuses) => {
      const status = statuses.multiCidLabeledProfile.subjectStatuses[0]
      cy.intercept(
        'GET',
        `${SERVER_URL}/tools.ozone.moderation.queryStatuses*`,
        {
          subjectStatuses: [
            {
              ...status,
              subject: {
                $type: 'com.atproto.repo.strongRef',
                uri,
                cid: liveCid,
              },
            },
          ],
        },
      )
    })
    cy.intercept('GET', '**/api/get-record-snapshot*', {
      uri,
      did,
      recordPath: 'site.standard.document/article',
      total: 1,
      count: 1,
      snapshots: [snapshot],
    }).as('snapshots')
    cy.intercept('GET', `${SERVER_URL}/com.atproto.server.getServiceAuth*`, {
      token: 'test-plugin-token',
    })

    cy.fixture('seed.json').then((seed) => {
      mockRepoResponse({ statusCode: 200, body: seed.carla.repo })
      mockProfileResponse({
        statusCode: 200,
        body: { did, handle: 'carla.test', displayName: 'Carla' },
      })
      mockRecordResponse({
        statusCode: 200,
        body: {
          uri,
          cid: liveCid,
          value: liveValue,
          blobs: [],
          indexedAt: '2026-10-12T09:00:00Z',
          moderation: {},
          repo: seed.carla.repo,
        },
      })
    })

    cy.fixture('auth.json').then((auth) => {
      mockOzoneMetaResponse({ statusCode: 200, body: auth.ozoneMetaResponse })
      mockOzoneDidDataResponse({
        statusCode: 200,
        body: auth.ozoneDidDataResponse,
      })
      mockLabelerServiceRecordResponse({
        statusCode: 200,
        body: auth.getLabelerRecordResponse,
      })
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const claims = btoa(
        JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
      )
      auth.createSessionResponse.accessJwt = `${header}.${claims}.test-signature`
      cy.intercept(
        'POST',
        `${SERVER_URL}/com.atproto.server.refreshSession`,
        auth.createSessionResponse,
      )
      cy.intercept(
        'GET',
        `${SERVER_URL}/com.atproto.server.getSession`,
        auth.createSessionResponse,
      )
      cy.visit(
        `http://127.0.0.1:3000/reports?quickOpen=${encodeURIComponent(uri)}`,
      )
      cy.login(auth)
    })
    cy.wait('@snapshots')
  })

  it('uses saved raw values and CID while a different live record exists, then resets to live', () => {
    cy.contains('Reported document')
    cy.contains('Current article')
    cy.get('img[alt="Document cover image"]')
      .should('have.attr', 'src')
      .and('include', `/${did}/${coverCid}@jpeg`)
    cy.get('img[alt="Document cover image"]').should(($image) => {
      expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0)
    })
    cy.contains('button', '1 snapshot').click()
    cy.contains('button', `CID: ${snapshotCid}`).click()
    cy.contains('Archived article')
    cy.contains('Current article').should('not.exist')
    cy.contains('dd', snapshotCid)
    cy.contains('a', 'https://old.example/archived').should(
      'have.attr',
      'href',
      'https://old.example/archived',
    )
    cy.get('[aria-label="Document text"]').should(
      'have.text',
      snapshot.value.textContent,
    )
    cy.contains('button', 'click to view live version').click()
    cy.contains('Current article')
    cy.contains('Archived article').should('not.exist')
    cy.contains('dd', liveCid)
  })

  it('renders an archived document and its cover when the live record has been deleted', () => {
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.moderation.getRecord*`, {
      statusCode: 400,
      body: { error: 'RecordNotFound', message: 'Record not found' },
    })
    cy.reload()
    cy.contains('button', '1 snapshot').click()
    cy.contains('button', `CID: ${snapshotCid}`).click()
    cy.contains('Archived article')
    cy.contains('dd', snapshotCid)
    cy.get('img[alt="Document cover image"]').should('exist')
    cy.contains('a', 'https://old.example/archived').should(
      'have.attr',
      'href',
      'https://old.example/archived',
    )
    cy.get('[aria-label="Document text"]').should(
      'have.text',
      snapshot.value.textContent,
    )
  })

  it('preserves snapshots after a live refetch fails and does not present cached content as live', () => {
    cy.contains('Current article')
    cy.contains('button', '1 snapshot').click()
    cy.contains('button', `CID: ${snapshotCid}`).click()
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.moderation.getRecord*`, {
      statusCode: 400,
      body: { error: 'RecordNotFound', message: 'Record not found' },
    }).as('deletedRecord')
    cy.window().then((win) => win.dispatchEvent(new win.Event('focus')))
    cy.wait('@deletedRecord')
    cy.contains('Archived article')
    cy.contains('button', 'click to view live version').click()
    cy.contains('Archived article').should('not.exist')
    cy.contains('Current article').should('not.exist')
    cy.contains('Record not available')
  })

  it('resolves publication references and applies label-based media preferences', () => {
    const publicationUri = `at://${did}/site.standard.publication/self`
    cy.fixture('seed.json').then((seed) => {
      const metadata = {
        blobs: [],
        indexedAt: '2026-10-12T09:00:00Z',
        moderation: {},
        repo: seed.carla.repo,
      }
      mockRecordResponse({
        statusCode: 200,
        body: {
          ...metadata,
          uri,
          cid: liveCid,
          value: { ...liveValue, site: publicationUri },
          labels: [{ src: did, uri, val: 'porn', cts: '2026-10-12T09:00:00Z' }],
        },
      })
      mockRecordResponse({
        statusCode: 200,
        body: {
          ...metadata,
          uri: publicationUri,
          cid: liveCid,
          value: {
            $type: 'site.standard.publication',
            url: 'https://publication.example/blog/',
            name: 'Example publication',
          },
        },
      })
    })
    cy.reload()
    cy.contains('Example publication')
    cy.contains('a', 'https://publication.example/blog/article').should(
      'have.attr',
      'href',
      'https://publication.example/blog/article',
    )
    cy.get('img[alt="Document cover image"]').should('have.class', 'blur-sm')
    cy.contains('button', '1 snapshot').click()
    cy.contains('button', `CID: ${snapshotCid}`).click()
    cy.contains('Archived article')
    cy.get('img[alt="Document cover image"]').should('have.class', 'blur-sm')
    cy.contains('button', 'click to view live version').click()
    cy.get('img[alt="Document cover image"]').should('have.class', 'blur-sm')
  })

  it('keeps the article visible when its publication cannot be fetched', () => {
    cy.fixture('seed.json').then((seed) => {
      mockRecordResponse({
        statusCode: 200,
        body: {
          uri,
          cid: liveCid,
          value: {
            ...liveValue,
            site: `at://${did}/site.standard.publication/missing`,
          },
          blobs: [],
          indexedAt: '2026-10-12T09:00:00Z',
          moderation: {},
          repo: seed.carla.repo,
        },
      })
    })
    cy.reload()
    cy.contains('Current article')
    cy.contains('Publication unavailable.')
    cy.get('[aria-label="Document text"]').should(
      'have.text',
      liveValue.textContent,
    )
    cy.contains('dt', 'Source URL').should('not.exist')
  })
})
