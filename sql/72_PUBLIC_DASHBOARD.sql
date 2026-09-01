-- ============================================================
-- 72_PUBLIC_DASHBOARD.sql — หน้าสรุปผลรวมที่ทุกคนเปิดดูได้ โดยไม่ต้องล็อกอิน
-- เกมเพลิน (GamePlearn) · 13 ส.ค. 2569
--
-- ต้องรัน `43_REPORT_CARDS.sql` มาก่อน (ใช้ view ใบรายงานผลจากที่นั่นทั้งหมด)
-- ✅ ไม่แตะตาราง ไม่แตะข้อมูล ไม่แตะ policy เดิม · เพิ่มฟังก์ชันอ่านอย่างเดียว 3 ตัว
-- ✅ idempotent รันซ้ำได้
--
-- ============================================================
-- ⭐ กติกาความเป็นส่วนตัว — อ่านก่อนแก้ไฟล์นี้ทุกครั้ง
-- ============================================================
--
-- ฟังก์ชันในไฟล์นี้เปิดให้ `anon` เรียกได้ = **คนทั้งอินเทอร์เน็ตเรียกได้** จึงล็อกไว้สามชั้น:
--
--   1. **คืนเฉพาะค่าที่รวมแล้ว (aggregate) เท่านั้น** — ไม่มีทางคืนแถวรายคน
--      ทุก query มี `group by` และเลือกเฉพาะ count/avg · ไม่มี select ชื่อเด็กสักจุด
--   2. **ไม่คืนสิ่งที่ระบุตัวคนหรือเปิดทางเข้าห้อง** — ห้ามคืน:
--      ชื่อ/นามสกุล/เลขที่นักเรียน · `join_key` · `teacher_id` · อีเมลครู · `student_id`
--   3. **ไม่รวมห้อง "ผู้เล่นทั่วไป"** — ไม่ใช่ห้องเรียนของครู ไม่มีชั้น/โรงเรียนจริง
--      และเป็นห้องที่กติกา PDPA เด็กของโครงการห้ามเก็บชื่อจริงอยู่แล้ว
--
-- ⚠️ **ห้ามคลาย RLS ของตารางไหนเพื่อทำหน้านี้** — กติกาเหล็กของโครงการคือ
--    "ครูเห็นเฉพาะห้องตัวเอง" ต้องไม่ถูกแตะ · ต้องเห็นข้ามกันให้ทำเป็น RPC เฉพาะทาง
--    ไฟล์นี้จึงเป็น `security definer` แบบเดียวกับไฟล์ `59` (ห้องสาธารณะของครูคนอื่น)
--
-- 📌 **เพดานจำนวนนักเรียนขั้นต่ำ = 5 คน** (ครูเคาะใหม่ 19 ส.ค. 2569)
--    ⚠️ กลับมติเดิม: ก่อนหน้านี้ไฟล์นี้เคยบันทึกว่า "แสดงทุกห้อง ไม่ต้องซ่อนห้องที่เด็กน้อย"
--       ครูกลับคำเมื่อ 19 ส.ค. 2569 พร้อมกับการเปิดให้ "ดูคะแนนรายห้องได้โดยไม่ต้องล็อกอิน"
--       เหตุผล: พอเจาะลงถึงระดับห้อง ห้องที่มีเด็ก 1-3 คน **ค่าเฉลี่ยห้อง = คะแนนรายคน**
--       ⇒ ระบุตัวเด็กได้ทันทีทั้งที่ไม่มีชื่อสักตัวอยู่ในผลลัพธ์
--
--    วิธีที่ใช้: **คงแถวไว้ แต่ปิดค่าเฉลี่ย** ไม่ใช่ซ่อนทั้งแถว
--      · ครูยังเห็นว่าห้องมีอยู่และมีเด็กกี่คน — ห้องไม่หายเงียบ ๆ ให้ไล่หาสาเหตุ
--      · จำนวนคนไม่ใช่คะแนน จึงไม่ทำให้ระบุตัวเด็กได้
--      · ถ้าซ่อนทั้งแถว ผลลัพธ์จะกลายเป็นอาเรย์ว่าง แล้วข้อสอบความเป็นส่วนตัวที่ตรวจ
--        ด้วยการ grep หาชื่อเด็ก จะ "ผ่านแบบว่างเปล่า" ทั้งที่ไม่ได้ทดสอบอะไรเลย
--
--    นับหัวอย่างไร: **นับรวมทั้งใบผลสัมฤทธิ์และใบสมรรถนะ** (keyed ∪ dkeyed)
--      ห้ามนับจาก keyed อย่างเดียว — ห้องที่มีแต่ใบสมรรถนะจะได้ 0 แล้วถูกปิดค่าเฉลี่ยทิ้ง
--      ทั้งที่อาจมีเด็ก 40 คน (กับดักเดียวกับที่ V.1.6.8 เพิ่ง CTE `allkeys` มาแก้)
--
--    เพดานนี้ครอบเฉพาะ `rpc_pub_breakdown` (ค่าเฉลี่ยรายกลุ่ม) ตามถ้อยคำที่ครูเคาะ
--    ไม่ครอบ `rpc_pub_summary` (ยอดรวมทั้งระบบ) ซึ่งรวมทุกคนอยู่แล้วจึงไม่ชี้ตัวใคร
--
-- 📌 **ไม่จัดอันดับโรงเรียน** ตามที่ครูตัดสิน — ฟังก์ชันคืนค่าของแต่ละกลุ่ม
--    พร้อม "ค่าเฉลี่ยรวมทุกโรงเรียน" ไว้เทียบ · การเรียงลำดับเป็นเรื่องของหน้าเว็บ
--    และหน้าเว็บเรียงตามชื่อ ไม่ใช่ตามคะแนน
-- ============================================================


