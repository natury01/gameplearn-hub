-- ============================================================
-- 60_ROOM_CLAIM.sql — สร้างห้องเรียนได้ก่อนล็อกอิน แล้วค่อยผูกเข้าบัญชีทีหลัง
-- เกมเพลิน (GamePlearn) · 2026-08-12 · งานข้อ 4.3 ของ HANDOVER_2026-08-12
--
-- ครูเลือกทางนี้เอง: **สร้างเลย → เก็บกุญแจรับห้องไว้ในเครื่อง → ล็อกอินเมื่อไหร่ค่อยผูก**
-- เหตุผลของครู: ครูที่เพิ่งรู้จักเว็บนี้อยากลองสร้างห้องให้เด็กเล่นก่อน ไม่อยากสมัครอะไรตั้งแต่ยังไม่รู้ว่าดีไหม
--
-- วิธีทำงาน
--   1. `rpc_create_room_open`  — ใครก็เรียกได้ (แม้ยังไม่ล็อกอิน) สร้างห้อง teacher_id = null
--      คืน **กุญแจรับห้อง (claim token)** มาให้เก็บไว้ในเครื่องของครู
--   2. `rpc_room_by_claim`     — เอากุญแจมาแลกดูข้อมูลห้อง (ใช้ตอนยังไม่ล็อกอิน)
--   3. `rpc_claim_room`        — ล็อกอินแล้วเอากุญแจมาผูกห้องเข้าบัญชี · ผูกได้ครั้งเดียว กุญแจถูกลบทิ้ง
--
-- 🔒 ที่ยึดไว้
--   · ห้องที่ยังไม่มีเจ้าของ **มองไม่เห็นจาก RLS เดิม** อยู่แล้ว (policy เทียบ teacher_id = auth.uid()
--     ซึ่ง null ไม่เท่ากับอะไรเลย) — ไฟล์นี้ไม่คลาย policy ใด ๆ ทั้งสิ้น ทางเดียวที่เข้าถึงคือกุญแจ
--   · กุญแจมาจาก `gen_random_uuid()` สองก้อนต่อกัน (72 ตัวอักษร)
--     ⚠️ `gen_random_uuid()` เป็นฟังก์ชันแกนของ Postgres ตั้งแต่รุ่น 13 **ไม่ใช่ pgcrypto**
--        จึงไม่ติดปัญหา search_path เหมือนกรณี crypt() ที่เคยทำให้ v7993 ล้มทั้งไฟล์
--        และไม่ใช้ random() เพราะเดาลำดับได้ ส่วนนี้เป็นกุญแจเข้าของห้อง จะเดาได้ไม่ได้
--   · กุญแจ **หมดอายุใน 60 วัน** · ห้องที่หมดอายุแล้วยังไม่มีเจ้าของและไม่มีนักเรียน จะถูกเก็บกวาด
--     (ห้องที่มีนักเรียนแล้วไม่ถูกลบเด็ดขาด แม้กุญแจหมดอายุ — ข้อมูลเด็กห้ามหาย)
--
-- ⚠️ ความเสี่ยงที่ยังเหลืออยู่ ต้องรู้ไว้ ไม่ได้แก้หมดในไฟล์นี้
--   ใครก็ตามที่ถือ anon key (ซึ่งเปิดเผยอยู่ในหน้าเว็บ) สร้างห้องเปล่ารัว ๆ ได้
--   ไฟล์นี้กันด้วย 2 ชั้น: เพดานจำนวนห้องที่ยังไม่มีเจ้าของทั้งระบบ + เก็บกวาดห้องหมดอายุอัตโนมัติ
--   ซึ่ง **ไม่ใช่การกันสแปมที่แท้จริง** — การกันจริงต้องทำที่ชั้นขอบ (rate limit) ซึ่งอยู่นอกฐานข้อมูล
--   ถ้าวันหนึ่งเจอห้องเปล่าโผล่เป็นพัน ให้ดูที่นี่ก่อน แล้วค่อยพิจารณาปิด RPC ตัวนี้ชั่วคราว
--   (ปิดได้ด้วย: revoke execute on function public.rpc_create_room_open(...) from anon;)
--
-- ✅ ไม่ใช้ pgcrypto · idempotent รันซ้ำได้ · ไม่แก้ ไม่ลบของเดิม
-- ============================================================


