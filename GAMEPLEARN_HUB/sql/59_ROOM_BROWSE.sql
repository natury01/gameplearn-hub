-- ============================================================
-- 59_ROOM_BROWSE.sql — ให้ครูดู "ห้องสาธารณะของครูคนอื่น" ได้จาก Dashboard เว็บกลาง
-- เกมเพลิน (GamePlearn) · 2026-08-12 · งานข้อ 4.1 ของ HANDOVER_2026-08-12
--
-- ทำไมต้องเป็น RPC: RLS ของ 46 ตั้งไว้ว่า **ครูเห็นเฉพาะห้องของตัวเอง** ซึ่งถูกแล้วและห้ามคลาย
-- การจะเห็นข้ามกันได้จึงต้องเป็นทางเดินเฉพาะที่เลือกส่งออกมาทีละอย่าง ไม่ใช่เปิด policy ให้อ่านตาราง
--
-- 🔒 สิ่งที่ RPC ชุดนี้ **ไม่มีวันคืนออกมา** (คุมที่ตัว SQL ไม่ใช่ที่หน้าเว็บ):
--    · ชื่อ-นามสกุลนักเรียน หรือ id ของนักเรียน — คืนแค่ "จำนวนคน"
--    · โค้ดเข้าห้อง (join_key) — ถ้าหลุด ใครก็พาเด็กเข้าห้องคนอื่นได้
--    · อีเมล/ชื่อครูเจ้าของห้อง — บอกแค่ว่า "ห้องนี้ของฉันหรือเปล่า"
--    · ห้อง "ผู้เล่นทั่วไป" — ไม่ใช่ห้องเรียน และมีข้อจำกัด PDPA เด็ก (ไฟล์ 23)
--
-- ขอบเขตที่คืน: ห้องที่ครูเจ้าของ **ตั้งเองว่า "ค้นหาชื่อโรงเรียนได้"** (listed = true) เท่านั้น
--   ห้องที่ตั้งเป็น "โค้ดเท่านั้น" ไม่โผล่เด็ดขาด — ครูคนนั้นเลือกไม่เปิดเผยไว้แล้ว
--   สำหรับห้อง listed = true การเปิดเผยระดับ "จำนวนคน/ค่าเฉลี่ย" น้อยกว่าที่หน้าเข้าห้องของเกม
--   เปิดให้อยู่แล้ว (ที่นั่นค้นชื่อโรงเรียนแล้วเห็น **รายชื่อนักเรียนจริง**) จึงไม่ได้เพิ่มการเปิดเผยใหม่
--
-- ⚠️ ที่ต้องรู้ไว้: `authenticated` ในระบบนี้รวมบัญชีนิรนามด้วย (เกมมีปุ่มเข้าแบบไม่สมัคร)
--    จึงถือว่าข้อมูลชุดนี้ = "ระดับเดียวกับที่เปิดเผยอยู่แล้ว" ห้ามใส่อะไรที่ละเอียดกว่านี้เพิ่ม
--
-- ✅ ไม่ใช้ pgcrypto · idempotent รันซ้ำได้ · ไม่แก้ ไม่ลบ policy เดิม
-- ============================================================


-- ============================================================
-- PART 1 — มุมมองภายใน: ห้องสาธารณะพร้อมตัวเลขสรุป
--   เป็น view ธรรมดาที่ไม่ให้ใครอ่านตรง ๆ (ไม่ grant) — มีไว้ให้ RPC ด้านล่างใช้ซ้ำ
--   ค่าเฉลี่ย **ไม่นับนักเรียนที่ถูกปิดการใช้งาน** ตามกติกากลาง (ไฟล์ 48)
--   ไม่งั้นเลขบนหน้านี้จะไม่ตรงกับเลขในหน้าห้องของครูเจ้าของเอง
-- ============================================================

create or replace view public.v_public_rooms as
select c.id,
       c.name                                as room_name,
       c.grade,
       c.room_no,
       c.academic_year,
       c.school_id,
       coalesce(s.name, '(ไม่ระบุโรงเรียน)')  as school_name,
       c.teacher_id,
       c.created_at,
       (select count(*) from public.students st
         where st.classroom_id = c.id and coalesce(st.is_active, true))          as students_on,
       (select count(*) from public.classroom_games cg
         where cg.classroom_id = c.id and cg.is_enabled)                          as games_on,
       (select round(avg(p.progress_percent)::numeric, 1)
          from public.student_game_progress p
          join public.students st2 on st2.id = p.student_id
         where st2.classroom_id = c.id and coalesce(st2.is_active, true))         as avg_progress
  from public.classrooms c
  left join public.schools s on s.id = c.school_id
 where coalesce(c.listed, true)                    -- ครูเจ้าของตั้งเองว่าเปิดให้ค้นหาได้
   and coalesce(c.is_active, true)                 -- ห้องที่ปิดชั่วคราวไม่ต้องโผล่
   and btrim(coalesce(c.name, '')) <> 'ผู้เล่นทั่วไป'
   and c.teacher_id is not null;                   -- ห้องที่ยังไม่มีเจ้าของ (ไฟล์ 60) ยังไม่ใช่ห้องสาธารณะ

