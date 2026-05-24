'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trophy, Edit3, Trash2, Check, X, Calendar } from 'lucide-react'
import { formatRecordTime } from '@/types'

interface MarathonPb {
  id: string
  category: '10K' | 'HALF' | 'FULL'
  record_sec: number
  achieved_at: string | null
}

interface MarathonManagerProps {
  initialPbs: MarathonPb[]
}

export function MarathonManager({ initialPbs }: MarathonManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [pbs, setPbs] = useState<MarathonPb[]>(initialPbs)
  const [editingCategory, setEditingCategory] = useState<'10K' | 'HALF' | 'FULL' | null>(null)
  
  // 입력 폼 상태
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [achievedAt, setAchievedAt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const getPbByCategory = (cat: '10K' | 'HALF' | 'FULL') => {
    return pbs.find((pb) => pb.category === cat)
  }

  // 수정 모드 진입
  const startEdit = (cat: '10K' | 'HALF' | 'FULL') => {
    setError('')
    const pb = getPbByCategory(cat)
    if (pb) {
      const h = Math.floor(pb.record_sec / 3600)
      const m = Math.floor((pb.record_sec % 3600) / 60)
      const s = pb.record_sec % 60

      setHours(h > 0 ? String(h) : '')
      setMinutes(String(m))
      setSeconds(String(s))
      setAchievedAt(pb.achieved_at || '')
    } else {
      setHours('')
      setMinutes('')
      setSeconds('')
      setAchievedAt('')
    }
    setEditingCategory(cat)
  }

  // PB 저장 (Upsert)
  const savePb = async (cat: '10K' | 'HALF' | 'FULL') => {
    setError('')
    
    const hNum = parseInt(hours || '0', 10)
    const mNum = parseInt(minutes || '0', 10)
    const sNum = parseInt(seconds || '0', 10)

    if (isNaN(hNum) || isNaN(mNum) || isNaN(sNum)) {
      return setError('기록 시간을 숫자로 올바르게 입력해주세요.')
    }

    const totalSeconds = hNum * 3600 + mNum * 60 + sNum
    if (totalSeconds <= 0) {
      return setError('시간은 0초보다 커야 합니다.')
    }

    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다.')

      const { data, error: upsertError } = await supabase
        .from('marathon_pbs')
        .upsert({
          user_id: user.id,
          category: cat,
          record_sec: totalSeconds,
          achieved_at: achievedAt || null,
        }, { onConflict: 'user_id, category' })
        .select()
        .single()

      if (upsertError) throw new Error(upsertError.message)

      // 상태 갱신
      setPbs((prev) => {
        const filtered = prev.filter((p) => p.category !== cat)
        return [...filtered, {
          id: data.id,
          category: data.category,
          record_sec: data.record_sec,
          achieved_at: data.achieved_at,
        }]
      })
      setEditingCategory(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message || '기록 저장 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // PB 삭제
  const deletePb = async (cat: '10K' | 'HALF' | 'FULL', id: string) => {
    if (!confirm(`${cat} 최고 기록을 삭제하시겠습니까?`)) return

    setIsLoading(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('marathon_pbs')
        .delete()
        .eq('id', id)

      if (deleteError) throw new Error(deleteError.message)

      setPbs((prev) => prev.filter((p) => p.category !== cat))
      router.refresh()
    } catch (err: any) {
      setError(err.message || '기록 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const categories: ('10K' | 'HALF' | 'FULL')[] = ['10K', 'HALF', 'FULL']

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {categories.map((cat) => {
          const pb = getPbByCategory(cat)
          const isEditing = editingCategory === cat

          return (
            <div
              key={cat}
              className={`bg-zinc-900/60 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-300 ${
                isEditing
                  ? 'border-lime-400/50 shadow-lg shadow-lime-950/20'
                  : 'border-zinc-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* 정보 영역 */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-lime-400 shadow-md">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{cat}</h3>
                    {pb && !isEditing ? (
                      <div className="space-y-1">
                        <p className="text-2xl font-black text-white tracking-tight">
                          {formatRecordTime(pb.record_sec)}
                        </p>
                        {pb.achieved_at && (
                          <p className="text-zinc-500 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            달성일: {pb.achieved_at}
                          </p>
                        )}
                      </div>
                    ) : !isEditing ? (
                      <p className="text-zinc-600 text-sm italic">기록이 등록되지 않았습니다.</p>
                    ) : null}
                  </div>
                </div>

                {/* 제어 버튼 / 편집 폼 */}
                {!isEditing ? (
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Button
                      id={`edit-${cat}-btn`}
                      onClick={() => startEdit(cat)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3.5 py-2 rounded-xl border border-zinc-700 transition-all flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {pb ? '기록 수정' : '기록 추가'}
                    </Button>
                    {pb && (
                      <Button
                        id={`delete-${cat}-btn`}
                        onClick={() => deletePb(cat, pb.id)}
                        disabled={isLoading}
                        className="bg-zinc-950 hover:bg-red-950/30 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/30 text-xs px-3 py-2 rounded-xl transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="w-full md:max-w-md space-y-4 pt-2 md:pt-0">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-zinc-500 text-xs">시간 (HH)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-white rounded-lg text-center h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-zinc-500 text-xs">분 (MM)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          max="59"
                          value={minutes}
                          onChange={(e) => setMinutes(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-white rounded-lg text-center h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-zinc-500 text-xs">초 (SS)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          max="59"
                          value={seconds}
                          onChange={(e) => setSeconds(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-white rounded-lg text-center h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-zinc-500 text-xs">달성 날짜 (선택)</Label>
                      <Input
                        type="date"
                        value={achievedAt}
                        onChange={(e) => setAchievedAt(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="bg-zinc-950 border-zinc-800 text-white rounded-lg h-10"
                      />
                    </div>

                    {error && (
                      <p className="text-red-400 text-xs font-semibold text-center bg-red-950/20 border border-red-900/30 py-1.5 rounded-lg">
                        {error}
                      </p>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        id={`cancel-${cat}-btn`}
                        onClick={() => setEditingCategory(null)}
                        className="bg-zinc-950 hover:bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700 text-xs h-9 px-3 rounded-lg"
                      >
                        취소
                      </Button>
                      <Button
                        id={`save-${cat}-btn`}
                        onClick={() => savePb(cat)}
                        disabled={isLoading}
                        className="bg-lime-400 hover:bg-lime-500 text-black text-xs h-9 px-3 rounded-lg flex items-center gap-1 font-bold"
                      >
                        <Check className="w-3.5 h-3.5" />
                        저장
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
