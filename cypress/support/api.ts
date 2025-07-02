export const API_URL = 'http://localhost:2583'
export const SERVER_URL = `${API_URL}/xrpc`
export const PLC_URL = 'https://plc.directory'
export const HANDLE_RESOLVER_URL = 'https://api.bsky.app/xrpc'

export const mockAuthResponse = (response: Record<string, any>) =>
  cy.intercept(
    'POST',
    `${SERVER_URL}/com.atproto.server.createSession`,
    response,
  )

export const mockRepoResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) => {
  cy.intercept(
    'GET',
    `${SERVER_URL}/tools.ozone.moderation.getRepo?did=${encodeURIComponent(
      response.body.did,
    )}`,
    response,
  )
}

export const mockRecordResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) => {
  cy.intercept(
    'GET',
    `${SERVER_URL}/tools.ozone.moderation.getRecord?uri=${encodeURIComponent(
      response.body.uri,
    )}`,
    response,
  )
}

export const mockLabelerServiceRecordResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) => {
  const [did, collection, rkey] = response.body.uri
    .replace('at://', '')
    .split('/')
  const queryParams = `repo=${encodeURIComponent(
    did,
  )}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(
    rkey,
  )}`

  cy.intercept(
    'GET',
    `${SERVER_URL}/com.atproto.repo.getRecord?${queryParams}`,
    response,
  )
}

export const mockProfileResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) =>
  cy.intercept(
    'GET',
    `${SERVER_URL}/app.bsky.actor.getProfile?actor=${encodeURIComponent(
      response.body.did,
    )}`,
    response,
  )

export const mockModerationReportsResponse = (response: Record<string, any>) =>
  cy.intercept(
    'GET',
    `${SERVER_URL}/tools.ozone.moderation.queryStatuses*`,
    response,
  )
export const mockOzoneMetaResponse = (response: Record<string, any>) =>
  cy.intercept('GET', '/.well-known/ozone-metadata.json', response)
export const mockOzoneDidDataResponse = (response: Record<string, any>) =>
  cy.intercept('GET', `${PLC_URL}/*/data`, response)
export const mockServerConfigResponse = (response: Record<string, any>) =>
  cy.intercept('GET', `${SERVER_URL}/tools.ozone.server.getConfig*`, response)

export const mockEmitEventResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) =>
  cy.intercept(
    'POST',
    `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
    response,
  )

export const mockSafelinkQueryEventsResponse = (response: Record<string, any>) =>
  cy.intercept(
    'GET',
    `${SERVER_URL}/tools.ozone.safelink.queryEvents*`,
    response,
  ).as('mockSafelinkQueryEventsResponse')

export const mockSafelinkQueryRulesResponse = (response: Record<string, any>) =>
  cy.intercept(
    'POST',
    `${SERVER_URL}/tools.ozone.safelink.queryRules*`,
    response,
  ).as('mockSafelinkQueryRulesResponse')

export const mockSafelinkRemoveRuleResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) =>
  cy.intercept(
    'POST',
    `${SERVER_URL}/tools.ozone.safelink.removeRule`,
    response,
  ).as('mockSafelinkRemoveRuleResponse')

export const mockSafelinkAddRuleResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) =>
  cy.intercept(
    'POST',
    `${SERVER_URL}/tools.ozone.safelink.addRule`,
    response,
  ).as('mockSafelinkAddRuleResponse')

export const mockSafelinkUpdateRuleResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) =>
  cy.intercept(
    'POST',
    `${SERVER_URL}/tools.ozone.safelink.updateRule`,
    response,
  ).as('mockSafelinkUpdateRuleResponse')
