'use client'

import { useState, useEffect } from 'react'
import { Monitor, Smartphone } from 'lucide-react'

export function DeviceFrame({ children }: { children: React.ReactNode }) {
  const [isFrameEnabled, setIsFrameEnabled] = useState(true)
  const [mounted, setMounted] = useState(false)

  // SSR과 Hydration 미스매치 방지
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('src-device-frame')
    if (saved !== null) {
      setIsFrameEnabled(saved === 'true')
    }
  }, [])

  const toggleFrame = (enabled: boolean) => {
    setIsFrameEnabled(enabled)
    localStorage.setItem('src-device-frame', String(enabled))
  }

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-950">{children}</div>
  }

  // 모바일 프레임 모드가 활성화되었을 때의 레이아웃
  if (isFrameEnabled) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col md:flex-row items-center justify-center p-0 md:p-6 select-none md:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] md:from-zinc-900 md:via-zinc-950 md:to-black overflow-x-hidden">
        {/* 데스크톱 안내 및 컨트롤 패널 */}
        <div className="hidden md:flex flex-col gap-4 fixed left-8 top-8 z-50 max-w-xs text-left bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-5 rounded-2xl shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] bg-lime-950 text-lime-400 border border-lime-900/50 px-2 py-0.5 rounded-full font-bold">
              SRC Simulator
            </span>
            <h2 className="text-base font-bold text-white mt-1.5">디바이스 시뮬레이터</h2>
            <p className="text-zinc-500 text-xs leading-relaxed">
              실제 모바일 크기(iPhone 13 Pro 규격)로 최적화된 화면입니다. 웹 브라우저 전체 화면으로 보시려면 아래 모드를 변경하세요.
            </p>
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-800">
            <button
              onClick={() => toggleFrame(true)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isFrameEnabled
                  ? 'bg-lime-400 text-black shadow-md shadow-lime-950/30'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              모바일 (기본)
            </button>
            <button
              onClick={() => toggleFrame(false)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                !isFrameEnabled
                  ? 'bg-lime-400 text-black shadow-md shadow-lime-950/30'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              풀스크린 웹
            </button>
          </div>
        </div>

        {/* 모바일 폰 목업 틀 (md 미만 화면에서는 완전히 사라짐) */}
        <div className="w-full h-screen md:h-auto md:w-[390px] md:aspect-[9/19.5] md:max-h-[844px] md:rounded-[48px] md:border-[12px] md:border-zinc-900 md:bg-zinc-950 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] md:relative md:flex md:flex-col md:overflow-hidden select-text border-zinc-900">
          
          {/* 노치 / 다이나믹 아일랜드 데코레이션 (데스크톱 프레임 모드에서만 표시) */}
          <div className="hidden md:block absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-zinc-900 rounded-full z-50 pointer-events-none" />

          {/* 모바일 프레임 강제 반응형 오버라이드 클래스 적용 */}
          <div className="w-full h-full flex flex-col force-mobile overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    )
  }

  // 모바일 프레임 모드가 비활성화되었을 때 (일반 전체 화면)
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white relative">
      {/* 다시 모바일 모드로 돌아가는 미니 플로팅 패널 */}
      <button
        onClick={() => toggleFrame(true)}
        className="hidden md:flex items-center gap-1.5 fixed right-6 top-6 z-50 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition-all shadow-lg"
      >
        <Smartphone className="w-4 h-4 text-lime-400" />
        모바일 모드로 보기
      </button>
      <div>{children}</div>
    </div>
  )
}
