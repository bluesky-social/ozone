/// <reference types="cypress" />
import type { ActivityRow } from '../../../components/reports/moderatorActivity'
import {
  SERVER_URL,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockLabelerServiceRecordResponse,
} from '../../support/api'

const BASE_URL = Cypress.env('BASE_URL') || 'http://127.0.0.1:3000'
const actor = 'did:plc:tfeay256xpz3vf5v5d3cxykt'
const row = (
  id: number,
  source: ActivityRow['source'] = 'activity',
  extra: Partial<ActivityRow> = {},
): ActivityRow => {
  const createdAt = `2026-04-05T12:00:${String(id).padStart(2, '0')}.000Z`
  return {
    id,
    source,
    createdBy: actor,
    createdAt,
    type:
      source === 'event'
        ? 'tools.ozone.moderation.defs#modEventLabel'
        : 'noteActivity',
    reportId: 42,
    ...(source === 'event'
      ? {
          event: {
            id,
            createdBy: actor,
            creatorHandle: 'alice.test',
            createdAt,
            subject: { $type: 'com.atproto.admin.defs#repoRef', did: actor },
            subjectBlobCids: [],
            event: {
              $type: 'tools.ozone.moderation.defs#modEventLabel',
              createLabelVals: ['spam'],
              negateLabelVals: [],
              comment: 'Enforcement rationale',
            },
          },
        }
      : {
          activity: {
            id,
            reportId: 42,
            isAutomated: false,
            createdBy: actor,
            createdAt,
            activity: { $type: 'tools.ozone.report.defs#noteActivity' },
            internalNote: 'Review rationale',
          },
        }),
    ...extra,
  }
}

function visitModerators(
  role = 'roleAdmin',
  suffix = '',
  selectedModerator = actor,
) {
  cy.viewport(1280, 1000)
  cy.clock(Date.UTC(2026, 3, 5, 12, 30), [
    'Date',
    'setInterval',
    'clearInterval',
  ])
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.team.listMembers*`, {
    members: [
      {
        did: actor,
        role: 'tools.ozone.team.defs#roleModerator',
        profile: { did: actor, handle: 'alice.test', displayName: 'Alice' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        disabled: false,
      },
    ],
  }).as('members')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
    queues: [
      {
        id: 1,
        name: 'Review',
        stats: {},
        enabled: true,
        createdBy: actor,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
  })
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getHistoricalStats*`, {
    stats: [],
  }).as('moderatorStats')
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.getLiveStats*`, {
    stats: {},
  }).as('liveStats')
  cy.fixture('auth.json').then((auth) => {
    auth.ozoneServerConfigResponse.viewer = {
      role: `tools.ozone.team.defs#${role}`,
    }
    mockOzoneMetaResponse({ body: auth.ozoneMetaResponse })
    mockOzoneDidDataResponse({ body: auth.ozoneDidDataResponse })
    mockLabelerServiceRecordResponse({ body: auth.getLabelerRecordResponse })
    cy.visit(
      `${BASE_URL}/analytics?tab=moderators&moderatorDid=${selectedModerator}${suffix}`,
    )
    cy.login(auth)
  })
}

