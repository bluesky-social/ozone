import { NextRequest } from 'next/server'

const SNAPSHOT_API_URL = process.env.SNAPSHOT_API_URL
const SNAPSHOT_AUTH_HEADER = process.env.SNAPSHOT_AUTH_HEADER

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const uri = searchParams.get('uri')

  if (!uri) {
    return Response.json(
      { error: 'Missing required query parameter: uri' },
      { status: 400 },
    )
  }

  try {
    const snapshotUrl = new URL('/get-snapshot', SNAPSHOT_API_URL)
    snapshotUrl.searchParams.set('uri', uri)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (SNAPSHOT_AUTH_HEADER) {
      headers['Authorization'] = SNAPSHOT_AUTH_HEADER
    }

    const response = await fetch(snapshotUrl.toString(), {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }))
      return Response.json(errorData, { status: response.status })
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('Error fetching snapshot:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}