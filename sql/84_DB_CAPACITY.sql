-- ============================================================
-- DB_CAPACITY — ตรวจความจุฐานข้อมูลเองได้จากหน้าเว็บ (ตาราง 1 + RPC 2)
-- เกมเพลิน (GamePlearn) · 23 ส.ค. 2569
-- ร่างโดยแชต [PLAN] วางแผน/ตรวจสอบ · ยังไม่ใช่ของที่พร้อมรัน
--
-- 🔴 ไฟล์นี้ "ยังไม่มีเลขประจำไฟล์"
--    เลข 00–89 เป็นของแชตเว็บกลาง — ต้องได้เลขจริงก่อนจึงรันได้
--    ฉบับก่อนหน้าตั้งเลขเอาเองเป็น 60 ซึ่ง **ชนกับ 60_ROOM_CLAIM.sql ที่รันไปแล้ว**
--    (อยู่ใน SQL_ครูต้องรัน_2026-08-19\07_60_ROOM_CLAIM.sql)
--    เลขที่ใช้ไปแล้วบนดิสก์: 52 · 59 · 60 · 61 · 64 · 66 · 71 · 72 · 82 · 83
--    ⇒ เลขว่างถัดไปที่เห็นจากของจริงคือ 84 (ให้เจ้าของบล็อกเป็นผู้ยืนยัน)
--
--    ยามกันรันผิดอยู่ท้ายหัวไฟล์นี้ — คัดลอกไปวางแล้วกด Run เฉย ๆ จะไม่มีอะไรเกิดขึ้น
--    (บทเรียน "เกมผี" จาก 17_ADD_NEW_GAME.sql · กติกาใน 23_WHAT_IS_LOCKED.md:
--     "ไฟล์ SQL ที่มีส่วนต้องแก้ก่อนรัน ต้องมีตัวกัน ไม่ใช่แค่คอมเมนต์")
--
-- ── ที่มา ───────────────────────────────────────────────────
-- ครูถาม: "ถ้าเผยแพร่แล้วคนเยอะ ระบบจะไหวไหม"
-- คำตอบวัดได้ครั้งเดียวเมื่อ 23 ส.ค. (94_PRELAUNCH_CAPACITY.md) ว่าเพดานแผนฟรี ~400 คน
-- ไฟล์นี้ทำให้คำตอบนั้น **ดูสดได้ทุกเมื่อ** ไม่ต้องรัน SQL แล้วคัดลอกผลมาวางในแชตอีก
-- (20_MULTI_CHAT_WORKFLOW.md เขียนว่า "Claude อ่าน Supabase ตรง ๆ ไม่ได้" — แก้ด้วยการ
--  ให้เว็บของเราเองอ่านแล้วแสดงผล ไม่ใช่ให้ Claude อ่านฐาน)
--
-- ── สิ่งที่ไฟล์นี้ทำ ────────────────────────────────────────
--   · ตาราง public.platform_limits  — โควตาของแผนที่ใช้อยู่ (แถวเดียว) เปลี่ยนได้จากหน้าเว็บ
--   · rpc_db_capacity()             — คืนตัวเลขความจุสด ๆ เป็น jsonb ก้อนเดียว
--   · rpc_set_platform_plan(...)    — เปลี่ยนแผน แล้วคืนชุดตัวเลขใหม่ในคำขอเดียว
--
-- ── สิ่งที่ไฟล์นี้ "ไม่" ทำ ─────────────────────────────────
--   · ไม่อ่านข้อมูลนักเรียนรายคนแม้แต่แถวเดียว — อ่านแต่ "ขนาด" กับ "จำนวน"
--   · ไม่ DROP / ไม่ RENAME / ไม่แก้ข้อมูลเดิม (กฎล็อกข้อ 7)
--   · ไม่แตะตาราง events, students, attempts เลย
--
-- ── ข้อควรรู้เรื่องสคีมา ────────────────────────────────────
-- ⚠️ สคีมาของตาราง public.events **ไม่มีอยู่ในไฟล์ SQL ชุดใดบนดิสก์**
--    (ตรวจแล้วทั้ง sql/ ของเว็บกลาง · SQL_ครูต้องรัน_ · supabase_patch_all_v7995.sql)
--    ไฟล์นี้จึง **ไม่เดาชื่อคอลัมน์เวลา** แต่ให้ RPC ค้นจาก information_schema ตอนรัน
--    ถ้าหาไม่เจอ ช่อง "อัตราการโต" จะคืน null และหน้าเว็บแสดง "—" พร้อมเหตุผล
--    ไม่ใช่แสดง 0 ซึ่งอ่านแล้วเข้าใจผิดว่า "ไม่โตเลย"
--
-- idempotent รันซ้ำได้ · ไม่แตะข้อมูลที่มีอยู่ · มีวิธีถอยท้ายไฟล์
-- ⚠️ ต้องมี is_admin() อยู่ในฐานก่อน — **แต่ฟังก์ชันนี้ไม่มีไฟล์ติดตั้งบนดิสก์เลย**
--    ตรวจแล้ว 25 ส.ค. 2569 ICT: ไล่ไฟล์ .sql ทุกไฟล์บนดิสก์ + ในซิปทุกตัว
--    พบนิยาม create function is_admin() ที่เดียวคือ test/sql/00_fixture.sql
--    ซึ่งเป็น "ของจำลองสำหรับเทสต์" ไม่ใช่ตัวจริง
--    (ร่างเดิมเขียนว่า "ต้องรัน 15_SITE_PAGES.sql ที่สร้าง is_admin()" — **ไม่จริง**
--     03_15_SITE_PAGES.sql:13 เขียนเองว่ามันเป็นผู้ *ใช้* และชี้ไป 01_DATABASE_CORE
--     ซึ่งก็แค่ใช้เหมือนกัน · 82_REPORT_SENDER_PROOF.sql:33 ก็เขียนผิดแบบเดียวกัน)
--    ⇒ ตัวจริงอยู่แต่ในฐาน production — ตระกูลเดียวกับ PENDING P16 (ตาราง events)
--    บนฐานจริงมีอยู่แล้วแน่นอน เพราะไฟล์ 52 · 61 · 66 · 71 · 82 ใช้มันอยู่ทุกวัน
-- ============================================================