-- ============================================================
-- PART 0 — ยามกันรันผิดลำดับ
-- ============================================================

do $guard$
begin
  if not exists (select 1 from information_schema.views
                  where table_schema='public' and table_name='v_student_achievement') then
    raise exception 'ยังไม่มี v_student_achievement — รัน 43_REPORT_CARDS.sql ก่อน';
  end if;
  if not exists (select 1 from information_schema.views
                  where table_schema='public' and table_name='v_student_comp_dims') then
    raise exception 'ยังไม่มี v_student_comp_dims — รัน 43_REPORT_CARDS.sql ก่อน';
  end if;
end $guard$;


-- ============================================================
-- PART 1 — ตัวช่วย: ห้องที่นับเข้าหน้าสาธารณะ
--
-- แยกออกมาเป็น view ภายใน (ไม่ granted ให้ใคร) เพื่อให้กติกา "ห้องไหนนับ"
-- อยู่ที่เดียว ไม่ต้องเขียนซ้ำในทั้งสามฟังก์ชัน แล้วหลุดไปแก้ไม่ครบ
-- ============================================================

create or replace view public.v_pub_rooms as
select c.id            as classroom_id,
       c.school_id,
       c.grade,
       c.academic_year,
       c.name          as room_name,
       s.name          as school_name
  from public.classrooms c
  left join public.schools s on s.id = c.school_id
 where coalesce(c.is_active, true)
   and btrim(coalesce(c.name, '')) <> 'ผู้เล่นทั่วไป'   -- กติกาความเป็นส่วนตัว ข้อ 3
   and c.teacher_id is not null;                        -- ห้องที่ยังไม่มีเจ้าของ = ยังไม่เริ่มใช้จริง

revoke all on public.v_pub_rooms from public, anon, authenticated;

comment on view public.v_pub_rooms is
  'ห้องที่นับเข้าหน้าสรุปสาธารณะ — ใช้ภายในฟังก์ชัน security definer เท่านั้น ไม่ granted ให้ใคร';


-- ============================================================
-- PART 2 — ตัวเลือกในแถบกรอง (โรงเรียน · ชั้น · ปีการศึกษา · เกม)
--   คืนเฉพาะตัวเลือกที่ "มีผลจริง" แล้ว — ไม่ใช่ทุกแถวในทะเบียน
--   เพราะตัวเลือกที่เลือกแล้วได้หน้าว่างเปล่า คือตัวเลือกที่ไม่ควรมี
-- ============================================================

