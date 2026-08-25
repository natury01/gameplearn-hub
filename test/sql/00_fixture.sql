-- ============================================================
-- 00_fixture.sql — จำลองสภาพฐานจริงของ Supabase บน Postgres เปล่า (สำหรับทดสอบเท่านั้น)
--
-- ทำไมต้องมี: ไฟล์ SQL ของโครงการนี้เคยพังบนฐานจริงทั้งที่รันผ่านบน PG เปล่า
-- (`ERROR: 42883: function crypt(text, text) does not exist` — เพราะ Supabase ติดตั้ง
--  ส่วนเสริมไว้ในสคีมา `extensions` ไม่ใช่ `public` แต่ไฟล์ประกาศ `search_path = public`)
-- ไฟล์นี้จึงจงใจวาง pgcrypto ไว้ที่ `extensions` เหมือนของจริง เพื่อให้บั๊กแบบนั้นโผล่ตอนทดสอบ
--
-- สิ่งที่จำลอง: auth.uid() · role anon/authenticated · RLS · is_admin() · ตารางหลัก
-- ============================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;   -- ← จงใจไม่ใช่ public

create schema if not exists auth;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

grant usage on schema public to anon, authenticated;
grant usage on schema extensions to anon, authenticated;
-- ของจริงบน Supabase role นี้เข้าถึงสคีมา auth ได้ (ไม่งั้น policy ที่เรียก auth.uid() จะพังทั้งระบบ)
grant usage on schema auth to anon, authenticated;

-- auth.uid() ของ Supabase อ่านจาก JWT · ที่นี่อ่านจากตัวแปร session ให้ตั้งค่าได้ตอนทดสอบ
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;

-- ---------- ตารางหลัก (เท่าที่ไฟล์ 59/60 แตะ) ----------
create table if not exists public.teachers (
  id uuid primary key, email text, display_name text, is_anonymous boolean default false,
  role text default 'teacher');   -- [V.1.6.26 · P37] ฐานจริงมีคอลัมน์นี้ — is_admin() อ่านจากมัน

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(), name text not null);

create table if not exists public.classrooms (
  id                uuid primary key default gen_random_uuid(),
  teacher_id        uuid references public.teachers(id),
  school_id         uuid references public.schools(id),
  name              text not null,
  grade             text,
  room_no           text,
  academic_year     text,
  join_key          text not null unique,
  listed            boolean not null default true,
  is_active         boolean not null default true,
  allow_self_add    boolean not null default false,
  join_pin_required boolean not null default false,
  created_at        timestamptz not null default now());

create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  classroom_id   uuid not null references public.classrooms(id) on delete cascade,
  student_number text, first_name text, last_name text, character_name text, join_pin text,
  is_active      boolean not null default true);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(), code text unique, name text, status text default 'published',
  -- [V.1.6.27 · F4] สองคอลัมน์นี้คือกลไกแยกภาคของ resolver จริง — fixture ต้องมีให้ครบ
  -- ไม่งั้นเทสต์พิสูจน์กับ resolver ปลอมแล้วเขียวหลอก (ผู้ตรวจหักล้าง 25 ส.ค. จับได้)
  score_code text, season_tag text);

