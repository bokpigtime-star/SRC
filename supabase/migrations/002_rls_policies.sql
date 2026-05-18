-- ============================================================
-- SRC (수원러닝크루) - RLS Policies Migration 002
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 헬퍼 함수: 권한 확인
-- SECURITY DEFINER + STABLE: 쿼리당 1회 실행으로 성능 최적화
-- ─────────────────────────────────────────────────────────────

-- 현재 사용자의 role 반환 (비활성 유저는 null 반환)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = (SELECT auth.uid())
    AND is_active = true;
$$;

-- 현재 사용자가 특정 role 이상 권한을 가지는지 확인
CREATE OR REPLACE FUNCTION public.is_role_or_above(required_role user_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT CASE required_role
    WHEN 'WAITING'  THEN true
    WHEN 'REGULAR'  THEN public.get_my_role() IN ('REGULAR', 'PACER', 'ADMIN')
    WHEN 'PACER'    THEN public.get_my_role() IN ('PACER', 'ADMIN')
    WHEN 'ADMIN'    THEN public.get_my_role() = 'ADMIN'
    ELSE false
  END;
$$;

-- ─────────────────────────────────────────────────────────────
-- profiles 테이블 RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT
-- · 본인 프로필: 항상 조회 가능 (WAITING 포함, 로그인 상태 확인용)
-- · 타인 프로필: REGULAR 이상만 조회 가능
--   (단, phone 등 민감 정보는 앱 레이어에서 역할 기반 마스킹 처리)
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_select_others" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_role_or_above('REGULAR') AND is_active = true);

-- UPDATE (본인 기본정보 수정: name, birth_year, gender, phone, is_profile_complete)
-- ADMIN은 role, exemption, is_active 등 모든 컬럼 수정 가능
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_role_or_above('ADMIN'))
  WITH CHECK (public.is_role_or_above('ADMIN'));

-- INSERT: 트리거에서만 처리 (service_role 사용), 직접 삽입 불가
-- (트리거 함수는 SECURITY DEFINER이므로 별도 정책 불필요)

-- ─────────────────────────────────────────────────────────────
-- places 테이블 RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- SELECT: REGULAR 이상은 활성 장소만, ADMIN은 비활성 포함 전체
CREATE POLICY "places_select_active" ON public.places
  FOR SELECT TO authenticated
  USING (
    (is_active = true AND public.is_role_or_above('REGULAR'))
    OR public.is_role_or_above('ADMIN')
  );

-- INSERT: ADMIN만
CREATE POLICY "places_insert_admin" ON public.places
  FOR INSERT TO authenticated
  WITH CHECK (public.is_role_or_above('ADMIN'));

-- UPDATE: ADMIN만 (Soft Delete 포함)
CREATE POLICY "places_update_admin" ON public.places
  FOR UPDATE TO authenticated
  USING (public.is_role_or_above('ADMIN'))
  WITH CHECK (public.is_role_or_above('ADMIN'));

-- DELETE: 실제 Hard Delete는 허용하지 않음 (is_active=false 사용)
-- 만약의 실수를 막기 위해 ADMIN도 DELETE 금지 (UPDATE로 Soft Delete)
CREATE POLICY "places_no_delete" ON public.places
  FOR DELETE TO authenticated
  USING (false);

-- ─────────────────────────────────────────────────────────────
-- run_logs 테이블 RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.run_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: REGULAR 이상 전체 조회 (생존 대시보드, 랭킹 등)
CREATE POLICY "run_logs_select" ON public.run_logs
  FOR SELECT TO authenticated
  USING (public.is_role_or_above('REGULAR'));

-- INSERT: 본인 기록만, REGULAR 이상
CREATE POLICY "run_logs_insert" ON public.run_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_role_or_above('REGULAR')
  );

-- UPDATE: 본인 기록 또는 ADMIN
CREATE POLICY "run_logs_update" ON public.run_logs
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_role_or_above('ADMIN')
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_role_or_above('ADMIN')
  );

-- DELETE: 본인 기록 또는 ADMIN
CREATE POLICY "run_logs_delete" ON public.run_logs
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_role_or_above('ADMIN')
  );

-- ─────────────────────────────────────────────────────────────
-- marathon_pbs 테이블 RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.marathon_pbs ENABLE ROW LEVEL SECURITY;

-- SELECT: REGULAR 이상 전체 조회
CREATE POLICY "pbs_select" ON public.marathon_pbs
  FOR SELECT TO authenticated
  USING (public.is_role_or_above('REGULAR'));

-- INSERT: 본인 또는 ADMIN
CREATE POLICY "pbs_insert" ON public.marathon_pbs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_role_or_above('ADMIN')
  );

-- UPDATE: 본인 또는 ADMIN
CREATE POLICY "pbs_update" ON public.marathon_pbs
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_role_or_above('ADMIN')
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_role_or_above('ADMIN')
  );

-- DELETE: 본인 또는 ADMIN
CREATE POLICY "pbs_delete" ON public.marathon_pbs
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_role_or_above('ADMIN')
  );

-- ─────────────────────────────────────────────────────────────
-- 최초 ADMIN 설정 방법 (배포 후 Dashboard SQL Editor에서 실행)
-- 아래 SQL에서 'your-kakao-id@kakao.com' 부분을
-- 실제 카카오 로그인 후 Supabase Dashboard > Authentication > Users 에서
-- 확인한 사용자 ID(UUID)로 교체하여 실행하세요.
-- ─────────────────────────────────────────────────────────────
/*
UPDATE public.profiles
SET role = 'ADMIN'
WHERE id = '<여기에_본인_UUID_입력>';
*/