-- ============================================================
-- ⚠️ ทั้งไฟล์อยู่ใน transaction เดียว — begin ที่นี่ · commit ที่ท้ายไฟล์
--
-- ทำไมต้องมี (พิสูจน์ด้วยการทดลองจริง 23 ส.ค. บน PostgreSQL 16):
--   ยามข้างล่างใช้ raise exception ซึ่งหยุดได้จริง**เฉพาะเมื่อเครื่องมือหยุดเมื่อเจอ error**
--   Supabase SQL Editor หยุดให้ · แต่ psql ที่ไม่ได้ตั้ง ON_ERROR_STOP **ไม่หยุด**
--   มันข้ามคำสั่งที่ล้มแล้วรันต่อ ⇒ ยามขึ้นแดงสวยงามแต่ของถูกสร้างครบทุกชิ้น
--   (ทดสอบแล้ว: error 7 บรรทัด แต่ตาราง platform_limits ถูกสร้างจริง)
--
--   ห่อด้วย transaction แล้วรูนั้นปิดสนิท เพราะเมื่อ transaction ถูก abort
--   คำสั่งที่เหลือจะถูกปฏิเสธทั้งหมดโดยอัตโนมัติ และ commit กลายเป็น rollback
--   ⇒ "ล้ม = ไม่มีอะไรเกิดขึ้นเลย" ในทุกเครื่องมือ ไม่ใช่แค่บางเครื่องมือ
--
--   นี่คือรูปแบบเดียวกับบทเรียน "เกมผี" — คอมเมนต์เตือนไม่พอ ต้องมีตัวกันที่ทำงานจริง
--   ต่างกันตรงที่รอบนี้ตัวกันเองก็เกือบไม่พอ ถ้าไม่ได้ลองรันดู
-- ============================================================
begin;


-- ============================================================
-- ยาม 1 — เลขประจำไฟล์ (ต้องแก้ก่อนถึงจะรันได้)
--
-- แก้ค่า v_file_number ข้างล่างเป็นเลข 2 หลักที่ "จองแล้วจริง" จากเจ้าของบล็อก 00–89
-- แล้วเปลี่ยนชื่อไฟล์เป็น <เลข>_DB_CAPACITY.sql ให้ตรงกัน
-- ============================================================
do $numguard$
declare
  v_file_number text := '84';   -- จองแล้ว 25 ส.ค. 2569 ICT โดย Claude Code (ตรวจแล้วว่า 84 ว่างจริงทั้ง sql/ · SQL_ครูต้องรัน_ · ซิปรุ่นเก่า)
