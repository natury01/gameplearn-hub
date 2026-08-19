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
-- 📌 **ครูตัดสินใจไว้ว่า "แสดงทุกห้อง ไม่ต้องซ่อนห้องที่เด็กน้อย"**
--    ⇒ ไฟล์นี้ไม่มีเพดานจำนวนขั้นต่ำ · ถ้าวันหนึ่งเปลี่ยนใจ ให้เพิ่มเงื่อนไข
--    `having count(distinct …) >= N` ที่ query ของ rpc_pub_breakdown จุดเดียว
--    (จดไว้ตรงนี้เพื่อให้คนที่มาทีหลังรู้ว่าไม่ได้ลืม แต่เป็นการตัดสินใจ)
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

create or replace function public.rpc_pub_summary(
  p_school uuid default null,
  p_grade  text default null,
  p_year   text default null,
  p_game   text default null)
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
  ),
  ach as (
    select a.* from public.v_student_achievement a
     join room r on r.classroom_id = a.classroom_id
     where (p_game is null or a.game_code = p_game)
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
    select u.key as unit_name,
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
     group by u.key
  )
  select jsonb_build_object(
    'scope', jsonb_build_object('school', p_school, 'grade', p_grade, 'year', p_year, 'game', p_game),
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
      'avg_percent', (select round(avg(percent)::numeric, 1) from ach),
      'avg_all',     (select round(avg(percent)::numeric, 1) from ach_all),
      'dist', (select coalesce(jsonb_agg(jsonb_build_object('band', b.band, 'label', b.label, 'n', b.n)
                                         order by b.ord), '[]'::jsonb)
                 from (select 1 as ord, '80-100' as band, 'ดีเยี่ยม (80–100)' as label,
                              count(*) filter (where percent >= 80) as n from ach
                       union all select 2, '70-79',  'ดี (70–79)',        count(*) filter (where percent >= 70 and percent < 80) from ach
                       union all select 3, '60-69',  'พอใช้ (60–69)',      count(*) filter (where percent >= 60 and percent < 70) from ach
                       union all select 4, '50-59',  'ผ่านเกณฑ์ (50–59)',  count(*) filter (where percent >= 50 and percent < 60) from ach
                       union all select 5, '0-49',   'ต้องช่วยเหลือ (ต่ำกว่า 50)', count(*) filter (where percent < 50) from ach) b)),
    'comps', (select coalesce(jsonb_agg(jsonb_build_object(
                       'code', c.code, 'name', c.name,
                       'n_students', c.n_students, 'avg_score', c.avg_score,
                       'avg_all', c.avg_all) order by c.ord), '[]'::jsonb)
                from (select v.ord, v.code,
                             coalesce((select min(d.comp_name) from dim d where d.comp_code = v.code), v.nm) as name,
                             (select count(distinct d.student_id) from dim d where d.comp_code = v.code) as n_students,
                             (select round(avg(d.score)::numeric, 1) from dim d where d.comp_code = v.code) as avg_score,
                             (select round(avg(a.score)::numeric, 1) from dim_all a where a.comp_code = v.code) as avg_all
                        from (values (1,'SM','การจัดการตนเอง'), (2,'HOT','การคิดขั้นสูง'),
                                     (3,'CM','การสื่อสาร'), (4,'TW','การรวมพลังทำงานเป็นทีม'),
                                     (5,'CZ','การเป็นพลเมืองที่เข้มแข็ง'),
                                     (6,'SN','การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน'))
                             as v(ord, code, nm)) c),
    'units', (select coalesce(jsonb_agg(jsonb_build_object('name', unit_name, 'n', n, 'avg', avg_value)
                              order by unit_name), '[]'::jsonb) from units),
    'updated_at', (select max(computed_at) from ach)
  )
$fn$;

revoke all on function public.rpc_pub_summary(uuid, text, text, text) from public;
grant execute on function public.rpc_pub_summary(uuid, text, text, text) to anon, authenticated;