create table if not exists public.classroom_games (
  classroom_id uuid references public.classrooms(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  is_enabled boolean not null default true,
  primary key (classroom_id, game_id));

create table if not exists public.student_game_progress (
  student_id uuid references public.students(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  progress_percent numeric, best_score numeric, attempts_count int default 0,
  primary key (student_id, game_id));

-- [V.1.6.26 · P37] เดิม fixture ใช้ตาราง app_admins ซึ่ง "ไม่มีจริงในฐาน production"
-- ของจริง (ครูรัน pg_get_functiondef ส่งมา 25 ส.ค. — `SCHEMA_กู้คืนจากฐานจริง\is_admin.sql`):
-- is_admin() อ่าน teachers.role = 'admin' · เทสต์ที่ต้องเป็นแอดมินให้ set role แทน insert ตารางอื่น
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teachers t where t.id = auth.uid() and t.role = 'admin')
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- RLS แบบเดียวกับของจริง: ครูเห็นเฉพาะห้องตัวเอง ----------
alter table public.classrooms enable row level security;
alter table public.students   enable row level security;
alter table public.schools    enable row level security;

drop policy if exists cls_own on public.classrooms;
create policy cls_own on public.classrooms for select to authenticated
  using (teacher_id = auth.uid() or public.is_admin());
drop policy if exists cls_ins on public.classrooms;
create policy cls_ins on public.classrooms for insert to authenticated
  with check (teacher_id = auth.uid());
drop policy if exists cls_upd on public.classrooms;
create policy cls_upd on public.classrooms for update to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists stu_own on public.students;
create policy stu_own on public.students for select to authenticated
  using (public.is_admin() or exists (select 1 from public.classrooms c
    where c.id = students.classroom_id and c.teacher_id = auth.uid()));

drop policy if exists sch_read on public.schools;
create policy sch_read on public.schools for select to anon, authenticated using (true);

grant select, insert, update on public.classrooms to authenticated;
grant select on public.students to authenticated;
grant select on public.schools to anon, authenticated;
grant select on public.games, public.classroom_games to anon, authenticated;

-- ตัวช่วยของไฟล์ 55 (ไฟล์ 59/60 ใช้ต่อ) — ฐานจริงมีแล้ว
create or replace function public.gp_owns_classroom(p_classroom uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classrooms c
    where c.id = p_classroom and (c.teacher_id = auth.uid() or public.is_admin()))
$$;


-- ============================================================
-- ส่วนต่อ: ชั้นวัดผล (ย่อจาก 08_ASSESSMENT_CORE.sql + 43_REPORT_CARDS.sql)
--   เอามาเท่าที่ไฟล์ 53/61 แตะจริง ๆ — ไม่ได้ลอกทั้งไฟล์
--   จุดประสงค์คือให้ rpc_publish_standards รันได้จริงและพิสูจน์พฤติกรรม ไม่ใช่จำลองทั้งระบบ
-- ============================================================

create table if not exists public.assessment_frameworks (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, kind text, name_th text, status text default 'active', level_scale jsonb);

create table if not exists public.framework_items (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references public.assessment_frameworks(id) on delete cascade,
  code text not null, parent_id uuid, depth int default 1, name_th text, sort_order int default 0,
  unique (framework_id, code));

create table if not exists public.game_framework_items (
  game_id uuid not null references public.games(id) on delete cascade,
  item_id uuid not null references public.framework_items(id) on delete cascade,
  weight numeric default 1.0, note text,
  primary key (game_id, item_id));

insert into public.assessment_frameworks (code, kind, name_th) values
  ('core-2551-rev2560','achievement','หลักสูตรแกนกลาง 2551 (ปรับปรุง 2560)'),
  ('cbe-core','competency','สมรรถนะหลัก 6 ด้าน')
on conflict (code) do nothing;

-- กลุ่มสาระระดับบน (ตัวชี้วัดจะถูกผูกใต้ตัวนี้)
insert into public.framework_items (framework_id, code, depth, name_th, sort_order)
select f.id, v.code, 1, v.nm, v.so from public.assessment_frameworks f,
  (values ('SO','สังคมศึกษา ศาสนาและวัฒนธรรม',4),('SC','วิทยาศาสตร์และเทคโนโลยี',3)) as v(code,nm,so)
 where f.code = 'core-2551-rev2560'
on conflict (framework_id, code) do nothing;

-- สมรรถนะหลัก 6 ด้าน (เว็บกลางไม่สร้างสมรรถนะใหม่ตามคำสั่งเกม — ต้องมีอยู่ก่อน)
insert into public.framework_items (framework_id, code, depth, name_th, sort_order)
select f.id, v.code, 1, v.nm, v.so from public.assessment_frameworks f,
  (values ('SM','การจัดการตนเอง',1),('HOT','การคิดขั้นสูง',2),('CM','การสื่อสาร',3),
          ('TW','การรวมพลังทำงานเป็นทีม',4),('CZ','การเป็นพลเมืองที่เข้มแข็ง',5),
          ('SN','การอยู่ร่วมกับธรรมชาติฯ',6)) as v(code,nm,so)
 where f.code = 'cbe-core'
on conflict (framework_id, code) do nothing;

-- จาก 43: แปลงรหัสสมรรถนะให้เป็นชุดกลาง (เกมภาค 1 ส่ง HT/NS มา)
create or replace function public.gp_comp_code(p text) returns text
language sql immutable as $$
  select case upper(btrim(coalesce(p,'')))
           when 'HT' then 'HOT' when 'NS' then 'SN'
           else upper(btrim(coalesce(p,''))) end
$$;

-- [V.1.6.27 · F4] gp_resolve_game = **ฉบับจริงจากฐาน คำต่อคำ** (SCHEMA_DUMP_2026-08-25.sql:1001)
-- เดิมเป็น mock จับคู่ code||'-p2' ตรง ๆ — คนละอัลกอริทึมกับของจริง (score_code/season_tag)
-- ⇒ เทสต์เคยพิสูจน์ผู้เรียกแต่ไม่เคยพิสูจน์ resolver (ผู้ตรวจหักล้าง 25 ส.ค. จับได้)
CREATE OR REPLACE FUNCTION public.gp_resolve_game(p_code text, p_version text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  v_id uuid;
  v_rows int;
begin
  -- "ตระกูล" ของรหัสนี้ = ทุกแถวที่รหัสแคตตาล็อกหรือรหัสส่งคะแนนตรงกัน
  -- ⚠️ ห้ามลัดด้วย "code ตรงเป๊ะชนะทันที" — ของกาญจนบุรี รหัสแคตตาล็อกของภาค 1
  --    เป็นรหัสส่งคะแนนของภาค 2 ด้วย ถ้าลัด ภาค 2 ที่ลืมป้ายภาคจะเขียนทับภาค 1 เงียบ ๆ
  select count(*) into v_rows from public.games
   where code = p_code or score_code = p_code;
  if v_rows = 0 then return null; end if;

  -- 1) รหัสนี้เป็นของเกมเดียว = ไม่มีอะไรให้สับสน (ส่งรุ่นมาหรือไม่ก็ได้)
  if v_rows = 1 then
    select id into v_id from public.games where code = p_code or score_code = p_code;
    return v_id;
  end if;

  -- 2) หลายภาคใช้รหัสร่วมกัน → ต้องมีรุ่นเสมอ ไม่งั้นบอกไม่ได้ว่าภาคไหน
  if coalesce(btrim(p_version), '') = '' then
    raise exception 'รหัส % ใช้ร่วมกัน % ภาค — ต้องส่ง game_version มาด้วยเพื่อระบุภาค (ภาคหลังต้องมีป้ายภาคในรุ่น เช่น -p2-)',
      p_code, v_rows;
  end if;

  -- 3) ป้ายภาคในรุ่นตรงกับแถวไหน แถวนั้นชนะ
  select id into v_id
  from public.games
  where (code = p_code or score_code = p_code)
    and season_tag is not null
    and p_version like '%' || season_tag || '%'
  limit 1;
  if v_id is not null then return v_id; end if;

  -- 4) รุ่นไม่มีป้ายภาค → ภาคฐาน (ภาค 1 ของกาญจนบุรีเป็นแบบนี้)
  select id into v_id
  from public.games
  where (code = p_code or score_code = p_code) and season_tag is null
  limit 1;
  if v_id is null then
    raise exception 'รหัส % ไม่มีภาคฐาน และรุ่น % ไม่ตรงป้ายภาคใดเลย — ตรวจ season_tag ในตาราง games',
      p_code, p_version;
  end if;
  return v_id;
