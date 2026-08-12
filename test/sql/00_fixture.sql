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
  id uuid primary key, email text, display_name text, is_anonymous boolean default false);

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
  id uuid primary key default gen_random_uuid(), code text unique, name text, status text default 'published');

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

create table if not exists public.app_admins (user_id uuid primary key);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid())
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

-- จาก 43: หาเกมจากรหัส+รุ่น · ป้ายรุ่นที่มี -p2- คือภาค 2 (ใช้ score_code เดียวกันโดยตั้งใจ)
create or replace function public.gp_resolve_game(p_code text, p_version text)
returns uuid language sql stable security definer set search_path = public as $$
  select g.id from public.games g
   where g.code = case when p_version like '%-p2-%' then p_code || '-p2' else p_code end
   limit 1
$$;
