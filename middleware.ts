import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  // by only matching on the route where it's needed,
  // does not interfere with /xrpc (in particular websockets)
  matcher: '/',
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  // if (url.pathname === '/') {
  //   url.pathname = '/reports'
  //   url.searchParams.set('resolved', 'false')
  //   return NextResponse.redirect(url)
  // }
}
