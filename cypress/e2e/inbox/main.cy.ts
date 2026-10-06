/// <reference types="cypress" />

import inbox from '../../fixtures/inbox.json'
import {
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockLabelerServiceRecordResponse,
} from '../../support/api'

const basePath = `${Cypress.config('baseUrl') ?? 'http://127.0.0.1:3000'}/repositories/${encodeURIComponent(inbox.did)}/inbox`
function expectVisible(text: string) {
  cy.contains(text).scrollIntoView()
  cy.contains(text).should('be.visible')
}
const details = {
  ...inbox.item,
  record: inbox.report.record,
  actions: inbox.actions,
  cursor: 'older-actions',
  reports: {
    reasonTypes: ['com.atproto.moderation.defs#reasonSpam'],
    firstReportedOn: '2026-09-29T00:00:00Z',
    lastReportedOn: '2026-09-30T00:00:00Z',
  },
}

describe('Moderator inbox preview', () => {
  let writes: string[]

  beforeEach(() => {
    writes = []
    cy.intercept('POST', '**/xrpc/tools.ozone.inbox.*', (request) => {
      writes.push(new URL(request.url).pathname)
      request.reply({ ...inbox.item, appeal: { state: 'pending' } })
    }).as('inboxWrite')
    cy.intercept('GET', '**/xrpc/tools.ozone.moderation.getSubjects*', {
      subjects: [],
    })
    cy.intercept('GET', '**/xrpc/tools.ozone.inbox.*', (request) => {
      const url = new URL(request.url)
      expect(url.searchParams.get('did')).to.equal(inbox.did)
      expect(request.headers['atproto-proxy']).to.include('#atproto_labeler')
      const method = url.pathname.split('.').pop()
      if (method === 'listActionedSubjects') {
        request.reply({
          subjects:
            url.searchParams.get('filter') === 'pending' ? [] : [inbox.item],
        })
      } else if (method === 'getActionedSubject') {
        const subject = url.searchParams.get('subject')
        const response =
          subject === inbox.did
            ? {
                ...details,
                subject: {
                  $type: 'com.atproto.admin.defs#repoRef',
                  did: inbox.did,
                },
                enforcement: { state: 'suspended', scope: 'network' },
                appeal: { state: 'none' },
                availableActions: ['appeal'],
                record: undefined,
                actions: [
                  inbox.actions[0],
                  {
                    ...inbox.actions[1],
                    type: 'accountSuspended',
                    scope: 'network',
                    reversedAt: undefined,
                  },
                ],
              }
            : details
        request.reply(
          url.searchParams.has('cursor')
            ? {
                ...response,
                cursor: undefined,
                actions: [inbox.actions[1], inbox.olderAction],
              }
            : response,
        )
      } else if (method === 'listReports') {
        request.reply({ reports: [] })
      } else if (method === 'getReport') {
        request.reply({
          report: inbox.report,
          resolution: {
            outcome: 'noAction',
            scope: 'app',
            resolvedAt: '2026-10-01T12:00:00Z',
          },
        })
      } else if (method === 'getAccountStatus') {
        request.reply({
          src: inbox.item.src,
          standing: 'warning',
          updatedAt: '2026-10-01T14:00:00Z',
          expiresAt: '2026-10-03T14:00:00Z',
        })
      } else if (method === 'getUnreadCount') {
        request.reply({
          unreadCounts: { total: 3, reports: 1, subjects: 1, accountStatus: 1 },
        })
      } else if (method === 'getNotificationPreferences') {
        request.reply({ preferences: { push: false } })
      } else if (method === 'listNotifications') {
        request.reply(
          url.searchParams.has('cursor')
            ? { notifications: [inbox.standingNotification] }
            : {
                notifications: inbox.notifications,
                cursor: 'older-notifications',
              },
        )
      } else
        request.reply({
          statusCode: 404,
          body: { message: 'Unexpected inbox request' },
        })
    }).as('inboxRead')
    cy.fixture('auth.json').then((auth) => {
      cy.intercept(
        'POST',
        '**/xrpc/com.atproto.server.refreshSession',
        auth.createSessionResponse,
      )
      mockOzoneMetaResponse({ statusCode: 200, body: auth.ozoneMetaResponse })
      mockOzoneDidDataResponse({
        statusCode: 200,
        body: auth.ozoneDidDataResponse,
      })
      mockLabelerServiceRecordResponse({
        statusCode: 200,
        body: auth.getLabelerRecordResponse,
      })
      cy.intercept(
        'GET',
        `**/xrpc/tools.ozone.moderation.getRepo?did=${encodeURIComponent(inbox.did)}`,
        { ...auth.getRepoResponse, did: inbox.did, handle: 'target.test' },
      )
      cy.intercept(
        'GET',
        `**/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(inbox.did)}`,
        { ...auth.getProfileResponse, did: inbox.did, handle: 'target.test' },
      )
      cy.visit(`${basePath}/actioned-subjects`)
      cy.login(auth)
    })
    cy.contains('h2', 'Mod Inbox', { timeout: 30000 }).scrollIntoView()
    cy.contains('h2', 'Mod Inbox', { timeout: 30000 }).should('be.visible')
  })

  it('keeps subject filters and sort controls available after an empty response', () => {
    cy.contains('label', 'Sort by').find('select').select('createdAt')
    cy.contains('label', 'Order').find('select').select('asc')
    cy.intercept(
      'GET',
      '**/xrpc/tools.ozone.inbox.listActionedSubjects*filter=pending*',
    ).as('pendingSubjects')
    cy.contains('label', 'Show').find('select').select('pending')
    cy.wait('@pendingSubjects')
      .its('request.url')
      .then((value) => {
        const params = new URL(value).searchParams
        expect(params.get('sortField')).to.equal('createdAt')
        expect(params.get('sortDirection')).to.equal('asc')
        expect(params.has('cursor')).to.equal(false)
      })
    expectVisible('No actioned subjects match this filter.')
    expectVisible('Under review and resolved refer to the subject’s appeal.')
    cy.contains('label', 'Show').find('select').select('resolved')
    cy.get('article > button[aria-expanded]').should('have.length', 1)
    cy.contains('label', 'Show').find('select').select('unread')
    cy.get('article > button[aria-expanded]').should('have.length', 1)
    cy.then(() => expect(writes).to.deep.equal([]))
  })

  it('shows raw removed content, policy links, UTC report dates, and older history without duplicates', () => {
    cy.get('article > button[aria-expanded]').click()
    expectVisible('Original removed post returned by the backend')
    expectVisible('No active enforcement')
    cy.contains('a', 'Spam and deceptive conduct').should(
      'have.attr',
      'href',
      'https://example.test/policies/spam',
    )
    const firstReported = new Date('2026-09-29T00:00:00Z').toLocaleDateString(
      undefined,
      { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
    )
    expectVisible('First reported ' + firstReported)
    expectVisible('Appeal reviewed')
    cy.contains('button', 'Appeal this decision').should('not.exist')
    cy.contains('h3', 'Action history')
      .parent()
      .within(() => {
        cy.contains('button', 'Load more').click()
        cy.get('ol > li').should('have.length', 3)
        expectVisible('Labels: spam')
        cy.contains('button', 'Load more').should('not.exist')
      })
    cy.contains('summary', 'Record data').click()
    cy.get('pre').should('contain.text', 'app.bsky.feed.post')
    cy.then(() => expect(writes).to.deep.equal([]))
  })

  it('shows notifications, standing, preferences, older pages, and a linked report outside the list', () => {
    cy.contains('button', 'Notifications').click()
    expectVisible('Push notifications: Off')
    cy.contains('Unread notifications')
      .parent()
      .should('contain.text', 'Reports 1 · Subjects 1 · Account standing 1')
    expectVisible('Latest account activity')
    cy.contains('button', 'Load more').click()
    expectVisible('Warning → Good')
    cy.contains('button', 'Load more').should('not.exist')
    cy.contains('label', 'Section').find('select').select('reports')
    cy.contains('label', 'Reason').find('select').select('reportResolved')
    cy.intercept(
      'GET',
      '**/xrpc/tools.ozone.inbox.listNotifications*unreadOnly=true*',
    ).as('unreadNotifications')
    cy.contains('label', 'Unread only').find('input').check()
    cy.wait('@unreadNotifications')
      .its('request.url')
      .then((value) => {
        const params = new URL(value).searchParams
        expect(params.get('section')).to.equal('reports')
        expect(params.getAll('reasons')).to.deep.equal(['reportResolved'])
        expect(params.has('cursor')).to.equal(false)
      })
    cy.contains('a', 'View report').click()
    expectVisible('Selected report #900')
    expectVisible('No action taken')
    expectVisible('Original removed post returned by the backend')
    cy.get(
      'section[aria-label="Selected report"] [aria-label="Unread"]',
    ).should('not.exist')
    cy.then(() => expect(writes).to.deep.equal([]))
  })

  it('opens a linked subject outside the list and submits an optional reason for the specific decision', () => {
    cy.visit(
      `${basePath}/actioned-subjects?subject=${encodeURIComponent(inbox.did)}`,
    )
    cy.get('section[aria-label="Selected subject"]').within(() => {
      cy.contains('button', 'Appeal this decision').click()
      expectVisible('Reason for appeal (optional)')
      expectVisible('Decision: Account Suspended')
      cy.contains('button', 'Submit appeal').click()
    })
    cy.wait('@inboxWrite')
      .its('request.body')
      .should('deep.equal', {
        subject: { $type: 'com.atproto.admin.defs#repoRef', did: inbox.did },
        action: {
          $type: 'tools.ozone.inbox.appealActionedSubject#actionRef',
          id: 20,
        },
      })
    cy.then(() =>
      expect(writes).to.deep.equal([
        '/xrpc/tools.ozone.inbox.appealActionedSubject',
      ]),
    )
  })

  it('renders the preview on narrow screens in light and dark themes', () => {
    cy.viewport(390, 844)
    cy.document().then((doc) => doc.documentElement.classList.remove('dark'))
    cy.contains('label', 'Inbox section').find('select').select('notifications')
    expectVisible('Push notifications: Off')
    cy.contains('label', 'Inbox section')
      .find('select')
      .select('actioned-subjects')
    cy.get('article > button[aria-expanded]').click()
    cy.contains('h2', 'Mod Inbox').scrollIntoView()
    cy.contains('h2', 'Mod Inbox').should('be.visible')
    cy.contains('h2', 'Mod Inbox')
      .closest('section')
      .should(($section) => {
        expect($section[0].scrollWidth).to.be.at.most($section[0].clientWidth)
      })
    cy.screenshot('inbox-mobile-light', { capture: 'viewport' })
    cy.document().then((doc) => doc.documentElement.classList.add('dark'))
    cy.contains('h2', 'Mod Inbox').should('be.visible')
    cy.screenshot('inbox-mobile-dark', { capture: 'viewport' })
    cy.viewport(1280, 900)
    cy.contains('h2', 'Mod Inbox').scrollIntoView()
    cy.contains('h2', 'Mod Inbox').should('be.visible')
    cy.screenshot('inbox-desktop-dark', { capture: 'viewport' })
    cy.then(() => expect(writes).to.deep.equal([]))
  })
})
