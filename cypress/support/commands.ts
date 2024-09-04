import {
  mockAuthResponse,
  mockRepoResponse,
  mockProfileResponse,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockServerConfigResponse,
  API_URL,
  mockRecordResponse,
  mockLabelerServiceRecordResponse,
} from './api'

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
    mockLabelerServiceRecordResponse({
      statusCode: 200,
      body: authFixture.getLabelerRecordResponse,
    })

    cy.get('#service-url').clear().type(API_URL)
    cy.get('#account-handle').type('alice.test')
    cy.get('#password').type('hunter2')
    cy.get("button[type='submit']").click()
  },
)
