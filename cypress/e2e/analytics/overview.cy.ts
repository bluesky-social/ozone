/// <reference types="cypress" />

import {
  SERVER_URL,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockLabelerServiceRecordResponse,
} from '../../support/api'

const BASE_URL = Cypress.env('BASE_URL') || 'http://127.0.0.1:3000'
const snapshot = {
  lastUpdated: '2026-10-14T15:00:00.000Z',
  inboundCount: 375,
  pendingCount: 2400,
  closedCount: 100,
  acknowledgedCount: 70,
  actionedCount: 30,
  escalatedCount: 4,
  avgHandlingTimeSec: 960,
  closureTargetOverdueCount: 250,
  closureTargetMetCount: 6,
  closureTargetMissedCount: 2,
}

function visitOverview(stats: object) {
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
    queues: [],
  })
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
    stats,
  }).as('liveStats')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`, {
    stats: [],
  })
  cy.fixture('auth.json').then((auth) => {
    mockOzoneMetaResponse({ body: auth.ozoneMetaResponse })
    mockOzoneDidDataResponse({ body: auth.ozoneDidDataResponse })
    mockLabelerServiceRecordResponse({ body: auth.getLabelerRecordResponse })
    cy.intercept('POST', `${SERVER_URL}/com.atproto.server.refreshSession`, {
      body: auth.createSessionResponse,
    })
    cy.visit(`${BASE_URL}/analytics`, {
      onBeforeLoad(win) {
        win.localStorage.theme = 'light'
      },
    })
    cy.login(auth)
  })
  cy.get('[data-cy="overview-metrics"]').should('be.visible')
}

function expectMetric(label: string, value: string) {
  cy.contains('dt', new RegExp(`^${label}$`))
    .siblings('dd')
    .first()
    .should('have.text', value)
}

describe('Analytics overview cards', () => {
  it('shows the current backlog and target attainment among targeted closures, in both themes and on mobile', () => {
    cy.viewport(1440, 1000)
    visitOverview(snapshot)
    cy.get('[data-cy="overview-metrics"]').within(() => {
      cy.get('dt').then((labels) => {
        expect([...labels].map((label) => label.textContent)).to.deep.equal([
          'Inbound',
          'Pending',
          'Closed',
          'Escalated',
          'Avg handling time',
          'Closure Target',
        ])
      })
      expectMetric('Inbound', '375')
      expectMetric('Pending', '2,400')
      expectMetric('Closed', '100')
      expectMetric('Escalated', '4')
      expectMetric('Avg handling time', '16m')
      expectMetric('Closure Target', '75%')
      cy.contains('250 past closure target').should('be.visible')
      cy.contains('70 acknowledged · 30 actioned').should('be.visible')
      cy.contains('6 of 8 targeted closures met').should('be.visible')
      cy.contains('Updated 2026-10-14 15:00:00 UTC.').should('be.visible')
      cy.get('dd').first().should('have.css', 'color', 'rgb(17, 24, 39)')
    })
    cy.get('[data-cy="overview-metrics"]').screenshot('overview-cards-light')
    cy.document().then((doc) => doc.documentElement.classList.add('dark'))
    cy.get('[data-cy="overview-metrics"] dd')
      .first()
      .should('have.css', 'color', 'rgb(243, 244, 246)')
    cy.get('[data-cy="overview-metrics"] h2').should(
      'have.css',
      'color',
      'rgb(243, 244, 246)',
    )
    cy.get('[data-cy="overview-metrics"]').screenshot('overview-cards-dark')
    cy.viewport(375, 812)
    cy.get('[data-cy="overview-metrics"]').then(($el) => {
      expect($el[0].scrollWidth).to.be.at.most($el[0].clientWidth)
    })
    cy.get('[data-cy="overview-metrics"]').screenshot('overview-cards-mobile')
  })

  it('shows unavailable metrics for a legacy snapshot', () => {
    visitOverview({
      lastUpdated: snapshot.lastUpdated,
      inboundCount: 10,
      pendingCount: 20,
      actionedCount: 30,
      avgHandlingTimeSec: 50,
    })
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectMetric('Pending', '20')
      expectMetric('Closed', '—')
      expectMetric('Escalated', '—')
      expectMetric('Avg handling time', '—')
      expectMetric('Closure Target', '—')
      cy.contains('Target results unavailable').should('be.visible')
    })
  })

  it('does not present a zero percent success rate when no targeted reports closed', () => {
    visitOverview({
      ...snapshot,
      closureTargetMetCount: 0,
      closureTargetMissedCount: 0,
    })
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectMetric('Closure Target', '—')
      cy.contains('No closed reports with a target').should('be.visible')
    })
  })
})
