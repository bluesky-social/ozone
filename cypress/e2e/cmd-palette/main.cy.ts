/// <reference types="cypress" />"

import { mockServerConfigResponse } from '../../support/api'

describe('Command Palette', () => {
  const SERVER_URL = 'https://bsky.social/xrpc'
  const PLC_URL = 'https://plc.directory'

  const mockAuthResponse = (response: Record<string, any>) =>
    cy.intercept(
      'POST',
      `${SERVER_URL}/com.atproto.server.createSession`,
      response,
    )

  const mockRepoResponse = (response: Record<string, any>) =>
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.moderation.getRepo*`,
      response,
    )

  const mockProfileResponse = (response: Record<string, any>) =>
    cy.intercept('GET', `${SERVER_URL}/app.bsky.actor.getProfile*`, response)

  const mockModerationReportsResponse = (response: Record<string, any>) =>
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.moderation.queryStatuses*`,
      response,
    )
  const mockOzoneMetaResponse = (response: Record<string, any>) =>
    cy.intercept('GET', '/.well-known/ozone-metadata.json', response)
  const mockOzoneDidDataResponse = (response: Record<string, any>) =>
    cy.intercept('GET', `${PLC_URL}/*/data`, response)
  const mockResolveHandleResponse = (response: Record<string, any>) =>
    cy.intercept(
      'GET',
      `${SERVER_URL}/com.atproto.identity.resolveHandle*`,
      response,
    )

  const setupLoginMocks = () => {
    mockAuthResponse({
      statusCode: 200,
      body: authFixture.createSessionResponse,
    })
    mockResolveHandleResponse({
      statusCode: 200,
      body: authFixture.createResolveHandleResponse,
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
    mockServerConfigResponse({
      statusCode: 200,
      body: authFixture.ozoneServerConfigResponse,
    })
  }

  const openCommandPalette = (input?: string) => {
    const comboKey = Cypress.platform === 'darwin' ? '{cmd}k' : '{ctrl}k'
    cy.get('body').type(comboKey)
    if (input) {
      cy.get('[aria-controls="kbar-listbox"]').clear().type(input, {
        delay: 0,
      })
    }
  }

  let authFixture
  const bskyPostUrlWithHandle =
    'https://bsky.app/profile/alice.test/post/3kozf56ocx32a'

  beforeEach(() => {
    cy.visit('http://localhost:3000')
    cy.fixture('auth.json').then((data) => {
      authFixture = data

      setupLoginMocks()
      cy.get('#service-url').should('have.value', 'https://bsky.social')
      cy.get('#account-handle').type('alice.test')
      cy.get('#password').type('hunter2')
      cy.get("button[type='submit']").click()
      cy.wait(1000)
    })
  })

  it('Shows options from bsky app post url', () => {
    // Setup the auth response
    openCommandPalette(bskyPostUrlWithHandle)
    cy.get('#kbar-listbox-item-1').contains('Take action on Post').click()
    cy.wait(500)
    cy.location('href').then((href) => {
      expect(decodeURIComponent(href)).to.include(
        `quickOpen=at://did:plc:56ud7t6bqdkwblmzwmkcetst/app.bsky.feed.post/3kozf56ocx32a`,
      )
    })

    cy.wait(1000)
    openCommandPalette(bskyPostUrlWithHandle)
    cy.get('#kbar-listbox-item-2').contains('Take action on alice.test').click()
    cy.wait(500)
    cy.location('href').then((href) => {
      expect(decodeURIComponent(href)).to.include(
        `quickOpen=did:plc:56ud7t6bqdkwblmzwmkcetst`,
      )
    })
  })
})
