-- ============================================================
-- SRC (수원러닝크루) - RLS Policies Migration 003
-- 프로필 누락 대비 RLS Insert 정책 추가
-- ============================================================

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid() 
    AND role = 'WAITING'::user_role 
    AND exemption = 'NORMAL'::exemption_status
  );
