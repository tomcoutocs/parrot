import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Set this to 'false' to disable the password lock
const ENABLE_PASSWORD_LOCK = false

export function middleware(request: NextRequest) {
  // Skip password lock if disabled
  if (!ENABLE_PASSWORD_LOCK) {
    return NextResponse.next()
  }

  // Skip all API routes (except we'll handle site-lock-login explicitly)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow the login API route
    if (request.nextUrl.pathname === '/api/site-lock-login') {
      return NextResponse.next()
    }
    // Skip other API routes
    return NextResponse.next()
  }

  // Check if user is authenticated (has the auth cookie)
  const isAuthenticated = request.cookies.get('site-lock-auth')?.value === 'authenticated'

  // Allow access to the login page
  if (request.nextUrl.pathname === '/site-lock-login') {
    // If already authenticated, redirect to home
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/site-lock-login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)).*)',
  ],
}

