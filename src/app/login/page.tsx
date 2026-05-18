import type { Metadata } from 'next'
import { KakaoLoginButton } from '@/components/auth/KakaoLoginButton'
import Image from 'next/image'

export const metadata: Metadata = {
  title: '로그인 | 수원러닝크루 SRC',
  description: '수원러닝크루 멤버 전용 러닝 기록 및 생존 관리 시스템',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* 로고 영역 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 mb-4 shadow-xl shadow-orange-900/30">
            <span className="text-4xl">🏃</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">수원러닝크루</h1>
          <p className="text-zinc-400 text-sm mt-1">SRC 멤버 전용 기록 관리</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <p className="text-zinc-400 text-sm text-center mb-6">
            카카오 계정으로 간편하게 시작하세요
          </p>

          {/* 에러 메시지 */}
          {searchParams.error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm text-center">
              로그인 중 오류가 발생했습니다. 다시 시도해 주세요.
            </div>
          )}

          <KakaoLoginButton />

          <p className="text-zinc-600 text-xs text-center mt-4 leading-relaxed">
            로그인 시 운영자 승인 후 서비스를 이용하실 수 있습니다
          </p>
        </div>

        <p className="text-zinc-700 text-xs text-center mt-6">
          © 2025 수원러닝크루 SRC
        </p>
      </div>
    </main>
  )
}
