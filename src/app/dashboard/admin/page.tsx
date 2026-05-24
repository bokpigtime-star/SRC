import { createClient } from '@/lib/supabase/server'
import { AdminConsole } from '@/components/admin/AdminConsole'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '운영자 콘솔 | 수원러닝크루 SRC',
  description: '회원 승인, 권한 관리, 장소 관리를 처리하는 운영자 전용 페이지입니다.',
}

export default async function AdminPage() {
  const supabase = await createClient()

  // 1. 유저 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. 운영자 권한 검증
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'ADMIN') {
    // 권한이 없으면 대시보드로 리다이렉트
    redirect('/dashboard')
  }

  // 3. 승인 대기자 목록 조회 (프로필 설정을 완료했고 활성화 상태인 WAITING 유저)
  const { data: waitingUsers = [] } = await supabase
    .from('profiles')
    .select('id, name, birth_year, gender, role, exemption, phone')
    .eq('role', 'WAITING')
    .eq('is_profile_complete', true)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  // 4. 정회원/페이서/운영자 목록 조회 (활성화 상태인 유저들)
  const { data: activeUsers = [] } = await supabase
    .from('profiles')
    .select('id, name, birth_year, gender, role, exemption, phone')
    .neq('role', 'WAITING')
    .eq('is_active', true)
    .order('name', { ascending: true })

  // 5. 러닝 장소 목록 조회 (삭제 유무 상관없이 가져오되, UI에서 필터링하거나 전체 노출)
  const { data: places = [] } = await supabase
    .from('places')
    .select('id, name, is_active')
    .order('name', { ascending: true })

  const typedWaitingUsers = (waitingUsers || []).map(u => ({
    ...u,
    gender: u.gender as '남' | '여' | '기타' | null
  }))

  const typedActiveUsers = (activeUsers || []).map(u => ({
    ...u,
    gender: u.gender as '남' | '여' | '기타' | null
  }))

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          운영자 메뉴
        </h2>
        <p className="text-zinc-500 text-sm">
          가입 승인, 멤버 권한(페이서/면제/강퇴) 및 러닝 장소를 관리합니다.
        </p>
      </div>

      {/* 어드민 콘솔 컴포넌트 */}
      <AdminConsole
        waitingUsers={typedWaitingUsers}
        activeUsers={typedActiveUsers}
        places={places || []}
      />
    </div>
  )
}
