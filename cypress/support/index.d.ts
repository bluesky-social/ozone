/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject> {
    /**
     * Mock auth response and login
     * @example
     * cy.login()
     */
    login(authFixture: {
      createSessionResponse: any
      getRepoResponse: any
      getProfileResponse: any
      ozoneMetaResponse: any
      ozoneDidDataResponse: any
      ozoneServerConfigResponse: any
    }): Chainable<any>
  }
}
