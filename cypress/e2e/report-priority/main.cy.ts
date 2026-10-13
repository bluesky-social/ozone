/// <reference types="cypress" />

import {
  SERVER_URL,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockLabelerServiceRecordResponse,
} from '../../support/api'

const BASE_URL = Cypress.env('BASE_URL') || 'http://127.0.0.1:3000'
const levelsKey = 'tools.ozone.setting.priorityLevels'
const mappingsKey = 'tools.ozone.setting.reportPriorityLevels'
const spam = 'com.atproto.moderation.defs#reasonSpam'
const did = 'did:plc:tfeay256xpz3vf5v5d3cxykt'
const initialLevels = {
  urgent: { name: 'Urgent', score: 100, targetResolutionMinutes: 30 },
}

function option(key: string, value: Record<string, unknown>) {
  return {
    key,
    value,
    scope: 'instance',
    did,
    managerRole: 'tools.ozone.team.defs#roleAdmin',
    createdBy: did,
    lastUpdatedBy: did,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }
}

function login(path: string, role = 'roleAdmin') {
  cy.fixture('auth.json').then((auth) => {
    auth.ozoneServerConfigResponse.viewer.role = `tools.ozone.team.defs#${role}`
    mockOzoneMetaResponse({ body: auth.ozoneMetaResponse })
    mockOzoneDidDataResponse({ body: auth.ozoneDidDataResponse })
    mockLabelerServiceRecordResponse({
      statusCode: 200,
      body: auth.getLabelerRecordResponse,
    })
    cy.intercept('POST', `${SERVER_URL}/com.atproto.server.refreshSession`, {
      body: auth.createSessionResponse,
    })
    cy.visit(`${BASE_URL}${path}`)
    cy.login(auth)
  })
}

