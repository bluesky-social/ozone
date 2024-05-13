export const API_URL = 'https://bsky.social'
export const SERVER_URL = `${API_URL}/xrpc`
export const PLC_URL = 'https://plc.directory'

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

export const mockProfileResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) =>
  cy.intercept(
    'GET',
    `${SERVER_URL}/app.bsky.actor.getProfile?did=${encodeURIComponent(
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

export const mockEmitEventResponse = (response: {
  statusCode: number
  body: Record<string, any>
}) =>
  cy.intercept(
    'POST',
    `${SERVER_URL}/tools.ozone.moderation.emitEvent`,
    response,
  )
