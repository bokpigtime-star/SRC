-- ============================================================
-- SRC (수원러닝크루) - Seed Places Migration 005
-- ============================================================

INSERT INTO public.places (name)
SELECT v.name FROM (
  VALUES 
    ('광교호수공원'),
    ('만석공원'),
    ('서호공원'),
    ('신대저수지'),
    ('수원화성 성곽길'),
    ('수원종합운동장 트랙'),
    ('수원천'),
    ('효원공원')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.places WHERE places.name = v.name AND places.is_active = true
);