create or replace function public.rpc_pub_filters()
returns jsonb
language sql
security definer
set search_path = public
stable
as $fn$
  with room as (
    select r.* from public.v_pub_rooms r
     where exists (select 1 from public.v_student_achievement a where a.classroom_id = r.classroom_id)
        or exists (select 1 from public.v_student_comp_dims  d where d.classroom_id = r.classroom_id)
  )
  select jsonb_build_object(
    'schools', coalesce((select jsonb_agg(x order by x->>'name')
        from (select distinct jsonb_build_object('id', school_id, 'name', school_name) as x
                from room where school_id is not null) s), '[]'::jsonb),
    'grades', coalesce((select jsonb_agg(distinct grade) from room where grade is not null), '[]'::jsonb),
    'years', coalesce((select jsonb_agg(distinct academic_year) from room where academic_year is not null), '[]'::jsonb),
    'games', coalesce((select jsonb_agg(x order by x->>'name')
        from (select distinct jsonb_build_object('code', a.game_code, 'name', a.game_name) as x
                from public.v_student_achievement a
                join room r on r.classroom_id = a.classroom_id) g), '[]'::jsonb),
    /* [V.1.6.35 · ครูสั่ง 2 ก.ย. "ผลการเรียนรวมต้องมีตัวกรองห้อง" — สเปก HUB ข้อ D + ใบ 2 ก.ย.]
       รายการห้องที่มีผลจริง พร้อม school/grade/year ให้หน้าเว็บย่อรายการเองโดยไม่เรียกฐานซ้ำ
       ชื่อห้อง (เช่น "ป.4/2") ไม่ใช่ตัวตนเด็ก — แบบเดียวกับที่ rpc_pub_breakdown โหมด classroom
       แสดงชื่อห้องอยู่แล้ว · ไม่มี join_key/โค้ดห้องออกไป (กติกาข้อ 2 หัวไฟล์คงเดิม) */
    'rooms', coalesce((select jsonb_agg(x order by x->>'name')
        from (select jsonb_build_object('id', classroom_id, 'name', room_name,
                                        'school', school_id, 'grade', grade,
                                        'year', academic_year) as x
                from room) rr), '[]'::jsonb),
    'rooms_with_data', (select count(*) from room)
  )
$fn$;

revoke all on function public.rpc_pub_filters() from public;
grant execute on function public.rpc_pub_filters() to anon, authenticated;


-- ============================================================
-- PART 3 — สรุปภาพรวมตามตัวกรอง
--
-- คืนสี่ก้อน:
--   ach    — ผลสัมฤทธิ์: จำนวน · ค่าเฉลี่ยร้อยละ · การกระจายเป็น 5 ช่วง
--   comps  — สมรรถนะครบ 6 ด้าน (ด้านที่ยังไม่มีเกมวัด คืน null ไม่ใช่ 0)
--   units  — "คะแนนเก็บ/คะแนนสอบ" อ่านจาก unit_scores ที่เกมส่งมา
--            ⚠️ ชื่อช่องมาจากเกม เว็บกลางไม่ตั้งชื่อเอง และไม่คิดคะแนนซ้ำ (กติกาเหล็ก)
--   all_*  — ค่าเฉลี่ยรวม "ทุกโรงเรียน" ไว้เป็นเส้นเทียบ (ครูสั่ง: เทียบ ไม่จัดอันดับ)
-- ============================================================

/* [V.1.6.35] ลายเซ็นเปลี่ยน (เพิ่ม p_room) — เติมพารามิเตอร์ default = ได้ overload ไม่ใช่แทนที่
   PostgREST จะเจอสองลายเซ็นแล้วตอบ PGRST203 ⇒ ต้อง drop ลายเซ็นเดิมก่อนเสมอ (คำเตือน HUB ข้อ ③ข)
   ไม่ขัด additive-only: ลายเซ็นใหม่รับ argument ชุดเดิมได้ครบ ไคลเอนต์เก่ายิงผ่านเหมือนเดิม */
drop function if exists public.rpc_pub_summary(uuid, text, text, text);

create or replace function public.rpc_pub_summary(
  p_school uuid default null,
  p_grade  text default null,
  p_year   text default null,
  p_game   text default null,
  p_room   uuid default null)