end $function$;

-- ============================================================
-- [V.1.6.27 · F4 ทาง ก] ของที่ไฟล์ 85 (ท่อส่งผลทุกท่อ) ต้องใช้ — โครงตามฐานจริง
-- (คอลัมน์คัดจาก SCHEMA_DUMP_2026-08-25.sql เฉพาะที่ท่อเหล่านี้แตะ)
-- ============================================================

-- gp_level_of — ตัวตัดระดับสมรรถนะที่ rpc_submit_competency เรียก (ฉบับจริงจาก dump:933)
CREATE OR REPLACE FUNCTION public.gp_level_of(p_total numeric, p_eligible boolean, p_ctc numeric, p_stm numeric, p_crt numeric, p_prb numeric)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when p_total is null then null
    when p_total >= 80 then
      case when coalesce(p_eligible, false)
            and least(coalesce(p_ctc, -1), coalesce(p_stm, -1),
                      coalesce(p_crt, -1), coalesce(p_prb, -1)) >= 65
           then 6 else 5 end
    when p_total >= 65 then 5
    when p_total >= 50 then 4
    else 3
  end
$function$;

-- feedback — ท่อ rpc_submit_feedback (85 แก้ให้แยกภาคด้วย · ผู้ตรวจหักล้างพบว่าหลุดยาม)
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  kind text, message text, game_id uuid references public.games(id),
  name text, contact text, meta jsonb default '{}'::jsonb,
  created_at timestamptz default now());

