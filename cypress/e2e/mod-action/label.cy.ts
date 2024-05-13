/// <reference types="cypress" />"

import {
  mockModerationReportsResponse,
  mockRepoResponse,
  SERVER_URL,
} from '../../support/api'

describe('Mod Action -> Label', () => {
  let authFixture
  let statusesFixture
  let seedFixture

  beforeEach(() => {
    cy.visit('http://localhost:3000')
    cy.fixture('statuses.json').then((data) => {
      statusesFixture = data
      mockModerationReportsResponse(statusesFixture.onlyRepo)
    })
    cy.fixture('seed.json').then((data) => {
      seedFixture = data
      console.log(seedFixture)
      mockRepoResponse({ statusCode: 200, body: seedFixture.carla.repo })
    })

    cy.fixture('auth.json').then((data) => {
      authFixture = data
      cy.login(authFixture)
    })
  })

  it('Allows removing and adding a label to a subject', () => {
    const SPAM_LABEL = 'spam'
    cy.get('table').should('include.text', 'Loading moderation queue...')
    cy.contains('button', 'Take Action').click()
    cy.get('[data-cy="label-list"]').contains(
      seedFixture.carla.repo.labels[0].val,
    )
    cy.get('[data-cy="mod-event-selector"] button').click()
    cy.get('[data-headlessui-state="open"] > a:contains("Label")').click()
    cy.get('[data-cy="label-selector-buttons"] button')
      .contains(seedFixture.carla.repo.labels[0].val)
      .click()
    cy.get(
      `[data-cy="label-selector-buttons"] button:contains("${SPAM_LABEL}")`,
    ).click()
    cy.get('#mod-action-panel button[type="submit"]').click()

    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        expect(req.body.event.createLabelVals).to.include(SPAM_LABEL)
        expect(req.body.event.negateLabelVals).to.include(
          seedFixture.carla.repo.labels[0].val,
        )

        req.reply({
          statusCode: 204,
          body: {
            id: 7,
            event: {
              $type: 'tools.ozone.moderation.defs#modEventLabel',
              createLabelVals: [SPAM_LABEL],
              negateLabelVals: [seedFixture.carla.repo.labels[0].val],
            },
            subject: {
              $type: 'com.atproto.admin.defs#repoRef',
              did: seedFixture.carla.repo.did,
            },
            subjectBlobCids: [],
            createdBy: 'did:plc:t7jaiidsmjzvtp7quvto4lo2',
            createdAt: '2024-05-13T18:40:13.196Z',
          },
        })
      },
    )
  })

  it('Allows searching and adding custom label', () => {
    const TEST_LABEL = 'test'

    cy.contains('button', 'Take Action').click()
    cy.get('[data-cy="mod-event-selector"] button').click()
    cy.get('[data-headlessui-state="open"] > a:contains("Label")').click()
    cy.get('input[name="searchLabel"]').type(TEST_LABEL)
    cy.get('button')
      .contains(`Click here to add ${TEST_LABEL} as a label.`)
      .click()
    cy.get('[data-cy="label-selector-buttons"] button').contains(TEST_LABEL)
    cy.get('#mod-action-panel button[type="submit"]').click()

    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        expect(req.body.event.createLabelVals).to.include(TEST_LABEL)

        req.reply({
          statusCode: 204,
          body: {
            id: 7,
            event: {
              $type: 'tools.ozone.moderation.defs#modEventLabel',
              createLabelVals: [TEST_LABEL],
              negateLabelVals: [],
            },
            subject: {
              $type: 'com.atproto.admin.defs#repoRef',
              did: seedFixture.carla.repo.did,
            },
            subjectBlobCids: [],
            createdBy: 'did:plc:t7jaiidsmjzvtp7quvto4lo2',
            createdAt: '2024-05-13T18:40:13.196Z',
          },
        })
      },
    )
  })
})
