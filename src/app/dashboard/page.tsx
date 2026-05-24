import { createClient } from '@/lib/supabase/server'
import { calculateSurvival } from '@/lib/survival'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Calendar, MapPin, Trash2, Award, Zap, Compass, CalendarCheck } from 'lucide-react'

// 기록 삭제를 위한 서버 액션
async function deleteRunLog(formData: FormData) {
  'use server'
  const logId = formData.get('logId') as string
  if (!logId) return

  const supabase = await createClient()
  const { error } = await supabase.from('run_logs').delete().eq('id', logId)

  if (error) {
    console.error('기록 삭제 실패:', error.message)
    return
  }

  revalidatePath('/dashboard')
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // 1. 유저 정보 획득
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 2. 프로필 획득
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (!profile) return null

  // 3. 이번 달 범위 계산 (현지 시간 기준 YYYY-MM-DD)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const startOfMonth = `${year}-${month}-01`
  
  // 이번 달 마지막 날 계산
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

  // 4. 이번 달 러닝 로그 가져오기
  const { data: runLogs = [] } = await supabase
    .from('run_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('run_date', startOfMonth)
    .lte('run_date', endOfMonth)
    .order('run_date', { ascending: false })

  const typedLogs = (runLogs || []).map(log => ({
    ...log,
    distance: Number(log.distance)
  }))

  // 5. 생존 여부 계산
  const isExempted = profile.exemption === 'EXEMPTED'
  const survival = calculateSurvival(typedLogs, isExempted)

  // 이번 달 누적 거리 계산
  const totalDistance = typedLogs.reduce((acc, log) => acc + log.distance, 0)

  // 생존 프로그레스 계산 (최대 100%)
  // 생존에 필요한 최소 런이 있고, 이미 달성한 횟수가 있다면 비율을 보여줌
  // 조건 A는 2회, 조건 B는 6회이므로, 채운 횟수에 기반하여 계산
  let progressPercent = 0
  if (survival.isSurvived) {
    progressPercent = 100
  } else {
    // 임시로 채워진 총 횟수 대비 최대 필요한 횟수 비율 계산
    const currentCompleted = survival.totalDays
    // 최단 필요 횟수 기준
    const target = currentCompleted + survival.minRunsNeeded
    progressPercent = target > 0 ? Math.round((currentCompleted / target) * 100) : 0
  }

  return (
    <div className="space-y-6">
      {/* 웰컴 배너 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-lime-400/10 via-zinc-900/50 to-transparent border border-lime-400/10 p-6">
        <div className="relative z-10 space-y-1">
          <span className="text-xs font-semibold text-lime-400 uppercase tracking-widest">수원러닝크루 SRC</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            안녕하세요, {profile.name}님!
          </h2>
          <p className="text-zinc-400 text-sm">
            오늘도 활기찬 러닝으로 건강한 하루를 시작해 보세요.
          </p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-15 pointer-events-none select-none">
          🏃
        </div>
      </div>

      {/* 생존 대시보드 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 생존 현황 카드 */}
        <div className="md:col-span-2 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between border-b border-zinc-800/40 pb-3">
            <div className="space-y-1">
              <h3 className="text-zinc-300 text-sm font-semibold flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-lime-400" />
                이번 달 생존 현황
              </h3>
              <p className="text-zinc-500 text-xs">
                기준: {startOfMonth} ~ {endOfMonth}
              </p>
            </div>
            <div className="self-start sm:self-auto">
              {survival.isExempted ? (
                <span className="inline-flex items-center gap-1 bg-blue-950 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-900 shadow-lg shadow-blue-950/50">
                  활동 면제
                </span>
              ) : survival.isSurvived ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-900 shadow-lg shadow-emerald-950/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  생존 완료
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-lime-400/10 text-lime-400 px-3 py-1 rounded-full text-xs font-bold border border-lime-400/20 shadow-lg shadow-lime-950/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                  생존 진행 중
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-2xl font-extrabold text-white">
                {survival.isSurvived ? '생존 성공!' : `${survival.minRunsNeeded}회 남음`}
              </span>
              <span className="text-zinc-500 text-xs font-medium">
                달성률 {progressPercent}%
              </span>
            </div>
            
            {/* 프로그레스 바 */}
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-lime-400 to-lime-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-sm text-zinc-300 font-medium">
              {survival.message}
            </p>
          </div>
        </div>

        {/* 이번 달 통계 카드 */}
        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="text-zinc-400 text-sm font-semibold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-lime-400" />
              이번 달 통계
            </h3>
            <p className="text-zinc-500 text-xs">누적 수치</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-zinc-400 text-sm">누적 거리</span>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-white">
                  {totalDistance.toFixed(1)}
                </span>
                <span className="text-zinc-400 text-sm ml-1">km</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-zinc-800/80">
              <div>
                <span className="block text-xs text-zinc-500">총 횟수</span>
                <span className="text-base font-bold text-white">{survival.totalDays}회</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500">벙(정규)</span>
                <span className="text-base font-bold text-white">{survival.regularDays}회</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500">개인런</span>
                <span className="text-base font-bold text-white">{survival.personalDays}회</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 러닝 인증 기록 */}
      <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-lime-400" />
            최근 인증 기록
          </h3>
          <Link
            href="/dashboard/record"
            className="text-xs text-lime-400 hover:text-lime-300 font-semibold transition-colors"
          >
            + 새 인증 등록
          </Link>
        </div>

        {typedLogs.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl space-y-2">
            <Compass className="w-8 h-8 text-zinc-700 mx-auto" />
            <p className="text-zinc-500 text-sm">이번 달에 등록한 인증 기록이 없습니다.</p>
            <p className="text-zinc-600 text-xs">첫 러닝 기록을 인증해 보세요!</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 overflow-hidden">
            {typedLogs.map((log) => (
              <div key={log.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{log.distance.toFixed(1)} km</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                      log.run_type === 'REGULAR'
                        ? 'bg-lime-950/50 text-lime-400 border-lime-900/50'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {log.run_type === 'REGULAR' ? '벙' : '개인'}
                    </span>
                    {log.is_pacing && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-yellow-950/50 text-yellow-500 border border-yellow-900/50">
                        🎈 페이서
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {log.run_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {log.place_name}
                    </span>
                  </div>
                </div>

                {/* 삭제 버튼 */}
                <form action={deleteRunLog}>
                  <input type="hidden" name="logId" value={log.id} />
                  <button
                    type="submit"
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition-all duration-150"
                    title="인증 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