describe('Report priority configuration', () => {
  let stored: Record<string, Record<string, any>>
  let writes: { key: string; value: Record<string, unknown> }[]

  beforeEach(() => {
    stored = {
      [levelsKey]: structuredClone(initialLevels),
      [mappingsKey]: { [spam]: 'urgent' },
    }
    writes = []
    cy.intercept(
      'GET',
      `${SERVER_URL}/tools.ozone.setting.listOptions*`,
      (req) => {
        const keys = new URL(req.url).searchParams.getAll('keys')
        req.reply({
          options: keys
            .filter((key) => key in stored)
            .map((key) => option(key, stored[key])),
        })
      },
    ).as('settings')
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.setting.upsertOption`,
      (req) => {
        const { key, value, scope, managerRole } = req.body
        expect(scope).to.equal('instance')
        expect(managerRole).to.equal('tools.ozone.team.defs#roleAdmin')
        const next = { ...stored, [key]: value }
        expect(
          Object.values(next[mappingsKey]).every((level) =>
            Object.hasOwn(next[levelsKey], level),
          ),
        ).to.equal(true)
        stored[key] = value
        writes.push({ key, value })
        req.reply({ option: option(key, value) })
      },
    ).as('save')
  })

  it('adds a complete level immediately and preserves it after reload', () => {
    const description =
      'Routine reports with no immediate risk.\n\nReview these after urgent reports.'
    login('/configure?tab=reportPriorities')
    cy.contains('h4', 'Priority Levels').should('be.visible')
    cy.contains('button', 'Priority Levels').should(
      'have.attr',
      'aria-pressed',
      'true',
    )
    cy.get('#priority-report-reason').should('not.exist')
    cy.contains('button', 'Save priorities').should('not.exist')
    cy.get('[data-cy="new-priority-level"]').within(() => {
      cy.contains('button', 'Add').should('be.disabled')
      cy.contains('label', 'Target minutes')
        .find('input')
        .should('have.value', '30')
      cy.contains('label', 'Priority score')
        .find('input')
        .should('have.value', '99')
      cy.contains('label', 'Name').find('input').type('urgent')
      cy.get('[role="alert"]').should('contain', 'name already exists')
      cy.contains('button', 'Add').should('be.disabled')
      cy.contains('label', 'Name').find('input').clear()
      cy.contains('label', 'Name').find('input').type('normal')
      cy.contains('label', 'Priority score').find('input').clear()
      cy.contains('label', 'Priority score').find('input').type('100')
      cy.get('[role="alert"]').should('contain', 'score is already in use')
      cy.contains('button', 'Add').should('be.disabled')
      cy.contains('label', 'Priority score').find('input').clear()
      cy.contains('label', 'Priority score').find('input').type('0')
      cy.contains('label', 'Target minutes').find('input').clear()
      cy.contains('label', 'Target minutes').find('input').type('30')
      cy.get('textarea').type(description)
      cy.contains('button', 'Add').click()
      cy.contains('label', 'Name').find('input').should('have.value', '')
      cy.contains('label', 'Priority score')
        .find('input')
        .should('have.value', '')
      cy.get('textarea').should('have.value', '')
    })
    cy.wait('@save')
    cy.get('[data-cy="priority-level"]').should('have.length', 2)
    cy.get('[data-cy="new-priority-level"]')
      .prev()
      .should('have.attr', 'data-cy', 'priority-level')
    cy.then(() => {
      expect(stored[levelsKey].normal).to.deep.equal({
        name: 'normal',
        description,
        score: 0,
        targetResolutionMinutes: 30,
      })
      expect(writes).to.have.length(1)
    })
    cy.reload()
    cy.get('[data-cy="priority-level"]')
      .last()
      .within(() => {
        cy.contains('label', 'Name')
          .find('input')
          .should('have.value', 'normal')
          .and('be.disabled')
        cy.get('textarea').should('have.value', description)
      })
  })

  it('saves searched and custom reason assignments when a level is selected', () => {
    const threats = 'tools.ozone.report.defs#reasonViolenceThreats'
    const custom = 'com.example.moderation#customReason'
    cy.viewport(1440, 1000)
    login('/configure?tab=reportPriorities')
    cy.contains('button', 'Assignments').click()
    cy.get('#priority-report-reason').type('Violent Threats')
    cy.contains('[role="option"]', 'Violent Threats').click()
    cy.contains('button', 'Add reason').click()
    cy.contains('Choose a level to save this assignment.').should('be.visible')
    cy.contains('button', 'Priority Levels').click()
    cy.get('[data-cy="priority-assignment"]').should('not.exist')
    cy.contains('button', 'Assignments').click()
    cy.contains('Choose a level to save this assignment.').should('be.visible')
    cy.then(() => expect(writes).to.have.length(0))
    cy.get(`select[aria-label$="(${threats})"]`).select('urgent')
    cy.wait('@save')
    cy.get('#priority-report-reason').should('be.enabled').type(`  ${custom}  `)
    cy.contains('[role="option"]', `Use custom reason: ${custom}`).click()
    cy.contains('button', 'Add reason').click()
    cy.get(`select[aria-label$="(${custom})"]`).select('urgent')
    cy.wait('@save')
    cy.then(() =>
      expect(stored[mappingsKey]).to.deep.equal({
        [spam]: 'urgent',
        [threats]: 'urgent',
        [custom]: 'urgent',
      }),
    )
    cy.reload()
    cy.contains('button', 'Assignments').click()
    cy.get('[data-cy="priority-assignment"]').should('have.length', 3)
    cy.get(`select[aria-label$="(${custom})"]`).should('have.value', 'urgent')
    cy.get('#priority-report-reason').type(custom)
    cy.get('[role="option"]').should('not.exist')
    cy.contains('button', 'Add reason').should('be.disabled')
    cy.get('#priority-report-reason').clear()
    cy.get('#priority-report-reason').type('{esc}')
    cy.get('#priority-report-reason').blur()
    cy.get('#priority-assignments-heading').scrollIntoView()
    cy.screenshot('priority-configuration-desktop')
    cy.viewport(375, 812)
    cy.get(`select[aria-label$="(${custom})"]`).scrollIntoView()
    cy.get(`select[aria-label$="(${custom})"]`).should('be.visible')
    cy.screenshot('priority-configuration-mobile')
  })

  it('removes a reason assignment immediately without deleting its level', () => {
    login('/configure?tab=reportPriorities')
    cy.contains('button', 'Assignments').click()
    cy.get(`[aria-label="Remove reason ${spam}"]`).click()
    cy.wait('@save')
    cy.contains('No report reasons assigned yet.').should('be.visible')
    cy.then(() => {
      expect(stored[mappingsKey]).to.deep.equal({})
      expect(stored[levelsKey]).to.deep.equal(initialLevels)
    })
    cy.get('#priority-report-reason').type(spam)
    cy.contains('[role="option"]', spam).should('be.visible')
  })

  it('starts at score 100 and suggests one below the lowest saved score', () => {
    stored = { [levelsKey]: {}, [mappingsKey]: {} }
    login('/configure?tab=reportPriorities')
    cy.contains('No priority levels defined yet.').should('be.visible')
    cy.contains('button', 'Assignments').click()
    cy.get('#priority-report-reason').should('be.disabled')
    cy.contains('button', 'Priority Levels').click()
    cy.get('[data-cy="new-priority-level"]').within(() => {
      cy.contains('label', 'Name').find('input').type('normal')
      cy.contains('label', 'Priority score')
        .find('input')
        .should('have.value', '100')
      cy.contains('button', 'Add').click()
      cy.contains('label', 'Priority score')
        .find('input')
        .should('have.value', '99')
    })
    cy.wait('@save')
    cy.contains('button', 'Assignments').click()
    cy.get('#priority-report-reason')
      .should('be.enabled')
      .type('Animal Welfare')
    cy.get('#priority-report-reason').type('{enter}')
    cy.contains('button', 'Add reason').click()
    cy.get('[data-cy="priority-assignment"] select').select('normal')
    cy.wait('@save')
    cy.then(() => {
      expect(stored[levelsKey].normal.targetResolutionMinutes).to.equal(30)
      expect(stored[levelsKey].normal.score).to.equal(100)
      expect(stored[mappingsKey]).to.deep.equal({
        'tools.ozone.report.defs#reasonViolenceAnimalWelfare': 'normal',
      })
    })
  })

  it('removes mappings before deleting a referenced level', () => {
    login('/configure?tab=reportPriorities')
    cy.get('[data-cy="priority-level"]').within(() =>
      cy.contains('button', 'Remove').click(),
    )
    cy.contains('No priority levels defined yet.').should('be.visible')
    cy.then(() =>
      expect(writes).to.deep.equal([
        { key: mappingsKey, value: {} },
        { key: levelsKey, value: {} },
      ]),
    )
  })

  it('keeps invalid drafts through refetch and saves valid edits on blur', () => {
    login('/configure?tab=reportPriorities')
    cy.get('[data-cy="priority-level"]').within(() => {
      cy.contains('label', 'Target minutes').find('input').clear()
      cy.contains('label', 'Target minutes').find('input').type('0')
      cy.get('textarea').type('Unsaved description')
      cy.get('[role="alert"]').should('contain', 'positive whole minutes')
      cy.contains('label', 'Priority score').find('input').clear()
      cy.contains('label', 'Priority score').find('input').type('101')
      cy.contains('label', 'Target minutes').find('input').clear()
      cy.contains('label', 'Target minutes').find('input').type('2')
      cy.get('[role="alert"]').should('contain', '0 to 100')
    })
    cy.contains('button', 'Assignments').click()
    cy.get('[data-cy="priority-level"]').should('not.exist')
    cy.contains('button', 'Priority Levels').click()
    cy.window().trigger('blur')
    cy.window().trigger('focus')
    cy.get('[data-cy="priority-level"] textarea').should(
      'have.value',
      'Unsaved description',
    )
    cy.then(() => expect(writes).to.have.length(0))
    cy.get('[data-cy="priority-level"]').within(() => {
      cy.contains('label', 'Priority score').find('input').clear()
      cy.contains('label', 'Priority score').find('input').type('90')
      cy.contains('label', 'Priority score').find('input').blur()
    })
    cy.wait('@save')
    cy.then(() =>
      expect(stored[levelsKey].urgent).to.deep.equal({
        ...initialLevels.urgent,
        score: 90,
        targetResolutionMinutes: 2,
        description: 'Unsaved description',
      }),
    )
    cy.reload()
    cy.get('[data-cy="priority-level"] textarea').should(
      'have.value',
      'Unsaved description',
    )
  })

  it('retains a new level after a failed save and retries without retyping', () => {
    let rejectNextSave = true
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.setting.upsertOption`,
      (req) => {
        if (rejectNextSave) {
          rejectNextSave = false
          req.reply({ statusCode: 500, body: { error: 'InternalServerError' } })
        }
      },
    )
    login('/configure?tab=reportPriorities')
    cy.get('[data-cy="new-priority-level"]').within(() => {
      cy.contains('label', 'Name').find('input').type('normal')
      cy.get('textarea').type('Keep this description.')
      cy.contains('button', 'Add').click()
    })
    cy.get('.Toastify__toast--error')
      .should('contain', 'Could not save priority changes')
      .and('be.visible')
    cy.get('[data-cy="new-priority-level"] textarea').should(
      'have.value',
      'Keep this description.',
    )
    cy.get('[data-cy="new-priority-level"] textarea').type(
      ' Updated before retry.',
    )
    cy.contains('button', 'Retry').click()
    cy.get('[data-cy="priority-level"]').should('have.length', 2)
    cy.get('[data-cy="new-priority-level"] textarea').should('have.value', '')
    cy.then(() =>
      expect(stored[levelsKey].normal.description).to.equal(
        'Keep this description. Updated before retry.',
      ),
    )
  })

  it('recovers when removing a level fails after removing its mappings', () => {
    let rejectNextLevelSave = true
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.setting.upsertOption`,
      (req) => {
        if (req.body.key === levelsKey && rejectNextLevelSave) {
          rejectNextLevelSave = false
          req.reply({ statusCode: 500, body: { error: 'InternalServerError' } })
        }
      },
    )
    login('/configure?tab=reportPriorities')
    cy.get('[data-cy="priority-level"]').within(() =>
      cy.contains('button', 'Remove').click(),
    )
    cy.get('.Toastify__toast--error')
      .should('contain', 'Could not save priority changes')
      .and('be.visible')
    cy.get('[data-cy="priority-level"]').should('have.length', 1)
    cy.then(() => expect(stored[mappingsKey]).to.deep.equal({}))
    cy.contains('button', 'Retry').click()
    cy.contains('No priority levels defined yet.').should('be.visible')
    cy.then(() => expect(stored[levelsKey]).to.deep.equal({}))
  })

  it('lets moderators view priorities without editing them', () => {
    login('/configure?tab=reportPriorities', 'roleModerator')
    cy.get('[data-cy="priority-level"] input').should('be.disabled')
    cy.get('[data-cy="priority-level"] textarea').should('be.disabled')
    cy.get('[data-cy="new-priority-level"]').should('not.exist')
    cy.contains('button', 'Assignments').click()
    cy.get(`select[aria-label$="(${spam})"]`).should('be.disabled')
    cy.contains('button', 'Add reason').should('not.exist')
    cy.get('[aria-label^="Remove reason "]').should('not.exist')
    cy.contains('button', 'Save priorities').should('not.exist')
  })
})

describe('Report reason picker', () => {
  it('still submits a selected standard reason from the report form', () => {
    const threats = 'tools.ozone.report.defs#reasonViolenceThreats'
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.setting.listOptions*`, {
      options: [],
    })
    cy.intercept(
      'POST',
      `${SERVER_URL}/com.atproto.moderation.createReport`,
      (req) => {
        req.reply({
          id: 123,
          ...req.body,
          reportedBy: did,
          createdAt: '2026-09-01T00:00:00.000Z',
        })
      },
    ).as('createReport')
    login(`/repositories/${did}?reportUri=${did}`)
    cy.get('#reasonType').type('Animal Welfare')
    cy.contains('[role="option"]', 'Animal Welfare').click()
    cy.get('#reasonType').clear()
    cy.get('#reasonType').type('Violent Threats')
    cy.contains('[role="option"]', 'Use custom reason').should('not.exist')
    cy.get('#reasonType').type('{enter}')
    cy.contains('button', 'Submit').click()
    cy.wait('@createReport')
      .its('request.body.reasonType')
      .should('eq', threats)
    cy.contains('Repo has been reported').should('be.visible')
  })
})

