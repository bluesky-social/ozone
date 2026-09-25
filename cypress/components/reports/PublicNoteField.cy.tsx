/// <reference types="cypress" />

import React, { useState } from 'react'
import '../../../styles/globals.css'
import { PublicNoteField } from '../../../components/reports/PublicNoteField'

function TestField() {
  const [value, setValue] = useState('')
  return (
    <>
      <PublicNoteField value={value} onChange={setValue} />
      <output data-testid="draft">{value}</output>
    </>
  )
}

describe('<PublicNoteField />', () => {
  it('keeps the reporter note hidden until requested and clears it when hidden', () => {
    cy.mount(<TestField />)
    cy.get('textarea[aria-label="Public note to reporter"]').should('not.exist')
    cy.contains('button', 'Public Note').click()
    cy.get('textarea[aria-label="Public note to reporter"]').type(
      'We reviewed your report.',
    )
    cy.get('[data-testid="draft"]').should('have.text', 'We reviewed your report.')
    cy.contains('button', 'Hide public note').click()
    cy.get('textarea[aria-label="Public note to reporter"]').should('not.exist')
    cy.get('[data-testid="draft"]').should('have.text', '')
  })
})

export {}