returns jsonb
language sql
security definer
set search_path = public
stable
as $fn$
  with room as (
    select r.* from public.v_pub_rooms r
     where (p_school is null or r.school_id = p_school)
       and (p_grade  is null or r.grade = p_grade)
       and (p_year   is null or r.academic_year = p_year)
       and (p_room   is null or r.classroom_id = p_room)   -- [V.1.6.35 · ครูสั่ง 2 ก.ย.] ตัวกรองห้อง
  ),
  ach as (
    /* [V.1.6.35 · ใบ AUDIT 1 ก.ย. ข้อ ๔ "ปืนที่ขึ้นลำ"] เลิกดึงทุกคอลัมน์จาก view — ระบุเฉพาะที่ใช้จริง
       คอลัมน์ชื่อ-นามสกุล-เลขที่ของผู้เรียนไม่ถูกดึงเข้า CTE เลย: ไม่อยู่ในมือ = เติมอะไรทีหลังก็ไม่หลุด */
    select a.student_id, a.classroom_id, a.game_code, a.game_name,
           a.score, a.max_score, a.percent, a.grade_label, a.progress_percent,
           a.unit_scores, a.computed_at, a.is_legacy
      from public.v_student_achievement a
     join room r on r.classroom_id = a.classroom_id
     where (p_game is null or a.game_code = p_game)
  ),
  /* [V.1.6.35 · ยามกลุ่มเล็ก — กติกาเดิมของระบบ (rpc_pub_breakdown ใช้ head_n < 5 อยู่แล้ว)
     ตัวกรองห้องทำให้ขอบเขตแคบถึงห้องเดียวได้เป็นครั้งแรก ⇒ ยามต้องมาพร้อมตัวกรอง ไม่ใช่ตามหลัง
     นับหัวแบบเดียวกับ head_n: นักเรียนที่มีผลอย่างใดอย่างหนึ่งในขอบเขตที่กรอง */
  head as (
    select count(*) as n from (
      select student_id from ach
      union
      select d.student_id from public.v_student_comp_dims d
        join room r on r.classroom_id = d.classroom_id
       where d.evidence <> 'self_report'
         and (p_game is null or d.game_code = p_game)) u
  ),
  ach_all as (   -- ทุกโรงเรียน (ไม่กรองโรงเรียน/ชั้น/ปี) — เส้นเทียบ
    select a.percent from public.v_student_achievement a
     join public.v_pub_rooms r on r.classroom_id = a.classroom_id
     where (p_game is null or a.game_code = p_game)
  ),
  dim as (
    select d.* from public.v_student_comp_dims d
     join room r on r.classroom_id = d.classroom_id
     where d.evidence <> 'self_report'
       and (p_game is null or d.game_code = p_game)
  ),
  dim_all as (
    select d.comp_code, d.score from public.v_student_comp_dims d
     join public.v_pub_rooms r on r.classroom_id = d.classroom_id
     where d.evidence <> 'self_report'
       and (p_game is null or d.game_code = p_game)
  ),
  units as (
    /* [V.1.6.31 · ข้อ C — ใบ HUB 25/26 ส.ค.] เพิ่มมิติเกม
       เดิม group by u.key อย่างเดียว ⇒ คีย์ชื่อซ้ำของสองเกม (เช่น `_boss` ภาค1=19.1 · ภาค2=13)
       ถูกยุบเป็นแท่งเดียวแล้วเฉลี่ยข้ามเกม บนจอ "ทุกเกม" ซึ่งเป็นค่าเริ่มต้นของหน้า
       — เลขผิดที่ดูเหมือนถูก · กติกาเหล็กเดิมคงครบ: ชื่อช่องมาจากเกม เว็บกลางไม่ตั้งชื่อเอง
       แค่เลิกยุบของสองเกมเข้าด้วยกัน · ลายเซ็นฟังก์ชันไม่เปลี่ยน (ไม่มีปัญหา overload) */
    select a.game_code, a.game_name, u.key as unit_name,
           count(*)                                  as n,
           round(avg((u.value)::numeric), 1)          as avg_value
      from ach a
      /* [V.1.6.8] ใบผลของนักเรียน 'คนเดียว' ที่ unit_scores ไม่ใช่ object (jsonb 'null'
         หรือ array/number) ทำให้ jsonb_each_text โยน error แล้วทั้งฟังก์ชันล้ม
         ⇒ ครูทุกคนเปิดหน้าสาธารณะไม่ได้เลย เพราะข้อมูลเสียของคนเดียว
         coalesce เดิมจับได้แค่ SQL NULL · ต้องตรวจรูปทรงด้วย jsonb_typeof */
      cross join lateral jsonb_each_text(
        case when jsonb_typeof(a.unit_scores) = 'object' then a.unit_scores
             else '{}'::jsonb end) u
     where u.value ~ '^-?[0-9]+(\.[0-9]+)?$'          -- เก็บเฉพาะช่องที่เป็นตัวเลขจริง
     group by a.game_code, a.game_name, u.key         -- [V.1.6.31 · ข้อ C] มิติเกม
  )
  select jsonb_build_object(
    'scope', jsonb_build_object('school', p_school, 'grade', p_grade, 'year', p_year, 'game', p_game,
                                'room', p_room),
    /* [V.1.6.35 · ยามกลุ่มเล็ก] เกณฑ์ < 5 เป็นของระบบอยู่แล้ว (breakdown :suppressed) — ใช้ให้ทั่ว */
    'suppressed', (select n from head) < 5,
    'suppressed_note', case when (select n from head) < 5
        then 'กลุ่มนี้มีนักเรียนน้อยกว่า 5 คน — ไม่แสดงค่าเฉลี่ยและการกระจาย เพื่อไม่ให้ระบุตัวผู้เรียนได้'
        end,
    /* [V.1.6.35 · ข้อเสนอ ก ของ HUB — AUDIT รับทั้งฉบับ] ป้ายเตือนสองสเกลปนกัน
       ⚠️ ปรับจากร่างของ HUB หนึ่งจุด: นับ mixed "ภายในเกมเดียวกัน" ไม่ใช่ข้ามเกม
       — คนละเกมมี max_score ต่างกันโดยชอบ (ภาค 1 = 130 · ภาค 2 = 160) ถ้านับรวมกัน
       หน้าจอ "ทุกเกม" จะขึ้นป้ายเตือนตลอดกาลทั้งที่ไม่มีอะไรปน · ที่เป็นโรคจริงคือ
       เกมเดียวกันมีสองตัวหาร (ใบเก่า 160 / ใบใหม่ 130 หลังมติตัดบอส) */
    'scale_mixed', (select count(*) > 0 from (
        select game_code from ach group by game_code
        having count(distinct max_score) > 1) mx),
    'scales', coalesce((select jsonb_agg(jsonb_build_object(
                 'game', s.game_name, 'game_code', s.game_code, 'scales', s.scales)
               order by s.game_code)
        from (select game_code, min(game_name) as game_name,
                     jsonb_agg(distinct max_score order by max_score) as scales
                from ach group by game_code
              having count(distinct max_score) > 1) s), '[]'::jsonb),
    /* [V.1.6.8] เดิมนับจาก room ตรง ๆ = นับห้องที่ยังไม่มีผลด้วย และไม่ฟังตัวกรองเกม
       ทำให้หัวเรื่องขึ้น '6 ห้องเรียน · 3 โรงเรียน' ขณะที่กราฟข้างล่างมี 2 แท่ง
       ⇒ นับเฉพาะห้องที่มีผลจริงในขอบเขตที่กรองอยู่ (ทั้งใบผลสัมฤทธิ์และใบสมรรถนะ)
       ท่าเดียวกับ rooms_with_data ใน rpc_pub_filters ที่ทำถูกอยู่แล้ว */
    'n_schools',  (select count(distinct r.school_id) from room r
                    where r.classroom_id in (select classroom_id from ach
                                             union select classroom_id from dim)),
    'n_rooms',    (select count(*) from (select classroom_id from ach
                                         union select classroom_id from dim) q),
    /* [V.1.6.8] คงตัวเลข 'ห้องทั้งระบบ' ไว้ด้วย เผื่อหน้าจออยากบอกทั้งสองมุม */
    'n_rooms_all',   (select count(*)                  from room),
    'n_schools_all', (select count(distinct school_id) from room),
    'n_games',    (select count(distinct game_code)   from ach),
    'n_students', (select count(distinct student_id)  from ach),
    'ach', jsonb_build_object(
      'n',           (select count(*) from ach),
      /* [V.1.6.35] ค่าเฉลี่ย/การกระจายของกลุ่มเล็ก < 5 คน ถูกยามกดเป็น null/[] — รูปเดียวกับ breakdown */
      'avg_percent', case when (select n from head) < 5 then null
                          else (select round(avg(percent)::numeric, 1) from ach) end,
      'avg_all',     (select round(avg(percent)::numeric, 1) from ach_all),
      'dist', case when (select n from head) < 5 then '[]'::jsonb else
              (select coalesce(jsonb_agg(jsonb_build_object('band', b.band, 'label', b.label, 'n', b.n)
                                         order by b.ord), '[]'::jsonb)
                 from (select 1 as ord, '80-100' as band, 'ดีเยี่ยม (80–100)' as label,
                              count(*) filter (where percent >= 80) as n from ach
                       union all select 2, '70-79',  'ดี (70–79)',        count(*) filter (where percent >= 70 and percent < 80) from ach
                       union all select 3, '60-69',  'พอใช้ (60–69)',      count(*) filter (where percent >= 60 and percent < 70) from ach
                       union all select 4, '50-59',  'ผ่านเกณฑ์ (50–59)',  count(*) filter (where percent >= 50 and percent < 60) from ach
                       union all select 5, '0-49',   'ต้องช่วยเหลือ (ต่ำกว่า 50)', count(*) filter (where percent < 50) from ach) b) end),
    'comps', (select coalesce(jsonb_agg(jsonb_build_object(
                       'code', c.code, 'name', c.name,
                       'n_students', c.n_students, 'avg_score', c.avg_score,
                       'avg_all', c.avg_all) order by c.ord), '[]'::jsonb)
                from (select v.ord, v.code,
                             coalesce((select min(d.comp_name) from dim d where d.comp_code = v.code), v.nm) as name,
                             (select count(distinct d.student_id) from dim d where d.comp_code = v.code) as n_students,
                             /* [V.1.6.35] ยามกลุ่มเล็ก — ค่าเฉลี่ยรายด้านของกลุ่ม < 5 คน ระบุตัวได้เท่าค่าเฉลี่ยรวม */
                             case when (select n from head) < 5 then null
                                  else (select round(avg(d.score)::numeric, 1) from dim d where d.comp_code = v.code) end as avg_score,
                             (select round(avg(a.score)::numeric, 1) from dim_all a where a.comp_code = v.code) as avg_all
                        from (values (1,'SM','การจัดการตนเอง'), (2,'HOT','การคิดขั้นสูง'),
                                     (3,'CM','การสื่อสาร'), (4,'TW','การรวมพลังทำงานเป็นทีม'),
                                     (5,'CZ','การเป็นพลเมืองที่เข้มแข็ง'),
                                     (6,'SN','การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน'))
                             as v(ord, code, nm)) c),
    /* [V.1.6.31 · ข้อ C] เพิ่ม game/game_code ต่อแถว — หน้าเว็บเติมชื่อเกมนำหน้าป้าย
       เฉพาะตอนตัวกรองเกมว่าง (ดู dashboard.html ส่วนกราฟคะแนนเก็บ) */
    'units', case when (select n from head) < 5 then '[]'::jsonb else
             (select coalesce(jsonb_agg(jsonb_build_object(
                                'game', game_name, 'game_code', game_code,
                                'name', unit_name, 'n', n, 'avg', avg_value)
                              order by game_name, unit_name), '[]'::jsonb) from units) end,
    'updated_at', (select max(computed_at) from ach)
  )
