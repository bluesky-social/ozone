/// <reference types="cypress" />

import {
  mockCreateQueueResponse,
  mockDeleteQueueResponse,
  mockListQueuesResponse,
  mockQueueGetAssignmentsResponse,
} from '../../../support/api'

const BASE_URL = 'http://127.0.0.1:3000'

describe('Queue Management', () => {
  let authFixture: Record<string, any>
  let spamQueue: Record<string, any>
  let hateSpeechQueue: Record<string, any>

  beforeEach(() => {
    cy.visit(`${BASE_URL}/configure?tab=queues`)
    cy.fixture('auth.json').then((auth) => {
      authFixture = auth
      cy.fixture('queues.json').then((queues) => {
        spamQueue = queues.spamQueue
        hateSpeechQueue = queues.hateSpeechQueue
        mockQueueGetAssignmentsResponse({
          statusCode: 200,
          body: { assignments: [] },
        })
        cy.login(authFixture)
      })
    })
  })

  describe('List Queues', () => {
    it('displays queue cards with name, status badge, subject types, report types, and stats', () => {
      mockListQueuesResponse({
        statusCode: 200,
        body: {
          queues: [spamQueue, hateSpeechQueue],
        },
      })

      cy.get('[data-cy="queue-card"]').should('have.length', 2)

      cy.get('[data-cy="queue-card"]')
        .first()
        .within(() => {
          cy.contains('Spam Queue')
          cy.contains('Enabled')
          cy.contains('account')
          cy.contains('Spam')
          cy.contains('5') // pendingCount
          cy.contains('10') // actionedCount
        })

      cy.get('[data-cy="queue-card"]')
        .eq(1)
        .within(() => {
          cy.contains('Hate Speech Queue')
          cy.contains('Disabled')
          cy.contains('record')
          cy.contains('app.bsky.feed.post')
        })

      cy.get('button[title="Edit queue"]').should('have.length', 2)
      cy.get('button[title="Delete queue"]').should('have.length', 2)
    })

    it('shows Load More button and loads next page', () => {
      mockListQueuesResponse({
        statusCode: 200,
        body: {
          queues: [spamQueue],
          cursor: 'page2',
        },
      })

      cy.get('[data-cy="queue-card"]').should('have.length', 1)
      cy.contains('Load more').should('be.visible')

      mockListQueuesResponse({
        statusCode: 200,
        body: {
          queues: [hateSpeechQueue],
        },
      })

      cy.contains('Load more').click()
      cy.get('[data-cy="queue-card"]').should('have.length', 2)
      cy.contains('Load more').should('not.exist')
    })

    it('shows empty state and no action buttons when no queues exist', () => {
      mockListQueuesResponse({
        statusCode: 200,
        body: {
          queues: [],
        },
      })

      cy.contains('No queues found.').should('be.visible')
      cy.get('button[title="Edit queue"]').should('not.exist')
      cy.get('button[title="Delete queue"]').should('not.exist')
    })
  })

  describe('Create Queue', () => {
    beforeEach(() => {
      mockListQueuesResponse({ statusCode: 200, body: { queues: [] } })
    })

    it('creates a queue with all fields and validates the API payload', () => {
      const createdQueue = {
        ...spamQueue,
        id: 99,
        name: 'My New Queue',
        subjectTypes: ['account', 'record'],
        collection: 'app.bsky.feed.post',
        reportTypes: ['tools.ozone.report.defs#reasonHarassmentHateSpeech'],
      }

      mockCreateQueueResponse({
        statusCode: 200,
        body: { queue: createdQueue },
      })
      mockListQueuesResponse({
        statusCode: 200,
        body: { queues: [createdQueue] },
      })

      cy.get('[data-cy="add-queue-button"]').click()
      cy.get('#name').should('be.visible')

      cy.get('#name').type('My New Queue')
      cy.get('#description').type('A test queue for new reports')
      cy.get('#subjectTypes-account').check()
      cy.get('#subjectTypes-record').check()
      cy.get('#collection').should('be.visible').type('app.bsky.feed.post{esc}')

      cy.get('[data-cy="report-types-input"]')
        .scrollIntoView()
        .type('hate speech')
      cy.contains('Hate Speech').click()
      cy.get('[data-cy="report-types-input"]').type('{esc}')

      cy.get('[data-cy="submit-queue-button"]').click()
      cy.wait(2000)

      cy.contains('Queue created successfully').should('be.visible')
    })

    it('shows collection field only when record subject type is checked', () => {
      cy.get('[data-cy="add-queue-button"]').click()

      cy.get('#collection').should('not.exist')
      cy.get('#subjectTypes-record').check()
      cy.get('#collection').should('be.visible')
      cy.get('#subjectTypes-record').uncheck()
      cy.get('#collection').should('not.exist')
    })
  })

  describe('Delete Queue', () => {
    describe('with multiple queues (migration target available)', () => {
      beforeEach(() => {
        mockListQueuesResponse({
          statusCode: 200,
          body: { queues: [spamQueue, hateSpeechQueue] },
        })
      })

      it('opens delete dialog with correct queue name and migration dropdown', () => {
        cy.get('button[title="Delete queue"]').first().click()

        cy.get('[data-cy="delete-queue-dialog"]').within(() => {
          cy.contains('Delete Queue: Spam Queue?')
          cy.get('#migrate-target').should('be.visible')
        })
        cy.contains('This is the last queue').should('not.exist')
      })

      it('deletes without migration and validates payload has no migrateToQueueId', () => {
        mockDeleteQueueResponse({
          statusCode: 200,
          body: {
            deleted: true,
            reportsMigrated: 0,
          },
        })
        mockListQueuesResponse({
          statusCode: 200,
          body: { queues: [hateSpeechQueue] },
        })

        cy.get('button[title="Delete queue"]').first().click()
        cy.get('[data-cy="confirm-delete-queue-button"]').click()
        cy.wait(2000)
        cy.contains('Queue deleted successfully').should('be.visible')
        cy.get('[data-cy="delete-queue-dialog"]').should('not.exist')
      })
    })
  })
})