begin
  if v_file_number !~ '^[0-9]{2}$' then
    raise exception E'ไฟล์นี้ยังไม่ได้เลขประจำไฟล์ จึงยังรันไม่ได้\n'
      '  1. ขอเลขว่างจากเจ้าของบล็อก 00–89 (แชตเว็บกลาง) — จากของจริงบนดิสก์ เลขว่างถัดไปคือ 84\n'
      '  2. แก้บรรทัด v_file_number ในยามนี้เป็นเลขนั้น\n'
      '  3. เปลี่ยนชื่อไฟล์เป็น <เลข>_DB_CAPACITY.sql ให้ตรงกัน\n'
      'เหตุผลที่ต้องมียามนี้: ฉบับก่อนตั้งเลขเอาเองเป็น 60 ซึ่งชนกับ 60_ROOM_CLAIM.sql ที่รันไปแล้ว';
  end if;
end
$numguard$;


-- ============================================================
-- ยาม 2 — ของที่ต้องมีอยู่ก่อน
-- ============================================================
do $guard$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception E'ยังไม่มี is_admin() ในฐานนี้ — ฟังก์ชันนี้ไม่มีไฟล์ติดตั้งบนดิสก์\n'
      'ถ้าเจอข้อความนี้แปลว่ากำลังรันบนฐานที่ไม่ใช่ฐานจริงของระบบ\n'
      '(ฐานจริงมี is_admin() อยู่แล้ว เพราะไฟล์ 52 · 61 · 66 · 71 · 82 ใช้มันอยู่)';
  end if;

  if to_regclass('public.events') is null then
    raise exception E'ยังไม่มีตาราง public.events — ไฟล์นี้ตรวจความจุจากตารางนั้นเป็นหลัก';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'events' and column_name = 'raw'
  ) then
    raise exception E'ตาราง public.events ไม่มีคอลัมน์ raw\n'
      'สัดส่วน raw คือหนึ่งในตัวเลขหลักของหน้านี้ (43.7%% ของตารางเมื่อ 23 ส.ค.)\n'
      'ถ้าคอลัมน์ถูกเปลี่ยนชื่อจริง ให้แก้ไฟล์นี้ตามชื่อใหม่ก่อนรัน';
  end if;
end
$guard$;


-- ============================================================
-- PART 1 — ตารางโควตาของแผนที่ใช้อยู่
--
-- ทำไมต้องเก็บในตาราง ไม่ฝังในโค้ด:
--   แผนที่ Supabase คิดเงินจริง **อ่านจากในฐานข้อมูลไม่ได้** (ต้องใช้ Management API)
--   หน้านี้จึงให้ผู้ดูแลเป็นคน "บอก" ว่าอยู่แผนไหน แล้วคำนวณเพดานจากค่านั้น
--   เก็บในตาราง = เปลี่ยนแผนแล้วเห็นผลทันทีโดยไม่ต้องออกรุ่นเว็บใหม่
-- ============================================================
create table if not exists public.platform_limits (
  id                    smallint primary key default 1 check (id = 1),
  plan_name             text        not null default 'free',
  db_quota_bytes        bigint      not null default 524288000,      -- 500 MB
  egress_quota_bytes    bigint      not null default 5368709120,     -- 5 GB
  storage_quota_bytes   bigint      not null default 1073741824,     -- 1 GB (โควตาคนละก้อนกับ DB)
  events_per_player     integer     not null default 1578,           -- ดู 94 หัวข้อ 3
  note                  text,
  updated_at            timestamptz not null default now(),
  updated_by            text
);

comment on table  public.platform_limits is
  'โควตาของแผน Supabase ที่ใช้อยู่ — แถวเดียว (id=1) · แก้ผ่าน rpc_set_platform_plan()';
comment on column public.platform_limits.events_per_player is
  'events ต่อผู้เล่นจริง 1 คน · ค่า 1578 มาจากการเทียบสองจุดเวลา (94 หัวข้อ 3) '
  'ไม่ใช่ค่าเฉลี่ยรวม 1106 ซึ่งถูกบัญชีทดสอบเจือจางลง';

