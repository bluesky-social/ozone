/// <reference types="cypress" />

import React from 'react'
import '../../../styles/globals.css'
import { RevokeCredentialsForm } from '../../../components/repositories/RevokeCredential'

describe('<RevokeCredentialsForm />', () => {
  let mockProps: React.ComponentProps<typeof RevokeCredentialsForm>

  beforeEach(() => {
    mockProps = {
      accounts: [{ did: 'did:plc:test123', handle: 'testuser.bsky.social' }],
      onClose: cy.stub(),
      revokeCredentials: cy.stub(),
      isLoading: false,
      error: null,
      emailTemplate: {
        id: 'template-123',
        name: 'Account Revocation Notice',
        subject: 'Your account credentials have been revoked',
        contentMarkdown:
          'Hello {{handle}}, your credentials have been revoked for security reasons.',
        disabled: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastUpdatedBy: 'admin',
      },
      revokeCredentialsTemplateId: 'template-123',
    }
  })

  it('handles single account credential revocation with comment and email template', () => {
    cy.mount(<RevokeCredentialsForm {...mockProps} />)

    cy.contains('Revoke Account Credentials')
    cy.contains(
      'Revoking account credentials will remove all active session tokens',
    )
    cy.contains('@testuser.bsky.social')

    cy.get('input[name="comment"]')
      .should('have.attr', 'placeholder')
      .and('contain', 'Account was compromised')
    cy.get('input[name="comment"]').type(
      'Account security compromised - suspicious login activity detected',
    )
    cy.get('input[name="comment"]').should(
      'have.value',
      'Account security compromised - suspicious login activity detected',
    )

    cy.contains('Send email using template')
    cy.contains('Account Revocation Notice')
    cy.get('input[name="sendActionEmail"]').should('be.checked')

    cy.get('input[name="sendActionEmail"]').uncheck()
    cy.get('input[name="sendActionEmail"]').should('not.be.checked')
    cy.get('input[name="sendActionEmail"]').check()

    cy.contains('Revoke Credentials').click()
    cy.contains('Revoke Account Credentials?')
    cy.contains('Yes, Revoke Credentials').click()

    cy.wrap(mockProps.revokeCredentials).should(
      'have.been.calledWith',
      {
        comment:
          'Account security compromised - suspicious login activity detected',
        externalUrl: '',
        accounts: [{ did: 'did:plc:test123', handle: 'testuser.bsky.social' }],
        emailTemplate: mockProps.emailTemplate,
        batchId: undefined,
      },
      Cypress.sinon.match.object,
    )
  })

  it('handles multiple accounts with batch id and external URL', () => {
    const multiAccountProps = {
      ...mockProps,
      accounts: [
        { did: 'did:plc:test1', handle: 'user1.bsky.social' },
        { did: 'did:plc:test2', handle: 'user2.bsky.social' },
        { did: 'did:plc:test3', handle: 'user3.bsky.social' },
      ],
    }

    cy.mount(<RevokeCredentialsForm {...multiAccountProps} />)

    cy.contains('3 accounts')

    cy.get('input[name="comment"]').type('Coordinated spam attack detected')
    cy.get('input[name="externalUrl"]').type('https://linear.app/case/12345')

    cy.contains('Batch ID')
    cy.get('button[title="Regenerate Batch ID"]').click()

    cy.contains('Revoke Credentials').click()
    cy.contains('Yes, Revoke Credentials').click()

    cy.wrap(mockProps.revokeCredentials).should(
      'have.been.calledWith',
      Cypress.sinon.match({
        comment: 'Coordinated spam attack detected',
        externalUrl: 'https://linear.app/case/12345',
        accounts: multiAccountProps.accounts,
        emailTemplate: mockProps.emailTemplate,
        batchId: Cypress.sinon.match.string,
      }),
      Cypress.sinon.match.object,
    )
  })

  it('handles loading states and error conditions', () => {
    const loadingProps = {
      ...mockProps,
      isLoading: true,
    }

    cy.mount(<RevokeCredentialsForm {...loadingProps} />)

    cy.contains('Revoking...').should('be.disabled')

    const errorProps = {
      ...mockProps,
      ...mockProps,
      error: { message: 'Network timeout occurred' },
    }

    cy.mount(<RevokeCredentialsForm {...errorProps} />)

    cy.contains('Revoke Credentials').click()
    cy.contains('Network timeout occurred')
  })

  it('handles missing email template configuration', () => {
    const noTemplateProps = {
      ...mockProps,
      emailTemplate: undefined,
      revokeCredentialsTemplateId: undefined,
    }

    cy.mount(<RevokeCredentialsForm {...noTemplateProps} />)

    cy.contains('No email template configured for credential revocation')
    cy.contains('Configure a template')

    cy.get('input[name="sendActionEmail"]').should('not.exist')

    cy.contains('Batch ID').should('not.exist')

    cy.get('input[name="comment"]').type('Manual revocation needed')
    cy.contains('Revoke Credentials').click()
    cy.contains('Yes, Revoke Credentials').click()

    cy.wrap(mockProps.revokeCredentials).should(
      'have.been.calledWith',
      {
        comment: 'Manual revocation needed',
        externalUrl: '',
        accounts: mockProps.accounts,
        emailTemplate: undefined,
        batchId: undefined,
      },
      Cypress.sinon.match.object,
    )
  })

  it('handles successful revocation and cleanup', () => {
    const onCloseSpy = cy.stub()
    const mutateStub = cy.stub().callsFake((data, options) => {
      setTimeout(() => options.onSuccess(), 0)
    })

    const successProps = {
      ...mockProps,
      onClose: onCloseSpy,
      revokeCredentials: mutateStub,
    }

    cy.mount(<RevokeCredentialsForm {...successProps} />)

    cy.get('input[name="comment"]').type('Security incident resolved')
    cy.contains('Revoke Credentials').click()
    cy.contains('Yes, Revoke Credentials').click()

    cy.wrap(onCloseSpy).should('have.been.called')
  })
})

export {}
