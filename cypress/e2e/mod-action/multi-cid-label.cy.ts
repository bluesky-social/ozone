/// <reference types="cypress" />"

import {
  mockLabelerServiceRecordResponse,
  mockModerationReportsResponse,
  mockOzoneDidDataResponse,
  mockOzoneMetaResponse,
  mockProfileResponse,
  mockRecordResponse,
  mockRepoResponse,
  SERVER_URL,
} from '../../support/api'

describe('Mod Action -> Label', () => {
  let authFixture
  let statusesFixture
  let seedFixture

  beforeEach(() => {
    cy.fixture('auth.json').then((data) => {
      authFixture = data
      mockOzoneMetaResponse({ statusCode: 200, body: data.ozoneMetaResponse })
      mockOzoneDidDataResponse({
        statusCode: 200,
        body: data.ozoneDidDataResponse,
      })
      mockLabelerServiceRecordResponse({
        statusCode: 200,
        body: data.getLabelerRecordResponse,
      })
    })
    cy.fixture('statuses.json').then((data) => {
      statusesFixture = data
      mockModerationReportsResponse(statusesFixture.multiCidLabeledProfile)
    })
    cy.fixture('seed.json').then((data) => {
      seedFixture = data
      mockRepoResponse({
        statusCode: 200,
        body: seedFixture.carla.repo,
      })
      mockProfileResponse({
        statusCode: 200,
        body: seedFixture.carla.multiCidLabeledProfile,
      })
      mockRecordResponse({
        statusCode: 200,
        body: seedFixture.carla.multiCidLabeledProfile,
      })
    })

    cy.visit('http://127.0.0.1:3000')
    cy.then(() => {
      cy.login(authFixture)
    })
  })

  it('Removes the same label from each record CID', () => {
    const PORN_LABEL = 'porn'
    cy.get('table').should('include.text', seedFixture.carla.repo.handle)
    cy.contains('button', 'Take Action').click()
    cy.get('[data-cy="label-list"]').contains(PORN_LABEL)
    cy.get('[data-cy="mod-event-selector"] button').click()
    cy.get('[data-headlessui-state="open"] > a:contains("Label")').click()
    cy.get('[data-cy="label-selector-buttons"] span')
      .contains(PORN_LABEL)
      .click()

    const labeledCids = [
      ...new Set<string>(
        seedFixture.carla.multiCidLabeledProfile.labels.map(({ cid }) => cid),
      ),
    ]
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        expect(req.body.event.createLabelVals).to.be.empty
        expect(req.body.event.negateLabelVals).to.deep.equal([PORN_LABEL])
        req.reply({
          statusCode: 200,
          body: {
            ...req.body,
            id: labeledCids.indexOf(req.body.subject.cid) + 1,
            createdAt: '2024-07-25T13:18:48.623Z',
          },
        })
      },
    ).as('emitLabelEvent')

    cy.get('#mod-action-panel button[type="submit"]').click()

    cy.wait(labeledCids.map(() => '@emitLabelEvent')).then((requests) => {
      const requestedCids = requests.map(({ request }) => request.body.subject.cid)
      expect(requestedCids).to.have.members(labeledCids)
    })
  })
})
