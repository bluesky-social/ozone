/// <reference types="cypress" />

import {
  SERVER_URL,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockLabelerServiceRecordResponse,
} from '../../support/api'

const BASE_URL = Cypress.env('BASE_URL') || 'http://127.0.0.1:3000'
const day = {
  date: '2026-10-10',
  computedAt: '2026-10-11T00:00:00.000Z',
  inboundCount: 10,
  closedCount: 10,
  actionedCount: 2,
  acknowledgedCount: 8,
  pendingCount: 100,
  closureTargetOverdueCount: 20,
  closureTargetMetCount: 1,
  closureTargetMissedCount: 1,
  ahtDurationSec: 600,
  ahtSampleCount: 2,
  resolutionDurationSec: 6000,
  resolutionSampleCount: 10,
}
const nextDay = {
  ...day,
  date: '2026-10-11',
  pendingCount: 1,
  closedCount: 90,
  actionedCount: 81,
  acknowledgedCount: 9,
  closureTargetMetCount: 18,
  closureTargetMissedCount: 0,
  ahtDurationSec: 800,
  ahtSampleCount: 8,
  resolutionDurationSec: 9000,
  resolutionSampleCount: 90,
}

function login(path: string, role: string) {
  cy.fixture('auth.json').then((auth) => {
    auth.ozoneServerConfigResponse.viewer.role = `tools.ozone.team.defs#${role}`
    mockOzoneMetaResponse({ body: auth.ozoneMetaResponse })
    mockOzoneDidDataResponse({ body: auth.ozoneDidDataResponse })
    mockLabelerServiceRecordResponse({
      statusCode: 200,
      body: auth.getLabelerRecordResponse,
    })
    cy.intercept('POST', `${SERVER_URL}/com.atproto.server.refreshSession`, {
      body: auth.createSessionResponse,
    })
    cy.visit(`${BASE_URL}${path}`)
    cy.login(auth)
  })
}

