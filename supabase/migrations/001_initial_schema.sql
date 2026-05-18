-- ============================================================
-- SRC (수원러닝크루) - DB Schema Migration 001
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ENUM 타입 정의
-- ─────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('WAITING', 'REGULAR', 'PACER', 'ADMIN');
CREATE TYPE exemption_status AS ENUM ('NORMAL', 'EXEMPTED');
CREATE TYPE run_type AS ENUM ('PERSONAL', 'REGULAR');
CREATE TYPE marathon_category AS ENUM ('10K', 'HALF', 'FULL');
CREATE TYPE gender_type AS ENUM ('남', '여', '기타');

-- ─────────────────────────────────────────────────────────────
-- 1. profiles 테이블
--    Supabase auth.users 와 1:1 연결, 사용자 프로필 및 권한 관리
-- ─────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 카카오 고유 ID: 탈퇴 후 재가입 시 기존 데이터 복구에 사용
  kakao_id      TEXT UNIQUE,
  -- 닉네임 구성 요소 (프론트에서 '이름/년생/성별' 형식으로 조합)
  name          TEXT NOT NULL DEFAULT '',
  birth_year    SMALLINT,            -- 예: 94 (년도 마지막 2자리)
  gender        gender_type,
  -- 연락처: 민감 정보, ADMIN만 열람 (RLS 처리)
  phone         TEXT,
  -- 권한 및 상태
  role          user_role NOT NULL DEFAULT 'WAITING',
  exemption     exemption_status NOT NULL DEFAULT 'NORMAL',
  is_active     BOOLEAN NOT NULL DEFAULT true,  -- Soft Delete
  -- 프로필 설정 완료 여부 (최초 로그인 후 프로필 입력 페이지 분기용)
  is_profile_complete BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_profiles_kakao_id ON profiles (kakao_id);
CREATE INDEX idx_profiles_role ON profiles (role) WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────
-- 2. places 테이블
--    ADMIN이 관리하는 러닝 장소 목록
-- ─────────────────────────────────────────────────────────────

CREATE TABLE places (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,  -- Soft Delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. run_logs 테이블
--    러닝 인증 기록 (핵심 테이블)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE run_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 거리: 소수점 1자리, 최소 3.0km
  distance      NUMERIC(5,1) NOT NULL CHECK (distance >= 3.0),
  -- 장소: place_name은 스냅샷 저장 (장소 삭제 시에도 텍스트 보존)
  place_id      UUID REFERENCES places(id) ON DELETE SET NULL,
  place_name    TEXT NOT NULL,
  run_date      DATE NOT NULL,
  run_type      run_type NOT NULL,
  is_pacing     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 생존 계산 및 월별 조회 성능을 위한 인덱스
CREATE INDEX idx_run_logs_user_month ON run_logs (user_id, run_date DESC);
CREATE INDEX idx_run_logs_date ON run_logs (run_date DESC);

-- ─────────────────────────────────────────────────────────────
-- 4. marathon_pbs 테이블
--    마라톤 PB (10K / Half / Full)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE marathon_pbs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category     marathon_category NOT NULL,
  -- 기록은 초 단위로 저장. 표시는 앱 레이어에서 HH:MM:SS로 변환
  record_sec   INTEGER NOT NULL CHECK (record_sec > 0),
  achieved_at  DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 종목당 1개 레코드만 유지 (Upsert 사용)
  UNIQUE (user_id, category)
);

-- ─────────────────────────────────────────────────────────────
-- 5. updated_at 자동 갱신 트리거
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_run_logs_updated_at
  BEFORE UPDATE ON run_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_marathon_pbs_updated_at
  BEFORE UPDATE ON marathon_pbs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 6. 카카오 로그인 시 profiles 자동 생성 트리거
--    - 신규 가입: WAITING 상태로 레코드 삽입
--    - 재가입 (kakao_id 동일): is_active=true 복구, role은 WAITING으로 초기화
--      (기존 run_logs, marathon_pbs는 삭제되지 않으므로 자동 복구)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_kakao_id TEXT;
  v_existing_profile_id UUID;
BEGIN
  -- 카카오 provider_id 추출
  v_kakao_id := NEW.raw_user_meta_data->>'provider_id';

  -- 동일 kakao_id로 기존 비활성 프로필이 있는지 확인 (재가입 케이스)
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE kakao_id = v_kakao_id AND is_active = false
  LIMIT 1;

  IF v_existing_profile_id IS NOT NULL THEN
    -- 재가입: 기존 레코드의 auth.users id를 새 id로 업데이트하고 복구
    UPDATE public.profiles
    SET
      id        = NEW.id,
      is_active = true,
      role      = 'WAITING',
      exemption = 'NORMAL',
      updated_at = now()
    WHERE id = v_existing_profile_id;
  ELSE
    -- 신규 가입: 프로필 레코드 생성 (name은 빈 값, 프로필 설정 페이지에서 입력)
    INSERT INTO public.profiles (id, kakao_id, name, is_profile_complete)
    VALUES (
      NEW.id,
      v_kakao_id,
      '',    -- 프로필 설정 페이지에서 입력
      false
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
