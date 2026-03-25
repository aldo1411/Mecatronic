import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/select-workshop', '/subscription/suspended']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_ROUTES.some(r => path.startsWith(r))

  // No autenticado → login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Autenticado en ruta pública → dashboard
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && !isPublic) {
    const meta = user.app_metadata as {
      active_workshop_id?: string
      subscription_status?: string
    }

    // Sin taller activo → select-workshop
    if (!meta?.active_workshop_id && path !== '/select-workshop') {
      return NextResponse.redirect(new URL('/select-workshop', request.url))
    }

    // Suscripción suspendida → suspended
    if (
      meta?.subscription_status === 'suspended' &&
      !path.startsWith('/subscription/suspended')
    ) {
      return NextResponse.redirect(new URL('/subscription/suspended', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