function visitStats(
  stats: object[] = [day, nextDay],
  role = 'roleAdmin',
  grouping = '',
) {
  cy.clock(Date.UTC(2026, 9, 12, 12), ['Date'])
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
    queues: [],
  })
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
    stats: {
      ...day,
      pendingCount: 17,
      closureTargetOverdueCount: 3,
      lastUpdated: '2026-10-12T11:50:00.000Z',
    },
  }).as('liveStats')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`, {
    stats,
  }).as('history')
  login(
    `/analytics/detail?startDate=2026-10-10&endDate=2026-10-11${grouping}`,
    role,
  )
  cy.wait('@history')
}

function expectHighlight(label: string, value: string) {
  cy.contains('dt', label)
    .parent()
    .find('[data-cy="metric-value"]')
    .should('have.text', value)
}

describe('Report analytics metrics', () => {
  it('shows live backlog separately from weighted range totals and daily charts', () => {
    cy.viewport(1280, 900)
    visitStats()
    cy.get('[aria-label="Analytics view"] input[value="trends"]').should(
      'be.checked',
    )
    cy.get('time').should('have.attr', 'datetime', '2026-10-12T11:50:00.000Z')
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectHighlight('Inbound', '20')
      expectHighlight('Closed', '100')
      expectHighlight('Pending', '17')
      cy.contains('[data-metric="pendingCount"]', '3 past closure target')
      cy.contains(
        '[data-metric="closedCount"]',
        '17 acknowledged · 83 actioned',
      )
      expectHighlight('Closure Target', '95%')
    })
    cy.get('[data-cy="detailed-metrics"]').should('not.exist')
    cy.get('[aria-label="Daily trends"]').then(($chart) => {
      expect($chart[0].getBoundingClientRect().top).to.be.lessThan(500)
    })
    cy.document().then((doc) => doc.documentElement.classList.remove('dark'))
    cy.get('[data-cy="overview-metrics"]').should('be.visible')
    cy.screenshot('analytics-detail-light', { capture: 'viewport' })
    cy.document().then((doc) => doc.documentElement.classList.add('dark'))
    cy.get('[data-cy="overview-metrics"]').should('be.visible')
    cy.screenshot('analytics-detail-dark', { capture: 'viewport' })
    cy.get('[data-cy="historical-stats"]').within(() => {
      cy.get('.recharts-yAxis').should('have.length', 2)
      cy.contains('tbody th', '2026-10-10')
        .siblings('td')
        .eq(2)
        .should('have.text', '100')
      cy.contains('tbody th', '2026-10-11')
        .siblings('td')
        .eq(2)
        .should('have.text', '1')
      cy.contains('button', /^Pending$/).click()
      cy.contains('button', /^Pending$/).should(
        'have.attr',
        'aria-pressed',
        'false',
      )
      cy.contains('button', /^Pending$/).click()
      cy.contains('button', /^Pending$/).should(
        'have.attr',
        'aria-pressed',
        'true',
      )
      cy.contains('button', /^Inbound$/).click()
      cy.contains('button', /^Inbound$/).should(
        'have.attr',
        'aria-pressed',
        'false',
      )
    })
    cy.contains(
      '[aria-label="Analytics view"] label',
      'Closure Targets',
    ).click()
    cy.get('[aria-label="Analytics view"] input[value="targets"]').should(
      'be.checked',
    )
    cy.get('[data-cy="overview-metrics"]')
      .should('have.attr', 'data-mode', 'targets')
      .within(() => {
        expectHighlight('Avg handling time', '2m')
        expectHighlight('Avg resolution time', '3m')
        expectHighlight('Target met', '19')
        expectHighlight('Target missed', '1')
        expectHighlight('Target met rate', '95%')
        expectHighlight('Past target', '3')
        cy.get(
          '[data-metric="pendingCount"], [data-metric="inboundCount"]',
        ).should('not.exist')
      })
    cy.get('[data-cy="historical-stats"]').within(() => {
      cy.contains('button', /^Pending$/).should('not.exist')
      cy.contains('button', /^Inbound$/).should('not.exist')
      cy.contains('button', /^Target met$/).should('be.visible')
      cy.contains('button', /^Target missed$/).should('be.visible')
    })
    cy.contains('[aria-label="Analytics view"] label', 'Trends').click()
    cy.get('[aria-label="Analytics view"] input[value="trends"]').should(
      'be.checked',
    )
    cy.get('[data-cy="overview-metrics"]')
      .should('have.attr', 'data-mode', 'trends')
      .within(() => {
        expectHighlight('Inbound', '20')
        expectHighlight('Pending', '17')
        cy.get('[data-metric="closureTargetMissedCount"]').should('not.exist')
      })
    cy.viewport(375, 812)
    cy.get('h1').scrollIntoView()
    cy.get('[aria-label="Daily trends"]').then(($chart) => {
      expect($chart[0].getBoundingClientRect().top).to.be.lessThan(1100)
    })
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(375),
    )
    cy.get('[aria-label="Analytics view"]').should('be.visible')
    cy.get('h1').scrollIntoView()
    cy.screenshot('analytics-detail-mobile', { capture: 'viewport' })
  })

  it('keeps the current pending snapshot when no historical rows are available', () => {
    visitStats([])
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectHighlight('Pending', '17')
      expectHighlight('Inbound', '—')
      expectHighlight('Closed', '—')
    })
    cy.get('[data-cy="detailed-metrics"]').should('not.exist')
    cy.contains(
      '[aria-label="Analytics view"] label',
      'Closure Targets',
    ).click()
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectHighlight('Target met', '—')
      expectHighlight('Target missed', '—')
      expectHighlight('Past target', '3')
    })
  })

  it('keeps partial metrics compatible across trends and target summaries', () => {
    visitStats([
      day,
      {
        date: '2026-10-11',
        inboundCount: 100,
        pendingCount: 0,
        actionedCount: 900,
        avgHandlingTimeSec: 9999,
      },
    ])
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectHighlight('Inbound', '110')
      expectHighlight('Closed', '10')
      expectHighlight('Closure Target', '50%')
      cy.contains('dt', 'Closed')
        .parent()
        .should('not.contain', 'Available for 1 of 2 days.')
    })
    cy.get('[data-cy="historical-stats"]').within(() => {
      cy.contains('tbody th', '2026-10-11')
        .siblings('td')
        .eq(2)
        .should('have.text', '0')
    })
    cy.contains(
      '[aria-label="Analytics view"] label',
      'Closure Targets',
    ).click()
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectHighlight('Avg handling time', '5m')
      expectHighlight('Avg resolution time', '10m')
      expectHighlight('Target met', '1')
      expectHighlight('Target missed', '1')
      expectHighlight('Target met rate', '50%')
    })
  })

  it('keeps unavailable legacy metrics distinct from zero', () => {
    visitStats([{ date: '2026-10-10', inboundCount: 5, actionedCount: 10 }])
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectHighlight('Closed', '—')
      expectHighlight('Closure Target', '—')
    })
    cy.get('[data-cy="historical-stats"]').within(() => {
      cy.contains('tbody th', '2026-10-10')
        .siblings('td')
        .eq(2)
        .should('have.text', 'Unavailable')
    })
    cy.contains(
      '[aria-label="Analytics view"] label',
      'Closure Targets',
    ).click()
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectHighlight('Target met', '—')
      expectHighlight('Target missed', '—')
      expectHighlight('Target met rate', '—')
      expectHighlight('Avg handling time', '—')
      expectHighlight('Avg resolution time', '—')
    })
    cy.contains('1 of 2 daily snapshots available').should('not.exist')
    cy.contains('No closure targets data for this range.').scrollIntoView()
    cy.contains('No closure targets data for this range.').should('be.visible')
  })

  it('does not send moderator filters for unauthorized deep links', () => {
    visitStats(
      [day],
      'roleModerator',
      '&grouping=moderator&moderatorDid=did:plc:other&queueId=9',
    )
    cy.get('@history')
      .its('request.query')
      .should((query) => {
        expect(query).not.to.have.property('moderatorDid')
        expect(query).not.to.have.property('queueId')
      })
    cy.get('option[value="moderator"]').should('not.exist')
  })

  it('uses one grouping dimension and omits backlog for moderator statistics', () => {
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.team.listMembers*`, {
      members: [],
    })
    visitStats(
      [day],
      'roleAdmin',
      '&grouping=moderator&moderatorDid=did:plc:other&queueId=9',
    )
    cy.get('@history')
      .its('request.query')
      .should((query) => {
        expect(query.moderatorDid).to.equal('did:plc:other')
        expect(query).not.to.have.property('queueId')
      })
    cy.get('[data-cy="overview-metrics"] [data-metric="pendingCount"]').should(
      'not.exist',
    )
    cy.get('@liveStats.all').should('have.length', 0)
    cy.get('[data-cy="historical-stats"]').within(() => {
      cy.contains('button', /^Pending$/).should('not.exist')
      cy.contains('thead th', /^Pending$/).should('not.exist')
    })
    cy.contains(
      '[aria-label="Analytics view"] label',
      'Closure Targets',
    ).click()
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectHighlight('Target met', '1')
      cy.get('[data-metric="closureTargetOverdueCount"]').should('not.exist')
    })
  })

  for (const [name, result] of [
    ['met', true],
    ['missed', false],
  ] as const) {
    it(`shows a closed report's resolution time and ${name} target result`, () => {
      const did = 'did:plc:tfeay256xpz3vf5v5d3cxykt'
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getReport*`, {
        id: 8,
        eventId: 8,
        status: 'closed',
        reportType: 'com.atproto.moderation.defs#reasonSpam',
        reportedBy: did,
        reporter: { type: 'account', subject: did },
        subject: { type: 'account', subject: did },
        createdAt: '2026-10-10T00:00:00.000Z',
        priorityLevel: 'urgent',
        priorityTargetMinutes: 30,
        resolutionTimeSec: 1800,
        priorityTargetMet: result,
      })
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.report.assignModerator`,
        {},
      )
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getAssignments*`, {
        assignments: [],
      })
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.team.listMembers*`, {
        members: [],
      })
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.listActivities*`, {
        activities: [],
      })
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.setting.listOptions*`, {
        options: [],
      })
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
        queues: [],
      })
      login('/reports/8', 'roleAdmin')
      cy.get('[data-cy="report-closure-result"]')
        .should('contain', 'Resolution time: 30m')
        .and('contain', `Closure target ${name}`)
    })
  }
})
