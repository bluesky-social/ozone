/// <reference types="cypress" />

import {
  mockLabelerServiceRecordResponse,
  mockOzoneDidDataResponse,
  mockOzoneMetaResponse,
  SERVER_URL,
} from '../../support/api'

const BASE_URL = 'http://127.0.0.1:3000'
const CURSOR = '1715600696530::1'

describe('Subject-status report sorting', () => {
  beforeEach(() => {
    // Block unmatched API requests so these tests never reach a live backend.
    const blockedRequest = {
      statusCode: 503,
      body: { error: 'UnmockedTestRequest' },
    }
    cy.intercept('https://**', blockedRequest)
    cy.intercept('**/xrpc/**', blockedRequest)
    cy.intercept('**/api/**', blockedRequest)
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.setting.listOptions*`, {
      options: [],
    })
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.moderation.queryStatuses*`,
      (req) => {
        expect(req.query.sortDirection).to.equal('desc')
        req.reply({
          subjectStatuses: [],
          cursor: req.query.cursor ? undefined : CURSOR,
        })
      },
    ).as('queryStatuses')

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
      cy.visit(`${BASE_URL}/reports`)
      cy.login(auth)
    })
    cy.wait('@queryStatuses')
  })

  it('keeps timestamp headers descending when clicked repeatedly', () => {
    cy.contains('thead a', 'Last Reported')
      .should('have.attr', 'href')
      .and('include', 'sortDirection=desc')
    cy.contains('thead a', 'Last Reported').click()
    cy.contains('thead a', 'Last Reported').click()
    cy.location('search').should('include', 'sortDirection=desc')

    cy.contains('thead a', 'Last Reviewed/Note').click()
    cy.wait('@queryStatuses')
      .its('request.query.sortField')
      .should('equal', 'lastReviewedAt')
    cy.contains('thead a', 'Last Reviewed/Note').click()
    cy.location('search').should('include', 'sortDirection=desc')

    cy.contains('thead a', 'Last Reported').click()
    cy.location('search').should('include', 'sortDirection=desc')
  })

  it('offers only descending summary sorts', () => {
    cy.contains('thead button', 'Summary').click()
    cy.contains('button', 'Ascending').should('not.exist')

    for (const [title, field] of [
      ['Reported records count', 'reportedRecordsCount'],
      ['Takendown records count', 'takendownRecordsCount'],
      ['Priority score', 'priorityScore'],
    ]) {
      cy.contains('p', title).parent().contains('button', 'Descending').click()
      cy.wait('@queryStatuses')
        .its('request.query.sortField')
        .should('equal', field)
      cy.location('search').should('include', 'sortDirection=desc')
    }
  })

  for (const field of [
    'lastReportedAt',
    'lastReviewedAt',
    'reportedRecordsCount',
    'takendownRecordsCount',
    'priorityScore',
  ]) {
    it(`uses descending ${field} for old ascending URLs and pagination`, () => {
      cy.visit(`${BASE_URL}/reports?sortField=${field}&sortDirection=asc`)
      cy.wait('@queryStatuses')
        .its('request.query.sortField')
        .should('equal', field)

      cy.contains('button', 'Load more').click()
      cy.wait('@queryStatuses').then(({ request }) => {
        expect(request.query.sortField).to.equal(field)
        expect(request.query.cursor).to.equal(CURSOR)
      })
    })
  }
})
