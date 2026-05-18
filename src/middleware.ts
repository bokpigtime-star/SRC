import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 인증 없이 접근 가능한 공개 경로
const PUBLIC_ROUTES = ['/login', '/auth/callback']

// 프로필 미설정 유저가 접근할 수 있는 경로
const PROFILE_SETUP_ROUTES = ['/profile-setup', '/auth/callback']

// WAITING 상태 유저가 접근할 수 있는 경로
const PENDING_ROUTES = ['/pending-approval', '/auth/callback']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신 (반드시 호출해야 세션 쿠키가 유지됨)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 1. 비인증 사용자: 공개 경로가 아니면 로그인 페이지로
  if (!user && !PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 2. 인증된 사용자: 프로필 및 권한 확인
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_profile_complete, is_active')
      .eq('id', user.id)
      .single()

    // 로그인 페이지 접근 시 → 적절한 페이지로 리다이렉트
    if (pathname === '/login') {
      const redirectUrl = request.nextUrl.clone()
      if (!profile?.is_profile_complete) {
        redirectUrl.pathname = '/profile-setup'
      } else if (profile?.role === 'WAITING') {
        redirectUrl.pathname = '/pending-approval'
      } else {
        redirectUrl.pathname = '/dashboard'
      }
      return NextResponse.redirect(redirectUrl)
    }

    // 프로필 미설정: profile-setup 경로만 허용
    if (!profile?.is_profile_complete && !PROFILE_SETUP_ROUTES.some(r => pathname.startsWith(r))) {
      const setupUrl = request.nextUrl.clone()
      setupUrl.pathname = '/profile-setup'
      return NextResponse.redirect(setupUrl)
    }

    // WAITING 상태: pending-approval 경로만 허용
    if (
      profile?.is_profile_complete &&
      profile?.role === 'WAITING' &&
      !PENDING_ROUTES.some(r => pathname.startsWith(r))
    ) {
      const pendingUrl = request.nextUrl.clone()
      pendingUrl.pathname = '/pending-approval'
      return NextResponse.redirect(pendingUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
