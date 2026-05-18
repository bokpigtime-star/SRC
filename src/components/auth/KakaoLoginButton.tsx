'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface KakaoLoginButtonProps {
  className?: string
}

export function KakaoLoginButton({ className }: KakaoLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleKakaoLogin = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'profile_nickname account_email', // 필요한 카카오 권한
      },
    })
    if (error) {
      console.error('카카오 로그인 오류:', error.message)
      setIsLoading(false)
    }
    // 성공 시 카카오 페이지로 리다이렉트되므로 setIsLoading 불필요
  }

  return (
    <Button
      id="kakao-login-btn"
      onClick={handleKakaoLogin}
      disabled={isLoading}
      className={`w-full h-12 bg-[#FEE500] hover:bg-[#F0D900] text-[#3C1E1E] font-semibold text-base rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg disabled:opacity-70 ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          연결 중...
        </span>
      ) : (
        <>
          {/* 카카오 로고 SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.72 1.636 5.106 4.124 6.537L5.1 21l4.65-2.977A11.9 11.9 0 0012 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
          </svg>
          카카오로 시작하기
        </>
      )}
    </Button>
  )
}
