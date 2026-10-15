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
const uri = `at://${did}/app.bsky.actor.link/3link`
const liveCid = 'bafyreifhjkivvt2r3bpqljq47r2pnouznn4beo2rtxxz6t2z2humv5hege'
const snapshotCid =
  'bafyreihxk6htaharm2dolbq5jmokvo4ghq5emv7nypwtg3wqfg3x3y2ali'
const snapshot = {
  id: 1,
  cid: snapshotCid,
  value: {
    $type: 'app.bsky.actor.link',
    uri: 'https://old.example/archived',
    title: 'Archived portfolio',
    createdAt: '2026-10-10T09:00:00Z',
  },
  ozoneValue: null,
  createdAt: '2026-10-11T09:00:00Z',
}

describe('Profile link previews and snapshots', () => {
  beforeEach(() => {
    // No test may reach a live moderation service or external link destination.
    const blocked = { statusCode: 503, body: { error: 'UnmockedTestRequest' } }
    cy.intercept('https://**', blocked)
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
      recordPath: 'app.bsky.actor.link/3link',
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
          value: {
            $type: 'app.bsky.actor.link',
            uri: 'https://current.example/portfolio',
            title: 'Current portfolio',
            createdAt: '2026-10-12T09:00:00Z',
          },
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
      cy.visit(
        `http://127.0.0.1:3000/reports?quickOpen=${encodeURIComponent(uri)}`,
      )
      cy.login(auth)
    })
    cy.wait('@snapshots')
  })

  it('uses saved raw values and CID while a different live record exists, then resets to live', () => {
    cy.contains('Reported profile link')
    cy.contains('Current portfolio')
    if (Cypress.env('captureProfileLinks')) {
      cy.contains('p', 'Current portfolio')
        .closest('div.border')
        .should('be.visible')
        .screenshot('profile-link-live')
    }
    cy.contains('button', '1 snapshot').click()
    cy.contains('button', `CID: ${snapshotCid}`).click()
    cy.contains('Archived portfolio')
    cy.contains('Current portfolio').should('not.exist')
    cy.contains('dd', snapshotCid)
    cy.contains('a', 'Open URL').should('have.attr', 'href', snapshot.value.uri)
    cy.contains('button', 'click to view live version').click()
    cy.contains('Current portfolio')
    cy.contains('Archived portfolio').should('not.exist')
    cy.contains('dd', liveCid)
  })

  it('renders an archived link when the live record has been deleted', () => {
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.moderation.getRecord*`, {
      statusCode: 400,
      body: { error: 'RecordNotFound', message: 'Record not found' },
    })
    cy.reload()
    cy.contains('button', '1 snapshot').click()
    cy.contains('button', `CID: ${snapshotCid}`).click()
    cy.contains('Archived portfolio')
    cy.contains('dd', snapshotCid)
    cy.contains('a', 'Open URL').should('have.attr', 'href', snapshot.value.uri)
  })
})