$fn$;

revoke all on function public.rpc_pub_summary(uuid, text, text, text, uuid) from public;
grant execute on function public.rpc_pub_summary(uuid, text, text, text, uuid) to anon, authenticated;


-- ============================================================
-- PART 4 — ตารางย่อย: แยกตามโรงเรียน / ชั้น / ห้อง / เกม
--   p_group = 'school' | 'grade' | 'classroom' | 'game'
--   คืนแถวละกลุ่ม พร้อมค่าเฉลี่ยผลสัมฤทธิ์และค่าเฉลี่ยสมรรถนะรวมทุกด้าน
--   ⚠️ ไม่มีชื่อนักเรียน ไม่มีโค้ดห้อง ไม่มีตัวตนครู — ดูกติกาข้อ 2 หัวไฟล์
-- ============================================================

/* [V.1.6.35] ลายเซ็นเปลี่ยน (เพิ่ม p_room) — drop ลายเซ็นเดิมก่อน กัน PGRST203 (เหตุผลเดียวกับ rpc_pub_summary) */
drop function if exists public.rpc_pub_breakdown(text, uuid, text, text, text);

create or replace function public.rpc_pub_breakdown(
  p_group  text default 'school',
  p_school uuid default null,
  p_grade  text default null,
  p_year   text default null,
  p_game   text default null,
  p_room   uuid default null)
