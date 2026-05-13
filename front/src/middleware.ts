import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const isAdminSubdomain = hostname.startsWith('admin.')
  let path = request.nextUrl.pathname

  // If on admin subdomain, map paths to /admin/...
  if (isAdminSubdomain && !path.startsWith('/admin') && !path.startsWith('/_next') && !path.startsWith('/api') && path !== '/favicon.ico') {
    path = path === '/' ? '/admin' : `/admin${path}`
  }

  // Skip non-admin routes entirely
  if (!path.startsWith('/admin')) {
    return NextResponse.next()
  }

  // --- Auth check for all /admin routes ---
  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // /admin/login — public, redirect to /admin if already logged in
  if (path === '/admin/login') {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      if (isAdminSubdomain) {
        url.pathname = '/'
      }
      return NextResponse.redirect(url)
    }
    // On subdomain, rewrite to /admin/login
    if (isAdminSubdomain && request.nextUrl.pathname !== '/admin/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.rewrite(url)
    }
    return response
  }

  // /admin/auth/callback — public (needed for magic link)
  if (path.startsWith('/admin/auth/callback')) {
    if (isAdminSubdomain && !request.nextUrl.pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = path
      return NextResponse.rewrite(url)
    }
    return response
  }

  // All other /admin/* routes — REQUIRE auth
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = isAdminSubdomain ? '/login' : '/admin/login'
    return NextResponse.redirect(url)
  }

  // Authenticated — rewrite subdomain path to /admin/...
  if (isAdminSubdomain && !request.nextUrl.pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone()
    url.pathname = path
    return NextResponse.rewrite(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
