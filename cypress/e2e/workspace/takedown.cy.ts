/// <reference types="cypress" />"

import {
  mockEmitEventResponse,
  mockModerationReportsResponse,
  mockPolicyListResponse,
  mockRepoResponse,
  SERVER_URL,
} from '../../support/api'

describe('Workspace -> Takedown', () => {
  let settingsFixture
  let authFixture
  let statusesFixture
  let seedFixture

  beforeEach(() => {
    cy.visit('http://127.0.0.1:3000/reports')
    cy.fixture('settings.json').then((data) => {
      settingsFixture = data
      mockPolicyListResponse(settingsFixture.policyListResponse)
    })
    cy.fixture('statuses.json').then((data) => {
      statusesFixture = data
      mockModerationReportsResponse(statusesFixture.onlyRepo)
    })
    cy.fixture('seed.json').then((data) => {
      seedFixture = data
      mockRepoResponse({ statusCode: 200, body: seedFixture.carla.repo })
    })

    mockEmitEventResponse({
      statusCode: 200,
      body: {
        id: 1000,
        event: {
          $type: 'tools.ozone.moderation.defs#modEventTakedown',
          policies: ['Policy One'],
          strikeCount: 0,
        },
        subject: {
          $type: 'com.atproto.admin.defs#repoRef',
          did: 'did:plc:jttgywq7eusytkmurmjbum6h',
        },
        subjectBlobCids: [],
        createdBy: 'did:plc:tfeay256xpz3vf5v5d3cxykt',
        createdAt: '2026-02-13T15:29:27.792Z',
        modTool: {
          name: 'ozone-ui/workspace',
          meta: {
            batchId: '1770996016635-479297c9-f611-480c-8e5c-ea3039804c1d',
            batchSize: 1,
          },
        },
      },
    })

    cy.fixture('auth.json').then((data) => {
      authFixture = data
      cy.login(authFixture)
    })
  })

  it('Does not allow takedowns without policy', () => {
    // open
    cy.openCommandPalette('workspace')
    cy.get('#kbar-listbox-item-0').click()
    cy.get('input[name="items"]').type(`${seedFixture.carla.repo.did}{enter}`)
    cy.get('input[name="workspaceItem"]').click()

    // select action
    cy.contains('button', 'Show Action Form').click()
    cy.get('div[data-cy="mod-event-selector"]').click()
    cy.get('[data-headlessui-state="open"] > a')
      .contains(/^Takedown$/)
      .click()

    // submit
    cy.contains('button[type="submit"]', 'Submit Action').click()

    // check
    cy.contains('p', 'Please select a policy for the takedown.').should(
      'be.visible',
    )
  })

  it('Allows takedowns with policy', () => {
    // open
    cy.openCommandPalette('workspace')
    cy.get('#kbar-listbox-item-0').click()
    cy.get('input[name="items"]').type(`${seedFixture.carla.repo.did}{enter}`)
    cy.get('input[name="workspaceItem"]').click()

    // select action
    cy.contains('button', 'Show Action Form').click()
    cy.get('div[data-cy="mod-event-selector"]').click()
    cy.get('[data-headlessui-state="open"] > a')
      .contains(/^Takedown$/)
      .click()

    // select this element
    cy.get('button[id^="headlessui-combobox-button-"]').click()
    cy.get('div[id^="headlessui-combobox-option-"]')
      .contains('Policy One')
      .click()

    // event interceptor
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        expect(req.body.event.$type).to.equal(
          'tools.ozone.moderation.defs#modEventTakedown',
        )
        expect(req.body.event.policies)
          .to.be.an('array')
          .that.includes('Policy One')
      },
    )

    // submit
    cy.contains('button[type="submit"]', 'Submit Action').click()

    // check
    cy.get('.Toastify__toast')
      .should('contain.text', 'Actioned 1 Account')
      .and('be.visible')
  })
})
