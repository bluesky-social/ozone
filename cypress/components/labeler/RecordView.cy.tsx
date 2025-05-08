/// <reference types="cypress" />
import React from 'react'
import { AppBskyLabelerService, ComAtprotoModerationDefs } from '@atproto/api'
import { deepCopy } from '../../support/utils'
import { LabelerRecordView } from '../../../components/labeler/RecordView'

const basicLabelerRecord: AppBskyLabelerService.Record = {
  $type: 'app.bsky.labeler.service',
  policies: {
    labelValues: [],
  },
  createdAt: new Date().toISOString(),
}

describe('<LabelerRecordView />', () => {
  it('Shows no labels message with option to add new label', () => {
    const labelRecord: AppBskyLabelerService.Record =
      deepCopy(basicLabelerRecord)
    const onUpdateSpy = cy.spy().as('onUpdateSpy')

    cy.mount(<LabelerRecordView record={labelRecord} onUpdate={onUpdateSpy} />)

    cy.get('p').contains('No labels configured.')
    cy.get('button').contains('Add Label').click()

    // Assert the spy was called with one label value entry
    cy.get('@onUpdateSpy').should(
      'have.been.calledWith',
      Cypress.sinon.match((updatedRecord) => {
        return updatedRecord.policies.labelValues.length === 1
      }),
    )
  })
  it('Shows selectable reason types', () => {
    const labelRecord: AppBskyLabelerService.Record =
      deepCopy(basicLabelerRecord)
    const onUpdateSpy = cy.spy().as('onUpdateSpy')

    cy.mount(<LabelerRecordView record={labelRecord} onUpdate={onUpdateSpy} />)

    cy.get('label').contains('Spam').click()
    cy.get('@onUpdateSpy').should('have.been.called')
    cy.get('@onUpdateSpy')
      .invoke('getCalls')
      .then((calls) => {
        const firstCallArgs = calls[0].args[0]
        expect(firstCallArgs.reasonTypes.length).to.be.ok
        expect(
          firstCallArgs.reasonTypes.includes(
            ComAtprotoModerationDefs.REASONSPAM,
          ),
        ).to.be.false
      })

    cy.get('label').contains('account').click()
    cy.get('@onUpdateSpy').should('have.been.called')
    cy.get('@onUpdateSpy')
      .invoke('getCalls')
      .then((calls) => {
        const secondCallArgs = calls[1].args[0]
        expect(secondCallArgs.subjectTypes.length).to.be.ok
        expect(secondCallArgs.subjectTypes.includes('account')).to.be.false
      })
  })
  it('Shows subject collection field only if record subject type selected', () => {
    cy.mount(
      <LabelerRecordView
        record={deepCopy(basicLabelerRecord)}
        onUpdate={() => null}
      />,
    )

    // Assert that subject collections field is shown when subject type is not defined at all
    cy.get('h3').contains('Subject Collections')

    cy.mount(
      <LabelerRecordView
        record={{ ...deepCopy(basicLabelerRecord), subjectTypes: ['record'] }}
        onUpdate={() => null}
      />,
    )

    // Assert that subject collections field is shown when subject types contain record
    cy.get('h3').contains('Subject Collections')

    cy.mount(
      <LabelerRecordView
        record={{ ...deepCopy(basicLabelerRecord), subjectTypes: ['account'] }}
        onUpdate={() => null}
      />,
    )

    // Assert that subject collections field is not shown when subject types does not contain record
    cy.get('h3').contains('Subject Collections').should('not.exist')
  })
  it.only('Shows label only editor view when a detailed definition doesnt exist', () => {
    const labelOnly: AppBskyLabelerService.Record = deepCopy(basicLabelerRecord)

    const onUpdateSpy = cy.spy().as('onUpdateSpy')

    labelOnly.policies.labelValues = ['test']
    cy.mount(<LabelerRecordView record={labelOnly} onUpdate={onUpdateSpy} />)

    cy.get('button[title="Edit test label definition"]').click()
    // Assert that changing label value updates the label value in the record
    cy.get('input[name="label"]').type('s')
    cy.get('button').contains('Save').click()

    cy.get('@onUpdateSpy')
      .invoke('getCalls')
      .then((calls) => {
        const firstCallArgs = calls[0].args[0]
        expect(firstCallArgs.policies.labelValues[0]).to.equal('tests')
      })

    // Assert that definition editor is shown and can be hidden
    cy.get('button[title="Edit test label definition"]').click()
    cy.get('button').contains('Add Definition').click()
    cy.get('h3').contains('Locales').should('exist')
    cy.get('button').contains('Remove Definition').click()

    // Assert that changing label definition updates the label definition in the record
    cy.get('button').contains('Add Definition').click()
    cy.get('input[name="name"]').type('testing')
    cy.get('textarea[name="description"]').type('TEST LABEL')
    cy.get('button').contains('Save').click()

    cy.get('@onUpdateSpy')
      .invoke('getCalls')
      .then((calls) => {
        const newDefinition = calls[1].args[0].policies.labelValueDefinitions[0]
        expect(newDefinition.locales[0].description).to.include('TEST LABEL')
        expect(newDefinition.locales[0].name).to.include('testing')
      })
  })
})

// Prevent TypeScript from reading file as legacy script
export {}