comment on view public.v_public_rooms is
  'ห้องที่ครูเจ้าของตั้งว่าค้นหาได้ พร้อมตัวเลขสรุป — ใช้ภายในโดย rpc_browse_rooms เท่านั้น ไม่ grant ให้ใครอ่านตรง';

revoke all on public.v_public_rooms from anon, authenticated;


-- ============================================================
-- PART 2 — RPC หลัก: รายการห้องสาธารณะตามตัวกรอง
--   ตัวกรองทุกตัวไม่บังคับ · ส่ง null = ไม่กรองมิตินั้น
--   p_q ค้นได้ที่ชื่อห้องกับชื่อโรงเรียน (ไม่ค้นโค้ดห้อง โดยตั้งใจ)
-- ============================================================

create or replace function public.rpc_browse_rooms(
  p_school text     default null,     -- id ของโรงเรียน (ส่งเป็นข้อความ เผื่อฝั่งเว็บส่ง '' มา)
  p_grade  text     default null,
  p_year   text     default null,
  p_q      text     default null,
  p_limit  int      default 200
) returns table (
  id            uuid,
  room_name     text,
  grade         text,
  academic_year text,
  school_name   text,
  students_on   bigint,
  games_on      bigint,
  avg_progress  numeric,
  is_mine       boolean
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.room_name, v.grade, v.academic_year, v.school_name,
         v.students_on, v.games_on, v.avg_progress,
         (v.teacher_id = auth.uid()) as is_mine
    from public.v_public_rooms v
   where (nullif(btrim(coalesce(p_school, '')), '') is null
          or v.school_id = nullif(btrim(p_school), '')::uuid)
     and (nullif(btrim(coalesce(p_grade, '')), '') is null  or v.grade = btrim(p_grade))
     and (nullif(btrim(coalesce(p_year, '')), '') is null   or v.academic_year = btrim(p_year))
     and (nullif(btrim(coalesce(p_q, '')), '') is null
          or v.room_name   ilike '%' || btrim(p_q) || '%'
          or v.school_name ilike '%' || btrim(p_q) || '%')
   order by v.school_name, v.grade nulls last, v.room_name
   limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

revoke all on function public.rpc_browse_rooms(text, text, text, text, int) from public;
grant execute on function public.rpc_browse_rooms(text, text, text, text, int) to authenticated;


-- ============================================================
-- PART 3 — RPC ตัวเลือกของตัวกรอง
--   ต้องแยกจาก PART 2 เพราะรายการห้องมีเพดาน (limit) ถ้าสร้างตัวกรองจากผลที่ถูกตัดแล้ว
--   ตัวเลือกจะหายไปเงียบ ๆ แล้วครูจะไม่มีทางรู้ว่ามีโรงเรียนอื่นอยู่
--   คืน 3 มิติในคำขอเดียว (kind = 'school' | 'grade' | 'year') — ยิงครั้งเดียวพอ
-- ============================================================

create or replace function public.rpc_browse_room_filters()
returns table (kind text, value text, label text, n bigint)
language sql stable security definer set search_path = public
as $$
  select 'school' as kind, v.school_id::text as value, v.school_name as label, count(*) as n
    from public.v_public_rooms v where v.school_id is not null
   group by 1, 2, 3
  union all
  select 'grade', v.grade, v.grade, count(*)
    from public.v_public_rooms v where nullif(btrim(coalesce(v.grade, '')), '') is not null
   group by 1, 2, 3
  union all
  select 'year', v.academic_year, v.academic_year, count(*)
    from public.v_public_rooms v where nullif(btrim(coalesce(v.academic_year, '')), '') is not null
   group by 1, 2, 3
   order by 1, 3;
$$;

revoke all on function public.rpc_browse_room_filters() from public;
grant execute on function public.rpc_browse_room_filters() to authenticated;

notify pgrst, 'reload schema';


-- ============================================================
-- PART 4 — ตรวจผล
-- ============================================================

select 'มุมมอง v_public_rooms' as รายการ,
       case when exists (select 1 from information_schema.views
                          where table_schema='public' and table_name='v_public_rooms')
            then '✅ มีแล้ว' else '❌ ไม่มี' end as ค่า
union all
select 'RPC rpc_browse_rooms',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_browse_rooms')
            then '✅ มีแล้ว' else '❌ ไม่มี' end
union all
select 'RPC rpc_browse_room_filters',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_browse_room_filters')
            then '✅ มีแล้ว' else '❌ ไม่มี' end
union all
select 'ห้องสาธารณะที่จะเห็นได้ตอนนี้', count(*)::text from public.v_public_rooms;

-- ► ห้องที่ตั้งเป็น "โค้ดเท่านั้น" ต้องไม่อยู่ในเลขข้างบน:
--   select count(*) from classrooms where listed = false;

-- ============================================================
-- ROLLBACK
-- ============================================================
-- drop function if exists public.rpc_browse_room_filters();
-- drop function if exists public.rpc_browse_rooms(text, text, text, text, int);
-- drop view if exists public.v_public_rooms;
-- ============================================================
