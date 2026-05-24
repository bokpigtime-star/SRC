import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'

export const metadata: Metadata = {
  title: '승인 대기 중 | 수원러닝크루 SRC',
  description: '운영자 승인 대기 중입니다.',
}

export default function PendingApprovalPage() {
  // 로그아웃 서버 액션
  const handleLogout = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        {/* 아이콘 */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-zinc-800/80 border border-zinc-700 mb-6 shadow-xl">
          <span className="text-5xl">⏳</span>
        </div>

        {/* 메인 메시지 */}
        <h1 className="text-xl font-bold text-white mb-2">승인 대기 중</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          가입 신청이 완료되었습니다.
          <br />
          운영자 승인 후 서비스를 이용하실 수 있습니다.
        </p>

        {/* 안내 카드 */}
        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5 text-left space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-lime-400 mt-0.5">•</span>
            <p className="text-zinc-300 text-sm">
              운영자에게 가입 사실을 알려주시면 더 빠르게 승인받을 수 있어요.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lime-400 mt-0.5">•</span>
            <p className="text-zinc-300 text-sm">
              승인이 완료되면 자동으로 서비스가 활성화됩니다.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lime-400 mt-0.5">•</span>
            <p className="text-zinc-300 text-sm">
              이미 SRC 멤버라면 기존 운영자에게 문의해 주세요.
            </p>
          </div>
        </div>

        {/* 제어 버튼 영역 */}
        <div className="space-y-2">
          {/* 새로고침 버튼 (승인 후 상태 갱신용) */}
          <form action="/pending-approval" method="get">
            <button
              id="refresh-status-btn"
              type="submit"
              className="w-full h-11 bg-lime-400 hover:bg-lime-500 text-black text-sm font-bold rounded-xl transition-colors duration-150 shadow-lg shadow-lime-950/20"
            >
              승인 상태 새로고침
            </button>
          </form>

          {/* 로그아웃 버튼 */}
          <form action={handleLogout}>
            <button
              id="logout-btn"
              type="submit"
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-white text-sm font-medium rounded-xl transition-colors duration-150 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              다른 계정으로 로그인
            </button>
          </form>
        </div>

        <p className="text-zinc-700 text-xs mt-6">© 2025 수원러닝크루 SRC</p>
      </div>
    </main>
  )
}
