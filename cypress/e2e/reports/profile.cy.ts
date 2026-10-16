/// <reference types="cypress" />

import {
  HANDLE_RESOLVER_URL,
  mockLabelerServiceRecordResponse,
  mockOzoneDidDataResponse,
  mockOzoneMetaResponse,
  SERVER_URL,
} from '../../support/api'

const BASE_URL = Cypress.env('BASE_URL') || 'http://127.0.0.1:3000'
const DID = 'did:plc:tfeay256xpz3vf5v5d3cxykt'
const OTHER_DID = 'did:plc:twqxpwemk3z3rrwezz7z7fpr'
const CURSOR = '2026-10-01T00:00:00.000Z::2'
const REASON = 'tools.ozone.report.defs#reasonMisleadingSpam'
const PROFILE_URL = `${BASE_URL}/repositories/${DID}?tab=reportee`

function report(id: number, record = false) {
  return {
    id,
    eventId: id,
    status: 'queued',
    reportType: REASON,
    reportedBy: OTHER_DID,
    reporter: { type: 'account', subject: OTHER_DID },
    subject: {
      type: record ? 'record' : 'account',
      subject: record ? `at://${DID}/app.bsky.feed.post/test` : DID,
    },
    comment: record ? 'Record report' : 'Account report',
    createdAt: '2026-10-01T00:00:00.000Z',
  }
}

function expectScopedQuery(query: Record<string, unknown>) {
  expect(query.did).to.equal(DID)
  expect(query).not.to.have.property('subject')
}

