/// <reference types="cypress" />"

import {
  API_URL,
  mockAuthResponse,
  mockLabelerServiceRecordResponse,
  mockOzoneDidDataResponse,
  mockOzoneMetaResponse,
} from '../../support/api'

describe('Authentication', () => {
  let authFixture

  beforeEach(() => {
    cy.fixture('auth.json').then((data) => {
      authFixture = data
      mockOzoneMetaResponse({ statusCode: 200, body: data.ozoneMetaResponse })
      mockOzoneDidDataResponse({
        statusCode: 200,
        body: data.ozoneDidDataResponse,
      })
      mockLabelerServiceRecordResponse({
        statusCode: 200,
        body: data.getLabelerRecordResponse,
      })
    })
    cy.visit('http://127.0.0.1:3000')
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
    }).as('failedLogin')

    cy.get('#service-url', { timeout: 10000 }).should('be.visible').clear()
    cy.get('#service-url').type(API_URL)
    cy.get('#account-handle').type('alice.test')
    cy.get('#password').type('hunter2')
    cy.get("button[type='submit']").click()
    cy.wait('@failedLogin').its('response.statusCode').should('eq', 401)

    // Assert that the error message is displayed in the UI
    cy.get('form').should('include.text', errorMessage)
  })

  it('Logs in and opens reports page when authentication succeeds', () => {
    cy.login(authFixture)
    // Assert that the reports are displayed
    cy.get('table').should('include.text', 'Loading moderation queue...')
  })
})
