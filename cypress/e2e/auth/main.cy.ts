/// <reference types="cypress" />"

describe('Authentication', () => {
  const SERVER_URL = 'https://bsky.social/xrpc/'
  const PLC_URL = 'https://plc.directory'

  const mockAuthResponse = (response: Record<string, any>) =>
    cy.intercept(
      'POST',
      `${SERVER_URL}/com.atproto.server.createSession`,
      response,
    )

  const mockRepoResponse = (response: Record<string, any>) =>
    cy.intercept('GET', `${SERVER_URL}/com.atproto.admin.getRepo*`, response)

  const mockProfileResponse = (response: Record<string, any>) =>
    cy.intercept('GET', `${SERVER_URL}/app.bsky.actor.getProfile*`, response)

  const mockModerationReportsResponse = (response: Record<string, any>) =>
    cy.intercept(
      'GET',
      `${SERVER_URL}/com.atproto.admin.queryModerationStatuses*`,
      response,
    )
  const mockOzoneMetaResponse = (response: Record<string, any>) =>
    cy.intercept('GET', '/.well-known/ozone-metadata.json', response)
  const mockOzoneDidDataResponse = (response: Record<string, any>) =>
    cy.intercept('GET', `${PLC_URL}/*/data`, response)

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
    // Setup the auth response
    mockAuthResponse({
      statusCode: 200,
      body: authFixture.createSessionResponse,
    })
    mockRepoResponse({
      statusCode: 200,
      body: authFixture.getRepoResponse,
    })
    mockProfileResponse({
      statusCode: 200,
      body: authFixture.getProfileResponse,
    })
    mockModerationReportsResponse({
      statusCode: 200,
      body: { cursor: null, subjectStatuses: [] },
    })
    mockOzoneMetaResponse({
      statusCode: 200,
      body: authFixture.ozoneMetaResponse,
    })
    mockOzoneDidDataResponse({
      statusCode: 200,
      body: authFixture.ozoneDidDataResponse,
    })

    cy.get('#service-url').should('have.value', 'https://bsky.social')
    cy.get('#account-handle').type('alice.test')
    cy.get('#password').type('hunter2')
    cy.get("button[type='submit']").click()

    // Assert that the reports are displayed
    cy.get('table').should('include.text', 'Loading moderation queue...')
  })
})