returns jsonb
language sql
security definer
set search_path = public
stable
as $fn$
  with room as (
    select r.* from public.v_pub_rooms r
     where (p_school is null or r.school_id = p_school)
       and (p_grade  is null or r.grade = p_grade)
       and (p_year   is null or r.academic_year = p_year)
       and (p_room   is null or r.classroom_id = p_room)   -- [V.1.6.35] ตัวกรองห้อง — ยาม <5 ต่อกลุ่มมีอยู่แล้วข้างล่าง
  ),
  ach as (
    select a.student_id, a.percent, a.game_code, a.game_name, r.*
      from public.v_student_achievement a
      join room r on r.classroom_id = a.classroom_id
     where (p_game is null or a.game_code = p_game)
  ),
  dim as (
    /* [V.1.6.8] เติม comp_code — ใช้แตกค่าเฉลี่ยรายด้าน (comp_by_dim) */
    select d.student_id, d.score, d.game_code, d.comp_code, r.*
      from public.v_student_comp_dims d
      join room r on r.classroom_id = d.classroom_id
     where d.evidence <> 'self_report'
       and (p_game is null or d.game_code = p_game)
  ),
  keyed as (
    select case lower(coalesce(p_group, 'school'))
             when 'grade'     then coalesce(grade, '(ไม่ระบุชั้น)')
             when 'classroom' then classroom_id::text
             when 'game'      then game_code
             else coalesce(school_id::text, '(ไม่ระบุโรงเรียน)') end as k,
           case lower(coalesce(p_group, 'school'))
             when 'grade'     then coalesce(grade, '(ไม่ระบุชั้น)')
             when 'classroom' then room_name
             when 'game'      then game_name
             else coalesce(school_name, '(ไม่ระบุโรงเรียน)') end as label,
           case lower(coalesce(p_group, 'school'))
             when 'classroom' then coalesce(school_name, '') else '' end as sub,
           student_id, percent
      from ach
  ),
  dkeyed as (
    select case lower(coalesce(p_group, 'school'))
             when 'grade'     then coalesce(grade, '(ไม่ระบุชั้น)')
             when 'classroom' then classroom_id::text
             when 'game'      then game_code
             else coalesce(school_id::text, '(ไม่ระบุโรงเรียน)') end as k,
           /* [V.1.6.8] เติม comp_code เพื่อแตกค่าเฉลี่ยรายด้าน (comp_by_dim) */
           student_id, score, comp_code
      from dim
  ),
  /* [V.1.6.8] เดิม agg ตั้งต้นจาก keyed (ใบผลสัมฤทธิ์) อย่างเดียว
     ⇒ ห้องที่มีแต่ใบสมรรถนะไม่มีแถวในตารางเลย แต่คะแนนกลับถูกนับเข้าค่าเฉลี่ยโรงเรียน
     (เห็นเป็น n_students=2 แต่ comp_students=3 ในแถวเดียวกัน — ตัวเลขขัดกันเอง)
     ⇒ ตั้งต้นจาก 'ทุก key ที่มีข้อมูลอย่างใดอย่างหนึ่ง' แล้วค่อยเติมค่าที่มี */
  allkeys as (
    select k, min(label) as label, min(sub) as sub from keyed group by k
    union
    select k, null::text, null::text from dkeyed where k not in (select k from keyed)
  ),
  agg as (
    select ak.k,
           coalesce(min(ak.label), min(kd.dlabel), ak.k)      as label,
           coalesce(min(ak.sub),   min(kd.dsub),   '')        as sub,
           count(distinct kk.student_id)                      as n_students,
           count(kk.student_id)                               as n_results,
           round(avg(kk.percent)::numeric, 1)                 as avg_percent,
           /* [19 ส.ค. 2569] จำนวนหัวจริงของกลุ่มนี้ = รวมทั้งเด็กที่มีใบผลสัมฤทธิ์
              และเด็กที่มีแต่ใบสมรรถนะ · ใช้ตัดสินเพดาน 5 คนเท่านั้น ไม่ได้เอาไปแสดง */
           (select count(*) from (
              select kk2.student_id from keyed kk2 where kk2.k = ak.k
              union
              select dd2.student_id from dkeyed dd2 where dd2.k = ak.k) u)  as head_n
      from allkeys ak
      left join keyed kk on kk.k = ak.k
      left join lateral (
        /* ป้ายของห้องที่มีแต่ใบสมรรถนะ — ดึงจาก room ตรง ๆ ตามชนิดการจัดกลุ่ม */
        select case lower(coalesce(p_group, 'school'))
                 when 'grade'     then coalesce(r.grade, '(ไม่ระบุชั้น)')
                 when 'classroom' then r.room_name
                 when 'game'      then ak.k
                 else coalesce(r.school_name, '(ไม่ระบุโรงเรียน)') end as dlabel,
               case lower(coalesce(p_group, 'school'))
                 when 'classroom' then coalesce(r.school_name, '') else '' end as dsub
          from room r
         where ak.k in (r.classroom_id::text, r.school_id::text, r.grade)
         limit 1) kd on true
     group by ak.k
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', a.k, 'label', a.label, 'sub', nullif(a.sub, ''),
           'n_students', a.n_students, 'n_results', a.n_results,
           /* [19 ส.ค. 2569] เพดาน 5 คน — ต่ำกว่านี้คืน null ไม่ใช่ 0
              (0 แปลว่า "วัดแล้วได้ศูนย์" ซึ่งไม่จริง · null แปลว่า "ยังไม่แสดง") */
           'min_students', 5,
           'suppressed', (a.head_n < 5),
           'suppressed_note', case when a.head_n < 5
                then 'ยังไม่แสดงค่าเฉลี่ย — กลุ่มนี้มีนักเรียนน้อยกว่า 5 คน (ค่าเฉลี่ยจะเท่ากับคะแนนรายคน)'
                else null end,
           'avg_percent', case when a.head_n < 5 then null else a.avg_percent end,
           /* [V.1.6.8] ⚠️ comp_avg = ค่าเฉลี่ยข้ามด้าน ซึ่งแต่ละด้านคิดคนละสูตร:
              4 ด้าน (คิดขั้นสูง/สื่อสาร/พลเมือง/ธรรมชาติฯ) = 30% รวบยอด + 70% ย่อย
              แต่ จัดการตนเอง กับ รวมพลังทำงานเป็นทีม ไม่มีขารวบยอด จึงคิดจากย่อย 100%
              ⇒ ตัวเลขเดียวนี้เอาคนละมาตรวัดมาบวกกัน ห้ามใช้ตัดสินคุณภาพเด็ก
              คงคีย์เดิมไว้เพื่อไม่ให้ของที่อ่านอยู่พัง แต่เติมข้อมูลกำกับให้หน้าจอตัดสินใจได้ */
           'comp_avg', case when a.head_n < 5 then null else
                        (select round(avg(d.score)::numeric, 1) from dkeyed d where d.k = a.k) end,
           'comp_dims_n', (select count(distinct d.comp_code) from dkeyed d where d.k = a.k),
           'comp_avg_note', 'เฉลี่ยข้ามด้านที่คิดคนละสูตร — ใช้ดูภาพรวมเท่านั้น ไม่ใช้ตัดสิน',
           'comp_by_dim', case when a.head_n < 5 then '{}'::jsonb else
                           (select coalesce(jsonb_object_agg(x.comp_code, x.s), '{}'::jsonb)
                              from (select d.comp_code, round(avg(d.score)::numeric, 1) as s
                                      from dkeyed d where d.k = a.k group by d.comp_code) x) end,
           'comp_students', (select count(distinct d.student_id) from dkeyed d where d.k = a.k))
         /* เรียงตามชื่อ ไม่ใช่ตามคะแนน — ครูตัดสินว่าไม่จัดอันดับโรงเรียน */
         order by a.label), '[]'::jsonb)
    from agg a
