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

    try {
      console.log('1. 저장 시작 - 사용자 세션 가져오는 중...')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('2. 사용자 세션 결과:', user)
      
      if (!user) {
        setError('인증 정보를 찾을 수 없습니다. 다시 로그인해 주세요.')
        setIsLoading(false)
        return
      }

      console.log('3. 프로필 저장(Upsert) 실행 중...')
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: name.trim(),
          birth_year: parseInt(birthYear, 10),
          gender,
          is_profile_complete: true,
          role: 'WAITING',
          exemption: 'NORMAL',
          is_active: true,
        })
        .select()

      console.log('4. 프로필 저장 완료. 결과:', updateData, '에러:', updateError)

      if (updateError) {
        throw new Error(updateError.message)
      }

      console.log('5. 승인 대기 페이지로 라우팅 시도 (/pending-approval)')
      router.push('/pending-approval')
    } catch (err: any) {
      console.error('프로필 저장 에러:', err)
      setError(err.message || '저장 중 오류가 발생했습니다. 다시 시도해 주세요.')
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lime-400 text-black mb-4 shadow-xl shadow-lime-950/35">
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
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-lime-400 focus:ring-lime-400/20 rounded-xl h-11"
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
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-lime-400 focus:ring-lime-400/20 rounded-xl h-11"
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
                    className={`h-11 rounded-xl text-sm font-bold transition-all duration-150 border ${
                      gender === g
                        ? 'bg-lime-400 border-lime-400 text-black shadow-lg shadow-lime-950/20'
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
              className="w-full h-12 bg-lime-400 hover:bg-lime-500 text-black font-extrabold rounded-xl transition-all duration-200 shadow-lg shadow-lime-950/30 disabled:opacity-70 mt-2"
            >
              {isLoading ? '저장 중...' : '완료'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
