import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 세션 교환 성공 후 프로필 상태 확인 → 미들웨어가 적절히 분기
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_profile_complete, role')
          .eq('id', user.id)
          .single()

        // 프로필 미완성 → 프로필 설정 페이지
        if (!profile?.is_profile_complete) {
          return NextResponse.redirect(`${origin}/profile-setup`)
        }

        // WAITING → 승인 대기 페이지
        if (profile?.role === 'WAITING') {
          return NextResponse.redirect(`${origin}/pending-approval`)
        }

        // 정상 회원 → 대시보드
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // 실패 시 로그인 페이지로 (에러 파라미터 포함)
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