$fn$;

revoke all on function public.rpc_pub_breakdown(text, uuid, text, text, text, uuid) from public;
grant execute on function public.rpc_pub_breakdown(text, uuid, text, text, text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';


-- ============================================================
-- PART 5 — ตรวจผล
-- ============================================================

select 'ฟังก์ชันสาธารณะครบ 3 ตัว' as รายการ,
       (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname='public' and p.proname in
               ('rpc_pub_filters','rpc_pub_summary','rpc_pub_breakdown')) as ผล
union all
select 'anon เรียกได้ทั้งสามตัว',
       case when has_function_privilege('anon','public.rpc_pub_filters()','execute')
             and has_function_privilege('anon','public.rpc_pub_summary(uuid,text,text,text,uuid)','execute')
             and has_function_privilege('anon','public.rpc_pub_breakdown(text,uuid,text,text,text,uuid)','execute')
            then '✅ ครบ' else '❌ ขาด' end
union all
/* [V.1.6.35] กัน PGRST203: ต้องเหลือลายเซ็นเดียวต่อฟังก์ชัน — ลายเซ็นเก่าถูก drop แล้ว */
select '⚠️ แต่ละฟังก์ชันต้องมีลายเซ็นเดียว (กัน PGRST203)',
       case when (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname='public' and p.proname='rpc_pub_summary') = 1
             and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname='public' and p.proname='rpc_pub_breakdown') = 1
            then '✅ เดียว' else '❌ ซ้อน — PostgREST จะ ambiguous' end
