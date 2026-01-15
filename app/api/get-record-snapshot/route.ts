import { NextRequest } from 'next/server'

const AETHER_API_URL = process.env.AETHER_API_URL || 'http://localhost:3000'
const AETHER_USERNAME = process.env.AETHER_USERNAME || 'admin'
const AETHER_PASSWORD = process.env.AETHER_PASSWORD || 'password'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const uri = searchParams.get('uri')

  if (!uri) {
    return Response.json(
      { error: 'Missing required query parameter: uri' },
      { status: 400 }
    )
  }

  try {
    const basicAuth = Buffer.from(`${AETHER_USERNAME}:${AETHER_PASSWORD}`).toString('base64')

    const aetherUrl = new URL('/get-snapshot', AETHER_API_URL)
    aetherUrl.searchParams.set('uri', uri)

    const response = await fetch(aetherUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return Response.json(errorData, { status: response.status })
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('Error fetching snapshot from Aether API:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
