/// <reference types="cypress" />"

import { mockAuthResponse } from '../../support/api'

describe('Authentication', () => {
  let authFixture

  beforeEach(() => {
    cy.visit('http://localhost:3000')
    cy.fixture('auth.json').then((data) => (authFixture = data))
  })

  it('Displays error when authentication fails', () => {
    // Setup the auth response
    const errorMessage = 'Invalid email'
    mockAuthResponse({
      statusCode: 401,
      body: {
        error: 'AuthenticationRequired',
        message: errorMessage,
      },
    })

    cy.get('#service-url').should('have.value', 'https://bsky.social')
    cy.get('#account-handle').type('alice.test')
    cy.get('#password').type('hunter2')
    cy.get("button[type='submit']").click()

    // Assert that the error message is displayed in the UI
    cy.get('form').should('include.text', errorMessage)
  })

  it('Logs in and opens reports page when authentication succeeds', () => {
    cy.login(authFixture)
    // Assert that the reports are displayed
    cy.get('table').should('include.text', 'Loading moderation queue...')
  })
})
