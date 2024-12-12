/// <reference types="cypress" />"

import {
  mockModerationReportsResponse,
  mockRepoResponse,
  SERVER_URL,
} from '../../support/api'

describe('Workspace -> Email Action', () => {
  let authFixture
  let statusesFixture
  let seedFixture

  beforeEach(() => {
    cy.visit('http://127.0.0.1:3000/reports')
    cy.fixture('statuses.json').then((data) => {
      statusesFixture = data
      mockModerationReportsResponse(statusesFixture.onlyRepo)
    })
    cy.fixture('seed.json').then((data) => {
      seedFixture = data
      mockRepoResponse({ statusCode: 200, body: seedFixture.carla.repo })
    })

    cy.fixture('auth.json').then((data) => {
      authFixture = data
      cy.login(authFixture)
    })
  })

  it('Allows sending bulk emails', () => {
    cy.openCommandPalette('workspace')
    cy.get('#kbar-listbox-item-0').click()
    cy.get('input[name="items"]').type(`${seedFixture.carla.repo.did}{enter}`)
    cy.get('input[name="workspaceItem"]').click()
    cy.contains('button', 'Show Action Form').click()
    cy.get('div[data-cy="mod-event-selector"]').click()
    cy.get('[data-headlessui-state="open"] > a:contains("Send Email")').click()
    cy.contains('button[type="submit"]', 'Send').click()

    // Assert the that email fails when content is empty
    cy.get('.Toastify__toast')
      .should('contain.text', 'Failed to action 1 Account')
      .and('be.visible')

    const subject = 'Your account behavior'
    const content = 'Please make sure you comply with our policies'
    // Set up emit event interceptor
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        expect(req.body.event.subjectLine).to.equal(subject)
        expect(req.body.event.content).to.include(content)
      },
    )

    cy.get('input[name="subject"]').type(subject)
    cy.get('textarea.w-md-editor-text-input').type(content)
    cy.contains('button[type="submit"]', 'Send').click()
  })
})
