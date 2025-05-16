/// <reference types="cypress" />

import { mount } from 'cypress/react'

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
    /**
     * Open command palette in app
     * @example
     * cy.openCommandPalette()
     */
    openCommandPalette(input?: string): Chainable<any>

    mount: typeof mount
  }
}
