/// <reference types="cypress" />

import {
  mockSafelinkQueryRulesResponse,
  mockSafelinkAddRuleResponse,
  mockSafelinkUpdateRuleResponse,
} from '../../support/api'

describe('Safelink Feature', () => {
  let authFixture
  const openSafelinkTab = () => {
    cy.get('table').should('be.visible')
    cy.get('a[href="/configure"]').click()
    cy.contains('Safelink').click()
    cy.contains('Loading safelink rules').should('be.visible')
  }

  beforeEach(() => {
    cy.visit('http://127.0.0.1:3000')
    cy.fixture('auth.json').then((data) => {
      authFixture = data
      cy.login(authFixture)
    })
  })

  describe('Add Safelink', () => {
    it('Allows adding a new safelink rule and validates API call', () => {
      const ruleData = {
        url: 'https://malicious.example.com',
        pattern: 'url',
        action: 'block',
        reason: 'spam',
        comment: 'Test malicious website',
      }

      mockSafelinkAddRuleResponse({
        statusCode: 200,
        body: {
          ...ruleData,
          id: 1,
          createdBy: 'did:plc:jttgywq7eusytkmurmjbum6h',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          eventType: 'addRule',
        },
      })

      openSafelinkTab()
      cy.get('a').contains('Add Rule').click()

      cy.get('#url').type('https://malicious.example.com')
      cy.get('#pattern').select('url')
      cy.get('#action').select('block')
      cy.get('#reason').select('spam')
      cy.get('#comment').type('Test malicious website')
      cy.get('button[type="submit"]').click()

      // Validate that the rule input was submitted
      cy.wait('@mockSafelinkAddRuleResponse').then((interception) => {
        expect(interception.request.body).to.deep.include(ruleData)
      })

      // Verify that success toast is shown
      cy.contains('Safelink rule added successfully').should('be.visible')
      // Verify that page is navigated back to rules list
      cy.contains('Safelink Rules').should('be.visible')
    })

    it('Validates form inputs and shows error for invalid data', () => {
      openSafelinkTab()

      cy.get('a').contains('Add Rule').click()
      cy.get('button[type="submit"]').click()
      cy.get('#url:invalid').should('exist')
    })

    it('Shows error when API call fails', () => {
      // Set up API mock to return error
      mockSafelinkAddRuleResponse({
        statusCode: 400,
        body: {
          error: 'InvalidInput',
          message: 'URL already exists in safelink rules',
        },
      })

      openSafelinkTab()
      cy.get('a').contains('Add Rule').click()

      cy.get('#url').type('https://example.com')
      cy.get('#pattern').select('url')
      cy.get('#action').select('block')
      cy.get('#reason').select('spam')
      cy.get('button[type="submit"]').click()

      cy.contains('URL already exists in safelink rules').should('be.visible')
    })
  })

  describe.only('Edit Safelink', () => {
    const mockRules = [
      {
        url: 'https://malicious.example.com',
        pattern: 'url',
        action: 'block',
        reason: 'spam',
        comment: 'Test malicious website',
        createdBy: 'did:plc:jttgywq7eusytkmurmjbum6h',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      },
      {
        url: 'suspicious.com',
        pattern: 'domain',
        action: 'warn',
        reason: 'phishing',
        comment: 'Suspicious domain',
        createdBy: 'did:plc:jttgywq7eusytkmurmjbum6h',
        createdAt: '2024-01-02T10:30:00Z',
        updatedAt: '2024-01-02T10:30:00Z',
      },
    ]

    beforeEach(() => {
      mockSafelinkQueryRulesResponse({
        rules: mockRules,
        cursor: undefined,
      })
    })

    it('Displays multiple safelink rules in the list', () => {
      openSafelinkTab()

      cy.contains('https://malicious.example.com').should('be.visible')
      cy.contains('suspicious.com').should('be.visible')
      cy.contains('Test malicious website').should('be.visible')
      cy.contains('Suspicious domain').should('be.visible')
      cy.contains('Block').should('be.visible')
      cy.contains('Warn').should('be.visible')
      cy.contains('URL').should('be.visible')
      cy.contains('Domain').should('be.visible')
    })

    it('Allows editing an existing rule with prefilled values and validates API call', () => {
      const updatedRuleData = {
        url: 'https://malicious.example.com',
        pattern: 'url',
        action: 'warn',
        reason: 'phishing',
        comment: 'Updated test malicious website',
      }

      mockSafelinkUpdateRuleResponse({
        statusCode: 200,
        body: {
          ...updatedRuleData,
          id: 2,
          eventType: 'updateRule',
          createdBy: 'did:plc:jttgywq7eusytkmurmjbum6h',
          createdAt: '2024-01-01T12:00:00Z',
          updatedAt: new Date().toISOString(),
        },
      })

      openSafelinkTab()

      cy.get('a[title="Edit rule"]').first().click()

      cy.url().should('include', 'view=edit')
      cy.url().should('include', 'url=https%3A%2F%2Fmalicious.example.com')
      cy.url().should('include', 'pattern=url')

      cy.get('#url').should('have.value', 'https://malicious.example.com')
      cy.get('#pattern').should('have.value', 'url')
      cy.get('#action').should('have.value', 'block')
      cy.get('#reason').should('have.value', 'spam')
      cy.get('#comment').should('have.value', 'Test malicious website')

      cy.get('#url').should('have.attr', 'readonly')
      cy.get('#pattern').should('be.disabled')

      cy.get('#action').select('warn')
      cy.get('#reason').select('phishing')
      cy.get('#comment').clear()
      cy.get('#comment').type('Updated test malicious website')

      cy.get('button[type="submit"]').click()

      cy.wait('@mockSafelinkUpdateRuleResponse').then((interception) => {
        expect(interception.request.body).to.deep.include(updatedRuleData)
      })

      cy.contains('Safelink rule updated successfully').should('be.visible')
      cy.contains('Safelink Rules').should('be.visible')
    })

    it('Shows error when update API call fails', () => {
      // Set up API mock to return error
      mockSafelinkUpdateRuleResponse({
        statusCode: 400,
        body: {
          error: 'InvalidInput',
          message: 'Failed to update rule',
        },
      })

      openSafelinkTab()

      // Click edit button for the first rule
      cy.get('a[title="Edit rule"]').first().click()

      // Change some values and submit
      cy.get('#action').select('warn')
      cy.get('button[type="submit"]').click()

      // Should show error message
      cy.contains('Failed to update rule').should('be.visible')
    })
  })
})
