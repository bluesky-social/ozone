/// <reference types="cypress" />
import {
  mockModerationReportsResponse,
  mockRepoResponse,
  mockOzoneMetaResponse,
  mockOzoneDidDataResponse,
  mockLabelerServiceRecordResponse,
  SERVER_URL,
} from '../../support/api'

const KEY = 'tools.ozone.setting.customActions'
const origin = 'http://127.0.0.1:3000'
const workflow = {
  id: 'review-example',
  name: 'Review example',
  helpText: 'Review the account.\n<b>Literal guidance</b> {{subject}}',
  allowedRoles: [
    'tools.ozone.team.defs#roleAdmin',
    'tools.ozone.team.defs#roleModerator',
  ],
  subjectTypes: ['account'],
  actions: [
    {
      id: 'tag',
      type: 'event',
      target: 'account',
      event: {
        $type: 'tools.ozone.moderation.defs#modEventTag',
        add: ['review:example'],
        remove: [],
      },
    },
  ],
}

describe('Settings custom actions', () => {
  let auth: any, seed: any, configuration: any, report: any
  beforeEach(() => {
    configuration = { version: 1, customActions: [workflow] }
    cy.fixture('seed.json').then((data) => {
      seed = data
    })
    cy.fixture('auth.json').then((data) => {
      auth = data
    })
    cy.fixture('statuses.json').then((statuses) => {
      mockModerationReportsResponse(statuses.onlyRepo)
    })
    cy.intercept('GET', '**/xrpc/tools.ozone.setting.listOptions*', (req) => {
      const keys = new URL(req.url).searchParams.getAll('keys')
      req.reply({
        options:
          keys.includes(KEY) && configuration
            ? [
                {
                  key: KEY,
                  scope: 'instance',
                  did: auth.ozoneMetaResponse.did,
                  createdBy: auth.createSessionResponse.did,
                  lastUpdatedBy: auth.createSessionResponse.did,
                  value: configuration,
                },
              ]
            : [],
      })
    })
    cy.intercept('GET', '**/xrpc/tools.ozone.moderation.queryEvents*', {
      events: [],
    })
    cy.intercept('GET', '**/xrpc/tools.ozone.report.listActivities*', {
      activities: [],
    })
    cy.intercept('GET', '**/xrpc/tools.ozone.report.getAssignments*', {
      assignments: [],
    })
    cy.intercept('GET', '**/xrpc/tools.ozone.team.listMembers*', {
      members: [],
    })
    cy.intercept('GET', '**/xrpc/tools.ozone.team.listOnline*', { members: [] })
    cy.intercept('GET', '**/xrpc/tools.ozone.queue.listQueues*', { queues: [] })
    cy.intercept('GET', '**/xrpc/tools.ozone.report.queryReports*', {
      reports: [],
    })
    cy.intercept('GET', '**/xrpc/tools.ozone.report.getReport*', (req) =>
      req.reply(report),
    )
    cy.intercept('POST', '**/xrpc/tools.ozone.report.assignModerator', {
      assignment: {},
    })
    cy.intercept('GET', '**/xrpc/tools.ozone.communication.listTemplates*', {
      communicationTemplates: [],
    })
    cy.intercept('GET', '**/xrpc/app.bsky.actor.getProfiles*', { profiles: [] })
    cy.then(() => {
      mockRepoResponse({ statusCode: 200, body: seed.carla.repo })
      report = {
        id: 123,
        eventId: 456,
        status: 'open',
        subject: {
          type: 'account',
          subject: seed.carla.repo.did,
          repo: seed.carla.repo,
        },
        reporter: { type: 'account', subject: auth.createSessionResponse.did },
        reportedBy: auth.createSessionResponse.did,
        reportType: 'com.atproto.moderation.defs#reasonSpam',
        createdAt: '2026-09-29T10:00:00Z',
        isAutomated: false,
      }
      mockOzoneMetaResponse({ statusCode: 200, body: auth.ozoneMetaResponse })
      mockOzoneDidDataResponse({
        statusCode: 200,
        body: auth.ozoneDidDataResponse,
      })
      mockLabelerServiceRecordResponse({
        statusCode: 200,
        body: auth.getLabelerRecordResponse,
      })
      cy.intercept(
        'GET',
        '**/xrpc/com.atproto.server.getSession',
        auth.createSessionResponse,
      )
      cy.intercept(
        'POST',
        '**/xrpc/com.atproto.server.refreshSession',
        auth.createSessionResponse,
      )
      cy.visit(origin)
      cy.login(auth)
    })
  })
  function selectCustom() {
    cy.contains('button', /^Action$|^Acknowledge$/)
      .first()
      .click()
    cy.contains('[role="menuitem"]', workflow.name)
      .should('not.have.attr', 'aria-disabled', 'true')
      .click()
    cy.get('[data-cy="custom-action-panel"]').should(
      'contain.text',
      workflow.helpText,
    )
    cy.get('[data-cy="custom-action-panel"] b').should('not.exist')
    cy.get('[data-cy="custom-action-panel"]')
      .contains('button', 'Confirm and run')
      .should('be.enabled')
  }
  it('uses the same definition, help text, and receipt in the old quick-action panel', () => {
    cy.get('table').should('contain.text', seed.carla.repo.handle)
    cy.contains('button', 'Take Action').click()
    selectCustom()
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        expect(req.body.event).to.deep.equal(workflow.actions[0].event)
        expect(req.body.modTool.meta.stepId).to.equal('tag')
        expect(req.body.modTool.meta.reportId).to.equal(undefined)
        req.reply({
          id: 70,
          ...req.body,
          createdAt: new Date().toISOString(),
          subjectBlobCids: [],
        })
      },
    ).as('customEvent')
    cy.contains('button', 'Confirm and run').click()
    cy.wait('@customEvent')
    cy.get('[data-cy="custom-operation-status"]').should(
      'contain.text',
      'succeeded',
    )
    cy.contains('a', 'View history')
      .should('have.attr', 'href')
      .and('include', '/events/batch/')
    cy.contains('button', 'Export for handoff').should('not.exist')
  })
  it('uses refreshed definitions for selection while keeping started runs fixed', () => {
    cy.visit(`${origin}/reports/123`)
    selectCustom()
    const updated = {
      ...workflow,
      name: 'Updated workflow',
      actions: [
        {
          ...workflow.actions[0],
          event: { ...workflow.actions[0].event, add: ['updated-tag'] },
        },
      ],
    }
    cy.then(() => {
      configuration.customActions = [updated]
    })
    cy.window().then((win) => win.dispatchEvent(new win.Event('focus')))
    cy.get('[data-cy="custom-action-panel"]')
      .should('contain.text', updated.name)
      .and('contain.text', 'updated-tag')
    let finishEvent: (() => void) | undefined
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        expect(req.body.event).to.deep.equal(updated.actions[0].event)
        return new Promise<void>((resolve) => {
          finishEvent = () => {
            req.reply({
              id: 72,
              ...req.body,
              createdAt: new Date().toISOString(),
              subjectBlobCids: [],
            })
            resolve()
          }
        })
      },
    ).as('updatedEvent')
    cy.contains('button', 'Confirm and run').should('be.enabled').click()
    cy.wrap(null).should(() => expect(finishEvent).to.be.a('function'))
    cy.then(() => {
      configuration.customActions = [{ ...workflow, name: 'Later workflow' }]
    })
    cy.window().then((win) => win.dispatchEvent(new win.Event('focus')))
    cy.contains('button', updated.name).click()
    cy.contains('[role="menuitem"]', 'Later workflow').should('be.visible')
    cy.get('[data-cy="custom-action-panel"]')
      .should('contain.text', updated.name)
      .and('contain.text', 'updated-tag')
    cy.contains('button', updated.name).click()
    cy.then(() => finishEvent!())
    cy.wait('@updatedEvent')
    cy.contains('Custom action completed.').should('be.visible')
    cy.get('[data-cy="custom-action-panel"]').should(
      'contain.text',
      updated.name,
    )
  })
  it('clears an unstarted selection when its setting is removed', () => {
    cy.visit(`${origin}/reports/123`)
    selectCustom()
    cy.then(() => {
      configuration = null
    })
    cy.window().then((win) => win.dispatchEvent(new win.Event('focus')))
    cy.get('[data-cy="custom-action-panel"]').should('not.exist')
    cy.contains('button', 'Confirm and run').should('not.exist')
  })
  it('supports nonclosing custom work on closed reports in the new UI', () => {
    cy.viewport(390, 844)
    cy.then(() => {
      report.status = 'closed'
    })
    cy.visit(`${origin}/reports/123`)
    selectCustom()
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        expect(req.body.modTool.meta.reportId).to.equal(123)
        expect(req.body.reportAction).to.equal(undefined)
        req.reply({
          id: 71,
          ...req.body,
          createdAt: new Date().toISOString(),
          subjectBlobCids: [],
        })
      },
    ).as('customEvent')
    cy.contains('button', 'Confirm and run').click()
    cy.wait('@customEvent')
    cy.contains('Custom action completed.').should('be.visible')
  })
  for (const initialStatus of ['closed', 'queued']) {
    it(`shows and submits configured steps on a ${initialStatus} report, leaving status checks to the server`, () => {
      const closingWorkflow = {
        ...workflow,
        id: 'label-and-close',
        name: 'Label and close report',
        actions: [
          {
            id: 'label',
            type: 'event',
            target: 'subject',
            event: {
              $type: 'tools.ozone.moderation.defs#modEventLabel',
              createLabelVals: ['test-label'],
              negateLabelVals: [],
            },
            reportAction: { scope: 'current' },
          },
          workflow.actions[0],
        ],
      }
      cy.then(() => {
        report.status = initialStatus
        configuration.customActions.push(closingWorkflow)
      })
      cy.visit(`${origin}/reports/123`)
      cy.contains('button', /^Action$/).click()
      cy.contains('[role="menuitem"]', closingWorkflow.name)
        .should('be.visible')
        .click()
      cy.get('[data-cy="custom-action-panel"]').should(
        'contain.text',
        'close current report as actioned',
      )
      let sends = 0
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
        (req) => {
          sends++
          expect(req.body.reportAction).to.deep.equal({ ids: [123] })
          req.reply({
            statusCode: 400,
            body: {
              error: 'InvalidRequest',
              message: 'Report transition rejected',
            },
          })
        },
      ).as('rejectedAction')
      cy.contains('button', 'Confirm and run').should('be.enabled').click()
      cy.wait('@rejectedAction')
      cy.contains('Custom action stopped after an error.').should('be.visible')
      cy.get('[data-cy="custom-operation-status"]')
        .first()
        .should('contain.text', 'failed')
      cy.get('[data-cy="custom-operation-status"]')
        .last()
        .should('contain.text', 'skipped')
      cy.then(() => expect(sends).to.equal(1))
    })
  }
  for (const ui of ['report', 'quick-action']) {
    it(`prints configured effects without executing them in the ${ui} preview`, () => {
      const actions = [
        {
          ...workflow.actions[0],
          event: { ...workflow.actions[0].event, remove: ['retired-tag'] },
        },
        {
          id: 'label',
          type: 'event',
          target: 'subject',
          event: {
            $type: 'tools.ozone.moderation.defs#modEventLabel',
            createLabelVals: ['test-label'],
            negateLabelVals: ['old-label'],
          },
        },
        {
          id: 'dm',
          type: 'event',
          target: 'account',
          event: {
            $type: 'tools.ozone.moderation.defs#modEventTag',
            add: [],
            remove: ['chat-disabled'],
          },
        },
        { id: 'verify', type: 'verify', target: 'account' },
        {
          id: 'temporary',
          type: 'event',
          target: 'subject',
          event: {
            $type: 'tools.ozone.moderation.defs#modEventTakedown',
            durationInHours: 24,
            comment: 'Configured takedown note',
          },
        },
        {
          id: 'permanent',
          type: 'event',
          target: 'account',
          event: { $type: 'tools.ozone.moderation.defs#modEventTakedown' },
        },
        {
          id: 'comment',
          type: 'event',
          target: 'subject',
          event: {
            $type: 'tools.ozone.moderation.defs#modEventComment',
            comment: '<b>Literal configured comment</b>',
            sticky: true,
          },
        },
        ...(ui === 'report'
          ? [
              {
                id: 'note',
                type: 'activity',
                target: 'report',
                activity: { $type: 'tools.ozone.report.defs#noteActivity' },
                internalNote: 'Configured internal note',
                publicNote: 'Configured public note',
              },
            ]
          : []),
      ]
      cy.then(() => {
        configuration.customActions = [{ ...workflow, actions }]
        cy.intercept('GET', `${SERVER_URL}/tools.ozone.server.getConfig*`, {
          ...auth.ozoneServerConfigResponse,
          verifierDid: auth.ozoneMetaResponse.did,
        })
        cy.intercept('GET', '**/xrpc/app.bsky.actor.getProfile*', {
          ...auth.getProfileResponse,
          did: seed.carla.repo.did,
          handle: 'profile-for-execution.test',
        })
      })
      let mutations = 0
      cy.intercept(
        'POST',
        /\/xrpc\/tools\.ozone\.(moderation\.emitEvent|report\.createActivity|verification\.grantVerifications)$/,
        (req) => {
          mutations++
          req.reply({ statusCode: 500, body: { error: 'UnexpectedMutation' } })
        },
      )
      if (ui === 'report') cy.visit(`${origin}/reports/123`)
      else {
        cy.get('table').should('contain.text', seed.carla.repo.handle)
        cy.contains('button', 'Take Action').click()
      }
      selectCustom()
      cy.get('[data-cy="custom-action-panel"] > ol > li').should(
        'have.length',
        actions.length,
      )
      cy.get('[data-cy="custom-action-panel"]')
        .should('contain.text', 'review:example')
        .and('contain.text', 'retired-tag')
        .and('contain.text', 'test-label')
        .and('contain.text', 'old-label')
        .and('contain.text', `Update tags: ${seed.carla.repo.did}`)
        .and('contain.text', 'chat-disabled')
        .and('contain.text', `Verify account: ${seed.carla.repo.did}`)
        .and('not.contain.text', 'profile-for-execution.test')
        .and('contain.text', 'for 24 hours')
        .and('contain.text', 'PERMANENT')
        .and('contain.text', 'Configured takedown note')
        .and('contain.text', '<b>Literal configured comment</b>')
        .and('contain.text', 'Replace the persistent subject note')
      if (ui === 'report') {
        cy.get('[data-cy="custom-action-panel"]')
          .should('contain.text', 'Add report note #123')
          .and('contain.text', 'Internal note: Configured internal note')
          .and('contain.text', 'Public note: Configured public note')
      }
      cy.get('[data-cy="custom-operation-status"]').should('not.exist')
      cy.contains('button', 'Confirm and run').should('be.enabled')
      cy.then(() => expect(mutations).to.equal(0))
    })
    it(`switches from completed custom actions to built-in and custom choices in the ${ui} UI`, () => {
      const nextWorkflow = {
        ...workflow,
        id: 'followup-example',
        name: 'Follow-up example',
        helpText: 'Review the next action before running it.',
      }
      cy.then(() => {
        configuration.customActions.push(nextWorkflow)
      })
      if (ui === 'report') {
        cy.visit(`${origin}/reports/123`)
      } else {
        cy.get('table').should('contain.text', seed.carla.repo.handle)
        cy.contains('button', 'Take Action').click()
      }
      let sends = 0
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
        (req) => {
          sends++
          req.reply({
            id: 80 + sends,
            ...req.body,
            createdAt: new Date().toISOString(),
            subjectBlobCids: [],
          })
        },
      ).as('customEvent')

      selectCustom()
      cy.contains('button', 'Confirm and run').click()
      cy.wait('@customEvent')
      cy.contains('Custom action completed.').should('be.visible')
      cy.contains('button', workflow.name).should('not.be.disabled').click()
      cy.contains('[role="menuitem"]', /^Label$/).click()
      cy.get('[data-cy="custom-action-panel"]').should('not.exist')
      cy.get(ui === 'quick-action' ? '[role="dialog"]' : 'body')
        .contains('button', /^Label$/)
        .should('be.visible')
        .click()
      cy.contains('[role="menuitem"]', workflow.name).click()
      cy.get('[data-cy="custom-operation-status"]').should('not.exist')
      cy.contains('button', 'Confirm and run').click()
      cy.wait('@customEvent')
      cy.contains('Custom action completed.').should('be.visible')
      cy.contains('button', workflow.name).should('not.be.disabled').click()
      cy.contains('[role="menuitem"]', nextWorkflow.name).click()
      cy.contains('button', nextWorkflow.name).should('be.visible')
      cy.get('[data-cy="custom-action-panel"]').should(
        'contain.text',
        nextWorkflow.helpText,
      )
      cy.get('[data-cy="custom-operation-status"]').should('not.exist')
      cy.contains('button', 'Confirm and run').should('be.enabled')
      cy.then(() => expect(sends).to.equal(2))
      cy.window().then((win) => {
        expect(
          Object.keys(win.sessionStorage).filter((key) =>
            key.startsWith('ozone.custom-actions.v1:'),
          ),
        ).to.have.length(0)
      })
    })
  }
  it('allows navigation after a failed run and discards panel progress without replay', () => {
    cy.visit(`${origin}/reports/123`)
    selectCustom()
    let sends = 0
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        sends++
        req.reply({
          statusCode: 500,
          body: { error: 'InternalServerError', message: 'Uncertain result' },
        })
      },
    )
    cy.contains('button', 'Confirm and run').click()
    cy.get('[data-cy="custom-operation-status"]').should(
      'contain.text',
      'failed',
    )
    cy.contains('Custom action stopped after an error.').should('be.visible')
    cy.contains(
      'button',
      /Continue|Check outcome|Retry remaining|Stop for now/,
    ).should('not.exist')
    cy.then(() => expect(sends).to.equal(1))
    cy.get('a[href="/configure"]').filter(':visible').first().click()
    cy.location('pathname').should('equal', '/configure')
    cy.contains('aside', 'has unfinished work').should('not.exist')
    cy.go('back')
    cy.location('pathname').should('equal', '/reports/123')
    cy.get('[data-cy="custom-operation-status"]').should('not.exist')
    cy.then(() => expect(sends).to.equal(1))
    cy.reload()
    cy.get('section[aria-label="Custom action progress"]').should('not.exist')
    cy.contains('aside', 'has unfinished work').should('not.exist')
    selectCustom()
    cy.get('[data-cy="custom-operation-status"]').should('not.exist')
    cy.contains('button', 'Confirm and run').should('be.enabled')
    cy.then(() => expect(sends).to.equal(1))
  })
  it('cancels during initial checks and keeps the final status without sending events', () => {
    cy.visit(`${origin}/reports/123`)
    selectCustom()
    let finishPreflight: (() => void) | undefined
    let sends = 0
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        sends++
        req.reply({ statusCode: 500, body: { error: 'UnexpectedRequest' } })
      },
    )
    cy.intercept(
      {
        method: 'GET',
        url: '**/xrpc/tools.ozone.setting.listOptions*tools.ozone.setting.protectedTags*',
        times: 1,
      },
      (req) =>
        new Promise<void>((resolve) => {
          finishPreflight = () => {
            req.reply({ options: [] })
            resolve()
          }
        }),
    )
    cy.contains('button', 'Confirm and run').click()
    cy.wrap(null).should(() => expect(finishPreflight).to.be.a('function'))
    cy.get('[data-cy="custom-action-panel"]')
      .contains('button', /^Cancel$/)
      .click()
    cy.contains(
      'Custom action cancelled. Remaining steps were skipped.',
    ).should('be.visible')
    cy.get('[data-cy="custom-operation-status"]').should(
      'contain.text',
      'skipped',
    )
    cy.then(() => finishPreflight!())
    cy.contains(
      'Custom action cancelled. Remaining steps were skipped.',
    ).should('be.visible')
    cy.then(() => expect(sends).to.equal(0))
  })
  for (const ui of ['report', 'quick-action']) {
    for (const stop of ['timeout', 'cancel']) {
      it(`handles ${stop} without sending remaining steps in the ${ui} UI`, () => {
        cy.then(() => {
          configuration.customActions = [
            {
              ...workflow,
              actions: [
                workflow.actions[0],
                { ...workflow.actions[0], id: 'unsent' },
              ],
            },
          ]
        })
        if (ui === 'report') {
          cy.visit(`${origin}/reports/123`)
        } else {
          cy.get('table').should('contain.text', seed.carla.repo.handle)
          cy.contains('button', 'Take Action').click()
        }
        let finishLate: (() => void) | undefined
        let sends = 0
        cy.intercept(
          'POST',
          `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
          (req) => {
            sends++
            return new Promise<void>((resolve) => {
              finishLate = () => {
                req.reply({
                  id: 90,
                  ...req.body,
                  createdAt: new Date().toISOString(),
                  subjectBlobCids: [],
                })
                resolve()
              }
            })
          },
        )
        selectCustom()
        cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
        cy.contains('button', 'Confirm and run').click()
        cy.wrap(null).should(() => expect(finishLate).to.be.a('function'))
        cy.get('[data-cy="custom-operation-status"]')
          .first()
          .should('contain.text', 'running')
        cy.contains(
          'button',
          /Stop for now|Pause|Continue|Retry remaining|Check outcome/,
        ).should('not.exist')
        if (stop === 'timeout') cy.tick(60_000)
        else
          cy.get('[data-cy="custom-action-panel"]')
            .contains('button', /^Cancel$/)
            .click()
        const timeoutMessage =
          stop === 'timeout'
            ? 'Custom action timed out. Remaining steps were skipped.'
            : 'Custom action cancelled. Remaining steps were skipped.'
        cy.contains(timeoutMessage).scrollIntoView()
        cy.contains(timeoutMessage).should('be.visible')
        cy.get('[data-cy="custom-operation-status"]')
          .first()
          .should(
            'contain.text',
            stop === 'timeout' ? 'timed-out' : 'cancelled',
          )
        cy.get('[data-cy="custom-operation-status"]')
          .last()
          .should('contain.text', 'skipped')
        cy.contains('a', 'View history').scrollIntoView()
        cy.contains('a', 'View history').should('be.visible')
        cy.then(() => finishLate!())
        cy.tick(1)
        cy.contains(timeoutMessage).scrollIntoView()
        cy.contains(timeoutMessage).should('be.visible')
        cy.contains('a', 'event 90').should('not.exist')
        cy.get('[data-cy="custom-action-panel"]')
          .contains('button', /^Cancel$/)
          .should('not.exist')
        cy.then(() => expect(sends).to.equal(1))
      })
    }
    it(`allows overlapping runs with distinct batch IDs in the ${ui} UI`, () => {
      const comment = (id: string) => ({
        id,
        type: 'event',
        target: 'account',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventComment',
          comment: id,
        },
      })
      const secondWorkflow = {
        ...workflow,
        id: 'second-workflow',
        name: 'Second workflow',
        actions: [comment('second-run')],
      }
      cy.then(() => {
        configuration.customActions = [
          {
            ...workflow,
            actions: [comment('first-step'), comment('last-step')],
          },
          secondWorkflow,
        ]
      })
      if (ui === 'report') {
        cy.visit(`${origin}/reports/123`)
      } else {
        cy.get('table').should('contain.text', seed.carla.repo.handle)
        cy.contains('button', 'Take Action').click()
      }
      let releaseFirst: (() => void) | undefined
      const sent: any[] = []
      cy.intercept(
        'POST',
        `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
        (req) => {
          sent.push(req.body)
          const reply = () =>
            req.reply({
              id: 100 + sent.length,
              ...req.body,
              createdAt: new Date().toISOString(),
              subjectBlobCids: [],
            })
          if (req.body.modTool.meta.stepId === 'first-step') {
            req.alias = 'firstEvent'
            return new Promise<void>((resolve) => {
              releaseFirst = () => {
                reply()
                resolve()
              }
            })
          }
          req.alias =
            req.body.modTool.meta.stepId === 'last-step'
              ? 'lastEvent'
              : 'secondEvent'
          reply()
        },
      )
      selectCustom()
      cy.contains('button', 'Confirm and run').click()
      cy.wrap(null).should(() => expect(releaseFirst).to.be.a('function'))
      cy.get('[data-cy="custom-operation-status"]').should(
        'contain.text',
        'running',
      )
      cy.contains('button', workflow.name).should('not.be.disabled').click()
      cy.contains('[role="menuitem"]', secondWorkflow.name).click()
      cy.contains('button', 'Confirm and run').should('be.enabled').click()
      cy.wait('@secondEvent')
      cy.contains('Custom action completed.').should('be.visible')
      cy.then(() => {
        expect(sent).to.have.length(2)
        expect(sent[0].modTool.meta.batchId).not.to.equal(
          sent[1].modTool.meta.batchId,
        )
      })
      if (ui === 'report') {
        cy.get('a[href="/configure"]').filter(':visible').first().click()
        cy.location('pathname').should('equal', '/configure')
      }
      cy.then(() => releaseFirst!())
      cy.wait('@firstEvent')
      cy.wait('@lastEvent')
      cy.then(() => {
        expect(sent).to.have.length(3)
        expect(sent[2].modTool.meta.batchId).to.equal(
          sent[0].modTool.meta.batchId,
        )
        expect(sent[2].subject).to.deep.equal(sent[0].subject)
      })
      if (ui === 'report') {
        cy.contains('aside', 'has unfinished work').should('not.exist')
      } else {
        cy.contains('button', secondWorkflow.name).should('be.visible')
        cy.contains('Custom action completed.').should('be.visible')
      }
    })
  }
  it('runs without session storage and never persists custom-action progress', () => {
    cy.visit(`${origin}/reports/123`)
    let storageWrites: any
    cy.window().then((win) => {
      storageWrites = cy
        .stub(win.sessionStorage, 'setItem')
        .throws(new Error('Session storage unavailable'))
    })
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
      (req) => {
        req.reply({
          id: 92,
          ...req.body,
          createdAt: new Date().toISOString(),
          subjectBlobCids: [],
        })
      },
    ).as('customEvent')
    selectCustom()
    cy.contains('button', 'Confirm and run').click()
    cy.wait('@customEvent')
    cy.contains('Custom action completed.').should('be.visible')
    cy.then(() => expect(storageWrites).not.to.have.been.called)
  })
  it('edits and saves settings with pinned scope and manager role', () => {
    cy.visit(`${origin}/configure`)
    const replacement = {
      version: 1,
      customActions: [{ ...workflow, name: 'Reviewed workflow' }],
    }
    cy.get('section[aria-label="Custom action settings"] textarea')
      .should('have.value', JSON.stringify(configuration, null, 2))
      .clear()
    cy.get('section[aria-label="Custom action settings"] textarea')
      .should('have.value', '')
      .type(JSON.stringify(replacement), {
        parseSpecialCharSequences: false,
        delay: 1,
      })
    cy.get('section[aria-label="Custom action settings"] textarea').should(
      'have.value',
      JSON.stringify(replacement),
    )
    cy.intercept(
      'POST',
      `${SERVER_URL}/tools.ozone.setting.upsertOption`,
      (req) => {
        expect(req.body.scope).to.equal('instance')
        expect(req.body.managerRole).to.equal('tools.ozone.team.defs#roleAdmin')
        expect(req.body.key).to.equal(KEY)
        configuration = req.body.value
        req.reply({
          option: {
            ...req.body,
            did: auth.ozoneMetaResponse.did,
            createdBy: auth.createSessionResponse.did,
            lastUpdatedBy: auth.createSessionResponse.did,
          },
        })
      },
    ).as('saveSettings')
    cy.contains('button', 'Save replacement').click()
    cy.wait('@saveSettings')
    cy.contains('Custom actions saved.').should('be.visible')
  })
  it('removes management controls after role loss', () => {
    cy.intercept('GET', `${SERVER_URL}/tools.ozone.server.getConfig*`, {
      ...auth.ozoneServerConfigResponse,
      viewer: { role: 'tools.ozone.team.defs#roleModerator' },
    })
    cy.visit(`${origin}/configure`)
    cy.get('section[aria-label="Custom action settings"]').should('not.exist')
  })
  it('rejects invalid configuration without removing built-in actions', () => {
    cy.then(() => {
      configuration = {
        version: 1,
        customActions: [{ ...workflow, helpText: '   ' }],
      }
    })
    cy.visit(`${origin}/reports/123`)
    cy.contains('Custom actions are unavailable.').scrollIntoView()
    cy.contains('Custom actions are unavailable.').should('be.visible')
    cy.contains('button', /^Action$/).click()
    cy.contains('[role="menuitem"]', 'Label').should('be.visible')
    cy.contains('[role="menuitem"]', workflow.name).should('not.exist')
  })
  it('associates plain-text guidance with the picker and clears it on another selection', () => {
    cy.visit(`${origin}/reports/123`)
    selectCustom()
    cy.contains('button', workflow.name)
      .invoke('attr', 'aria-describedby')
      .then((id) => {
        expect(id).to.be.a('string')
        cy.get('[data-cy="custom-action-panel"] p')
          .filter((_, element) => element.id === id)
          .should('have.text', workflow.helpText)
      })
    cy.contains('button', workflow.name).click()
    cy.contains('[role="menuitem"]', 'Label').focus()
    cy.focused().type('{enter}')
    cy.get('[data-cy="custom-action-panel"]').should('not.exist')
  })
  it('offers no custom entries when the setting is absent', () => {
    cy.then(() => {
      configuration = null
    })
    cy.visit(`${origin}/reports/123`)
    cy.contains('button', /^Action$/).click()
    cy.contains('[role="menuitem"]', 'Label').should('be.visible')
    cy.contains('[role="menuitem"]', workflow.name).should('not.exist')
  })
})
