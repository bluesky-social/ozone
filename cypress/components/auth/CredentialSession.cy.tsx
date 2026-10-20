/// <reference types="cypress" />

import React from 'react'
import { useCredential } from '../../../components/shell/auth/credential/useCredential'

const sessionKey = 'ozone_session'

function CredentialSessionProbe({ service }: { service: string }) {
  const { session, signIn } = useCredential()
  return (
    <>
      <output>{session?.did ?? 'Signed out'}</output>
      <button
        onClick={() =>
          signIn({ service, identifier: 'alice.test', password: 'hunter2' })
        }
      >
        Sign in
      </button>
    </>
  )
}

describe('Credential session recovery', () => {
  let service: string
  let savedSession

  beforeEach(() => {
    cy.fixture('auth.json').then(({ createSessionResponse }) => {
      cy.window().then((win) => {
        service = win.location.origin
        savedSession = { ...createSessionResponse, service }
        win.localStorage.setItem(sessionKey, JSON.stringify(savedSession))
      })
      cy.intercept('POST', '**/xrpc/com.atproto.server.createSession', {
        body: createSessionResponse,
      }).as('signIn')
      cy.intercept('GET', '**/xrpc/com.atproto.server.getSession', {
        body: createSessionResponse,
      })
    })
  })

  for (const { statusCode, error, retainSession } of [
    { statusCode: 503, error: 'ServiceUnavailable', retainSession: true },
    { statusCode: 401, error: 'ExpiredToken', retainSession: false },
  ]) {
    it(`allows signing in after saved-session refresh fails with ${error}`, () => {
      cy.intercept('POST', '**/xrpc/com.atproto.server.refreshSession', {
        statusCode,
        body: { error, message: 'Session refresh failed' },
      }).as('refresh')
      cy.mount(<CredentialSessionProbe service={service} />)
      cy.wait('@refresh')
      cy.get('output').should('have.text', 'Signed out')
      cy.window().should((win) => {
        expect(win.localStorage.getItem(sessionKey)).to.equal(
          retainSession ? JSON.stringify(savedSession) : null,
        )
      })
      cy.contains('button', 'Sign in').click()
      cy.wait('@signIn')
      cy.get('output').should('have.text', savedSession.did)
    })
  }

  it('keeps sign-in usable when the saved service URL is malformed', () => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        sessionKey,
        JSON.stringify({ ...savedSession, service: 'not a URL' }),
      )
    })
    cy.mount(<CredentialSessionProbe service={service} />)
    cy.get('output').should('have.text', 'Signed out')
    cy.contains('button', 'Sign in').click()
    cy.wait('@signIn')
    cy.get('output').should('have.text', savedSession.did)
  })

  it('restores the saved account after a successful refresh', () => {
    cy.intercept('POST', '**/xrpc/com.atproto.server.refreshSession', (req) => {
      req.reply({ body: savedSession })
    }).as('refresh')
    cy.mount(<CredentialSessionProbe service={service} />)
    cy.wait('@refresh')
    cy.get('output').should('have.text', savedSession.did)
  })
})