-- ตารางของ fixture เดิมเป็นฉบับย่อ — เติมคอลัมน์ที่ท่อส่งจริง (85) ใช้ให้ครบตามฐานจริง
alter table public.students add column if not exists save_blob jsonb;
alter table public.students add column if not exists save_updated_at timestamptz;
alter table public.students add column if not exists collected_score numeric;
alter table public.students add column if not exists boss_score numeric;
alter table public.student_game_progress add column if not exists current_activity_id text;
alter table public.student_game_progress add column if not exists total_play_seconds integer not null default 0;
alter table public.student_game_progress add column if not exists summary_metrics jsonb not null default '{}'::jsonb;
alter table public.student_game_progress add column if not exists last_played_at timestamptz;
alter table public.student_game_progress add column if not exists updated_at timestamptz not null default now();

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  session_id text, attempt_no integer, is_first boolean, game_version text,
  started_at timestamptz, ended_at timestamptz, created_at timestamptz default now());

create table if not exists public.events (
  id bigint generated by default as identity primary key,
  attempt_id uuid references public.attempts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  stage_id text, kind text, question_id text, correct boolean,
  credit numeric, score numeric, raw jsonb, created_at timestamptz default now());

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  kind text not null, payload jsonb, dims jsonb, overall numeric,
  interpretation text, created_at timestamptz default now());

create table if not exists public.competency_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  run_id text, a numeric, b numeric, c numeric, d numeric, total numeric,
  ctc numeric, stm numeric, crt numeric, prb numeric, level integer,
  data_status text, research_eligible boolean, detail jsonb,
  computed_at timestamptz default now(), game_version text,
  unique (student_id, game_id, run_id));

