import { createClient } from '@/lib/supabase/server'
import { MarathonManager } from '@/components/marathon/MarathonManager'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '마라톤 PB 관리 | 수원러닝크루 SRC',
  description: '종목별 개인 최고 기록(Personal Best)을 기록하고 관리합니다.',
}

export default async function MarathonPage() {
  const supabase = await createClient()

  // 1. 유저 정보 획득
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. 현재 등록된 마라톤 PB 기록 조회
  const { data: pbs = [] } = await supabase
    .from('marathon_pbs')
    .select('id, category, record_sec, achieved_at')
    .eq('user_id', user.id)

  const formattedPbs = (pbs || []).map((pb) => ({
    id: pb.id,
    category: pb.category as '10K' | 'HALF' | 'FULL',
    record_sec: pb.record_sec,
    achieved_at: pb.achieved_at,
  }))

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          마라톤 PB 관리
        </h2>
        <p className="text-zinc-500 text-sm">
          종목별 개인 최고 기록(Personal Best)을 저장하고 관리해 보세요.
        </p>
      </div>

      {/* 매니저 컴포넌트 */}
      <MarathonManager initialPbs={formattedPbs} />
    </div>
  )
}
