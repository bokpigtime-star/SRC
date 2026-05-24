'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 공통 어드민 권한 체크 헬퍼
async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증 오류')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN') {
    throw new Error('권한이 없습니다.')
  }
  return supabase
}

// 1. 대기 사용자 승인
export async function approveUser(userId: string) {
  try {
    const supabase = await checkAdmin()
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'REGULAR' })
      .eq('id', userId)

    if (error) throw error
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 2. 회원 강퇴 (Soft Delete)
export async function kickUser(userId: string) {
  try {
    const supabase = await checkAdmin()
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)

    if (error) throw error
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 3. 페이서 지정/해제 (PACER <-> REGULAR)
export async function togglePacer(userId: string, currentRole: string) {
  try {
    const supabase = await checkAdmin()
    const newRole = currentRole === 'PACER' ? 'REGULAR' : 'PACER'
    
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) throw error
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 4. 면제 여부 지정 (NORMAL <-> EXEMPTED)
export async function toggleExemption(userId: string, currentExemption: string) {
  try {
    const supabase = await checkAdmin()
    const newExemption = currentExemption === 'EXEMPTED' ? 'NORMAL' : 'EXEMPTED'
    
    const { error } = await supabase
      .from('profiles')
      .update({ exemption: newExemption })
      .eq('id', userId)

    if (error) throw error
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 5. 러닝 장소 추가
export async function addPlace(name: string) {
  try {
    const supabase = await checkAdmin()
    if (!name.trim()) throw new Error('장소명을 입력해 주세요.')

    const { error } = await supabase
      .from('places')
      .insert({ name: name.trim() })

    if (error) throw error
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 6. 러닝 장소 삭제 (Soft Delete)
export async function deletePlace(placeId: string) {
  try {
    const supabase = await checkAdmin()
    const { error } = await supabase
      .from('places')
      .update({ is_active: false })
      .eq('id', placeId)

    if (error) throw error
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 7. 타 회원 러닝 로그 삭제
export async function deleteUserRunLog(logId: string) {
  try {
    const supabase = await checkAdmin()
    const { error } = await supabase
      .from('run_logs')
      .delete()
      .eq('id', logId)

    if (error) throw error
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 8. 타 회원 마라톤 PB 삭제
export async function deleteUserMarathonPb(pbId: string) {
  try {
    const supabase = await checkAdmin()
    const { error } = await supabase
      .from('marathon_pbs')
      .delete()
      .eq('id', pbId)

    if (error) throw error
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
