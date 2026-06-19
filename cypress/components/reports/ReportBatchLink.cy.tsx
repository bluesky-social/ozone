/// <reference types="cypress" />

import React from 'react'
import '../../../styles/globals.css'
import { ReportBatchLink } from '../../../components/reports/ReportBatchLink'

describe('<ReportBatchLink />', () => {
  it('links to the batch page when modTool.meta.batchId is present', () => {
    cy.mount(
      <ReportBatchLink
        modTool={{ name: 'ozone/workspace', meta: { batchId: 'batch-abc-123' } }}
      />,
    )

    cy.get('a[href="/events/batch/batch-abc-123"]')
      .should('have.attr', 'target', '_blank')
    // Surfaces the originating tool name alongside the link.
    cy.contains('ozone/workspace')
  })

  it('works for any tool name, not just the TIDA intake form', () => {
    cy.mount(
      <ReportBatchLink
        modTool={{
          name: 'fieldkit/tida-intake',
          meta: { batchId: 'tida-999', somethingElse: 'x' },
        }}
      />,
    )

    cy.get('a[href="/events/batch/tida-999"]').should('exist')
  })

  it('renders nothing when there is no batchId', () => {
    cy.mount(
      <ReportBatchLink modTool={{ name: 'ozone/workspace', meta: {} }} />,
    )
    cy.get('a').should('not.exist')
  })

  it('renders nothing when meta is absent', () => {
    cy.mount(<ReportBatchLink modTool={{ name: 'ozone/workspace' }} />)
    cy.get('a').should('not.exist')
  })

  it('renders nothing when modTool is absent', () => {
    cy.mount(<ReportBatchLink modTool={undefined} />)
    cy.get('a').should('not.exist')
  })
})

export {}