-- แถวตั้งต้น = แผนฟรี · on conflict do nothing = รันซ้ำไม่ทับค่าที่ครูตั้งไว้แล้ว
insert into public.platform_limits (id, plan_name, note)
values (1, 'free', 'ค่าตั้งต้นจากไฟล์ติดตั้ง — เปลี่ยนได้จากหน้าตรวจความจุ')
on conflict (id) do nothing;

alter table public.platform_limits enable row level security;

drop policy if exists platform_limits_admin_read  on public.platform_limits;
drop policy if exists platform_limits_admin_write on public.platform_limits;

create policy platform_limits_admin_read on public.platform_limits
  for select to authenticated using (public.is_admin());
create policy platform_limits_admin_write on public.platform_limits
  for update to authenticated using (public.is_admin()) with check (public.is_admin());


-- ============================================================
-- PART 2 — rpc_db_capacity() : คืนตัวเลขความจุสด ๆ
--
-- คืน jsonb ก้อนเดียว หน้าเว็บวาดจากก้อนนี้ล้วน ๆ ไม่ต้องยิงซ้ำหลายคำขอ
--
-- ⚠️ หลักที่ยึดตลอดฟังก์ชันนี้: **วัดไม่ได้ให้คืน null อย่าคืน 0**
--    0 กับ "วัดไม่ได้" อ่านแล้วคนละเรื่องกัน และ 0 ทำให้คนสบายใจผิด ๆ
--    (บทเรียนเดียวกับตารางสถิติรายวันที่ต้องเติมวันที่ไม่มีคนเข้าเป็น 0
--     ไม่ใช่ข้ามแถว — คนละทิศแต่เหตุผลเดียวกัน คือห้ามให้ช่องว่างแปลความเอง)
-- ============================================================
create or replace function public.rpc_db_capacity()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_lim         public.platform_limits%rowtype;
  v_db_bytes    bigint  := null;
  v_db_source   text    := 'measured';
  v_ev_bytes    bigint;
  v_ev_rows     bigint;
  v_bpe         numeric := null;
  v_raw_avg     numeric := null;
  v_raw_pct     numeric := null;
  v_students    bigint  := null;
  v_attempts    bigint  := null;
  v_other       bigint;
  v_budget      bigint;
  v_bytes_pp    numeric := null;
  -- [แก้ 25 ส.ค.] integer → bigint · ทดลองจริงแล้ว: โควตา 9 TB ทำให้ RPC ตาย
  -- ด้วย ERROR: integer out of range ซึ่ง**กดจากช่องกรอกในหน้าเว็บได้จริง**
  -- และครูจะเห็นข้อความอังกฤษเต็มจอโดยไม่รู้ว่าเพราะอะไร
  v_ceiling     bigint := null;
  v_tables      jsonb;
  v_idx_unused  jsonb;
  v_bloat       jsonb;
  v_tscol       text    := null;
  v_per_day     numeric := null;
  v_days_left   bigint := null;
  v_stats_reset timestamptz;
