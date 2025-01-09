import { oauthClientMetadataSchema } from '@atproto/oauth-types'

import { OAUTH_SCOPE } from '@/lib/constants'

const logoUrl = '/img/logo-colorful.png'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)

  const proto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('x-forwarded-host')
  if (proto && host) {
    const { protocol, hostname, port } = new URL(`${proto}://${host}`)
    requestUrl.protocol = protocol
    requestUrl.hostname = hostname
    requestUrl.port = port
  }

  return Response.json(
    oauthClientMetadataSchema.parse({
      client_id: requestUrl.href,
      client_uri: new URL('/', requestUrl).href,
      redirect_uris: [new URL('/', requestUrl).href],
      response_types: ['code'],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
      scope: OAUTH_SCOPE,
      dpop_bound_access_tokens: true,
      application_type: 'web',
      client_name: 'Ozone Service',
      logo_uri: new URL(
        `/_next/image?url=${encodeURIComponent(logoUrl)}&w=150&q=75`,
        requestUrl,
      ).href,
      // tos_uri: 'https://example.com/tos',
      // policy_uri: 'https://example.com/policy',
      // jwks_uri: 'https://example.com/jwks',
    }),
  )
}
