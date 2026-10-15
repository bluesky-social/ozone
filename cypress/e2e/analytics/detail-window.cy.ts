/// <reference types="cypress" />

import {
  SERVER_URL,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockLabelerServiceRecordResponse,
} from '../../support/api'

const BASE_URL = Cypress.env('BASE_URL') || 'http://127.0.0.1:3000'
const refreshed = {
  date: '2026-09-20',
  computedAt: '2026-09-22T00:00:00.000Z',
  inboundCount: 5,
  pendingCount: 2,
  closedCount: 3,
  actionedCount: 1,
  acknowledgedCount: 2,
  escalatedCount: 1,
  ahtDurationSec: 60,
  ahtSampleCount: 1,
  resolutionDurationSec: 600,
  resolutionSampleCount: 3,
}
const legacy = {
  date: '2026-09-21',
  computedAt: '2026-09-21T23:00:00.000Z',
  inboundCount: 10,
  pendingCount: 4,
  actionedCount: 900,
  actionRate: 9000,
  avgHandlingTimeSec: 900,
}

function visitStats(
  role = 'roleAdmin',
  range = 'startDate=2026-09-22&endDate=2026-09-23',
) {
  cy.clock(Date.UTC(2026, 8, 23, 12), ['Date'])
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
    queues: [],
  })
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
    stats: { ...refreshed, lastUpdated: refreshed.computedAt },
  }).as('liveStats')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`, {
    stats: [refreshed, legacy],
  }).as('historicalStats')
  cy.fixture('auth.json').then((auth) => {
    auth.ozoneServerConfigResponse.viewer.role = `tools.ozone.team.defs#${role}`
    cy.intercept('POST', `${SERVER_URL}/com.atproto.server.refreshSession`, {
      body: auth.createSessionResponse,
    })
    mockOzoneMetaResponse({
      body: auth.ozoneMetaResponse,
    })
    mockOzoneDidDataResponse({
      body: auth.ozoneDidDataResponse,
    })
    mockLabelerServiceRecordResponse({
      statusCode: 200,
      body: auth.getLabelerRecordResponse,
    })
    cy.visit(`${BASE_URL}/analytics/detail?${range}`)
    cy.login(auth)
  })
  cy.wait('@liveStats')
  cy.wait('@historicalStats')
  cy.location('search').should('contain', 'preset=')
}

describe('Report statistics date windows', () => {
  it('keeps legacy dates, navigates calendar periods, and restores them from the URL', () => {
    visitStats('roleAdmin', 'preset=30d')
    cy.location('search').should('contain', 'startDate=2026-08-24')
    for (const label of ['Day', 'Week', 'Month', 'Quarter']) {
      cy.contains('[aria-label="Statistics period"] button', label).should(
        'be.visible',
      )
    }
    cy.get('input[type="date"]').should('not.exist')
    cy.contains('[aria-label="Statistics period"] button', 'Quarter').click()
    cy.wait('@historicalStats')
      .its('request.query.limit')
      .should('equal', '100')
    cy.location('search').should('contain', 'period=quarter')
    cy.get('[aria-label="Selected time window"]').should(
      'contain',
      'Jul 1, 2026 – Sep 23, 2026',
    )
    cy.get('[aria-label="Next time window"]').should('be.disabled')
    cy.get('[aria-label="Previous time window"]').click()
    cy.get('[aria-label="Selected time window"]').should(
      'contain',
      'Apr 1, 2026 – Jun 30, 2026',
    )
    cy.location('search').should('contain', 'startDate=2026-04-01')
    cy.location('search').should('contain', 'endDate=2026-06-30')
    cy.get('[aria-label="Next time window"]').click()
    cy.get('[aria-label="Selected time window"]').should(
      'contain',
      'Jul 1, 2026 – Sep 23, 2026',
    )
    cy.go('back')
    cy.get('[aria-label="Selected time window"]').should(
      'contain',
      'Apr 1, 2026 – Jun 30, 2026',
    )
    cy.reload()
    cy.contains('[aria-label="Statistics period"] button', 'Quarter').should(
      'have.attr',
      'aria-pressed',
      'true',
    )
    cy.get('[aria-label="Selected time window"]').should(
      'contain',
      'Apr 1, 2026 – Jun 30, 2026',
    )
    cy.contains('[aria-label="Statistics period"] button', 'Day').click()
    cy.get('[aria-label="Selected time window"]').should(
      'have.text',
      'Jun 30, 2026 (UTC)',
    )
    cy.contains('[aria-label="Statistics period"] button', 'Week').click()
    cy.get('[aria-label="Selected time window"]').should(
      'contain',
      'Jun 29, 2026 – Jul 5, 2026',
    )
    cy.contains('[aria-label="Statistics period"] button', 'Month').click()
    cy.get('[aria-label="Selected time window"]').should(
      'contain',
      'Jul 1, 2026 – Jul 31, 2026',
    )
  })

  it('defaults to the current week and keeps the scope while moving the window', () => {
    cy.viewport(1280, 900)
    visitStats('roleAdmin', 'grouping=queue&queueId=4')
    cy.contains('[aria-label="Statistics period"] button', 'Week').should(
      'have.attr',
      'aria-pressed',
      'true',
    )
    cy.get('[aria-label="Selected time window"]').should(
      'contain',
      'Sep 21, 2026 – Sep 23, 2026',
    )
    cy.get('[aria-label="Next time window"]').should('be.disabled')
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`,
      {
        stats: [],
      },
    ).as('previousHistory')
    cy.get('[aria-label="Previous time window"]').click()
    cy.wait('@previousHistory').then(({ request }) => {
      expect(request.query.queueId).to.equal('4')
      expect(request.query.startDate).to.equal('2026-09-14T00:00:00.000Z')
      expect(request.query.endDate).to.equal('2026-09-20T00:00:00.000Z')
    })
    cy.location('search').should('contain', 'grouping=queue&queueId=4')
    cy.get('[aria-label="Next time window"]').click()
    cy.get('[aria-label="Selected time window"]').should(
      'contain',
      'Sep 21, 2026 – Sep 23, 2026',
    )
    cy.document().then((doc) => doc.documentElement.classList.remove('dark'))
    cy.get('[aria-label="Statistics period"]').should(
      'have.css',
      'background-color',
      'rgb(243, 244, 246)',
    )
    cy.screenshot('detail-window-light', { capture: 'viewport' })
    cy.document().then((doc) => doc.documentElement.classList.add('dark'))
    cy.get('[aria-label="Statistics period"]').should(
      'have.css',
      'background-color',
      'rgb(30, 41, 59)',
    )
    cy.screenshot('detail-window-dark', { capture: 'viewport' })
    cy.viewport(375, 812)
    cy.get('[aria-label="Previous time window"]').should('be.visible')
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(375)
    })
    cy.get('[aria-label="Selected time window"]').should('be.visible')
    cy.screenshot('detail-window-mobile', { capture: 'viewport' })
  })

  for (const [name, range] of [
    ['reversed', 'startDate=2026-09-21&endDate=2026-09-20'],
    ['incomplete', 'startDate=2026-09-20'],
    ['invalid', 'startDate=2026-02-30&endDate=2026-03-01'],
  ]) {
    it(`disables window navigation when the date range is ${name}`, () => {
      visitStats('roleAdmin', range)
      cy.get('[aria-label="Previous time window"]').should('be.disabled')
      cy.get('[aria-label="Next time window"]').should('be.disabled')
      cy.contains('[aria-label="Statistics period"] button', 'Day').click()
      cy.get('[aria-label="Previous time window"]').should('be.enabled')
    })
  }
})
