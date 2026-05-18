'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Gender = '남' | '여' | '기타'

export default function ProfileSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // 프리뷰: '이름/년생/성별' 형식
  const preview =
    name || birthYear || gender
      ? `${name || '이름'}/${birthYear || '년생'}/${gender || '성별'}`
      : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!name.trim()) return setError('이름을 입력해주세요.')
    if (!birthYear || !/^\d{2}$/.test(birthYear))
      return setError('년생은 두 자리 숫자로 입력해주세요. (예: 94)')
    if (!gender) return setError('성별을 선택해주세요.')

    setIsLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('인증 정보를 찾을 수 없습니다. 다시 로그인해 주세요.')
      setIsLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        birth_year: parseInt(birthYear, 10),
        gender,
        is_profile_complete: true,
      })
      .eq('id', user.id)

    if (updateError) {
      setError('저장 중 오류가 발생했습니다. 다시 시도해 주세요.')
      setIsLoading(false)
      return
    }

    // 프로필 설정 완료 → WAITING이므로 승인 대기 페이지로
    router.push('/pending-approval')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 mb-4 shadow-xl shadow-orange-900/30">
            <span className="text-3xl">✍️</span>
          </div>
          <h1 className="text-xl font-bold text-white">프로필 설정</h1>
          <p className="text-zinc-400 text-sm mt-1">
            SRC 멤버 인증에 사용될 정보를 입력해주세요
          </p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">
                이름
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="예: 정혜유"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl h-11"
              />
            </div>

            {/* 년생 */}
            <div className="space-y-2">
              <Label htmlFor="birthYear" className="text-zinc-300 text-sm font-medium">
                년생 <span className="text-zinc-500 font-normal">(두 자리)</span>
              </Label>
              <Input
                id="birthYear"
                type="text"
                inputMode="numeric"
                placeholder="예: 94"
                value={birthYear}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                  setBirthYear(val)
                }}
                maxLength={2}
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl h-11"
              />
            </div>

            {/* 성별 */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm font-medium">성별</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['남', '여', '기타'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    id={`gender-${g}`}
                    onClick={() => setGender(g)}
                    className={`h-11 rounded-xl text-sm font-medium transition-all duration-150 border ${
                      gender === g
                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-900/30'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* 프리뷰 */}
            {preview && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 text-center">
                <p className="text-zinc-500 text-xs mb-1">앱에서 표시될 닉네임</p>
                <p className="text-white font-semibold text-base">{preview}</p>
              </div>
            )}

            {/* 에러 */}
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {/* 제출 버튼 */}
            <Button
              id="profile-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-900/30 disabled:opacity-70 mt-2"
            >
              {isLoading ? '저장 중...' : '완료'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
