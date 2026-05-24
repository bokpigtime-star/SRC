import { createClient } from '@/lib/supabase/server'
import { RecordForm } from '@/components/record/RecordForm'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '러닝 기록 등록 | 수원러닝크루 SRC',
  description: '러닝 기록을 등록하고 생존 상태를 업데이트합니다.',
}

export default async function RecordPage() {
  const supabase = await createClient()

  // 1. 유저 정보 획득
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. 프로필 획득
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // 3. 활성화된 장소 목록 획득
  const { data: places = [] } = await supabase
    .from('places')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-400 to-lime-500 shadow-xl shadow-lime-950/30">
          <span className="text-2xl">🔥</span>
        </div>
        <h2 className="text-xl font-bold text-white">오늘의 러닝 인증</h2>
        <p className="text-zinc-500 text-sm">
          인증 조건을 확인하고 정확한 정보를 입력해 주세요.
        </p>
      </div>

      {/* 폼 컨테이너 */}
      <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-2xl">
        <RecordForm places={places || []} userRole={profile.role} />
      </div>
    </div>
  )
}