begin
  ------------------------------------------------------------
  -- ด่านสิทธิ์ — ต้องเป็นบรรทัดแรกเสมอ
  ------------------------------------------------------------
  if not public.is_admin() then
    raise exception E'หน้านี้เปิดได้เฉพาะผู้ดูแลระบบ';
  end if;

  -- [แก้ 25 ส.ค.] ยามตอน "เรียก" — ของเดิมมียามเฉพาะตอน "ติดตั้ง" (บล็อกยามหัวไฟล์)
  --   ทดลองจริง: drop ตาราง events แล้วเรียก RPC ⇒ ได้ข้อความ PostgreSQL ภาษาอังกฤษ
  --   พร้อมชื่อตารางและตัวคำสั่ง SQL ไปโผล่บนจอครูตรง ๆ ผ่าน gp-core.js
  --   ขัดกฎเหล็ก "error ขึ้นจอครูได้เฉพาะ reason · detail ห้ามขึ้นจอ"
  if to_regclass('public.events') is null then
    raise exception E'อ่านความจุไม่ได้ — ไม่พบตาราง events ในฐานข้อมูลนี้';
  end if;

  select * into v_lim from public.platform_limits where id = 1;
  if not found then
    raise exception E'ยังไม่มีแถวโควตาใน platform_limits — รันไฟล์ติดตั้งนี้ซ้ำอีกครั้ง';
  end if;

  ------------------------------------------------------------
  -- ขนาดฐานข้อมูลรวม
  -- ถ้าสิทธิ์ไม่พอ ให้ถอยไปใช้สมมติฐาน 50 MB ที่เอกสาร 94 ใช้กันงบไว้
  -- แล้ว **บอกตรง ๆ** ว่าเป็นค่าสมมติ ไม่ใช่ค่าที่วัดได้
  ------------------------------------------------------------
  begin
    v_db_bytes := pg_database_size(current_database());
  exception when insufficient_privilege then
    v_db_bytes := null;
  end;

  v_ev_bytes := coalesce(pg_total_relation_size('public.events'), 0);
  -- [แก้ 25 ส.ค.] เดิม count(*) ทั้งตาราง — วัดจริงบนตาราง 620,000 แถว/207 MB
  --   ใช้เวลา 0.75-1.55 วิ และอ่าน ~194 MB ต่อการเรียกหนึ่งครั้ง
  --   ขัดกับเหตุผลที่ไฟล์นี้เขียนไว้เองว่า "เครื่อง Nano มี RAM 0.5 GB และหน้านี้ถูกเปิดบ่อย"
  --   (และ rpc_set_platform_plan เรียก rpc_db_capacity() ซ้ำ ⇒ กดบันทึกครั้งเดียว = สแกนสองรอบ)
  --   เปลี่ยนเป็นค่าประมาณจากสถิติ ให้เข้าชุดกับ est_rows ที่ไฟล์นี้ใช้อยู่แล้วในตารางรายตาราง
  select coalesce(reltuples, 0)::bigint into v_ev_rows
    from pg_class where oid = 'public.events'::regclass;
  if v_ev_rows < 0 then v_ev_rows := 0; end if;

  if v_ev_rows > 0 then
    -- [แก้ 25 ส.ค.] เพิ่มเงื่อนไข v_ev_bytes > 0
    --   ทดลองจริงบน PG16: ถ้า public.events เป็น partitioned table (relkind='p')
    --   pg_total_relation_size คืน 0 ⇒ เดิมได้ v_bpe = 0.0 **ไม่ใช่ null**
    --   แล้วหน้าเว็บโชว์ "ไบต์ต่อ 1 event = 0" ใต้คำว่า "ตัวเลขที่กำหนดเพดานทั้งหมด"
    --   ขัดกับหลักที่ไฟล์นี้ประกาศไว้เอง: "วัดไม่ได้ให้คืน null อย่าคืน 0"
    if v_ev_bytes > 0 then
      v_bpe := round(v_ev_bytes::numeric / v_ev_rows, 1);
    end if;
  end if;

  ------------------------------------------------------------
  -- ขนาดเฉลี่ยของ raw — สุ่มตัวอย่าง ไม่สแกนทั้งตาราง
  -- เหตุผล: เครื่อง Nano มี RAM 0.5 GB และหน้านี้ถูกเปิดบ่อย
  --         การอ่าน jsonb ทุกแถวเพื่อโชว์ตัวเลขเดียวไม่คุ้ม
  ------------------------------------------------------------
  select round(avg(pg_column_size(raw)), 1) into v_raw_avg
    from (select raw from public.events tablesample system (2) limit 5000) s;

  if v_raw_avg is null then           -- ตารางเล็กเกินกว่าที่ tablesample จะสุ่มติด
    select round(avg(pg_column_size(raw)), 1) into v_raw_avg
      from (select raw from public.events limit 5000) s;
  end if;

  if v_raw_avg is not null and v_ev_bytes > 0 and v_ev_rows > 0 then
    v_raw_pct := round(100.0 * v_raw_avg * v_ev_rows / v_ev_bytes, 1);
  end if;

  ------------------------------------------------------------
  -- จำนวนแถวของตารางที่เกี่ยวข้อง (ไม่อ่านเนื้อข้อมูล)
  ------------------------------------------------------------
  if to_regclass('public.students') is not null then
    execute 'select count(*) from public.students' into v_students;
  end if;
  if to_regclass('public.attempts') is not null then
    execute 'select count(*) from public.attempts' into v_attempts;
  end if;

  ------------------------------------------------------------
  -- คำนวณเพดานจำนวนผู้เล่น
  --   งบสำหรับ events = โควตา − (ทุกอย่างที่ไม่ใช่ events)
  --   ไบต์ต่อผู้เล่น 1 คน = ไบต์ต่อ event × events ต่อผู้เล่น
  ------------------------------------------------------------
  if v_db_bytes is null then
    v_other     := 52428800;          -- สมมติ 50 MB ตามที่ 94 ใช้
    v_db_source := 'assumed';
  else
    v_other     := greatest(v_db_bytes - v_ev_bytes, 0);
  end if;

  v_budget := greatest(v_lim.db_quota_bytes - v_other, 0);

  if v_bpe is not null and v_lim.events_per_player > 0 then
    v_bytes_pp := v_bpe * v_lim.events_per_player;
    if v_bytes_pp > 0 then
      v_ceiling := floor(v_budget / v_bytes_pp)::bigint;
    end if;
  end if;

  ------------------------------------------------------------
  -- ขนาดรายตาราง
  ------------------------------------------------------------
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_tables from (
    select jsonb_build_object(
             'name',        c.relname,
             'total_bytes', pg_total_relation_size(c.oid),
             'heap_bytes',  pg_relation_size(c.oid),
             'index_bytes', pg_indexes_size(c.oid),
             'est_rows',    coalesce(s.n_live_tup, 0)
           ) as x
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_stat_user_tables s on s.relid = c.oid
     where n.nspname = 'public' and c.relkind = 'r'
     order by pg_total_relation_size(c.oid) desc
     limit 25
  ) q;

  ------------------------------------------------------------
  -- index ที่ยังไม่เคยถูกใช้
  --
  -- ⚠️ idx_scan = 0 แปลว่า "ไม่ถูกใช้ตั้งแต่สถิติถูกล้างครั้งล่าสุด"
  --    ไม่ได้แปลว่า "ไม่เคยถูกใช้เลยตลอดกาล"
  --    จึงคืน stats_reset มาด้วย ให้หน้าเว็บเตือนถ้าสถิติเพิ่งถูกล้าง
  --    (ลบ index จากตัวเลขที่เพิ่งรีเซ็ตเมื่อวาน = ลบของที่ใช้อยู่จริง)
  -- ข้าม unique/primary เพราะเป็นตัวบังคับความถูกต้อง ไม่ใช่ของเร่งความเร็ว
  ------------------------------------------------------------
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_idx_unused from (
    select jsonb_build_object(
             'table', s.relname,
             'index', s.indexrelname,
             'bytes', pg_relation_size(s.indexrelid),
             'scans', s.idx_scan
           ) as x
      from pg_stat_user_indexes s
      join pg_index i on i.indexrelid = s.indexrelid
     where s.schemaname = 'public'
       and s.idx_scan = 0
       and not i.indisunique
       and not i.indisprimary
       and pg_relation_size(s.indexrelid) > 131072      -- ข้าม index จิ๋วกว่า 128 KB
     order by pg_relation_size(s.indexrelid) desc
     limit 20
  ) q;

  select stats_reset into v_stats_reset
    from pg_stat_database where datname = current_database();

  ------------------------------------------------------------
  -- พื้นที่ที่ได้คืนฟรีด้วย VACUUM
  ------------------------------------------------------------
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_bloat from (
    select jsonb_build_object(
             'table',          relname,
             'dead',           n_dead_tup,
             'live',           n_live_tup,
             'last_autovacuum', last_autovacuum
           ) as x
      from pg_stat_user_tables
     where schemaname = 'public' and n_dead_tup > 1000
     order by n_dead_tup desc
     limit 10
  ) q;

  ------------------------------------------------------------
  -- อัตราการโต — ค้นคอลัมน์เวลาเอง ไม่เดาชื่อ
  --
  -- เรียงลำดับความน่าจะเป็นตามชื่อที่พบบ่อย แล้วค่อยใช้คอลัมน์เวลาแรกที่เจอ
  -- ถ้าไม่เจอเลย → คืน null ทั้งชุด หน้าเว็บจะแสดง "—" พร้อมบอกว่าเพราะอะไร
  ------------------------------------------------------------
  select column_name into v_tscol
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'events'
     and data_type in ('timestamp with time zone', 'timestamp without time zone')
   order by case column_name
              when 'created_at'  then 1
              when 'inserted_at' then 2
              when 'ts'          then 3
              when 'occurred_at' then 4
              when 'at'          then 5
              else 9
            end, ordinal_position
   limit 1;

  if v_tscol is not null then
    execute format(
      'select count(*)::numeric / 30.0 from public.events where %I >= now() - interval ''30 days''',
      v_tscol
    ) into v_per_day;

    if v_per_day is not null and v_per_day > 0 and v_bpe is not null and v_bpe > 0 then
      v_days_left := floor(greatest(v_budget - v_ev_bytes, 0) / (v_per_day * v_bpe))::bigint;
    end if;
  end if;

  ------------------------------------------------------------
  -- ก้อนคำตอบ
  ------------------------------------------------------------
  return jsonb_build_object(
    'as_of',            now(),
    'plan', jsonb_build_object(
      'name',                v_lim.plan_name,
      'db_quota_bytes',      v_lim.db_quota_bytes,
      'egress_quota_bytes',  v_lim.egress_quota_bytes,
      'storage_quota_bytes', v_lim.storage_quota_bytes,
      'events_per_player',   v_lim.events_per_player,
      'note',                v_lim.note,
      'updated_at',          v_lim.updated_at,
      'updated_by',          v_lim.updated_by
    ),
    'database', jsonb_build_object(
      'size_bytes',   v_db_bytes,
      'size_source',  v_db_source,          -- 'measured' | 'assumed'
      'other_bytes',  v_other,              -- ทุกอย่างที่ไม่ใช่ events
      'budget_bytes', v_budget              -- งบที่เหลือให้ events
    ),
    'events', jsonb_build_object(
      'total_bytes',    v_ev_bytes,
      'rows',           v_ev_rows,
      'bytes_per_event', v_bpe,
      'raw_avg_bytes',  v_raw_avg,
      'raw_pct',        v_raw_pct,
      'raw_sampled',    true                -- ค่า raw มาจากการสุ่ม ไม่ใช่ทั้งตาราง
    ),
    'counts', jsonb_build_object(
      'students', v_students,
      'attempts', v_attempts
    ),
    'ceiling', jsonb_build_object(
      'bytes_per_player', v_bytes_pp,
      'players',          v_ceiling
    ),
    'growth', jsonb_build_object(
      'time_column',      v_tscol,          -- null = หาคอลัมน์เวลาไม่เจอ
      'events_per_day',   v_per_day,
      'days_until_full',  v_days_left
    ),
    'tables',          v_tables,
    'unused_indexes',  v_idx_unused,
    'stats_reset',     v_stats_reset,
    'bloat',           v_bloat
  );
