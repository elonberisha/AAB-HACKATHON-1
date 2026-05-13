import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } })
  const hostname = request.headers.get('host') || ''
  const isAdminSubdomain = hostname.startsWith('admin.')

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

  // Subdomain admin.euguide-ks.info → rewrite to /admin routes
  if (isAdminSubdomain) {
    const path = request.nextUrl.pathname

    // admin.euguide-ks.info/login → /admin/login
    if (path === '/login' || path === '/') {
      if (user && path !== '/login') {
        // Logged in, redirect to admin dashboard
        return NextResponse.rewrite(new URL('/admin', request.url))
      }
      if (!user && path !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      if (path === '/login') {
        if (user) {
          return NextResponse.redirect(new URL('/', request.url))
        }
        return NextResponse.rewrite(new URL('/admin/login', request.url))
      }
    }

    // All other paths on subdomain → rewrite to /admin/...
    if (!path.startsWith('/admin')) {
      const newUrl = new URL(`/admin${path}`, request.url)
      if (!user && path !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return NextResponse.rewrite(newUrl)
    }
  }

  // /admin/login is public (login page inside admin)
  if (request.nextUrl.pathname === '/admin/login') {
    if (user) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return response
  }

  // Protect all other /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/((?!_next|api|favicon.ico).*)'],
}
