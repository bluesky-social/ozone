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

beforeEach(() => cy.clock(Date.UTC(2026, 9, 14, 23, 30), ['Date']))

function visitOverview(
  stats: object,
  history: { date: string; [key: string]: unknown }[] = [],
  period: 'Today' | '7d' | '30d' | 'QTD' = 'Today',
  queues: object[] = [],
) {
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
    queues,
  })
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
    stats,
  }).as('liveStats')
  cy.intercept(
    'GET',
    `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`,
    (req) => {
      req.alias = req.query.queueId
        ? 'queueHistory'
        : req.query.reportTypes
          ? 'categoryHistory'
          : `overviewHistory${req.query.limit}`
      req.reply({
        stats: history.filter(
          (row) =>
            row.date >= String(req.query.startDate).slice(0, 10) &&
            row.date <= String(req.query.endDate).slice(0, 10),
        ),
      })
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
  if (period !== 'Today') {
    cy.contains('[aria-label="Statistics period"] button', period).click()
    cy.get('[data-cy="overview-metrics"]').should('be.visible')
  }
}

function expectMetric(label: string, value: string) {
  cy.contains('dt', new RegExp(`^${label}$`))
    .siblings('dd')
    .first()
    .should('have.text', value)
}

function queueSnapshot(
  id: number,
  name: string,
  pendingCount?: number,
  closureTargetOverdueCount?: number,
) {
  return {
    id,
    name,
    createdBy: 'did:plc:tfeay256xpz3vf5v5d3cxykt',
    createdAt: snapshot.lastUpdated,
    updatedAt: snapshot.lastUpdated,
    enabled: true,
    stats: {
      lastUpdated: snapshot.lastUpdated,
      pendingCount,
      closureTargetOverdueCount,
    },
  }
}

describe('Queue aging', () => {
  it('shows current queue snapshots, preserving zero and unavailable target counts across date windows', () => {
    cy.viewport(1280, 900)
    visitOverview(snapshot, [], 'Today', [
      queueSnapshot(1, 'Review queue', 100, 25),
      queueSnapshot(2, 'No overdue reports', 40, 0),
      queueSnapshot(3, 'Empty queue', 0, 0),
      queueSnapshot(4, 'Legacy queue', 50),
      queueSnapshot(5, 'No stats yet'),
    ])
    const checkSnapshots = () => {
      cy.get('[data-cy="queue-aging"]').within(() => {
        cy.contains('li', 'Review queue').within(() => {
          cy.get('[data-cy="queue-pending"]').should('have.text', '100 pending')
          cy.get('[data-cy="queue-overdue"]').should(
            'have.text',
            '25 past target',
          )
          cy.get('[role="img"]').should(
            'have.attr',
            'aria-label',
            '25 past target; 75 other pending',
          )
        })
        cy.contains('li', 'No overdue reports').within(() => {
          cy.get('[data-cy="queue-overdue"]').should(
            'have.text',
            '0 past target',
          )
          cy.get('[role="img"]').should(
            'have.attr',
            'aria-label',
            '0 past target; 40 other pending',
          )
        })
        cy.contains('li', 'Empty queue').within(() => {
          cy.get('[data-cy="queue-pending"]').should('have.text', '0 pending')
          cy.get('[data-cy="queue-overdue"]').should(
            'have.text',
            '0 past target',
          )
        })
        cy.contains('li', 'Legacy queue').within(() => {
          cy.get('[data-cy="queue-pending"]').should('have.text', '50 pending')
          cy.get('[data-cy="queue-overdue"]').should(
            'have.text',
            '— past target',
          )
          cy.contains('Target breakdown unavailable.')
          cy.get('[role="img"]').should('not.exist')
        })
        cy.contains('li', 'No stats yet').within(() => {
          cy.get('[data-cy="queue-pending"]').should('have.text', '— pending')
          cy.get('[data-cy="queue-overdue"]').should(
            'have.text',
            '— past target',
          )
        })
        cy.get('a').should('not.exist')
        cy.contains('Other pending includes reports without a closure target.')
      })
    }
    checkSnapshots()
    cy.contains('[aria-label="Statistics period"] button', '30d').click()
    checkSnapshots()
    cy.get('[data-cy="queue-aging"]').scrollIntoView()
    cy.get('[data-cy="queue-aging"]').should('be.visible')
    cy.screenshot('queue-aging-light', { capture: 'viewport' })
    cy.document().then((doc) => doc.documentElement.classList.add('dark'))
    cy.get('[data-cy="queue-aging"] h2').should(
      'have.css',
      'color',
      'rgb(243, 244, 246)',
    )
    cy.screenshot('queue-aging-dark', { capture: 'viewport' })
    cy.viewport(375, 812)
    cy.get('[data-cy="queue-aging"]').scrollIntoView()
    cy.get('[data-cy="queue-aging"]').then(($el) => {
      expect($el[0].scrollWidth).to.be.at.most($el[0].clientWidth)
    })
    cy.get('[data-cy="queue-aging"]').should('be.visible')
    cy.screenshot('queue-aging-mobile', { capture: 'viewport' })
  })

  it('loads additional queue snapshots without requesting per-queue stats', () => {
    visitOverview(snapshot)
    cy.contains('[data-cy="queue-aging"]', 'No queues available.')
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.queue.listQueues*`,
      (req) => {
        req.reply(
          req.query.cursor
            ? {
                queues: [queueSnapshot(2, 'Next queue', 80, 10)],
              }
            : {
                queues: [queueSnapshot(1, 'First queue', 100, 25)],
                cursor: 'next-page',
              },
        )
      },
    ).as('agingQueues')
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
      stats: snapshot,
    }).as('agingStats')
    cy.reload()
    cy.wait('@agingQueues')
    cy.get('[data-cy="queue-aging"]').scrollIntoView()
    cy.get('[data-cy="queue-aging"]').within(() => {
      cy.contains('li', 'First queue').should('be.visible')
      cy.contains('button', 'Load more queues').click()
    })
    cy.wait('@agingQueues')
      .its('request.query.cursor')
      .should('equal', 'next-page')
    cy.get('[data-cy="queue-aging"]').within(() => {
      cy.get('li').should('have.length', 2)
      cy.contains('li', 'Next queue')
        .should('contain', '80 pending')
        .and('contain', '10 past target')
      cy.contains('button', 'Load more queues').should('not.exist')
    })
    cy.get('@agingStats.all').then((requests) => {
      for (const request of requests) {
        expect(request.request.query).not.to.have.property('queueId')
      }
    })
  })
})

describe('Analytics overview cards', () => {
  it('shows the current backlog and target attainment among targeted closures, in both themes and on mobile', () => {
    cy.viewport(1280, 900)
    visitOverview(snapshot)
    cy.window().then((win) => {
      const time = new win.Date(snapshot.lastUpdated).toLocaleTimeString(
        undefined,
        { hour: 'numeric', minute: '2-digit' },
      )
      cy.get('[data-cy="stats-updated-at"]').should(
        'have.text',
        `Updated ${time}`,
      )
    })
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
  it('shows seven graph days for Today and follows the selected longer window', () => {
    visitOverview(snapshot, history)
    cy.wait('@overviewHistory7').its('request.query').should('deep.equal', {
      startDate: '2026-10-08T00:00:00.000Z',
      endDate: '2026-10-14T00:00:00.000Z',
      limit: '7',
    })
    cy.get('[data-cy="inbound-closed-chart"] tbody tr').should('have.length', 7)
    cy.get('[data-cy="overview-metrics"]').within(() =>
      expectMetric('Inbound', '375'),
    )
    cy.get('[data-cy="closure-action-rate"]').should('have.text', '30%')

    cy.contains('[aria-label="Statistics period"] button', '30d').click()
    cy.get('[data-cy="stats-updated-at"]').should('not.exist')
    cy.get('[data-cy="inbound-closed-chart"] tbody tr').should(
      'have.length',
      30,
    )
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectMetric('Closed', '1,560')
      expectMetric('Pending', '2,400')
    })
    cy.get('[data-cy="closure-action-rate"]').should('have.text', '42%')

    cy.contains('[aria-label="Statistics period"] button', 'QTD').click()
    cy.wait('@overviewHistory14').its('request.query').should('deep.equal', {
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-14T00:00:00.000Z',
      limit: '14',
    })
    cy.get('[data-cy="inbound-closed-chart"] tbody tr').should(
      'have.length',
      14,
    )
    cy.contains('[aria-label="Statistics period"] button', 'Today').click()
    cy.get('[data-cy="inbound-closed-chart"] tbody tr').should('have.length', 7)
    cy.get('[data-cy="overview-metrics"]').within(() =>
      expectMetric('Closed', '100'),
    )
  })

  it('weights range metrics, averages completed days, and keeps the window across tabs', () => {
    visitOverview(
      snapshot,
      [
        {
          date: '2026-10-13',
          inboundCount: 20,
          closedCount: 10,
          actionedCount: 2,
          acknowledgedCount: 8,
          escalatedCount: 2,
          pendingCount: 99999,
          closureTargetOverdueCount: 9999,
          ahtDurationSec: 600,
          ahtSampleCount: 2,
          resolutionDurationSec: 6000,
          resolutionSampleCount: 10,
          closureTargetMetCount: 1,
          closureTargetMissedCount: 1,
        },
        {
          date: '2026-10-14',
          inboundCount: 120,
          closedCount: 90,
          actionedCount: 81,
          acknowledgedCount: 9,
          escalatedCount: 10,
          pendingCount: 5000,
          closureTargetOverdueCount: 500,
          ahtDurationSec: 800,
          ahtSampleCount: 8,
          resolutionDurationSec: 9000,
          resolutionSampleCount: 90,
          closureTargetMetCount: 18,
          closureTargetMissedCount: 0,
        },
      ],
      '7d',
      [
        {
          id: 2,
          name: 'Review queue',
          createdBy: 'did:plc:tfeay256xpz3vf5v5d3cxykt',
          createdAt: snapshot.lastUpdated,
          updatedAt: snapshot.lastUpdated,
          enabled: true,
          stats: {},
        },
      ],
    )
    cy.get('[data-cy="overview-metrics"]').within(() => {
      expectMetric('Inbound', '140')
      expectMetric('Pending', '2,400')
      expectMetric('Avg handling time', '2m')
      expectMetric('Closure Target', '95%')
      cy.contains('250 past closure target')
      cy.contains('20 avg/day · 1 complete day')
      cy.contains('Available for 2 of 7 days.')
    })
    cy.get('[data-cy="closure-action-rate"]').should('have.text', '83%')
    cy.get('[data-cy="report-type-panel"]').within(() => {
      cy.contains('tr', 'Violence & Welfare').within(() => {
        cy.get('[data-cy="type-inbound"]').should('have.text', '140')
        cy.get('[data-cy="type-action-rate"]').should('have.text', '83%')
        cy.contains('2 of 7 days')
      })
    })
    cy.get('[data-cy="report-type-targets"]').within(() => {
      cy.contains('tr', 'Violence & Welfare').within(() => {
        cy.get('[data-cy="type-handling-time"]').should('have.text', '2m')
        cy.get('[data-cy="type-resolution-time"]').should('have.text', '3m')
        cy.get('[data-cy="type-target-samples"]').should('have.text', '19 / 20')
        cy.get('[data-cy="type-target-rate"]').should('have.text', '95%')
      })
    })
    cy.contains('[role="tab"]', 'Queues').click()
    cy.wait('@queueHistory').its('request.query').should('deep.equal', {
      queueId: '2',
      startDate: '2026-10-08T00:00:00.000Z',
      endDate: '2026-10-14T00:00:00.000Z',
      limit: '7',
    })
    cy.contains('a', 'Review queue').within(() => {
      cy.contains('140Inbound')
      cy.contains('2400Pending')
      cy.contains('83Actioned (83%)')
      cy.contains('Last 7 days (UTC)')
    })
    cy.contains('[role="tab"]', 'Categories').click()
    cy.wait('@categoryHistory')
      .its('request.query')
      .should('include', { limit: '7' })
      .and('have.property', 'reportTypes')
    cy.contains('a', 'Violence & Welfare')
      .should('contain', '140Inbound')
      .and('contain', '2400Pending')
    cy.contains('[role="tab"]', 'Overview').click()
    cy.contains('[aria-label="Statistics period"] button', '7d').should(
      'have.attr',
      'aria-pressed',
      'true',
    )
    cy.get('[data-cy="overview-metrics"]').within(() =>
      expectMetric('Inbound', '140'),
    )
  })

  it('preserves zero and unavailable report-type results in both themes and on mobile', () => {
    cy.viewport(1280, 900)
    visitOverview(
      snapshot,
      [
        {
          date: '2026-10-14',
          inboundCount: 0,
          closedCount: 0,
          actionedCount: 0,
          closureTargetMetCount: 0,
          closureTargetMissedCount: 0,
        },
      ],
      '7d',
    )
    cy.get('[data-cy="report-type-panel"] [data-cy="type-inbound"]')
      .first()
      .should('have.text', '0')
    cy.get('[data-cy="report-type-panel"] [data-cy="type-action-rate"]')
      .first()
      .should('have.text', '—')
    cy.get('[data-cy="report-type-targets"]').within(() => {
      cy.get('[data-cy="type-handling-time"]').first().should('have.text', '—')
      cy.get('[data-cy="type-resolution-time"]')
        .first()
        .should('have.text', '—')
      cy.get('[data-cy="type-target-samples"]')
        .first()
        .should('have.text', '0 / 0')
      cy.get('[data-cy="type-target-rate"]').first().should('have.text', '—')
    })
    cy.get('[data-cy="report-type-panel"]').parent().scrollIntoView()
    cy.get('[data-cy="report-type-panel"]').parent().should('be.visible')
    cy.screenshot('report-type-panels-light', { capture: 'viewport' })
    cy.document().then((doc) => doc.documentElement.classList.add('dark'))
    cy.get('[data-cy="report-type-panel"] h2').should(
      'have.css',
      'color',
      'rgb(243, 244, 246)',
    )
    cy.get('[data-cy="report-type-panel"]').parent().should('be.visible')
    cy.screenshot('report-type-panels-dark', { capture: 'viewport' })
    cy.viewport(375, 812)
    cy.get('[data-cy="report-type-targets"]').scrollIntoView()
    cy.get('[data-cy="report-type-targets"]').then(($el) => {
      expect($el[0].scrollWidth).to.be.at.most($el[0].clientWidth)
    })
    cy.get('[data-cy="report-type-targets"]').should('be.visible')
    cy.screenshot('report-type-targets-mobile', { capture: 'viewport' })
  })

  it('compares daily flows and weighted closure outcomes over the same UTC window', () => {
    cy.viewport(1280, 900)
    visitOverview(snapshot, [...history].reverse(), '30d')
    cy.wait('@overviewHistory30').its('request.query').should('deep.equal', {
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
    visitOverview(
      snapshot,
      [
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
      ],
      '30d',
    )
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
      cy.contains('Action types available for 2 of 30 days.').should(
        'be.visible',
      )
      cy.contains('dt', /^Label$/)
        .siblings('dd')
        .should('have.text', '51')
    })
  })

  it('keeps an empty historical response unavailable', () => {
    visitOverview(snapshot, [], '30d')
    cy.get('[data-cy="inbound-closed-chart"]').should(
      'contain',
      'No daily stats available for this period.',
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
