// ──────────────────────────────────────────────
// SRC 공통 타입 정의
// ──────────────────────────────────────────────

export type UserRole = 'WAITING' | 'REGULAR' | 'PACER' | 'ADMIN'
export type ExemptionStatus = 'NORMAL' | 'EXEMPTED'
export type RunType = 'PERSONAL' | 'REGULAR'
export type MarathonCategory = '10K' | 'HALF' | 'FULL'
export type GenderType = '남' | '여' | '기타'

export interface Profile {
  id: string
  kakao_id: string | null
  name: string
  birth_year: number | null
  gender: GenderType | null
  phone: string | null
  role: UserRole
  exemption: ExemptionStatus
  is_active: boolean
  is_profile_complete: boolean
  created_at: string
  updated_at: string
}

/** 프론트에서 '이름/년생/성별' 형식으로 조합하는 헬퍼 */
export function formatNickname(profile: Pick<Profile, 'name' | 'birth_year' | 'gender'>): string {
  const parts = [
    profile.name,
    profile.birth_year !== null ? String(profile.birth_year) : null,
    profile.gender,
  ].filter(Boolean)
  return parts.join('/')
}

export interface Place {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface RunLog {
  id: string
  user_id: string
  distance: number
  place_id: string | null
  place_name: string
  run_date: string  // ISO 날짜 문자열 (YYYY-MM-DD)
  run_type: RunType
  is_pacing: boolean
  created_at: string
  updated_at: string
}

export interface MarathonPb {
  id: string
  user_id: string
  category: MarathonCategory
  record_sec: number
  achieved_at: string | null
  created_at: string
  updated_at: string
}

/** 초(sec)를 'HH:MM:SS' 형식으로 변환 */
export function formatRecordTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}
