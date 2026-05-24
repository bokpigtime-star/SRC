-- ============================================================
-- SRC (수원러닝크루) - RLS Policies Migration 004 (임시 디버깅용)
-- ============================================================

-- 임시로 profiles 테이블의 RLS 보안을 비활성화하여 저장이 통과되는지 확인합니다.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
