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
  }).as('queues')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
    stats: { ...refreshed, lastUpdated: refreshed.computedAt },
  }).as('liveStats')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`, {
    stats: [refreshed, legacy],
  }).as('historicalStats')
  cy.fixture('auth.json').then((auth) => {
    auth.ozoneServerConfigResponse.viewer.role = `tools.ozone.team.defs#${role}`
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
  cy.wait(['@liveStats', '@queues'])
  cy.wait('@historicalStats')
  cy.location('search').should('contain', 'preset=')
}

function confirmRefresh() {
  cy.contains('button', 'Recompute stats').click()
  cy.get('[role="dialog"]').within(() => {
    cy.contains(
      'aggregate totals, categories, and active queues and moderators',
    ).should('be.visible')
    cy.get('[role="alert"]').should(
      'contain',
      'Only the most recent 7 days of your selected range will be recomputed.',
    )
    cy.contains('button', /^Recompute$/).click()
  })
}

describe('Report statistics recomputation', () => {
  it('recomputes inclusive UTC dates serially and reloads the statistics', () => {
    visitStats('roleModerator')
    cy.get('[data-cy="historical-stats"]').within(() => {
      cy.contains('1 of 2 daily snapshots').should('be.visible')
    })
    let completed = 0
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.report.refreshStats`,
      (req) => {
        expect(req.body).to.deep.equal({
          startDate: `2026-09-${22 + completed}`,
          endDate: `2026-09-${22 + completed}`,
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
    visitStats('roleAdmin', 'startDate=2026-09-20&endDate=2026-09-23')
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
    ).should('contain', '1 of 4 days completed.')
    cy.wait(['@historicalStats', '@liveStats'])
    cy.contains('button', 'Recompute stats').should('be.enabled')
    cy.then(() => expect(attempted).to.deep.equal(['2026-09-20', '2026-09-21']))
  })

  for (const [name, startDate] of [
    ['seven days', '2026-09-15'],
    ['eight days', '2026-09-14'],
    ['30 days', '2026-08-23'],
    ['90 days', '2026-06-24'],
    ['more than 100 days', '2026-01-01'],
  ]) {
    it(`recomputes the latest seven selected days for ${name} without changing the range`, () => {
      visitStats('roleAdmin', `startDate=${startDate}&endDate=2026-09-21`)
      const attempted: string[] = []
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.report.refreshStats`,
        (req) => {
          attempted.push(req.body.startDate)
          expect(req.body).to.deep.equal({
            startDate: req.body.startDate,
            endDate: req.body.startDate,
          })
          req.reply({ body: {} })
        },
      ).as('refreshStats')
      cy.location('search').then((originalSearch) => {
        cy.contains('button', 'Recompute stats').click()
        cy.get('[role="dialog"]').within(() => {
          cy.get('[role="alert"]').should(
            'contain',
            'Only the most recent 7 days of your selected range will be recomputed.',
          )
          cy.contains('Recompute 2026-09-15 through 2026-09-21 (UTC)').should(
            'be.visible',
          )
          cy.then(() => expect(attempted).to.have.length(0))
          cy.contains('button', /^Recompute$/).click()
        })
        cy.wait(Array(7).fill('@refreshStats'))
        cy.contains('Recomputed stats for 7 days.').should('be.visible')
        cy.then(() =>
          expect(attempted).to.deep.equal([
            '2026-09-15',
            '2026-09-16',
            '2026-09-17',
            '2026-09-18',
            '2026-09-19',
            '2026-09-20',
            '2026-09-21',
          ]),
        )
        cy.get('input[type="date"]').first().should('have.value', startDate)
        cy.get('input[type="date"]').last().should('have.value', '2026-09-21')
        cy.location('search').should('equal', originalSearch)
      })
    })
  }

  it('leaves the range unchanged and sends no requests when cancelled', () => {
    visitStats('roleAdmin', 'startDate=2026-08-01&endDate=2026-08-30')
    const attempted: string[] = []
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.report.refreshStats`,
      (req) => {
        attempted.push(req.body.startDate)
        req.reply({ body: {} })
      },
    )
    cy.contains('button', 'Recompute stats').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('[role="alert"]').should('be.visible')
      cy.contains('Recompute 2026-08-24 through 2026-08-30 (UTC)').should(
        'be.visible',
      )
      cy.contains('button', 'Cancel').click()
    })
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('input[type="date"]').first().should('have.value', '2026-08-01')
    cy.get('input[type="date"]').last().should('have.value', '2026-08-30')
    cy.then(() => expect(attempted).to.have.length(0))
  })

  it('keeps the original preset controls and shows dates only for Custom', () => {
    visitStats('roleAdmin', 'preset=30d')
    for (const label of ['7 days', '30 days', '90 days', 'Custom']) {
      cy.contains('button', label).should('be.visible')
    }
    cy.get('input[type="date"]').should('not.exist')
    cy.get('[aria-label="Previous time window"]').should('not.exist')
    cy.get('[aria-label="Next time window"]').should('not.exist')
    cy.contains('button', '90 days').click()
    cy.wait('@historicalStats')
      .its('request.query.limit')
      .should('equal', '100')
    cy.location('search').should('contain', 'preset=90d')
    cy.contains('button', 'Recompute stats').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('[role="alert"]').should('be.visible')
      cy.contains('Recompute 2026-09-17 through 2026-09-23 (UTC)').should(
        'be.visible',
      )
      cy.contains('button', 'Cancel').click()
    })
    cy.location('search').should('contain', 'preset=90d')
    cy.contains('button', 'Custom').click()
    cy.get('input[type="date"]').should('have.length', 2)
    cy.contains('button', '7 days').click()
    cy.get('input[type="date"]').should('not.exist')
  })

  for (const [name, range] of [
    ['reversed', 'startDate=2026-09-21&endDate=2026-09-20'],
    ['incomplete', 'startDate=2026-09-20'],
    ['invalid', 'startDate=2026-02-30&endDate=2026-03-01'],
  ]) {
    it(`disables recomputation when the date range is ${name}`, () => {
      visitStats('roleAdmin', range)
      cy.contains('button', 'Recompute stats').should('be.disabled')
      cy.contains('Select a valid start and end date').should('be.visible')
    })
  }

  it('hides recomputation from triage users', () => {
    visitStats('roleTriage')
    cy.contains('button', 'Recompute stats').should('not.exist')
  })
})