describe('Reports received on an account profile', () => {
  beforeEach(() => {
    // Every backend request is mocked; unmatched requests cannot reach production.
    const blocked = { statusCode: 503, body: { error: 'UnmockedTestRequest' } }
    cy.intercept('https://**', blocked)
    cy.intercept('**/xrpc/**', blocked)
    cy.intercept('**/api/**', blocked)
    cy.intercept('GET', `https://plc.directory/${DID}/log/audit`, [])
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.setting.listOptions*`, {
      options: [],
    })
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
      queues: [],
    })
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.report.queryReports*`,
      (req) => {
        req.reply(
          req.query.cursor
            ? { reports: [report(3)] }
            : { reports: [report(1), report(2, true)], cursor: CURSOR },
        )
      },
    ).as('reports')

    cy.fixture('auth.json').then((auth) => {
      mockOzoneMetaResponse({ body: auth.ozoneMetaResponse })
      mockOzoneDidDataResponse({ body: auth.ozoneDidDataResponse })
      mockLabelerServiceRecordResponse({
        statusCode: 200,
        body: auth.getLabelerRecordResponse,
      })
      cy.visit(PROFILE_URL)
      cy.login(auth)
    })
    cy.wait('@reports').its('request.query').then(expectScopedQuery)
    cy.get('section[aria-label="Reports received"]').as('received')
    cy.get('@received').find('tbody tr').should('have.length', 2)
  })

  it('shows account and record reports, locks scope against URL search, and is reachable from More', () => {
    cy.get('@received').should('contain.text', 'Account report')
    cy.get('@received').should('contain.text', 'Record report')
    cy.visit(`${PROFILE_URL}&term=subject:${OTHER_DID}&did=${OTHER_DID}`)
    cy.wait('@reports').its('request.query').then(expectScopedQuery)

    cy.get('nav[aria-label="Tabs"]').contains('span', 'Profile').click()
    cy.contains('button', 'More').click()
    cy.get('[role="menu"]').contains('button', 'Reports received').click()
    cy.location('search').should('include', 'tab=reportee')
    cy.contains('h2', 'Reports received').should('exist')
  })

  it('retains status, mute, subject type, collection, and report type filters', () => {
    cy.get('[aria-label="Report status"]').select('closed')
    cy.wait('@reports').then(({ request }) => {
      expectScopedQuery(request.query)
      expect(request.query.status).to.equal('closed')
      expect(request.query.isMuted).to.equal('false')
      expect(request.query).not.to.have.property('cursor')
    })
    cy.get('[aria-label="Muted reports"]').select('isMuted')
    cy.wait('@reports').its('request.query.isMuted').should('equal', 'true')
    cy.get('[aria-label="Muted reports"]').select('all')
    cy.wait('@reports')
      .its('request.query')
      .should('not.have.property', 'isMuted')

    cy.get('[aria-label="Subject type"]').select('record')
    cy.wait('@reports')
      .its('request.query.subjectType')
      .should('equal', 'record')
    cy.get('@received').find('input[value="app.bsky.feed.post"]').check()
    cy.wait('@reports').then(({ request }) => {
      expect(
        new URL(request.url).searchParams.getAll('collections'),
      ).to.deep.equal(['app.bsky.feed.post'])
    })
    cy.get('@received').find('input[role="combobox"]').type(REASON)
    cy.contains('[role="option"]', 'Spam').click()
    cy.get('@received').find('input[role="combobox"]').type('{esc}')
    cy.wait('@reports').then(({ request }) => {
      expectScopedQuery(request.query)
      const params = new URL(request.url).searchParams
      expect(params.getAll('reportTypes')).to.deep.equal([REASON])
      expect(params.get('status')).to.equal('closed')
      expect(params.get('subjectType')).to.equal('record')
    })

    cy.get('[aria-label="Subject type"]').select('account')
    cy.wait('@reports').then(({ request }) => {
      expectScopedQuery(request.query)
      expect(request.query.subjectType).to.equal('account')
      expect(request.query).not.to.have.property('collections')
    })
    cy.location('search').should('include', 'tab=reportee')
  })

  it('opens reports received from DID, AT URI, handle, and Bluesky URL palette actions', () => {
    cy.intercept(
      'GET',
      `${HANDLE_RESOLVER_URL}/com.atproto.identity.resolveHandle*`,
      { did: DID },
    )
    const inputs = [
      DID,
      `at://${DID}/app.bsky.feed.post/test`,
      'alice.test',
      'at://alice.test/app.bsky.feed.post/test',
      `https://bsky.app/profile/${DID}/post/test`,
      'https://bsky.app/profile/alice.test/post/test',
    ]
    for (const input of inputs) {
      cy.get('nav[aria-label="Tabs"]').contains('span', 'Profile').click()
      cy.location('search').should('not.include', 'tab=reportee')
      cy.openCommandPalette(input)
      // Palette results are virtualized, so scroll the Reports section into view.
      cy.get('#kbar-listbox').parent().scrollTo('bottom', {
        ensureScrollable: false,
      })
      cy.contains(
        '#kbar-listbox [role="option"]',
        'View reports received',
      ).click()
      cy.location('pathname').should('equal', `/repositories/${DID}`)
      cy.location('search').should('include', 'tab=reportee')
      cy.get('section[aria-label="Reports received"]').should('be.visible')
    }
  })

  it('preserves scope through pagination and sorting and saves the profile return URL', () => {
    cy.get('@received').contains('button', 'Load more').click()
    cy.wait('@reports').then(({ request }) => {
      expectScopedQuery(request.query)
      expect(request.query.cursor).to.equal(CURSOR)
    })
    cy.get('@received').find('tbody tr').should('have.length', 3)
    cy.get('@received').find('thead').contains('a', 'Last Update').click()
    cy.wait('@reports').then(({ request }) => {
      expectScopedQuery(request.query)
      expect(request.query.sortField).to.equal('updatedAt')
      expect(request.query).not.to.have.property('cursor')
    })
    cy.get('@received').find('tbody tr').should('have.length', 2)
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('ozone:reportsListUrl')).to.include(
        'tab=reportee',
      )
      expect(
        JSON.parse(win.sessionStorage.getItem('ozone:reportsListIds')!),
      ).to.deep.equal([1, 2])
    })
    cy.get('@received').find('a[href="/reports/1"]:visible').first().click()
    cy.location('pathname').should('equal', '/reports/1')
  })

  it('keeps filters available when the result is empty or the request fails', () => {
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.queryReports*`, {
      reports: [],
    }).as('emptyReports')
    cy.get('[aria-label="Report status"]').select('closed')
    cy.wait('@emptyReports')
    cy.get('@received').should('contain.text', 'No reports')
    cy.get('[aria-label="Report status"]').should('be.visible')

    cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.queryReports*`, {
      statusCode: 400,
      body: { error: 'InvalidRequest', message: 'Reports are unavailable' },
    })
    cy.get('[aria-label="Report status"]').select('open')
    cy.get('@received')
      .contains('Reports are unavailable', { timeout: 20000 })
      .should('be.visible')
    cy.get('[aria-label="Subject type"]').should('be.visible')
  })

  it('renders the existing table on mobile in light and dark themes', () => {
    cy.viewport(390, 844)
    for (const theme of ['light', 'dark']) {
      cy.document().then((doc) =>
        doc.documentElement.classList.toggle('dark', theme === 'dark'),
      )
      cy.get('@received').scrollIntoView()
      cy.get('[aria-label="Report status"]').should('be.visible')
      cy.get('@received').should(($section) => {
        expect($section[0].scrollWidth).to.be.at.most($section[0].clientWidth)
      })
      cy.get('nav[aria-label="Tabs"]').should(($nav) => {
        expect($nav[0].scrollWidth).to.be.at.most($nav[0].clientWidth)
      })
      cy.screenshot(`reportee-mobile-${theme}`, { capture: 'viewport' })
    }
  })

  it('preserves the global beta list subject search and default ordering', () => {
    cy.visit(`${BASE_URL}/reports/beta?term=subject:${DID}`)
    cy.wait('@reports').then(({ request }) => {
      expect(request.query.subject).to.equal(DID)
      expect(request.query).not.to.have.property('did')
      expect(request.query.sortField).to.equal('createdAt')
      expect(request.query.sortDirection).to.equal('asc')
    })
  })
})
