/// <reference types="cypress" />

import {
  mockLabelerServiceRecordResponse,
  mockOzoneDidDataResponse,
  mockOzoneMetaResponse,
  SERVER_URL,
} from '../../support/api'

const BASE_URL = Cypress.env('BASE_URL') || 'http://127.0.0.1:3000'
const did = 'did:plc:tfeay256xpz3vf5v5d3cxykt'

function login(path: string, role = 'roleAdmin') {
  cy.fixture('auth.json').then((auth) => {
    auth.ozoneServerConfigResponse.viewer.role = `tools.ozone.team.defs#${role}`
    mockOzoneMetaResponse({ body: auth.ozoneMetaResponse })
    mockOzoneDidDataResponse({ body: auth.ozoneDidDataResponse })
    mockLabelerServiceRecordResponse({
      statusCode: 200,
      body: auth.getLabelerRecordResponse,
    })
    cy.visit(`${BASE_URL}${path}`)
    cy.login(auth)
  })
}

describe('Queue matching and strict access', () => {
  beforeEach(() => {
    const blocked = { statusCode: 503, body: { error: 'UnmockedTestRequest' } }
    cy.intercept('https://**', blocked)
    cy.intercept('**/xrpc/**', blocked)
    cy.intercept('**/api/**', blocked)
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.setting.listOptions*`, {
      options: [],
    })
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
      queues: [],
    }).as('queues')
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.getAssignments*`, {
      assignments: [],
    })
  })

  it('creates a strict queue with accessible field help', () => {
    cy.fixture('queues.json').then(({ spamQueue }) => {
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.queue.createQueue`,
        (request) => {
          expect(request.body.strictAccess).to.equal(true)
          request.reply({ queue: { ...spamQueue, ...request.body } })
        },
      ).as('create')
    })
    login('/configure?tab=queues')
    cy.get('[data-cy="add-queue-button"]').click()
    cy.get('#name').type('Tagged queue')
    cy.get('#subjectTypes-account').check()
    cy.get('#strictAccess').check()
    cy.get('[aria-label="About strict access"]').focus()
    cy.get('[aria-label="About strict access"]').then(($button) => {
      cy.get(`[id="${$button.attr('aria-describedby')}"]`)
        .should('be.visible')
        .and('contain', 'Other roles need an active queue assignment')
    })
    cy.get('[aria-label="About strict access"]').type('{esc}')
    cy.get('[aria-label="About strict access"]').then(($button) => {
      cy.get(`[id="${$button.attr('aria-describedby')}"]`).should(
        'not.be.visible',
      )
    })
    cy.get('#name').focus()
    cy.get('[data-cy="submit-queue-button"]').click()
    cy.wait('@create')
    cy.contains('Queue created successfully').should('be.visible')
  })

  it('preserves a strict queue when a non-admin edits metadata', () => {
    cy.fixture('queues.json').then(({ spamQueue }) => {
      const queue = {
        ...spamQueue,
        strictAccess: true,
      }
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
        queues: [queue],
      })
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.queue.updateQueue`,
        (request) => {
          expect(request.body).not.to.have.property('strictAccess')
          expect(request.body).not.to.have.property('reporterTags')
          expect(request.body).not.to.have.property('accountTags')
          expect(request.body.name).to.equal('Renamed queue')
          request.reply({ queue: { ...queue, ...request.body } })
        },
      ).as('update')
    })
    login('/configure?tab=queues', 'roleModerator')
    cy.contains('button', 'Assign to me').should('not.exist')
    cy.get('button[title="Edit queue"]').click()
    cy.get('#strictAccess').should('not.exist')
    cy.contains('Strict access: Enabled').should('be.visible')
    cy.get('#name').clear()
    cy.get('#name').type('Renamed queue')
    cy.get('[data-cy="submit-queue-button"]').click()
    cy.wait('@update')
  })

  it('lets an admin disable strict access without changing matching criteria', () => {
    cy.fixture('queues.json').then(({ spamQueue }) => {
      const queue = {
        ...spamQueue,
        strictAccess: true,
      }
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
        queues: [queue],
      })
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.queue.updateQueue`,
        (request) => {
          expect(request.body.strictAccess).to.equal(false)
          expect(request.body).not.to.have.property('accountTags')
          request.reply({ queue: { ...queue, ...request.body } })
        },
      ).as('update')
    })
    login('/configure?tab=queues')
    cy.get('button[title="Edit queue"]').click()
    cy.get('#strictAccess').should('be.checked').uncheck()
    cy.get('[data-cy="submit-queue-button"]').click()
    cy.wait('@update')
  })

  it('omits an unchanged strict flag when an admin edits metadata', () => {
    cy.fixture('queues.json').then(({ spamQueue }) => {
      const queue = { ...spamQueue, strictAccess: true }
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
        queues: [queue],
      })
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.queue.updateQueue`,
        (request) => {
          expect(request.body).not.to.have.property('strictAccess')
          request.reply({ queue: { ...queue, ...request.body } })
        },
      ).as('update')
    })
    login('/configure?tab=queues')
    cy.get('button[title="Edit queue"]').click()
    cy.get('#name').clear()
    cy.get('#name').type('Renamed queue')
    cy.get('[data-cy="submit-queue-button"]').click()
    cy.wait('@update')
  })

  it('shows the strict lock explanation on keyboard focus', () => {
    cy.fixture('queues.json').then(({ spamQueue, hateSpeechQueue }) => {
      cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
        queues: [{ ...spamQueue, strictAccess: true }, hateSpeechQueue],
      })
    })
    login('/queues')
    cy.get('[aria-label="Strict access"]').should('have.length', 1).focus()
    cy.get('[aria-label="Strict access"]').then(($button) => {
      cy.get(`[id="${$button.attr('aria-describedby')}"]`)
        .should('be.visible')
        .and('contain', 'visible to admins and assigned queue members')
    })
  })

  it('warns a member before leaving a strict queue and removes the queue after revocation', () => {
    let removed = false
    cy.fixture('queues.json').then(({ spamQueue }) => {
      const queue = { ...spamQueue, strictAccess: true }
      cy.intercept(
        'GET',
        `${SERVER_URL}/tools.ozone.queue.listQueues*`,
        (request) => {
          request.reply({ queues: removed ? [] : [queue] })
        },
      )
      cy.intercept(
        'GET',
        `${SERVER_URL}/tools.ozone.queue.getAssignments*`,
        (request) => {
          request.reply({
            assignments: removed
              ? []
              : [{ id: 101, did, queue, startAt: '2026-10-01T00:00:00.000Z' }],
          })
        },
      )
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.queue.unassignModerator`,
        (request) => {
          expect(request.body).to.deep.equal({ did, queueId: queue.id })
          removed = true
          request.reply({})
        },
      ).as('leave')
    })
    login('/queues', 'roleModerator')
    cy.get('[data-cy="queue-assignees"]').closest('[tabindex="0"]').focus()
    cy.get('[data-cy="queue-assignees"]').should('be.visible')
    cy.get(`[data-cy="queue-assignees"] a[href="/repositories/${did}"]`).focus()
    cy.focused().should('have.attr', 'href', `/repositories/${did}`)
    cy.get(
      '[data-cy="queue-assignees"] button[title="Unassign moderator"]',
    ).click()
    cy.contains(
      'Leaving removes your access to this queue and its individual reports.',
    ).should('be.visible')
    cy.contains('button', 'Leave queue').click()
    cy.wait('@leave')
    cy.contains('No queues found.').should('be.visible')
    cy.get('[data-cy="queue-card"]').should('not.exist')
  })
})
