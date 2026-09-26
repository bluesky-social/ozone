/// <reference types="cypress" />

import { mount } from 'cypress/react'
import { DEFAULT_LOGIN_SERVICE_URL } from '../../../../lib/constants'
import {
  CredentialSignInForm,
  getSuggestedServiceUrls,
} from '../../../../components/shell/auth/credential/CredentialSignInForm'

describe('getSuggestedServiceUrls', () => {
  it('keeps bsky.social when default is different', () => {
    expect(getSuggestedServiceUrls('https://example-pds.test')).to.deep.equal([
      'https://example-pds.test',
      'https://bsky.social',
      'https://staging.bsky.dev',
    ])
  })

  it('does not duplicate bsky.social when it is the default', () => {
    expect(getSuggestedServiceUrls('https://bsky.social')).to.deep.equal([
      'https://bsky.social',
      'https://staging.bsky.dev',
    ])
  })
})

describe('<CredentialSignInForm />', () => {
  it('initializes service input from configured default and allows edits', () => {
    mount(
      <CredentialSignInForm className="mt-8 space-y-6" signIn={() => null} />,
    )

    cy.get('#service-url').should('have.value', DEFAULT_LOGIN_SERVICE_URL)
    cy.get('#service-url').clear()
    cy.get('#service-url').type('https://example-pds.test')
    cy.get('#service-url').should('have.value', 'https://example-pds.test')
  })

  it('renders deduplicated suggestions derived from the default PDS URL', () => {
    mount(
      <CredentialSignInForm className="mt-8 space-y-6" signIn={() => null} />,
    )

    const expectedSuggestions = getSuggestedServiceUrls(DEFAULT_LOGIN_SERVICE_URL)

    cy.get('#service-url-suggestions option')
      .then(($options) =>
        Array.from($options).map((option) => option.getAttribute('value')),
      )
      .then((values) => {
        const suggestionValues = values.filter(
          (value): value is string => Boolean(value),
        )
        expect(suggestionValues).to.deep.equal(expectedSuggestions)
        expect(new Set(suggestionValues).size).to.equal(suggestionValues.length)
      })
  })
})

export {}