describe('Report priority badges', () => {
  it('shows minute-based targets and keeps the existing date ordering', () => {
    const report = {
      id: 1,
      eventId: 1,
      status: 'queued',
      reportType: spam,
      reportedBy: did,
      reporter: { type: 'account', subject: did },
      subject: { type: 'account', subject: did },
      createdAt: '2026-09-01T00:00:00.000Z',
      priorityLevel: 'urgent',
      priorityScore: 100,
      priorityTargetMinutes: 30,
    }
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.setting.listOptions*`, {
      options: [],
    })
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.queue.listQueues*`, {
      queues: [],
    })
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.report.queryReports*`, {
      reports: [report],
    }).as('reports')
    login('/reports/beta')
    cy.wait('@reports')
      .its('request.query.sortField')
      .should('equal', 'createdAt')
    cy.get('tbody span[title="urgent · 30m target"]:visible').should(
      'have.length',
      1,
    )
    cy.get('[aria-label="Report order"]').should('not.exist')
    cy.get('thead').contains('a', 'Report').click()
    cy.wait('@reports')
      .its('request.query.sortField')
      .should('equal', 'createdAt')
    cy.get('thead').contains('a', 'Last Update').click()
    cy.wait('@reports')
      .its('request.query.sortField')
      .should('equal', 'updatedAt')
    cy.viewport(375, 812)
    cy.get('tbody span[title="urgent · 30m target"]:visible').should(
      'have.length',
      1,
    )
  })
})
