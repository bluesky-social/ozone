import {
  mockAuthResponse,
  mockRepoResponse,
  mockProfileResponse,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockServerConfigResponse,
  API_URL,
} from './api'

Cypress.Commands.add(
  'login',
  (authFixture: {
    createSessionResponse: any
    getRepoResponse: any
    getProfileResponse: any
    ozoneMetaResponse: any
    ozoneDidDataResponse: any
    ozoneServerConfigResponse: any
  }) => {
    // Setup the auth response
    mockAuthResponse({
      statusCode: 200,
      body: authFixture.createSessionResponse,
    })
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

    cy.get('#service-url').should('have.value', API_URL)
    cy.get('#account-handle').type('alice.test')
    cy.get('#password').type('hunter2')
    cy.get("button[type='submit']").click()
  },
)
