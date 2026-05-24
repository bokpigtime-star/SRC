'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, MapPin, Check } from 'lucide-react'

interface Place {
  id: string
  name: string
}

interface RecordFormProps {
  places: Place[]
  userRole: string
}

export function RecordForm({ places, userRole }: RecordFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [distance, setDistance] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [runType, setRunType] = useState<'PERSONAL' | 'REGULAR'>('PERSONAL')
  const [isPacing, setIsPacing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // 오늘 날짜 계산 (미래 날짜 선택 방지용)
  const todayStr = new Date().toISOString().split('T')[0]

  // 일반 회원의 경우 30일 전까지만 선택 가능
  const getMinDate = () => {
    if (userRole === 'ADMIN') return undefined
    const minDate = new Date()
    minDate.setDate(minDate.getDate() - 30)
    return minDate.toISOString().split('T')[0]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 1. 거리 Validation
    const distNum = parseFloat(distance)
    if (isNaN(distNum) || distNum < 3.0) {
      return setError('거리는 최소 3.0km 이상 입력해야 합니다.')
    }

    // 2. 장소 Validation
    if (!placeId) {
      return setError('러닝 장소를 선택해주세요.')
    }

    const selectedPlace = places.find((p) => p.id === placeId)
    if (!selectedPlace) {
      return setError('올바른 장소를 선택해주세요.')
    }

    // 3. 날짜 Validation
    const minDateStr = getMinDate()
    if (date > todayStr) {
      return setError('미래 날짜는 선택할 수 없습니다.')
    }
    if (minDateStr && date < minDateStr) {
      return setError('일반 회원은 최근 30일 이내의 기록만 등록할 수 있습니다.')
    }

    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
        setIsLoading(false)
        return
      }

      // run_logs 테이블에 기록 저장
      const { error: insertError } = await supabase.from('run_logs').insert({
        user_id: user.id,
        distance: distNum,
        place_id: selectedPlace.id,
        place_name: selectedPlace.name, // Soft Delete 대비 스냅샷 저장
        run_date: date,
        run_type: runType,
        is_pacing: isPacing,
      })

      if (insertError) {
        throw new Error(insertError.message)
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '기록 등록 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 거리 */}
      <div className="space-y-2">
        <Label htmlFor="distance" className="text-zinc-300 text-sm font-medium">
          러닝 거리 <span className="text-lime-400">* (3.0km 이상)</span>
        </Label>
        <div className="relative">
          <Input
            id="distance"
            type="number"
            step="0.1"
            placeholder="예: 5.0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="bg-zinc-900/60 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-lime-400 focus:ring-lime-450/20 rounded-xl h-12 pr-12"
            required
          />
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500 font-semibold text-sm">
            km
          </div>
        </div>
      </div>

      {/* 장소 */}
      <div className="space-y-2">
        <Label htmlFor="place" className="text-zinc-300 text-sm font-medium">
          러닝 장소 <span className="text-lime-400">*</span>
        </Label>
        <div className="relative">
          <select
            id="place"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-xl h-12 px-4 focus:border-lime-400 focus:outline-none appearance-none"
            required
          >
            <option value="" disabled className="bg-zinc-950 text-zinc-600">
              장소를 선택하세요
            </option>
            {places.map((place) => (
              <option key={place.id} value={place.id} className="bg-zinc-950">
                {place.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
            <MapPin className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 날짜 */}
      <div className="space-y-2">
        <Label htmlFor="date" className="text-zinc-300 text-sm font-medium">
          러닝 날짜 <span className="text-lime-400">*</span>
        </Label>
        <div className="relative">
          <Input
            id="date"
            type="date"
            max={todayStr}
            min={getMinDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-zinc-900/60 border-zinc-800 text-white focus:border-lime-400 focus:ring-lime-450/20 rounded-xl h-12 pr-10"
            required
          />
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 인증 종류 */}
      <div className="space-y-2">
        <Label className="text-zinc-300 text-sm font-medium">인증 종류</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRunType('PERSONAL')}
            className={`h-12 rounded-xl text-sm font-semibold transition-all duration-150 border flex items-center justify-center gap-2 ${
              runType === 'PERSONAL'
                ? 'bg-zinc-800 border-zinc-700 text-white shadow-lg'
                : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-800'
            }`}
          >
            {runType === 'PERSONAL' && <Check className="w-4 h-4 text-lime-400" />}
            개인 러닝 (PERSONAL)
          </button>
          <button
            type="button"
            onClick={() => setRunType('REGULAR')}
            className={`h-12 rounded-xl text-sm font-bold transition-all duration-150 border flex items-center justify-center gap-2 ${
              runType === 'REGULAR'
                ? 'bg-lime-400 border-lime-400 text-black shadow-lg shadow-lime-950/20'
                : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-800'
            }`}
          >
            {runType === 'REGULAR' && <Check className="w-4 h-4" />}
            크루 벙개 (REGULAR)
          </button>
        </div>
      </div>

      {/* 페이서 여부 (선택) */}
      <div className="flex items-center gap-3 py-2">
        <input
          id="pacing"
          type="checkbox"
          checked={isPacing}
          onChange={(e) => setIsPacing(e.target.checked)}
          className="w-5 h-5 rounded-lg border-zinc-800 bg-zinc-900 text-lime-400 focus:ring-lime-450/20 focus:ring-2 accent-lime-400 cursor-pointer"
        />
        <Label htmlFor="pacing" className="text-zinc-300 text-sm font-medium cursor-pointer select-none">
          당일 페이서(Pacer) 역할 수행 여부 (선택 🎈)
        </Label>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="text-red-400 text-sm text-center font-medium bg-red-950/30 border border-red-900/40 py-2.5 rounded-xl">
          {error}
        </p>
      )}

      {/* 제출 버튼 */}
      <Button
        id="record-submit-btn"
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-lime-400 hover:bg-lime-500 text-black font-extrabold rounded-xl transition-all duration-200 shadow-lg shadow-lime-950/30 disabled:opacity-70"
      >
        {isLoading ? '인증 등록 중...' : '인증 완료'}
      </Button>
    </form>
  )
}
