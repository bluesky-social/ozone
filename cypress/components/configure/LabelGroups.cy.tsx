/// <reference types="cypress" />
import React from 'react'
import '../../../styles/globals.css'
import { LabelGroups } from '../../../components/config/LabelGroups'

describe('<LabelGroups />', () => {
  let mockProps: React.ComponentProps<typeof LabelGroups>

  beforeEach(() => {
    mockProps = {
      initialData: {},
      allLabels: ['spam', 'nsfw', 'adult', 'violence', 'harassment'],
      canManageGroups: true,
      mutation: { isLoading: false },
      handleSave: cy.stub(),
    }
  })

  it('renders all ungrouped labels when no groups exist', () => {
    cy.mount(<LabelGroups {...mockProps} />)

    cy.get('h5').contains('Ungrouped Labels (5)')
    cy.get('[data-cy="ungrouped-label"]').should('have.length', 5)

    mockProps.allLabels.forEach((label) => {
      cy.contains(label).should('be.visible')
    })

    cy.contains('No groups created yet. Create your first group above.')
  })

  it('allows creating a new group with valid input', () => {
    cy.mount(<LabelGroups {...mockProps} />)

    cy.get('input[name="title"]').type('Test Group')
    cy.get('input[type="color"]').should('have.value', '#6366f1') // Default color
    cy.get('input[placeholder*="Optional note"]').type('Test note')

    // Submit the form
    cy.get('button[type="submit"]').click()

    // Verify the group was added to the UI (form should be reset)
    cy.get('input[name="title"]').should('have.value', '')
    cy.get('input[placeholder*="Optional note"]').should('have.value', '')
    cy.get('input[type="color"]').should('have.value', '#6366f1') // Back to default
  })

  it('shows validation error for duplicate group title', () => {
    const propsWithExistingGroup = {
      ...mockProps,
      initialData: {
        'Existing Group': {
          labels: ['spam'],
          color: '#6366f1',
          note: undefined,
        },
      },
    }

    cy.mount(<LabelGroups {...propsWithExistingGroup} />)

    cy.get('input[name="title"]').type('Existing Group')
    cy.get('button[type="submit"]').click()

    cy.contains('Group title already exists').should('be.visible')
  })

  it('displays existing groups with labels', () => {
    const propsWithGroups = {
      ...mockProps,
      initialData: {
        NSFW: {
          labels: ['nsfw', 'adult'],
          color: '#ef4444',
          note: 'Adult content',
        },
        Spam: {
          labels: ['spam'],
          color: '#f59e0b',
          note: undefined,
        },
      },
      allLabels: ['spam', 'nsfw', 'adult', 'violence', 'harassment'],
    }

    cy.mount(<LabelGroups {...propsWithGroups} />)

    // Check group headers
    cy.contains('h3', 'NSFW').should('be.visible')
    cy.contains('h3', 'Spam').should('be.visible')

    // Check group notes
    cy.contains('Adult content').should('be.visible')

    // Check labels in groups

    // Check ungrouped labels (should be 2: violence, harassment)
    cy.contains('Ungrouped Labels (2)')
  })

  it('allows removing labels from groups', () => {
    const propsWithGroups = {
      ...mockProps,
      initialData: {
        'Test Group': {
          labels: ['spam', 'nsfw'],
          color: '#6366f1',
          note: undefined,
        },
      },
    }

    cy.mount(<LabelGroups {...propsWithGroups} />)
    cy.contains('span', 'spam').siblings('button').click()
    cy.contains('span', 'spam').should('not.exist')
  })

  it('allows removing entire groups', () => {
    const propsWithGroups = {
      ...mockProps,
      initialData: {
        'Test Group': {
          labels: ['spam'],
          color: '#6366f1',
          note: undefined,
        },
      },
    }

    cy.mount(<LabelGroups {...propsWithGroups} />)

    cy.contains('h3', 'Test Group').should('be.visible')

    cy.get('[data-cy="remove-group-button"]').click()

    cy.contains('h3', 'Test Group').should('not.exist')
    cy.contains('No groups created yet. Create your first group above.')
  })

  it('allows changing group colors', () => {
    const propsWithGroups = {
      ...mockProps,
      initialData: {
        'Test Group': {
          labels: ['spam'],
          color: '#6366f1',
          note: undefined,
        },
      },
    }

    cy.mount(<LabelGroups {...propsWithGroups} />)

    cy.get('input[type="color"]').eq(1).should('have.value', '#6366f1')
    cy.get('input[type="color"]')
      .eq(1)
      .invoke('val', '#ff0000')
      .trigger('change')

    cy.get('input[type="color"]').eq(1).should('have.value', '#ff0000')
  })

  it('shows manual label addition interface', () => {
    const propsWithGroups = {
      ...mockProps,
      initialData: {
        'Test Group': {
          labels: ['spam'],
          color: '#6366f1',
          note: undefined,
        },
      },
    }

    cy.mount(<LabelGroups {...propsWithGroups} />)

    cy.get('[data-cy="add-group-button"]').click()

    cy.get('input[placeholder*="Enter label name"]').should('be.visible')
    cy.get('[data-cy="add-custom-label-button"]').should('be.visible')

    cy.get('input[placeholder*="Enter label name"]').type('my new label')
    cy.get('input[placeholder*="Enter label name"]').should(
      'have.value',
      'mynewlabel',
    )

    cy.get('[data-cy="add-custom-label-button"]').click()

    cy.contains('span', 'mynewlabel').should('be.visible')
  })

  it('handles keyboard shortcuts in manual label input', () => {
    const propsWithGroups = {
      ...mockProps,
      initialData: {
        'Test Group': {
          labels: [],
          color: '#6366f1',
          note: undefined,
        },
      },
    }

    cy.mount(<LabelGroups {...propsWithGroups} />)

    cy.get('[data-cy="add-group-button"]').click()

    cy.get('input[placeholder*="Enter label name"]').type('testlabel{enter}')
    cy.contains('span', 'testlabel').should('be.visible')

    cy.get('[data-cy="add-group-button"]').click()
    cy.get('input[placeholder*="Enter label name"]').type('anotherlabel{esc}')
    cy.get('input[placeholder*="Enter label name"]').should('not.exist')
  })

  it('disables save button when loading', () => {
    const loadingProps = {
      ...mockProps,
      mutation: { isLoading: true },
    }

    cy.mount(<LabelGroups {...loadingProps} />)

    cy.contains('Save Groups').should('be.disabled')
  })

  it('shows permission denied message when user cannot manage groups', () => {
    const noPermissionProps = {
      ...mockProps,
      canManageGroups: false,
    }

    cy.mount(<LabelGroups {...noPermissionProps} />)

    cy.contains("You don't have permission to manage label groups.").should(
      'be.visible',
    )
    cy.get('input[name="title"]').should('not.exist')
  })

  it('calls save handler when save button is clicked', () => {
    cy.mount(<LabelGroups {...mockProps} />)

    cy.contains('Save Groups').click()

    cy.wrap(mockProps.handleSave).should(
      'have.been.calledWith',
      Cypress.sinon.match.object,
    )
  })

  it('supports drag and drop between ungrouped labels and groups', () => {
    const propsWithGroups = {
      ...mockProps,
      initialData: {
        'Target Group': {
          labels: ['spam'],
          color: '#6366f1',
          note: undefined,
        },
      },
    }

    cy.mount(<LabelGroups {...propsWithGroups} />)

    cy.contains('Ungrouped Labels (4)')

    const dataTransfer = new DataTransfer()
    cy.get('[data-cy="ungrouped-label"]')
      .contains('nsfw')
      .trigger('dragstart', { dataTransfer })

    cy.contains('h3', 'Target Group')
      .parent()
      .parent()
      .trigger('dragover', { dataTransfer })

    cy.contains('h3', 'Target Group')
      .parent()
      .parent()
      .trigger('drop', { dataTransfer })

    cy.contains('Ungrouped Labels (3)')
    cy.contains('h3', 'Target Group')
      .parent()
      .parent()
      .parent()
      .contains('span', 'nsfw')
      .should('be.visible')
  })

  it('shows drag feedback when dragging labels', () => {
    const propsWithGroups = {
      ...mockProps,
      initialData: {
        'Test Group': {
          labels: ['spam'],
          color: '#6366f1',
          note: undefined,
        },
      },
    }

    cy.mount(<LabelGroups {...propsWithGroups} />)

    const dataTransfer = new DataTransfer()
    cy.get('[data-cy="ungrouped-label"]')
      .contains('nsfw')
      .trigger('dragstart', { dataTransfer })

    cy.get('[data-cy="ungrouped-label"]')
      .contains('nsfw')
      .should('have.class', 'bg-blue-200')

    cy.contains('h3', 'Test Group')
      .parent()
      .parent()
      .trigger('dragover', { dataTransfer })

    cy.contains('Drop here to add label').should('be.visible')
  })
})

// Prevent TypeScript from reading file as legacy script
export {}
