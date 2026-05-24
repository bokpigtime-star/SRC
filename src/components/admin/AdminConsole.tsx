'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  approveUser,
  kickUser,
  togglePacer,
  toggleExemption,
  addPlace,
  deletePlace,
  deleteUserRunLog,
  deleteUserMarathonPb,
} from '@/app/dashboard/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  UserCheck,
  Users,
  MapPin,
  Shield,
  Award,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  Calendar,
  Trophy,
  Check,
} from 'lucide-react'
import { formatNickname, formatRecordTime } from '@/types'

interface Profile {
  id: string
  name: string
  birth_year: number | null
  gender: '남' | '여' | '기타' | null
  role: 'WAITING' | 'REGULAR' | 'PACER' | 'ADMIN'
  exemption: 'NORMAL' | 'EXEMPTED'
  phone: string | null
}

interface Place {
  id: string
  name: string
  is_active: boolean
}

interface AdminConsoleProps {
  waitingUsers: Profile[]
  activeUsers: Profile[]
  places: Place[]
}

export function AdminConsole({
  waitingUsers,
  activeUsers,
  places,
}: AdminConsoleProps) {
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'waiting' | 'members' | 'places'>('waiting')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [newPlaceName, setNewPlaceName] = useState('')
  const [placeError, setPlaceError] = useState('')

  // 상세 보기 유저 ID
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<{
    logs: any[]
    pbs: any[]
    loading: boolean
  }>({ logs: [], pbs: [], loading: false })

  // 특정 유저 정보(최근 기록, PB) 불러오기
  const loadUserDetails = async (userId: string) => {
    if (selectedUserId === userId) {
      setSelectedUserId(null)
      return
    }

    setSelectedUserId(userId)
    setUserDetails({ logs: [], pbs: [], loading: true })

    try {
      // 1. 최근 10개 러닝 로그 가져오기
      const { data: logs } = await supabase
        .from('run_logs')
        .select('*')
        .eq('user_id', userId)
        .order('run_date', { ascending: false })
        .limit(10)

      // 2. 마라톤 PB 가져오기
      const { data: pbs } = await supabase
        .from('marathon_pbs')
        .select('*')
        .eq('user_id', userId)

      setUserDetails({
        logs: logs || [],
        pbs: pbs || [],
        loading: false,
      })
    } catch (err) {
      console.error(err)
      setUserDetails({ logs: [], pbs: [], loading: false })
    }
  }

  // 액션 래퍼
  const handleAction = async (id: string, actionFn: () => Promise<any>) => {
    setLoadingId(id)
    const res = await actionFn()
    if (!res.success) {
      alert(`오류: ${res.error}`)
    }
    setLoadingId(null)
  }

  // 장소 추가 핸들러
  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault()
    setPlaceError('')
    if (!newPlaceName.trim()) return

    setLoadingId('add-place')
    const res = await addPlace(newPlaceName)
    setLoadingId(null)

    if (res.success) {
      setNewPlaceName('')
      router.refresh()
    } else {
      setPlaceError(res.error || '장소 추가 중 오류 발생')
    }
  }

  return (
    <div className="space-y-6">
      {/* 탭 헤더 */}
      <div className="flex gap-2 border-b border-zinc-800 pb-px">
        <button
          onClick={() => setActiveTab('waiting')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'waiting'
              ? 'border-lime-400 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          승인 대기 ({waitingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-lime-400 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Users className="w-4 h-4" />
          회원 관리 ({activeUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('places')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'places'
              ? 'border-lime-400 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MapPin className="w-4 h-4" />
          장소 관리 ({places.filter((p) => p.is_active).length})
        </button>
      </div>

      {/* 탭 본문 */}
      <div className="space-y-4">
        {/* 1. 승인 대기자 관리 */}
        {activeTab === 'waiting' && (
          <div className="space-y-4">
            {waitingUsers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-zinc-500 text-sm">
                승인 신청을 대기 중인 사용자가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {waitingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="text-white font-bold text-base">
                        {formatNickname(user)}
                      </h4>
                      {user.phone && (
                        <p className="text-zinc-500 text-xs">연락처: {user.phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Button
                        id={`approve-${user.id}-btn`}
                        onClick={() => handleAction(user.id, () => approveUser(user.id))}
                        disabled={loadingId === user.id}
                        className="bg-lime-400 hover:bg-lime-500 text-black text-xs font-bold px-4 py-2 rounded-xl h-9 flex items-center gap-1"
                      >
                        {loadingId === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        승인하기
                      </Button>
                      <Button
                        id={`reject-${user.id}-btn`}
                        onClick={() => {
                          if (confirm('신청을 거절하고 강퇴 처리하시겠습니까?')) {
                            handleAction(user.id, () => kickUser(user.id))
                          }
                        }}
                        disabled={loadingId === user.id}
                        className="bg-zinc-950 border border-zinc-800 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 text-zinc-500 text-xs px-3.5 py-2 rounded-xl h-9"
                      >
                        거절
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. 정회원 정보 관리 */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {activeUsers.map((user) => {
              const isPacer = user.role === 'PACER'
              const isExempted = user.exemption === 'EXEMPTED'
              const isExpanded = selectedUserId === user.id

              return (
                <div
                  key={user.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-200"
                >
                  {/* 요약 뷰 */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-base">
                          {formatNickname(user)}
                        </span>
                        {/* 배지들 */}
                        <div className="flex gap-1">
                          {user.role === 'ADMIN' && (
                            <span className="text-[10px] bg-red-950/60 border border-red-900/50 text-red-400 px-1.5 py-0.5 rounded font-bold">
                              운영자
                            </span>
                          )}
                          {isPacer && (
                            <span className="text-[10px] bg-yellow-950/60 border border-yellow-900/50 text-yellow-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              🎈 페이서
                            </span>
                          )}
                          {isExempted && (
                            <span className="text-[10px] bg-blue-950/60 border border-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                              활동 면제
                            </span>
                          )}
                        </div>
                      </div>
                      {user.phone && (
                        <p className="text-zinc-500 text-xs">연락처: {user.phone}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                      {user.role !== 'ADMIN' && (
                        <>
                          {/* 페이서 설정 */}
                          <Button
                            id={`pacer-${user.id}-btn`}
                            onClick={() => handleAction(user.id, () => togglePacer(user.id, user.role))}
                            disabled={loadingId === user.id}
                            className={`text-xs px-3 py-1.5 h-8 rounded-xl font-medium transition-all ${
                              isPacer
                                ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {isPacer ? '페이서 해제' : '페이서 임명 🎈'}
                          </Button>

                          {/* 면제 설정 */}
                          <Button
                            id={`exempt-${user.id}-btn`}
                            onClick={() => handleAction(user.id, () => toggleExemption(user.id, user.exemption))}
                            disabled={loadingId === user.id}
                            className={`text-xs px-3 py-1.5 h-8 rounded-xl font-medium transition-all ${
                              isExempted
                                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {isExempted ? '정상 복구' : '면제 처리 🩹'}
                          </Button>

                          {/* 강퇴 설정 */}
                          <Button
                            id={`kick-${user.id}-btn`}
                            onClick={() => {
                              if (confirm(`${user.name} 회원을 강퇴하시겠습니까?`)) {
                                handleAction(user.id, () => kickUser(user.id))
                              }
                            }}
                            disabled={loadingId === user.id}
                            className="bg-zinc-950 border border-zinc-800 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 text-zinc-500 text-xs px-3 h-8 rounded-xl"
                          >
                            강퇴
                          </Button>
                        </>
                      )}

                      {/* 확장 토글 버튼 */}
                      <button
                        onClick={() => loadUserDetails(user.id)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="활동 기록 보기"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 세부 정보 영역 (최근 기록 및 PB 제거 기능 포함) */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 bg-zinc-950/40 p-5 space-y-4">
                      {userDetails.loading ? (
                        <div className="flex items-center justify-center py-6 text-zinc-500 gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          기록 불러오는 중...
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* 최근 러닝 인증 목록 */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              최근 러닝 기록 (최대 10개)
                            </h5>
                            {userDetails.logs.length === 0 ? (
                              <p className="text-zinc-600 text-xs italic py-2">인증 기록이 없습니다.</p>
                            ) : (
                              <div className="divide-y divide-zinc-800/50">
                                {userDetails.logs.map((log) => (
                                  <div key={log.id} className="py-2 flex items-center justify-between text-sm">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-white">{Number(log.distance).toFixed(1)} km</span>
                                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1 rounded font-semibold">
                                          {log.run_type === 'REGULAR' ? '벙' : '개인'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-zinc-500">
                                        {log.run_date} • {log.place_name}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleAction(log.id, () => deleteUserRunLog(log.id))}
                                      className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-red-950/10 transition-colors"
                                      title="기록 강제 삭제"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 마라톤 PB 목록 */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                              <Trophy className="w-3.5 h-3.5" />
                              마라톤 PB 기록
                            </h5>
                            {userDetails.pbs.length === 0 ? (
                              <p className="text-zinc-600 text-xs italic py-2">등록된 PB 기록이 없습니다.</p>
                            ) : (
                              <div className="space-y-2">
                                {userDetails.pbs.map((pb) => (
                                  <div
                                    key={pb.id}
                                    className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-2.5 flex items-center justify-between text-sm"
                                  >
                                    <div>
                                      <span className="font-bold text-lime-400 text-xs mr-2">{pb.category}</span>
                                      <span className="font-black text-white">{formatRecordTime(pb.record_sec)}</span>
                                      {pb.achieved_at && (
                                        <p className="text-[10px] text-zinc-500 mt-0.5">달성일: {pb.achieved_at}</p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleAction(pb.id, () => deleteUserMarathonPb(pb.id))}
                                      className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-red-950/10 transition-colors"
                                      title="PB 강제 삭제"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 3. 러닝 장소 관리 */}
        {activeTab === 'places' && (
          <div className="space-y-6">
            {/* 장소 등록 폼 */}
            <form onSubmit={handleAddPlace} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="placeName" className="text-zinc-300 text-sm font-medium">새 러닝 장소 추가</Label>
                <div className="flex gap-2">
                  <Input
                    id="placeName"
                    type="text"
                    placeholder="예: 광교호수공원"
                    value={newPlaceName}
                    onChange={(e) => setNewPlaceName(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white rounded-xl h-11"
                  />
                  <Button
                    id="add-place-btn"
                    type="submit"
                    disabled={loadingId === 'add-place' || !newPlaceName.trim()}
                    className="bg-lime-400 hover:bg-lime-500 text-black rounded-xl h-11 px-4 font-bold flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    추가
                  </Button>
                </div>
              </div>
              {placeError && (
                <p className="text-red-400 text-xs font-semibold">{placeError}</p>
              )}
            </form>

            {/* 장소 리스트 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {places
                .filter((p) => p.is_active)
                .map((place) => (
                  <div
                    key={place.id}
                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl px-5 py-4 flex items-center justify-between"
                  >
                    <span className="text-white font-bold">{place.name}</span>
                    <Button
                      id={`delete-place-${place.id}-btn`}
                      onClick={() => {
                        if (confirm(`'${place.name}' 장소를 삭제하시겠습니까?`)) {
                          handleAction(place.id, () => deletePlace(place.id))
                        }
                      }}
                      disabled={loadingId === place.id}
                      className="bg-zinc-950 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/30 p-2 h-9 w-9 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