create table if not exists public.student_item_scores (
  student_id uuid not null references public.students(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  item_id uuid not null references public.framework_items(id) on delete cascade,
  run_id text not null default 'live', score numeric, max_score numeric,
  level integer, level_label text, evidence jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  primary key (student_id, game_id, item_id, run_id));

-- _student_ok — คัดจากฐานจริงคำต่อคำ (ยามยืนยันตัวเด็กด้วย โค้ดห้อง+PIN)
create or replace function public._student_ok(p_student uuid, p_join_key text, p_pin text)
returns boolean language plpgsql stable security definer set search_path to 'public' as $$
declare v record;
begin
  select st.join_pin, c.join_pin_required into v
  from students st join classrooms c on c.id=st.classroom_id
  where st.id=p_student and upper(c.join_key)=upper(p_join_key) and c.is_active;
  if not found then return false; end if;
  if coalesce(v.join_pin_required,false) and coalesce(v.join_pin,'') <> '' then
    return v.join_pin = coalesce(p_pin,'');
  end if;
  return true;
end; $$;

-- auth.jwt() — ฐานจริงมีจาก Supabase · จำลองให้คืน {} (ไม่มีอีเมล)
-- ⚠️ ต้องมาก่อน _is_app_admin — ฟังก์ชัน sql ตรวจตัวที่อ้างถึงตั้งแต่ตอนสร้าง
create or replace function auth.jwt() returns jsonb
language sql stable as $$ select coalesce(nullif(current_setting('test.jwt', true), ''), '{}')::jsonb $$;

-- _is_app_admin + app_admins — ประตูผู้ดูแลชุดที่สองตามฐานจริง (rpc_kru_* ใช้)
create table if not exists public.app_admins (
  id uuid primary key default gen_random_uuid(), user_id uuid, email text,
  note text default '', created_at timestamptz default now());
create or replace function public._is_app_admin()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(
    select 1 from app_admins a
    where a.user_id = auth.uid()
       or (a.email is not null and lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;
grant execute on function public._is_app_admin() to anon, authenticated;


-- ============================================================
-- จาก 43_REPORT_CARDS.sql — ใบรายงานผล 2 ใบ (ยกโครงมาตรงตัว)
--
-- ยกมาเฉพาะส่วนที่ไฟล์ 64 ต้องใช้จริง: สองตาราง + ตัวช่วยสองตัว
-- **คัดลอกทีละอักษรจาก 43** โดยเฉพาะ check constraint ของ evidence และคีย์ unique
-- เพราะสองอย่างนี้คือกับดักที่ไฟล์ 64 ต้องดักให้ได้ (ของเดิมชนแล้วโยน error อังกฤษใส่ครู)
-- ============================================================

create table if not exists public.achievement_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_id    uuid not null references public.games(id) on delete cascade,
  run_id     text not null default 'live',
  game_version text,
  score numeric,
  max_score numeric,
  percent numeric,
  grade_label text,
  progress_percent numeric,
  unit_scores jsonb,
  criteria_note text,
  detail jsonb,
  computed_at timestamptz not null default now(),
  unique (student_id, game_id, run_id)
);

create table if not exists public.competency_dim_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_id    uuid not null references public.games(id) on delete cascade,
  run_id     text not null default 'live',
  comp_code  text not null,
  game_version text,
  score numeric,
  level integer,
  level_label text,
  sub_scores jsonb,
  evidence text not null default 'scored'
    check (evidence in ('scored','observed','self_report')),
  criteria_note text,
  detail jsonb,
  computed_at timestamptz not null default now(),
  decided_by   text not null default 'game',
  system_level integer,
  system_score numeric,
  unique (student_id, game_id, run_id, comp_code)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cdr_decided_by_chk') then
    alter table public.competency_dim_results
      add constraint cdr_decided_by_chk check (decided_by in ('game','teacher'));
  end if;
end $$;

create or replace function public.gp_level_label(p_level integer)
returns text language sql immutable as $$
  select case p_level
    when 3 then 'เริ่มต้น'
    when 4 then 'กำลังพัฒนา'
    when 5 then 'สามารถ'
    when 6 then 'เหนือความคาดหวัง'
    else null end
$$;

create or replace function public.gp_ts(p_text text)
returns timestamptz language plpgsql immutable as $$
begin
  return nullif(btrim(coalesce(p_text, '')), '')::timestamptz;
exception when others then
  return null;
end $$;


-- ============================================================
-- จาก 43_REPORT_CARDS.sql — view ใบรายงานผล (ยกมาตรงตัว)
-- ไฟล์ 72 อ่านจาก view พวกนี้ทั้งหมด จึงต้องมีของจริงในฐานจำลอง ไม่ใช่ตารางปลอม
-- ============================================================

drop view if exists public.v_student_achievement cascade;
create view public.v_student_achievement
with (security_invoker = on) as
select distinct on (ar.student_id, ar.game_id)
  ar.student_id, ar.game_id, ar.run_id, ar.game_version,
  g.code as game_code, g.name as game_name,
  s.classroom_id, s.student_number, s.first_name, s.last_name,
  ar.score, ar.max_score, ar.percent, ar.grade_label,
  ar.progress_percent, ar.unit_scores, ar.criteria_note,
  ar.computed_at,
  (ar.run_id = 'LEGACY-SHEETS') as is_legacy
from public.achievement_results ar
join public.students s on s.id = ar.student_id
join public.games g    on g.id = ar.game_id
order by ar.student_id, ar.game_id,
         (ar.run_id = 'LEGACY-SHEETS') asc, ar.computed_at desc;

drop view if exists public.v_student_comp_dims cascade;
create view public.v_student_comp_dims
with (security_invoker = on) as
select distinct on (r.student_id, r.game_id, r.comp_code)
  r.student_id, r.game_id, r.run_id, r.comp_code, r.game_version,
  g.code as game_code, g.name as game_name,
  s.classroom_id, s.student_number, s.first_name, s.last_name,
  r.score, r.level,
  coalesce(r.level_label, public.gp_level_label(r.level)) as level_label,
  r.sub_scores, r.evidence, r.decided_by, r.system_level, r.system_score,
  r.criteria_note, r.computed_at,
  (r.run_id = 'LEGACY-SHEETS') as is_legacy,
  fi.name as comp_name
from public.competency_dim_results r
join public.students s on s.id = r.student_id
join public.games g    on g.id = r.game_id
left join lateral (
  select i.name_th as name from public.framework_items i
  where i.code = r.comp_code and i.depth = 1
  limit 1) fi on true
order by r.student_id, r.game_id, r.comp_code,
         (r.run_id = 'LEGACY-SHEETS') asc, r.computed_at desc;

grant select on public.v_student_achievement, public.v_student_comp_dims to authenticated;
