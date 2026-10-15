import {
  mockAuthResponse,
  mockRepoResponse,
  mockProfileResponse,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockServerConfigResponse,
  API_URL,
  mockLabelerServiceRecordResponse,
  SERVER_URL,
} from './api'

function sessionToken(did: string, scope: string) {
  const now = Math.floor(Date.now() / 1000)
  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: did,
    scope,
    iat: now,
    exp: now + 3600,
  })}.test-signature`
}

Cypress.Commands.add(
  'login',
  (authFixture: {
    createSessionResponse: any
    getRepoResponse: any
    getLabelerRecordResponse: any
    getProfileResponse: any
    ozoneMetaResponse: any
    ozoneDidDataResponse: any
    ozoneServerConfigResponse: any
  }) => {
    const session = {
      ...authFixture.createSessionResponse,
      accessJwt: sessionToken(
        authFixture.createSessionResponse.did,
        'com.atproto.access',
      ),
      refreshJwt: sessionToken(
        authFixture.createSessionResponse.did,
        'com.atproto.refresh',
      ),
    }
    // Setup the auth response
    mockAuthResponse({
      statusCode: 200,
      body: session,
    }).as('login')
    // Reloads restore the saved session through both endpoints.
    cy.intercept(
      'POST',
      `${SERVER_URL}/com.atproto.server.refreshSession`,
      session,
    )
    cy.intercept('GET', `${SERVER_URL}/com.atproto.server.getSession`, session)
    mockServerConfigResponse({
      statusCode: 200,
      body: authFixture.ozoneServerConfigResponse,
    })
    mockRepoResponse({
      statusCode: 200,
      body: authFixture.getRepoResponse,
    })
    mockProfileResponse({
      statusCode: 200,
      body: authFixture.getProfileResponse,
    })
    mockOzoneMetaResponse({
      statusCode: 200,
      body: authFixture.ozoneMetaResponse,
    })
    mockOzoneDidDataResponse({
      statusCode: 200,
      body: authFixture.ozoneDidDataResponse,
    })
    mockLabelerServiceRecordResponse({
      statusCode: 200,
      body: authFixture.getLabelerRecordResponse,
    })

    // The login form mounts after @atproto/oauth-client-browser import
    // Allow a timeout for the import to complete
    cy.get('#service-url', { timeout: 10000 }).clear()
    cy.get('#service-url').type(API_URL)
    cy.get('#account-handle').type('alice.test')
    cy.get('#password').type('hunter2')
    cy.get("button[type='submit']").click()
    cy.wait('@login').its('response.statusCode').should('eq', 200)
    cy.get('header input[type="search"]', { timeout: 10000 }).should(
      'be.visible',
    )
  },
)

Cypress.Commands.add('openCommandPalette', (input?: string) => {
  cy.contains('button', /^Ctrl Panel$/, { timeout: 10000 })
    .should('be.visible')
    .click()
  cy.get('[aria-controls="kbar-listbox"]').should('be.visible')
  if (input) {
    cy.get('[aria-controls="kbar-listbox"]').clear()
    cy.get('[aria-controls="kbar-listbox"]').type(input)
  }
})
