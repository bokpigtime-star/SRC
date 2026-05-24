import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, PlusCircle, Trophy, ShieldAlert, LogOut } from 'lucide-react'
import { formatNickname } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const isAdmin = profile.role === 'ADMIN'

  // 로그아웃 서버 액션
  const handleLogout = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const nickname = formatNickname({
    name: profile.name,
    birth_year: profile.birth_year,
    gender: profile.gender,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white flex flex-col pb-24 md:pb-0 md:pl-64">
      {/* PC 사이드바 네비게이션 */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900/80 backdrop-blur-md border-r border-zinc-800 fixed inset-y-0 left-0 z-20 p-5 justify-between">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center shadow-lg shadow-lime-950/30">
              <span className="text-xl">🏃</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">수원러닝크루</h1>
              <span className="text-xs text-zinc-500 font-semibold">SRC System</span>
            </div>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-all font-medium text-sm"
            >
              <Home className="w-5 h-5 text-lime-400" />
              대시보드 (생존)
            </Link>
            <Link
              href="/dashboard/record"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-all font-medium text-sm"
            >
              <PlusCircle className="w-5 h-5 text-lime-400" />
              러닝 기록하기
            </Link>
            <Link
              href="/dashboard/marathon"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-all font-medium text-sm"
            >
              <Trophy className="w-5 h-5 text-lime-400" />
              마라톤 PB
            </Link>
            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-all font-medium text-sm"
              >
                <ShieldAlert className="w-5 h-5 text-lime-400" />
                운영자 메뉴
              </Link>
            )}
          </nav>
        </div>

        {/* 유저 프로필 영역 & 로그아웃 */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <div className="px-2">
            <div className="text-xs text-zinc-500">닉네임</div>
            <div className="font-semibold text-sm truncate flex items-center gap-1.5">
              {nickname}
              {profile.role === 'PACER' && <span>🎈</span>}
              {profile.role === 'ADMIN' && <span className="text-xs bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-900">운영자</span>}
            </div>
          </div>
          <form action={handleLogout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-red-950/20 hover:border-red-900/30 border border-transparent transition-all font-medium text-sm"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      {/* 모바일 상단 헤더 */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center">
            <span className="text-base">🏃</span>
          </div>
          <h1 className="font-bold text-base">SRC 대시보드</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
            {profile.name}
            {profile.role === 'PACER' && '🎈'}
          </span>
          <form action={handleLogout}>
            <button
              type="submit"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* 콘텐츠 영역 */}
      <main className="flex-1 p-5 md:p-8 max-w-4xl mx-auto w-full">
        {children}
      </main>

      {/* 모바일 하단 탭 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-900 px-4 py-2 flex justify-around items-center">
        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-1 py-1 text-zinc-400 hover:text-white transition-colors"
        >
          <Home className="w-5 h-5 text-lime-400" />
          <span className="text-[10px] font-medium">대시보드</span>
        </Link>
        <Link
          href="/dashboard/record"
          className="flex flex-col items-center gap-1 py-1 text-zinc-400 hover:text-white transition-colors"
        >
          <PlusCircle className="w-5 h-5 text-lime-400" />
          <span className="text-[10px] font-medium">기록등록</span>
        </Link>
        <Link
          href="/dashboard/marathon"
          className="flex flex-col items-center gap-1 py-1 text-zinc-400 hover:text-white transition-colors"
        >
          <Trophy className="w-5 h-5 text-lime-400" />
          <span className="text-[10px] font-medium">마라톤 PB</span>
        </Link>
        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className="flex flex-col items-center gap-1 py-1 text-zinc-400 hover:text-white transition-colors"
          >
            <ShieldAlert className="w-5 h-5 text-lime-400" />
            <span className="text-[10px] font-medium">운영자</span>
          </Link>
        )}
      </nav>
    </div>
  )
}
