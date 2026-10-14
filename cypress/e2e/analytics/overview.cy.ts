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

function visitOverview(stats: object, history: object[] = []) {
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
    queues: [],
  })
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
    stats,
  }).as('liveStats')
  cy.intercept(
    'GET',
    `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`,
    (req) => {
      if (req.query.limit === '30' && !req.query.reportTypes) {
        req.alias = 'overviewHistory'
        req.reply({ stats: history })
      } else {
        req.reply({ stats: [] })
      }
    },
  )
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
    cy.viewport(1280, 900)
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
    cy.get('[data-cy="overview-metrics"]').scrollIntoView()
    cy.get('[data-cy="overview-metrics"]')
      .should('be.visible')
      .screenshot('overview-cards-mobile')
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

const history = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 8, 15 + i)).toISOString().slice(0, 10),
  inboundCount: 100 + (i % 7) * 30,
  closedCount: i === 29 ? 400 : 40,
  actionedCount: i === 29 ? 370 : 10,
  acknowledgedCount: 30,
  labelActionCount: i === 29 ? 70 : 5,
  tagActionCount: i === 29 ? 100 : 1,
  takedownActionCount: i === 29 ? 200 : 4,
}))

describe('Overview activity panels', () => {
  beforeEach(() => cy.clock(Date.UTC(2026, 9, 14, 23, 30), ['Date']))

  it('compares daily flows and weighted closure outcomes over the same UTC window', () => {
    cy.viewport(1280, 900)
    visitOverview(snapshot, [...history].reverse())
    cy.wait('@overviewHistory').its('request.query').should('deep.equal', {
      startDate: '2026-09-15T00:00:00.000Z',
      endDate: '2026-10-14T00:00:00.000Z',
      limit: '30',
    })
    cy.get('[data-cy="inbound-closed-chart"]').within(() => {
      cy.contains('Last 30 days').should('contain', 'Today is partial')
      cy.get('tbody tr')
        .should('have.length', 30)
        .first()
        .should('contain', '2026-09-15')
      cy.get('.recharts-bar').should('have.length', 2)
      cy.contains('button', /^Closed$/).click()
      cy.contains('button', /^Closed$/).should(
        'have.attr',
        'aria-pressed',
        'false',
      )
      cy.get('.recharts-bar').should('have.length', 1)
      cy.contains('button', /^Closed$/).click()
      cy.get('.recharts-bar').should('have.length', 2)
    })
    cy.get('[data-cy="closure-breakdown"]').within(() => {
      cy.get('[data-cy="closure-action-rate"]').should('have.text', '42%')
      cy.contains('1,560 closed reports').should('be.visible')
      for (const [label, value] of [
        ['Actioned', '660'],
        ['Acknowledged', '900'],
        ['Label', '215'],
        ['Tag', '129'],
        ['Takedown', '316'],
      ]) {
        cy.contains('dt', new RegExp(`^${label}$`))
          .siblings('dd')
          .should('have.text', value)
      }
      cy.contains('of 30 days').should('not.exist')
    })
    cy.get('[data-cy="inbound-closed-chart"]').parent().scrollIntoView()
    cy.get('[data-cy="inbound-closed-chart"]')
      .parent()
      .should('be.visible')
      .screenshot('overview-activity-light')
    cy.document().then((doc) => doc.documentElement.classList.add('dark'))
    cy.get('[data-cy="inbound-closed-chart"] h2').should(
      'have.css',
      'color',
      'rgb(243, 244, 246)',
    )
    cy.get('[data-cy="closure-breakdown"] h2').should(
      'have.css',
      'color',
      'rgb(243, 244, 246)',
    )
    cy.get('[data-cy="inbound-closed-chart"]')
      .parent()
      .should('be.visible')
      .screenshot('overview-activity-dark')
    cy.viewport(375, 812)
    cy.get('[data-cy="inbound-closed-chart"]').scrollIntoView()
    cy.get('[data-cy="inbound-closed-chart"]').then(($el) => {
      expect($el[0].scrollWidth).to.be.at.most($el[0].clientWidth)
    })
    cy.get('[data-cy="inbound-closed-chart"]').screenshot(
      'overview-activity-mobile',
    )
  })

  it('preserves missing and legacy values and labels matching outcome coverage', () => {
    visitOverview(snapshot, [
      { date: '2026-09-15', inboundCount: 7, actionedCount: 900 },
      {
        date: '2026-10-13',
        inboundCount: 0,
        closedCount: 10,
        actionedCount: 2,
        acknowledgedCount: 8,
        labelActionCount: 1,
        tagActionCount: 1,
        takedownActionCount: 0,
      },
      {
        date: '2026-10-14',
        inboundCount: 15,
        closedCount: 90,
        actionedCount: 81,
        acknowledgedCount: 9,
        labelActionCount: 50,
        takedownActionCount: 31,
      },
    ])
    cy.get('[data-cy="inbound-closed-chart"]').scrollIntoView()
    cy.get('[data-cy="inbound-closed-chart"]').within(() => {
      cy.contains('Some daily counts are unavailable').should('be.visible')
      cy.contains('tbody th', '2026-09-15')
        .siblings('td')
        .eq(1)
        .should('have.text', 'Unavailable')
      cy.contains('tbody th', '2026-09-16')
        .siblings('td')
        .first()
        .should('have.text', 'Unavailable')
      cy.contains('tbody th', '2026-10-13')
        .siblings('td')
        .first()
        .should('have.text', '0')
    })
    cy.get('[data-cy="closure-breakdown"]').scrollIntoView()
    cy.get('[data-cy="closure-breakdown"]').within(() => {
      cy.get('[data-cy="closure-action-rate"]').should('have.text', '83%')
      cy.contains(
        'Comparable closure outcomes available for 2 of 30 days.',
      ).should('be.visible')
      cy.contains('Action types available for 1 of 30 days.').should(
        'be.visible',
      )
      cy.contains('dt', /^Label$/)
        .siblings('dd')
        .should('have.text', '1')
    })
  })

  it('keeps an empty historical response unavailable', () => {
    visitOverview(snapshot)
    cy.get('[data-cy="inbound-closed-chart"]').should(
      'contain',
      'No daily stats available for the last 30 days.',
    )
    cy.get('[data-cy="closure-breakdown"]').scrollIntoView()
    cy.get('[data-cy="closure-breakdown"]').within(() => {
      cy.get('[data-cy="closure-action-rate"]').should('have.text', '—')
      cy.contains('Closure outcomes unavailable.').should('be.visible')
      cy.contains('dt', /^Label$/)
        .siblings('dd')
        .should('have.text', '—')
    })
  })
})