-- ============================================================
-- PART 1 — ช่องเก็บกุญแจรับห้อง
-- ============================================================

alter table public.classrooms add column if not exists claim_token      text;
alter table public.classrooms add column if not exists claim_expires_at timestamptz;

comment on column public.classrooms.claim_token is
  'กุญแจรับห้องของห้องที่สร้างก่อนล็อกอิน — ผูกเข้าบัญชีแล้วต้องเป็น null เสมอ';

-- กุญแจต้องไม่ซ้ำ · ดัชนีคลุมเฉพาะแถวที่ยังถือกุญแจอยู่ ห้องที่ผูกแล้วไม่กินพื้นที่ดัชนี
create unique index if not exists classrooms_claim_token_uniq
  on public.classrooms (claim_token) where claim_token is not null;

create index if not exists classrooms_unclaimed_idx
  on public.classrooms (claim_expires_at) where teacher_id is null;


-- ============================================================
-- PART 2 — เก็บกวาดห้องร้าง
--   ลบเฉพาะห้องที่ครบทั้ง 3 ข้อ: ยังไม่มีเจ้าของ · กุญแจหมดอายุ · **ไม่มีนักเรียนสักคน**
--   ห้องที่มีเด็กเข้าไปแล้วไม่ถูกแตะ แม้ครูจะไม่เคยมาผูก — ข้อมูลเด็กห้ามหาย (กฎข้อ 1)
-- ============================================================

create or replace function public.gp_purge_unclaimed_rooms()
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_n integer;
begin
  with gone as (
    delete from public.classrooms c
     where c.teacher_id is null
       and c.claim_expires_at is not null
       and c.claim_expires_at < now()
       and not exists (select 1 from public.students s where s.classroom_id = c.id)
    returning 1)
  select count(*) into v_n from gone;
  return v_n;
end $$;

revoke all on function public.gp_purge_unclaimed_rooms() from public;


-- ============================================================
-- PART 3 — สร้างห้องโดยไม่ต้องล็อกอิน
--   ฟิลด์ชุดเดียวกับฟอร์มสร้างห้องปกติ (ระดับชั้น · ห้องที่ · โรงเรียน · ปีการศึกษา · วิธีเข้าห้อง)
--   ชื่อห้อง = "<ระดับชั้น>/<ห้องที่>" ตามรูปแบบที่ทั้งเกมและเว็บกลางใช้ร่วมกัน
--   โค้ดเข้าห้องสุ่มจากชุด 30 ตัวที่ตกลงกันไว้ (ไม่มี 0 1 I L O) ชนแล้วสุ่มใหม่
-- ============================================================

