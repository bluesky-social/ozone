/// <reference types="cypress" />

import { SERVER_URL } from '../../support/api'

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
  range = 'startDate=2026-09-20&endDate=2026-09-21',
) {
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
    queues: [],
  }).as('queues')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
    stats: { ...refreshed, lastUpdated: refreshed.computedAt },
  }).as('liveStats')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`, {
    stats: [refreshed, legacy],
  }).as('historicalStats')
  cy.visit(
    `${BASE_URL}/analytics/detail?grouping=aggregate&preset=custom&${range}`,
  )
  cy.fixture('auth.json').then((auth) => {
    auth.ozoneServerConfigResponse.viewer.role = `tools.ozone.team.defs#${role}`
    cy.login(auth)
  })
  cy.wait(['@liveStats', '@historicalStats', '@queues'])
}

function confirmRefresh() {
  cy.contains('button', 'Recompute stats').click()
  cy.get('[role="dialog"]').within(() => {
    cy.contains(
      'aggregate totals, categories, and active queues and moderators',
    ).should('be.visible')
    cy.contains('current pending counts').should('be.visible')
    cy.contains('button', /^Recompute$/).click()
  })
}

describe('Report statistics recomputation', () => {
  it('recomputes inclusive UTC dates serially and reloads the statistics', () => {
    visitStats('roleModerator')
    cy.get('[data-cy="historical-stats"]').within(() => {
      cy.contains('1 of 2 daily snapshots').should('be.visible')
      cy.contains('span', 'Actioned').parent().should('contain', '33%')
      cy.contains('900').should('not.exist')
    })
    let completed = 0
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.report.refreshStats`,
      (req) => {
        expect(req.body).to.deep.equal({
          startDate: `2026-09-${20 + completed}`,
          endDate: `2026-09-${20 + completed}`,
        })
        req.on('after:response', () => {
          completed++
        })
        req.reply({ body: {}, delay: 100 })
      },
    ).as('refreshStats')
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`,
      {
        stats: [refreshed, { ...refreshed, date: legacy.date }],
      },
    ).as('updatedHistory')

    confirmRefresh()
    cy.contains('button', 'Recompute stats').should('be.disabled')
    cy.wait(['@refreshStats', '@refreshStats'])
    cy.wait(['@updatedHistory', '@liveStats', '@queues'])
    cy.contains('Recomputed stats for 2 days.').should('be.visible')
    cy.contains('daily snapshots use older').should('not.exist')
  })

  it('stops on an error and reloads days that already completed', () => {
    visitStats('roleAdmin', 'startDate=2026-09-20&endDate=2026-09-22')
    const attempted: string[] = []
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.report.refreshStats`,
      (req) => {
        attempted.push(req.body.startDate)
        req.reply(
          attempted.length === 1
            ? { body: {} }
            : { statusCode: 500, body: { error: 'InternalServerError' } },
        )
      },
    ).as('refreshStats')

    confirmRefresh()
    cy.wait(['@refreshStats', '@refreshStats'])
    cy.contains(
      '[role="alert"]',
      'Recomputation stopped on 2026-09-21.',
    ).should('contain', '1 of 3 days completed.')
    cy.wait(['@historicalStats', '@liveStats'])
    cy.contains('button', 'Recompute stats').should('be.enabled')
    cy.then(() => expect(attempted).to.deep.equal(['2026-09-20', '2026-09-21']))
  })

  it('does not combine legacy outcomes with refreshed metrics', () => {
    visitStats()
    cy.get('[data-cy="historical-stats"]').within(() => {
      cy.contains('span', 'Inbound').parent().should('contain', '15')
      cy.contains('span', 'Closed').parent().should('contain', '3')
      cy.contains('span', 'Actioned').parent().should('contain', '33%')
      cy.contains('900').should('not.exist')
    })
  })

  for (const [name, range] of [
    ['reversed', 'startDate=2026-09-21&endDate=2026-09-20'],
    ['too long', 'startDate=2026-01-01&endDate=2026-09-21'],
    ['incomplete', 'startDate=2026-09-20'],
  ]) {
    it(`disables recomputation when the date range is ${name}`, () => {
      visitStats('roleAdmin', range)
      cy.contains('button', 'Recompute stats').should('be.disabled')
      cy.contains('Select a date range of 1 to 100 days').should('be.visible')
    })
  }

  it('hides recomputation from triage users', () => {
    visitStats('roleTriage')
    cy.contains('button', 'Recompute stats').should('not.exist')
  })
})