describe('Moderator activity review', () => {
  it('shows stats above mixed activity and applies the selected period to both', () => {
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.report.queryModeratorActivity*`,
      {
        rows: [row(3, 'event'), row(2), row(1)],
      },
    ).as('activity')
    visitModerators(
      'roleAdmin',
      '&view=live&activityQueue=1&includeAutomated=true',
      '',
    )
    cy.get('[aria-label="Moderator list"]').should('be.visible')
    cy.get('@activity.all').should('have.length', 0)
    cy.get('@moderatorStats.all').should('have.length', 0)
    cy.wait('@members')
    cy.get('[aria-label="Search moderators"]').type('Alice')
    cy.wait('@members').its('request.query.q').should('equal', 'Alice')
    cy.contains('[aria-label="Moderator list"] button', 'Alice').click()
    cy.get('[aria-label="Moderator list"]').should('not.exist')
    cy.wait('@activity').then(({ request }) => {
      expect(request.query.createdAfter).to.equal('2026-04-05T00:00:00.000Z')
      expect(request.query.createdBefore).to.equal('2026-04-06T00:00:00.000Z')
      for (const field of ['queueId', 'includeAutomated', 'refresh'])
        expect(request.query).not.to.have.property(field)
    })
    cy.get('[aria-label="Statistics period"] button')
      .first()
      .should('have.text', 'Today')
      .and('have.attr', 'aria-pressed', 'true')
    cy.contains('[aria-label="Statistics period"] button', 'Live').should(
      'not.exist',
    )
    cy.contains('Report statistics · All queues').should('be.visible')
    cy.get('[aria-label="Activity start date UTC"]').should('not.exist')
    cy.wait('@moderatorStats').then(({ request }) => {
      expect(request.query.startDate).to.equal('2026-04-05T00:00:00.000Z')
      expect(request.query.endDate).to.equal('2026-04-05T00:00:00.000Z')
    })
    cy.get('[data-activity-id]').should('have.length', 3)
    cy.get('[data-activity-id]')
      .first()
      .should('contain', 'Moderation event')
      .and('contain', 'Enforcement rationale')
      .and('contain', 'spam')
      .and('contain', 'UTC')
    cy.contains('Review rationale').should('exist')
    cy.contains('summary', 'Inspect').should('not.exist')
    cy.get('[aria-label="Activity queue"]').should('not.exist')
    cy.contains('Include automated activity').should('not.exist')
    cy.contains('[aria-label="Statistics period"] button', '7d').click()
    cy.wait('@moderatorStats').then(({ request }) => {
      expect(request.query.moderatorDid).to.equal(actor)
      expect(request.query.startDate).to.equal('2026-03-30T00:00:00.000Z')
      expect(request.query.endDate).to.equal('2026-04-05T00:00:00.000Z')
      for (const field of ['queueId', 'types', 'includeAutomated'])
        expect(request.query).not.to.have.property(field)
    })
    cy.wait('@activity').then(({ request }) => {
      expect(request.query.createdAfter).to.equal('2026-03-30T00:00:00.000Z')
      expect(request.query.createdBefore).to.equal('2026-04-06T00:00:00.000Z')
    })
    cy.get('[data-activity-id]').should('have.length', 3)
    cy.contains('Report statistics · All queues').should('be.visible')
    cy.get('[aria-label="Moderator analytics"]').then(($view) => {
      const stats = $view.find('h2').first()[0]
      const controls = $view.find('[aria-label="Activity filters"]')[0]
      const history = $view.find('[aria-label="Moderator activity"]')[0]
      expect(
        stats.compareDocumentPosition(controls) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.to.equal(0)
      expect(
        controls.compareDocumentPosition(history) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.to.equal(0)
    })
    cy.contains('button', 'Activity types').click()
    cy.get('[id="activity-type-noteActivity"]').check()
    cy.wait('@activity')
      .its('request.query.types')
      .should('equal', 'noteActivity')
    cy.location('search')
      .should('contain', 'period=7d')
      .and('not.contain', 'view=')
      .and('not.contain', 'activityQueue')
      .and('not.contain', 'includeAutomated')
    cy.contains('button', 'Reset Filters').click()
    cy.wait('@activity')
      .its('request.query')
      .should('not.have.property', 'types')
    cy.contains('button', 'Back to moderators').click()
    cy.get('[aria-label="Moderator list"]').should('be.visible')
    cy.contains('Report statistics · All queues').should('not.exist')
    cy.location('search')
      .should('contain', 'period=7d')
      .and('not.contain', 'moderatorDid')
    cy.go('back')
    cy.get('[data-activity-id]').should('have.length', 3)
    cy.contains('[aria-label="Statistics period"] button', '7d').should(
      'have.attr',
      'aria-pressed',
      'true',
    )
  })

  it('pauses refresh while focusing activity or paging', () => {
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.report.queryModeratorActivity*`,
      (req) => {
        if (req.query.cursor) req.reply({ rows: [row(0)] })
        else req.reply({ rows: [row(2), row(1)], cursor: 'older' })
      },
    ).as('activity')
    visitModerators()
    cy.wait('@activity')
    cy.get('[aria-label="Live refresh"]').click()
    cy.get('[data-activity-id]').first().find('a').first().focus()
    let inspectedTop = 0
    cy.get('[data-activity-id]')
      .first()
      .then(($row) => {
        inspectedTop = $row[0].getBoundingClientRect().top
      })
    cy.tick(30_000)
    cy.get('@activity.all').should('have.length', 1)
    cy.focused().should('have.prop', 'tagName', 'A')
    cy.get('[data-activity-id]')
      .first()
      .should(($row) => {
        expect($row[0].getBoundingClientRect().top).to.be.closeTo(
          inspectedTop,
          1,
        )
      })
    cy.contains('button', 'Load older activity').click()
    cy.wait('@activity').its('request.query.cursor').should('equal', 'older')
    cy.get('[data-activity-id]').should('have.length', 3)
    cy.tick(30_000)
    cy.get('@activity.all').should('have.length', 2)
    cy.contains('a', 'Report #42')
      .first()
      .should('have.attr', 'href', '/reports/42?activityReview=true')
    cy.screenshot('moderator-activity-history', { capture: 'viewport' })
  })

  it('toggles live refresh and pauses when hidden or viewing a longer period', () => {
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.report.queryModeratorActivity*`,
      { rows: [row(1)] },
    ).as('activity')
    visitModerators()
    cy.wait('@activity')
    cy.get('[data-activity-id]').should('have.length', 1)
    cy.get('[aria-label="Live refresh"]')
      .should('have.attr', 'aria-pressed', 'false')
      .and('have.attr', 'title', 'Enable live refresh')
    cy.tick(60_000)
    cy.get('@activity.all').should('have.length', 1)
    cy.contains('button', /^Refresh$/).should('not.exist')
    cy.get('[aria-label="Live refresh"]').click()
    cy.get('[aria-label="Live refresh"]')
      .should('have.attr', 'aria-pressed', 'true')
      .and('have.attr', 'title', 'Pause live refresh')
    cy.tick(30_000)
    cy.wait('@activity')
    cy.get('@activity.all').should('have.length', 2)
    cy.get('[aria-label="Live refresh"]').click()
    cy.tick(60_000)
    cy.get('@activity.all').should('have.length', 2)
    cy.get('[aria-label="Live refresh"]').click()
    cy.document().then((doc) =>
      Object.defineProperty(doc, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      }),
    )
    cy.tick(30_000)
    cy.get('@activity.all').should('have.length', 2)
    cy.document().then((doc) =>
      Object.defineProperty(doc, 'visibilityState', {
        configurable: true,
        value: 'visible',
      }),
    )
    cy.contains('[aria-label="Statistics period"] button', '7d').click()
    cy.wait('@activity')
    cy.get('[aria-label="Live refresh"]')
      .should('be.disabled')
      .and('have.attr', 'aria-pressed', 'false')
    cy.tick(30_000)
    cy.get('@activity.all').should('have.length', 3)
  })

  it('retains a previous-day review at UTC midnight', () => {
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.report.queryModeratorActivity*`,
      { rows: [row(1)] },
    ).as('activity')
    visitModerators()
    cy.wait('@activity')
    cy.clock().invoke('setSystemTime', Date.UTC(2026, 3, 6))
    cy.tick(30_000)
    cy.contains('A new UTC day has started.').should('be.visible')
    cy.get('@activity.all').should('have.length', 1)
    cy.get('[data-activity-id]').should('have.length', 1)
    cy.contains('button', 'Show current period').click()
    cy.wait('@activity')
      .its('request.query.createdAfter')
      .should('equal', '2026-04-06T00:00:00.000Z')
  })

  for (const role of ['roleModerator', 'roleTriage', 'roleVerifier']) {
    it(`denies direct access for ${role}`, () => {
      cy.intercept(
        'GET',
        `${SERVER_URL}/tools.ozone.report.queryModeratorActivity*`,
        { rows: [] },
      ).as('activity')
      visitModerators(role)
      cy.contains('Moderator activity is available to admins only.').should(
        'be.visible',
      )
      cy.get('@activity.all').should('have.length', 0)
      cy.get('@moderatorStats.all').should('have.length', 0)
      cy.contains('a', 'Back to Analytics').click()
      cy.contains('[role="tab"]', 'Moderators').should('not.exist')
    })
  }
})