create or replace function public.rpc_create_room_open(
  p_grade         text,
  p_room_no       text default null,
  p_school_name   text default null,
  p_academic_year text default null,
  p_listed        boolean default true
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_grade  text := btrim(coalesce(p_grade, ''));
  v_no     text := nullif(btrim(coalesce(p_room_no, '')), '');
  v_school text := nullif(btrim(coalesce(p_school_name, '')), '');
  v_year   text := nullif(btrim(coalesce(p_academic_year, '')), '');
  v_sid    uuid;
  v_name   text;
  v_key    text;
  v_token  text;
  v_id     uuid;
  v_open   int;
  i        int;
begin
  if v_grade = '' then
    raise exception 'ต้องใส่ระดับชั้นก่อน เช่น ป.4';
  end if;
  if length(v_grade) > 20 or length(coalesce(v_no, '')) > 10
     or length(coalesce(v_school, '')) > 150 or length(coalesce(v_year, '')) > 10 then
    raise exception 'ข้อมูลยาวเกินกว่าที่ช่องนั้นรับได้';
  end if;

  perform public.gp_purge_unclaimed_rooms();   -- เก็บกวาดก่อน แล้วค่อยนับเพดาน

  select count(*) into v_open from public.classrooms where teacher_id is null and claim_token is not null;
  if v_open >= 2000 then
    raise exception 'ตอนนี้มีห้องที่ยังไม่ได้ผูกบัญชีค้างอยู่มากผิดปกติ — ผู้ดูแลระบบต้องตรวจก่อน (ดูหมายเหตุในไฟล์ 60)';
  end if;

  -- โรงเรียน: เทียบชื่อแบบไม่สนตัวพิมพ์และช่องว่างหัวท้าย กันสร้างซ้ำจนรายการโรงเรียนรก
  if v_school is not null then
    select s.id into v_sid from public.schools s
     where lower(btrim(s.name)) = lower(v_school) limit 1;
    if v_sid is null then
      insert into public.schools (name) values (v_school) returning id into v_sid;
    end if;
  end if;

  v_name := case when v_no is null then v_grade else v_grade || '/' || v_no end;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  for i in 1..8 loop
    v_key := '';
    for j in 1..6 loop
      v_key := v_key || substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                               1 + floor(random() * 30)::int, 1);
    end loop;
    begin
      insert into public.classrooms
        (teacher_id, school_id, name, grade, room_no, academic_year, join_key,
         listed, is_active, allow_self_add, join_pin_required, claim_token, claim_expires_at)
      values
        (null, v_sid, v_name, v_grade, v_no, v_year, v_key,
         coalesce(p_listed, true), true, false, false, v_token, now() + interval '60 days')
      returning id into v_id;
      exit;                                   -- สร้างสำเร็จ ออกจากวง
    exception when unique_violation then
      v_id := null;                           -- โค้ดชนกัน สุ่มใหม่ (กติกาเดียวกับหน้าเกม)
    end;
  end loop;

  if v_id is null then
    raise exception 'สุ่มโค้ดเข้าห้องไม่สำเร็จหลังลอง 8 ครั้ง — ลองใหม่อีกครั้ง';
  end if;

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'name', v_name, 'join_key', v_key,
    'claim_token', v_token, 'expires_at', now() + interval '60 days');
end $$;

revoke all on function public.rpc_create_room_open(text, text, text, text, boolean) from public;
grant execute on function public.rpc_create_room_open(text, text, text, text, boolean) to anon, authenticated;


-- ============================================================
-- PART 4 — เอากุญแจมาแลกดูข้อมูลห้อง (ยังไม่ต้องล็อกอิน)
--   ใช้ตอนครูกลับมาเปิดเว็บอีกครั้งแต่ยังไม่ได้ล็อกอิน — จะได้เห็นว่าห้องที่สร้างไว้ยังอยู่
--   คืนเฉพาะข้อมูลของห้องนั้นห้องเดียว และเฉพาะเมื่อกุญแจตรงเป๊ะ
-- ============================================================

create or replace function public.rpc_room_by_claim(p_token text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_c record;
begin
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'no_token');
  end if;
  select c.id, c.name, c.join_key, c.grade, c.room_no, c.academic_year, c.listed,
         c.claim_expires_at, c.teacher_id,
         (select count(*) from public.students s where s.classroom_id = c.id) as n_students
    into v_c
    from public.classrooms c
   where c.claim_token = btrim(p_token);

  if v_c.id is null then
    /* ไม่บอกแยกว่า "ไม่มีกุญแจนี้" กับ "ผูกไปแล้ว" — ตอบเหมือนกันเพื่อไม่ให้ใช้ไล่เดากุญแจได้ */
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_c.claim_expires_at is not null and v_c.claim_expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired', 'name', v_c.name);
  end if;

  return jsonb_build_object('ok', true, 'id', v_c.id, 'name', v_c.name,
    'join_key', v_c.join_key, 'grade', v_c.grade, 'room_no', v_c.room_no,
    'academic_year', v_c.academic_year, 'listed', v_c.listed,
    'students', v_c.n_students, 'expires_at', v_c.claim_expires_at);
end $$;

revoke all on function public.rpc_room_by_claim(text) from public;
grant execute on function public.rpc_room_by_claim(text) to anon, authenticated;