-- ============================================================
-- PART 4 — ตารางย่อย: แยกตามโรงเรียน / ชั้น / ห้อง / เกม
--   p_group = 'school' | 'grade' | 'classroom' | 'game'
--   คืนแถวละกลุ่ม พร้อมค่าเฉลี่ยผลสัมฤทธิ์และค่าเฉลี่ยสมรรถนะรวมทุกด้าน
--   ⚠️ ไม่มีชื่อนักเรียน ไม่มีโค้ดห้อง ไม่มีตัวตนครู — ดูกติกาข้อ 2 หัวไฟล์
-- ============================================================

create or replace function public.rpc_pub_breakdown(
  p_group  text default 'school',
  p_school uuid default null,
  p_grade  text default null,
  p_year   text default null,
  p_game   text default null)
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
           round(avg(kk.percent)::numeric, 1)                 as avg_percent
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
           'avg_percent', a.avg_percent,
           /* [V.1.6.8] ⚠️ comp_avg = ค่าเฉลี่ยข้ามด้าน ซึ่งแต่ละด้านคิดคนละสูตร:
              4 ด้าน (คิดขั้นสูง/สื่อสาร/พลเมือง/ธรรมชาติฯ) = 30% รวบยอด + 70% ย่อย
              แต่ จัดการตนเอง กับ รวมพลังทำงานเป็นทีม ไม่มีขารวบยอด จึงคิดจากย่อย 100%
              ⇒ ตัวเลขเดียวนี้เอาคนละมาตรวัดมาบวกกัน ห้ามใช้ตัดสินคุณภาพเด็ก
              คงคีย์เดิมไว้เพื่อไม่ให้ของที่อ่านอยู่พัง แต่เติมข้อมูลกำกับให้หน้าจอตัดสินใจได้ */
           'comp_avg', (select round(avg(d.score)::numeric, 1) from dkeyed d where d.k = a.k),
           'comp_dims_n', (select count(distinct d.comp_code) from dkeyed d where d.k = a.k),
           'comp_avg_note', 'เฉลี่ยข้ามด้านที่คิดคนละสูตร — ใช้ดูภาพรวมเท่านั้น ไม่ใช้ตัดสิน',
           'comp_by_dim', (select coalesce(jsonb_object_agg(x.comp_code, x.s), '{}'::jsonb)
                             from (select d.comp_code, round(avg(d.score)::numeric, 1) as s
                                     from dkeyed d where d.k = a.k group by d.comp_code) x),
           'comp_students', (select count(distinct d.student_id) from dkeyed d where d.k = a.k))
         /* เรียงตามชื่อ ไม่ใช่ตามคะแนน — ครูตัดสินว่าไม่จัดอันดับโรงเรียน */
         order by a.label), '[]'::jsonb)
    from agg a
$fn$;

revoke all on function public.rpc_pub_breakdown(text, uuid, text, text, text) from public;
grant execute on function public.rpc_pub_breakdown(text, uuid, text, text, text) to anon, authenticated;

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
             and has_function_privilege('anon','public.rpc_pub_summary(uuid,text,text,text)','execute')
             and has_function_privilege('anon','public.rpc_pub_breakdown(text,uuid,text,text,text)','execute')
            then '✅ ครบ' else '❌ ขาด' end
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
-- drop function if exists public.rpc_pub_breakdown(text, uuid, text, text, text);
-- drop function if exists public.rpc_pub_summary(uuid, text, text, text);
-- drop function if exists public.rpc_pub_filters();
-- drop view if exists public.v_pub_rooms;
-- ⚠️ ไม่มีตารางหรือข้อมูลใดถูกแตะในไฟล์นี้ — ย้อนกลับแล้วไม่มีอะไรเสีย
--    (หน้า dashboard.html จะขึ้นกล่องบอกว่ายังไม่ได้รันไฟล์นี้ ส่วนหน้าอื่นไม่กระทบ)
-- ============================================================