end
$fn$;


-- ============================================================
-- PART 3 — rpc_set_platform_plan() : เปลี่ยนแผนแล้วคืนตัวเลขใหม่ทันที
--
-- คืนผลของ rpc_db_capacity() กลับไปในคำขอเดียว หน้าเว็บจึงคำนวณใหม่ได้
-- โดยไม่ต้องรีเฟรชและไม่ต้องยิงคำขอที่สอง
-- ============================================================
create or replace function public.rpc_set_platform_plan(
  p_plan                text,
  p_db_quota_bytes      bigint  default null,
  p_egress_quota_bytes  bigint  default null,
  p_storage_quota_bytes bigint  default null,
  p_events_per_player   integer default null,
  p_note                text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception E'เปลี่ยนแผนได้เฉพาะผู้ดูแลระบบ';
  end if;

  if coalesce(trim(p_plan), '') = '' then
    raise exception E'ต้องระบุชื่อแผน';
  end if;

  -- [แก้ 25 ส.ค.] เดิมตรวจแค่ 2 ช่องจาก 4 — ทดลองจริงแล้วยิงค่าติดลบเข้าไปได้:
  --   rpc_set_platform_plan('free', null, -5, -9, null, null) สำเร็จ
  --   ⇒ egress_quota_bytes = -5 · storage_quota_bytes = -9 ค้างในฐานถาวร
  --   แถบเปอร์เซ็นต์ในหน้าเว็บจะคำนวณเพี้ยนโดยไม่มี error ให้ใครสังเกต
  if p_db_quota_bytes      is not null and p_db_quota_bytes      <= 0
  or p_egress_quota_bytes  is not null and p_egress_quota_bytes  <= 0
  or p_storage_quota_bytes is not null and p_storage_quota_bytes <= 0
  or p_events_per_player   is not null and p_events_per_player   <= 0 then
    raise exception E'ค่าโควตาต้องมากกว่า 0 ทุกช่อง';
  end if;

  begin
    v_email := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  exception when others then
    v_email := null;
  end;

  -- ค่าที่ส่งมาเป็น null = ไม่เปลี่ยนช่องนั้น (ไม่ใช่ล้างเป็นศูนย์)
  update public.platform_limits
     set plan_name           = trim(p_plan),
         db_quota_bytes      = coalesce(p_db_quota_bytes,      db_quota_bytes),
         egress_quota_bytes  = coalesce(p_egress_quota_bytes,  egress_quota_bytes),
         storage_quota_bytes = coalesce(p_storage_quota_bytes, storage_quota_bytes),
         events_per_player   = coalesce(p_events_per_player,   events_per_player),
         note                = coalesce(p_note, note),
         updated_at          = now(),
         updated_by          = v_email
   where id = 1;

  if not found then
    raise exception E'ไม่พบแถวโควตา — รันไฟล์ติดตั้งนี้ซ้ำอีกครั้ง';
  end if;

  return public.rpc_db_capacity();
end
$fn$;


-- ============================================================
-- PART 4 — สิทธิ์
-- anon เรียกไม่ได้เลย · ครูที่ล็อกอินเรียกได้แต่จะเจอด่าน is_admin() ข้างใน
-- (สองชั้น: ชั้นสิทธิ์เรียก + ชั้นตรวจตัวตนในฟังก์ชัน)
-- ============================================================
revoke all on function public.rpc_db_capacity()                                   from public, anon;
revoke all on function public.rpc_set_platform_plan(text,bigint,bigint,bigint,integer,text) from public, anon;

grant execute on function public.rpc_db_capacity()                                   to authenticated;
grant execute on function public.rpc_set_platform_plan(text,bigint,bigint,bigint,integer,text) to authenticated;

-- [แก้ 25 ส.ค.] CHECK ที่ตัวตาราง — ยามในฟังก์ชันกันได้เฉพาะทางที่ผ่าน RPC
--   แต่ Supabase ตั้ง default privileges ให้ตารางใหม่ถึง authenticated
--   ⇒ ผู้ดูแลที่ล็อกอินแล้วยิง PATCH ตรงผ่าน PostgREST ข้ามยามในฟังก์ชันได้
--   ค่าคงทนต้องอยู่ที่ตาราง ไม่ใช่ที่ทางเข้าทางใดทางหนึ่ง
do $chk$
begin
  if not exists (select 1 from pg_constraint where conname = 'platform_limits_positive') then
    alter table public.platform_limits
      add constraint platform_limits_positive
      check (db_quota_bytes > 0 and egress_quota_bytes > 0
             and storage_quota_bytes > 0 and events_per_player > 0);
  end if;
end
$chk$;

notify pgrst, 'reload schema';

commit;
-- ↑ ถึงบรรทัดนี้แปลว่าผ่านครบทุกยาม · ถ้าล้มระหว่างทาง ทุกอย่างถูกถอยคืนอัตโนมัติ


-- ============================================================
-- ตรวจผล — วางต่อท้ายแล้วดูว่าได้ true ทั้งสามบรรทัด
-- ============================================================
-- select to_regclass('public.platform_limits') is not null              as "มีตารางโควตา";
-- select to_regprocedure('public.rpc_db_capacity()') is not null        as "มี rpc_db_capacity";
-- select (public.rpc_db_capacity() -> 'ceiling' ->> 'players') is not null as "คำนวณเพดานได้";
--
-- ดูผลจริงทั้งก้อน (ต้องล็อกอินเป็นผู้ดูแล):
-- select jsonb_pretty(public.rpc_db_capacity());


-- ============================================================
-- ROLLBACK — ถ้าต้องถอย
-- ============================================================
--   drop function if exists public.rpc_set_platform_plan(text,bigint,bigint,bigint,integer,text);
--   drop function if exists public.rpc_db_capacity();
--   drop table    if exists public.platform_limits;
--
--   ปลอดภัยที่จะถอยทั้งหมด เพราะไฟล์นี้ **สร้างของใหม่อย่างเดียว**
--   ไม่ได้แก้ตาราง ฟังก์ชัน หรือข้อมูลเดิมของใครเลยแม้แต่จุดเดียว
--   (ต่างจากไฟล์ 83 ที่ต้องถอยคอลัมน์และรวมแถวคืน — ของนี้ไม่มีปัญหานั้น)
