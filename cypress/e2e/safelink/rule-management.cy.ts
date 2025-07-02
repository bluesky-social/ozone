/// <reference types="cypress" />

import {
  mockSafelinkQueryRulesResponse,
  mockSafelinkQueryEventsResponse,
  mockSafelinkRemoveRuleResponse,
  SERVER_URL,
} from '../../support/api'

describe('Safelink Rule Management', () => {
  let authFixture

  const mockRules = [
    {
      url: 'https://malicious.example.com',
      pattern: 'url',
      action: 'block',
      reason: 'spam',
      comment: 'Test malicious website',
      createdBy: 'test-moderator',
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
    },
    {
      url: 'suspicious.com',
      pattern: 'domain',
      action: 'warn',
      reason: 'phishing',
      comment: 'Suspicious domain',
      createdBy: 'another-moderator',
      createdAt: '2024-01-02T10:30:00Z',
      updatedAt: '2024-01-02T10:30:00Z',
    },
  ]

  beforeEach(() => {
    cy.visit('http://127.0.0.1:3000')
    cy.fixture('auth.json').then((data) => {
      authFixture = data
      cy.login(authFixture)
    })

    // Mock the rules query to return test data
    mockSafelinkQueryRulesResponse({
      rules: mockRules,
      cursor: undefined,
    })
  })

  it('Displays existing safelink rules with proper information', () => {
    // Navigate to configuration page directly with safelink tab
    cy.visit('http://127.0.0.1:3000/configure?tab=safelink')
    
    // Should display the rules
    cy.contains('https://malicious.example.com').should('be.visible')
    cy.contains('suspicious.com').should('be.visible')
    cy.contains('Test malicious website').should('be.visible')
    cy.contains('Suspicious domain').should('be.visible')
    
    // Should show action types
    cy.contains('Block').should('be.visible')
    cy.contains('Warn').should('be.visible')
    
    // Should show pattern types
    cy.contains('URL').should('be.visible')
    cy.contains('Domain').should('be.visible')
    
    // Should show moderator info
    cy.contains('test-moderator').should('be.visible')
    cy.contains('another-moderator').should('be.visible')
  })

  it('Allows viewing events for a specific rule', () => {
    const mockEvents = [
      {
        id: 1,
        url: 'https://malicious.example.com',
        pattern: 'url',
        action: 'block',
        reason: 'spam',
        comment: 'Rule added',
        createdBy: 'test-moderator',
        createdAt: '2024-01-01T12:00:00Z',
        eventType: 'addRule',
      },
    ]

    // Mock events query
    mockSafelinkQueryEventsResponse({
      events: mockEvents,
      cursor: undefined,
    })

    // Navigate to configuration page directly with safelink tab
    cy.visit('http://127.0.0.1:3000/configure?tab=safelink')
    
    // Click "View events" button for the first rule (should be the chevron icon)
    cy.get('button[title="View events"]').first().click()
    
    // Should navigate to events view and show events
    cy.url().should('include', 'view=events')
    cy.url().should('include', 'urls=https%3A%2F%2Fmalicious.example.com')
    cy.url().should('include', 'pattern=url')
    
    // Wait for events to load and verify content
    cy.wait('@mockSafelinkQueryEventsResponse')
    cy.contains('Rule added').should('be.visible')
    cy.contains('Add').should('be.visible') // Event type
  })

  it('Allows editing an existing rule', () => {
    // Navigate to configuration page directly with safelink tab
    cy.visit('http://127.0.0.1:3000/configure?tab=safelink')
    
    // Click edit button for the first rule (pencil icon)
    cy.get('button[title="Edit rule"]').first().click()
    
    // Should navigate to edit view with URL and pattern in query params
    cy.url().should('include', 'view=edit')
    cy.url().should('include', 'url=https%3A%2F%2Fmalicious.example.com')
    cy.url().should('include', 'pattern=url')
    
    // Form should be pre-populated with rule data
    cy.get('#url').should('have.value', 'https://malicious.example.com')
    cy.get('#pattern').should('have.value', 'url')
    cy.get('#action').should('have.value', 'block')
    cy.get('#reason').should('have.value', 'spam')
    cy.get('#comment').should('have.value', 'Test malicious website')
    
    // URL and pattern fields should be disabled/readonly in edit mode
    cy.get('#url').should('have.attr', 'readonly')
    cy.get('#pattern').should('be.disabled')
  })

  it('Allows removing a safelink rule with confirmation', () => {
    // Set up remove rule API mock
    mockSafelinkRemoveRuleResponse({
      statusCode: 200,
      body: { success: true },
    })

    // Navigate to configuration page directly with safelink tab
    cy.visit('http://127.0.0.1:3000/configure?tab=safelink')
    
    // Stub the confirm dialog to return true
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true)
    })
    
    // Click remove button for the first rule (trash icon)
    cy.get('button[title="Remove rule"]').first().click()
    
    // Verify the API call was made
    cy.wait('@mockSafelinkRemoveRuleResponse').then((interception) => {
      expect(interception.request.body).to.deep.include({
        url: 'https://malicious.example.com',
        pattern: 'url',
      })
    })
  })

  it('Cancels removal when user clicks cancel in confirmation dialog', () => {
    // Navigate to configuration page directly with safelink tab
    cy.visit('http://127.0.0.1:3000/configure?tab=safelink')
    
    // Stub the confirm dialog to return false (user cancels)
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(false)
    })
    
    // Click remove button for the first rule (trash icon)
    cy.get('button[title="Remove rule"]').first().click()
    
    // Rule should still be visible (removal was cancelled)
    cy.contains('https://malicious.example.com').should('be.visible')
  })

  it('Shows pagination when there are many rules', () => {
    // Mock response with cursor for pagination
    mockSafelinkQueryRulesResponse({
      rules: mockRules,
      cursor: 'next-page-cursor',
    })

    // Navigate to configuration page directly with safelink tab
    cy.visit('http://127.0.0.1:3000/configure?tab=safelink')
    
    // Should show "Load More" button when there's a cursor
    cy.contains('Load More').should('be.visible')
  })

  it('Displays appropriate UI elements and actions for each rule', () => {
    // Navigate to configuration page directly with safelink tab
    cy.visit('http://127.0.0.1:3000/configure?tab=safelink')
    
    // Each rule should have view events, edit, and remove buttons
    cy.get('button[title="View events"]').should('have.length', 2)
    cy.get('button[title="Edit rule"]').should('have.length', 2)
    cy.get('button[title="Remove rule"]').should('have.length', 2)
    
    // Should show proper action colors/styling
    cy.contains('Block').should('have.class', 'text-red-600')
    cy.contains('Warn').should('have.class', 'text-yellow-600')
  })
})