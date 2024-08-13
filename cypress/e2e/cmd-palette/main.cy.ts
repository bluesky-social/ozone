/// <reference types="cypress" />"

import { HANDLE_RESOLVER_URL, SERVER_URL } from '../../support/api'

describe('Command Palette', () => {
  let statusesFixture

  const mockModerationReportsResponse = (response: Record<string, any>) =>
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.moderation.queryStatuses*`,
      response,
    )

  const mockResolveHandleResponse = (response: Record<string, any>) =>
    cy.intercept(
      'GET',
      `${HANDLE_RESOLVER_URL}/com.atproto.identity.resolveHandle*`,
      response,
    )

  const openCommandPalette = (input?: string) => {
    const comboKey = Cypress.platform === 'darwin' ? '{cmd}k' : '{ctrl}k'
    cy.get('body').type(comboKey)
    if (input) {
      cy.get('[aria-controls="kbar-listbox"]').clear().type(input)
      cy.wait(300)
    }
  }

  let authFixture
  const bskyPostUrlWithHandle =
    'https://bsky.app/profile/alice.test/post/3kozf56ocx32a'

  beforeEach(() => {
    cy.visit('http://127.0.0.1:3000')
    cy.fixture('statuses.json').then((data) => {
      statusesFixture = data
      mockModerationReportsResponse(statusesFixture.multiCidLabeledProfile)
    })
    cy.fixture('auth.json').then((data) => {
      authFixture = data
      cy.login(data)
      mockResolveHandleResponse({
        statusCode: 200,
        body: data.createResolveHandleResponse,
      })
    })
  })

  it('Shows post options from bsky app post url', () => {
    openCommandPalette(bskyPostUrlWithHandle)
    cy.get('#kbar-listbox-item-1').contains('Take action on Post').click()
    cy.wait(300)
    cy.location('href').then((href) => {
      expect(decodeURIComponent(href)).to.include(
        `quickOpen=at://did:plc:56ud7t6bqdkwblmzwmkcetst/app.bsky.feed.post/3kozf56ocx32a`,
      )
    })
  })

  it('Shows user options from bsky app post url', () => {
    openCommandPalette(bskyPostUrlWithHandle)
    cy.get('#kbar-listbox-item-2').contains('Take action on alice.test').click()
    cy.wait(300)
    cy.location('href').then((href) => {
      expect(decodeURIComponent(href)).to.include(
        `quickOpen=did:plc:56ud7t6bqdkwblmzwmkcetst`,
      )
    })
  })
})