-- ============================================================
-- PART 5 — ผูกห้องเข้าบัญชี (ต้องล็อกอินแล้ว)
--   ผูกได้ครั้งเดียว · ผูกเสร็จกุญแจถูกลบทิ้งทันที ใครถือสำเนากุญแจไว้ก็ใช้ไม่ได้อีก
-- ============================================================

create or replace function public.rpc_claim_room(p_token text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c   record;
begin
  if v_uid is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนจึงจะผูกห้องเข้าบัญชีได้';
  end if;
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    raise exception 'ไม่มีกุญแจรับห้อง';
  end if;

  select c.id, c.name, c.teacher_id, c.claim_expires_at into v_c
    from public.classrooms c
   where c.claim_token = btrim(p_token)
     for update;

  if v_c.id is null then
    raise exception 'กุญแจรับห้องนี้ใช้ไม่ได้แล้ว — อาจถูกผูกเข้าบัญชีไปแล้ว หรือหมดอายุจนห้องถูกเก็บกวาดไป';
  end if;
  if v_c.teacher_id is not null then
    raise exception 'ห้องนี้มีเจ้าของแล้ว';
  end if;
  if v_c.claim_expires_at is not null and v_c.claim_expires_at < now() then
    raise exception 'กุญแจรับห้องหมดอายุแล้ว (เก็บไว้ได้ 60 วันนับจากวันสร้าง)';
  end if;

  /* กันกรณีบัญชีนี้ยังไม่มีแถวในทะเบียนครู — บางฐานตั้ง classrooms.teacher_id ให้อ้างถึง teachers
     ถ้าไม่มีแถวจะติด foreign key แล้วครูจะเจอ error ที่อ่านไม่รู้เรื่องทั้งที่ล็อกอินอยู่แท้ ๆ */
  insert into public.teachers (id, display_name)
  values (v_uid, 'ครู')
  on conflict (id) do nothing;

  update public.classrooms
     set teacher_id = v_uid, claim_token = null, claim_expires_at = null
   where id = v_c.id;

  return jsonb_build_object('ok', true, 'id', v_c.id, 'name', v_c.name);
end $$;

revoke all on function public.rpc_claim_room(text) from public;
grant execute on function public.rpc_claim_room(text) to authenticated;

notify pgrst, 'reload schema';


-- ============================================================
-- PART 6 — ตรวจผล
-- ============================================================

select 'คอลัมน์ claim_token' as รายการ,
       case when exists (select 1 from information_schema.columns
                          where table_schema='public' and table_name='classrooms' and column_name='claim_token')
            then '✅ มีแล้ว' else '❌ ไม่มี' end as ค่า
union all
select 'RPC rpc_create_room_open',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_create_room_open')
            then '✅ มีแล้ว' else '❌ ไม่มี' end
union all
select 'RPC rpc_claim_room',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_claim_room')
            then '✅ มีแล้ว' else '❌ ไม่มี' end
union all
select 'RPC rpc_room_by_claim',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_room_by_claim')
            then '✅ มีแล้ว' else '❌ ไม่มี' end
union all
select 'ห้องที่ยังไม่ได้ผูกบัญชีตอนนี้', count(*)::text
  from public.classrooms where teacher_id is null and claim_token is not null;

-- ► เก็บกวาดด้วยมือเมื่อไหร่ก็ได้:  select public.gp_purge_unclaimed_rooms();
-- ► ดูห้องที่ยังไม่มีเจ้าของ (ไม่โชว์กุญแจ):
--   select name, join_key, claim_expires_at from classrooms where teacher_id is null;

-- ============================================================
-- ROLLBACK
-- ============================================================
-- drop function if exists public.rpc_claim_room(text);
-- drop function if exists public.rpc_room_by_claim(text);
-- drop function if exists public.rpc_create_room_open(text, text, text, text, boolean);
-- drop function if exists public.gp_purge_unclaimed_rooms();
-- drop index if exists public.classrooms_unclaimed_idx;
-- drop index if exists public.classrooms_claim_token_uniq;
-- alter table public.classrooms drop column if exists claim_expires_at;
-- alter table public.classrooms drop column if exists claim_token;   -- ⚠️ ห้องที่ยังไม่ผูกจะผูกไม่ได้อีก
-- ============================================================
