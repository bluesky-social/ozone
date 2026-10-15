/// <reference types="cypress" />

import {
  SERVER_URL,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockLabelerServiceRecordResponse,
} from '../../support/api'

const BASE_URL = Cypress.env('BASE_URL') || 'http://127.0.0.1:3000'
const stats = {
  lastUpdated: '2026-10-14T15:00:00.000Z',
  inboundCount: 375,
  pendingCount: 2400,
  closedCount: 100,
  acknowledgedCount: 70,
  actionedCount: 30,
  escalatedCount: 4,
  avgHandlingTimeSec: 960,
  avgResolutionTimeSec: 7200,
  closureTargetOverdueCount: 250,
  closureTargetMetCount: 6,
  closureTargetMissedCount: 2,
}

it('reuses the compact summary in queue lists and keeps it visible above queue reports', () => {
  cy.clock(Date.UTC(2026, 9, 14, 23, 30), ['Date'])
  cy.viewport(1280, 900)
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
    queues: [
      {
        id: 1,
        name: 'Review queue',
        createdBy: 'did:plc:tfeay256xpz3vf5v5d3cxykt',
        createdAt: stats.lastUpdated,
        updatedAt: stats.lastUpdated,
        enabled: true,
        stats,
      },
    ],
  })
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
    stats,
  }).as('liveStats')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.getAssignments*`, {
    assignments: [],
  })
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.queryReports*`, {
    reports: [],
  }).as('reports')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.team.listMembers*`, {
    members: [],
  })
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.setting.listOptions*`, {
    options: [],
  })
  cy.fixture('auth.json').then((auth) => {
    mockOzoneMetaResponse({ body: auth.ozoneMetaResponse })
    mockOzoneDidDataResponse({ body: auth.ozoneDidDataResponse })
    mockLabelerServiceRecordResponse({ body: auth.getLabelerRecordResponse })
    cy.intercept('POST', `${SERVER_URL}/com.atproto.server.refreshSession`, {
      body: auth.createSessionResponse,
    })
    cy.visit(`${BASE_URL}/queues`, {
      onBeforeLoad(win) {
        win.localStorage.theme = 'light'
      },
    })
    cy.login(auth)
  })
  cy.get('[data-cy="overview-metrics"]').should('have.length', 2)
  cy.get('[data-cy="overview-metrics"]').each(($summary) => {
    cy.wrap($summary).should('have.attr', 'data-layout', 'compact')
    cy.wrap($summary).within(() => {
      cy.get('dt').should('have.length', 6)
      cy.contains('Today (UTC)').should('not.exist')
      cy.get('time').should('have.attr', 'datetime', stats.lastUpdated)
      cy.get('time').should(
        'have.attr',
        'title',
        `Updated ${new Date(stats.lastUpdated).toLocaleString()}`,
      )
      for (const [metric, value] of [
        ['inboundCount', '375'],
        ['pendingCount', '2,400'],
        ['acknowledgedCount', '70'],
        ['actionedCount', '30'],
        ['escalatedCount', '4'],
        ['avgResolutionTimeSec', '2h'],
      ]) {
        cy.get(`[data-metric="${metric}"] [data-cy="metric-value"]`).should(
          'have.text',
          value,
        )
      }
      cy.get(
        '[data-metric="closedCount"], [data-metric="closureTargetMetRate"]',
      ).should('not.exist')
    })
  })
  cy.get('[data-cy="overview-metrics"]').first().should('be.visible')
  cy.screenshot('queue-summaries-light', { capture: 'viewport' })
  cy.document().then((doc) => doc.documentElement.classList.add('dark'))
  cy.get('[data-cy="overview-metrics"]').first().should('be.visible')
  cy.screenshot('queue-summaries-dark', { capture: 'viewport' })
  cy.viewport(375, 812)
  cy.get('[data-cy="queue-card"] h3').should('be.visible')
  cy.get('[data-layout="compact"]')
    .first()
    .find('[data-metric]')
    .then(($metrics) => {
      expect($metrics[5].getBoundingClientRect().top).to.be.greaterThan(
        $metrics[0].getBoundingClientRect().top,
      )
    })
  cy.document().then((doc) =>
    expect(doc.documentElement.scrollWidth).to.be.at.most(375),
  )
  cy.get('[data-cy="overview-metrics"]').first().should('be.visible')
  cy.screenshot('queue-summaries-mobile', { capture: 'viewport' })
  cy.viewport(1280, 900)
  cy.contains('[data-cy="queue-card"] a', 'Review queue').click()
  cy.wait('@reports').its('request.query.queueId').should('equal', '1')
  cy.get('[data-cy="overview-metrics"]')
    .should('have.length', 1)
    .and('be.visible')
    .and('have.attr', 'data-layout', 'compact')
  cy.get('[data-cy="overview-metrics"]')
    .should('contain', '2,400')
    .and('contain', '2h')
  cy.screenshot('queue-reports-summary', { capture: 'viewport' })
  cy.get('button[title="Expand queue details"]').click()
  cy.get('[data-cy="overview-metrics"]').should('have.length', 1)
  cy.get('@liveStats.all').then((requests) => {
    for (const req of requests)
      expect(req.request.query).not.to.have.property('queueId')
  })
})
