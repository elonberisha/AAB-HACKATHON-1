import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } })
  const hostname = request.headers.get('host') || ''
  const isAdminSubdomain = hostname.startsWith('admin.')
  const path = request.nextUrl.pathname

  // If on admin subdomain, rewrite all paths to /admin/...
  if (isAdminSubdomain) {
    // Don't rewrite if already going to /admin
    if (!path.startsWith('/admin') && !path.startsWith('/_next') && !path.startsWith('/api') && path !== '/favicon.ico') {
      const adminPath = path === '/' ? '/admin' : `/admin${path}`
      const url = request.nextUrl.clone()
      url.pathname = adminPath
      return NextResponse.rewrite(url)
    }
  }

  // Skip non-admin routes
  if (!path.startsWith('/admin')) {
    return response
  }

  // Create supabase client for auth check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // /admin/login is public
  if (path === '/admin/login') {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return response
  }

  // All other /admin routes require auth
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
