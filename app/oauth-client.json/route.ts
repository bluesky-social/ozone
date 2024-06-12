import { oauthClientMetadataSchema } from '@atproto/oauth-types'

const logoUrl = '/img/logo-colorful.png'

export async function GET(request: Request) {
  const clientMetadataUrl = new URL(request.url)

  const proto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('x-forwarded-host')
  if (proto && host) {
    const { protocol, hostname, port } = new URL(`${proto}://${host}`)
    clientMetadataUrl.protocol = protocol
    clientMetadataUrl.hostname = hostname
    clientMetadataUrl.port = port
  }

  return Response.json(
    oauthClientMetadataSchema.parse({
      client_id: clientMetadataUrl.href,
      client_uri: clientMetadataUrl.href,
      redirect_uris: [new URL('/', clientMetadataUrl).href],
      response_types: ['code id_token', 'code'],
      grant_types: ['authorization_code', 'implicit'],
      token_endpoint_auth_method: 'none',
      scope: 'openid profile email',
      dpop_bound_access_tokens: true,
      application_type: 'web',
      client_name: 'Ozone Service',
      logo_uri: new URL(
        `/_next/image?url=${encodeURIComponent(logoUrl)}&w=150&q=75`,
        clientMetadataUrl,
      ).href,
      // tos_uri: 'https://example.com/tos',
      // policy_uri: 'https://example.com/policy',
      // jwks_uri: 'https://example.com/jwks',
    }),
  )
}