union all
select '⚠️ view ภายใน v_pub_rooms ต้อง **ไม่** ให้ anon อ่านตรง ๆ',
       case when has_table_privilege('anon','public.v_pub_rooms','select')
            then '❌ อ่านได้ — ผิด' else '✅ อ่านไม่ได้ (ถูกต้อง)' end
union all
select 'ห้องที่นับเข้าหน้าสาธารณะตอนนี้', (select count(*)::text from public.v_pub_rooms);

-- ► ทดลอง: select public.rpc_pub_summary();
--   ต้องได้ ach/comps/units ครบ และไม่มีชื่อนักเรียนโผล่มาสักตัว


-- ============================================================
-- ROLLBACK
-- ============================================================
-- drop function if exists public.rpc_pub_breakdown(text, uuid, text, text, text, uuid);
-- drop function if exists public.rpc_pub_summary(uuid, text, text, text, uuid);
-- drop function if exists public.rpc_pub_filters();
-- drop view if exists public.v_pub_rooms;
-- ⚠️ ไม่มีตารางหรือข้อมูลใดถูกแตะในไฟล์นี้ — ย้อนกลับแล้วไม่มีอะไรเสีย
--    (หน้า dashboard.html จะขึ้นกล่องบอกว่ายังไม่ได้รันไฟล์นี้ ส่วนหน้าอื่นไม่กระทบ)
-- ============================================================
