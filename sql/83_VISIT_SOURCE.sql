-- ============================================================
-- 83_VISIT_SOURCE.sql — สถิติการเข้าถึงเกม: นับจากตัวเกมเอง + ป้ายแหล่งที่มา
-- เกมเพลิน (GamePlearn) · 23 ส.ค. 2569 · ตามคำสั่งครู
--
-- ครูสั่ง: "เว็บไซต์ อยากให้เก็บสถิติจากการเข้าถึงเกมเลย
--          ปัจจุบันเก็บแค่จากการเข้าจากหน้าเว็บไซต์"
--
-- ปัญหาวันนี้ (ตรวจจากโค้ดจริง ไม่ได้เดา):
--   1. เว็บกลางนับ "กดปุ่มเล่นเกม" จากหน้าเว็บเท่านั้น (js/gp-brand.js บรรทัด 108)
--      ⇒ เด็กที่เข้าจาก QR โค้ด หรือลิงก์ที่ครูส่งใน LINE **ไม่ถูกนับเลย**
--   2. 🔴 บั๊กที่มีอยู่แล้ว: หน้า "ผลการเรียนรู้" (dashboard.html) ส่ง p_page='dashboard'
--      แต่ 'dashboard' **ไม่อยู่ในรายการหน้าที่อนุญาต** ของ rpc_track_visit ในไฟล์ 52
--      ⇒ ฟังก์ชัน return ทิ้งเงียบ ๆ · การเข้าหน้านั้น **ไม่เคยถูกนับสักครั้ง**
--   3. 🔴 สองภาคใช้รหัสส่งคะแนนเดียวกันเป๊ะ ('kanchanaburi2050' ทั้งคู่)
--      ⇒ ถ้านับด้วยรหัสอย่างเดียว ตัวเลขของสองภาคจะรวมกันเป็นก้อนเดียว แยกไม่ออก
--
-- สิ่งที่ไฟล์นี้ทำ:
--   · เพิ่มคอลัมน์ source ให้ visit_daily ('hub' | 'qr' | 'direct' | 'unknown')
--   · rpc_track_visit ฉบับใหม่ รับ p_source และ p_game_version
--     แล้วแปลงเป็นรหัสของ "ภาคที่ถูกต้อง" ด้วย gp_resolve_game ให้เอง
--   · เพิ่ม 'dashboard' และ 'gameopen' เข้ารายการหน้าที่อนุญาต
--
-- ⚠️ ทำไมต้องแยก 'gameopen' ออกจาก 'game':
--     'game'     = กดปุ่มเล่นจากเว็บกลาง (ความหมายเดิม มีข้อมูลย้อนหลังอยู่แล้ว)
--     'gameopen' = ตัวเกมเปิดขึ้นจริง (ของใหม่)
--   ถ้าใช้ชื่อเดียวกัน ตัวเลขจะเด้งเป็นสองเท่าในวันที่ปล่อย และเทียบกับ
--   ข้อมูลย้อนหลังไม่ได้อีกเลย — ซึ่งแก้คืนไม่ได้เพราะข้อมูลปนกันไปแล้ว
--
-- ต้องรัน 52_VISIT_STATS.sql และ 43_REPORT_CARDS.sql ก่อน
-- idempotent รันซ้ำได้ · ไม่แตะข้อมูลที่มีอยู่ · มีวิธีถอยท้ายไฟล์
-- ============================================================

-- ── ยามกันรันผิดลำดับ ──
do $guard$
begin
  if to_regclass('public.visit_daily') is null then
    raise exception E'ยังไม่มีตาราง visit_daily — ต้องรัน 52_VISIT_STATS.sql ก่อนไฟล์นี้';
  end if;
  if to_regprocedure('public.gp_resolve_game(text,text)') is null then
    raise exception E'ยังไม่มี gp_resolve_game — ต้องรัน 43_REPORT_CARDS.sql ก่อนไฟล์นี้';
  end if;
end
$guard$;


-- ============================================================
-- PART 1 — เพิ่มคอลัมน์ source แล้วขยายกุญแจหลัก
--
-- ⚠️ ลำดับในบล็อกนี้สำคัญมาก: ต้องตรวจ "กุญแจหลักมี source แล้วหรือยัง"
--    ไม่ใช่ตรวจ "คอลัมน์ source มีแล้วหรือยัง"
--    ถ้าตรวจด้วยคอลัมน์ พอเพิ่มคอลัมน์เสร็จรอบแรก รอบถัดไปจะข้ามทั้งบล็อก
--    ⇒ กุญแจหลักไม่ถูกขยาย แล้ว on conflict ในฟังก์ชันจะโยน
--      "there is no unique or exclusion constraint matching the ON CONFLICT"
--    = พังตอนมีคนเข้าเว็บจริง ไม่ใช่ตอนรันไฟล์ ซึ่งหาสาเหตุยากที่สุด
-- ============================================================

do $mig$
begin
  if not exists (
    select 1
      from pg_index i
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
     where i.indrelid = 'public.visit_daily'::regclass
       and i.indisprimary
       and a.attname = 'source')
  then
    alter table public.visit_daily add column if not exists source text not null default 'unknown';
    alter table public.visit_daily drop constraint if exists visit_daily_pkey;
    alter table public.visit_daily add primary key (day, page, game_code, device, source);
    raise notice '[ย้ายโครงสร้างแล้ว] visit_daily มีคอลัมน์ source และกุญแจหลักใหม่';
  else
    raise notice '[ข้าม] visit_daily มี source ในกุญแจหลักอยู่แล้ว';
  end if;
end
$mig$;

comment on column public.visit_daily.source is
  'มาจากไหน: hub (กดจากเว็บกลาง) · qr (สแกนคิวอาร์) · direct (พิมพ์ลิงก์/แชร์ต่อ) · unknown';


-- ============================================================
-- PART 2 — rpc_track_visit ฉบับใหม่
--
-- พารามิเตอร์ทุกตัวหลัง p_page มีค่าตั้งต้น **โดยตั้งใจ**
--   เว็บกลางรุ่นที่ครูอัปไว้ตอนนี้ส่งมาแค่ 3 ตัว (p_page/p_new/p_device)
--   ถ้าตัวใหม่ไม่มี default พอ drop ตัวเก่า เว็บที่ยังไม่ได้อัปจะยิงไม่ติดทันที
--   ⇒ สถิติหยุดนับเงียบ ๆ ระหว่างรอครูอัปเว็บ
-- ============================================================

create or replace function public.rpc_track_visit(
  p_page         text,
  p_game_code    text    default null,
  p_new          boolean default false,
  p_device       text    default null,   -- 'mobile' | 'pc' · ไม่ส่ง = 'unknown'
  p_source       text    default null,   -- 'hub' | 'qr' | 'direct' · ไม่ส่ง = 'unknown'
  p_game_version text    default null    -- ใช้แยกภาคเมื่อสองภาคใช้รหัสร่วมกัน
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_page text := lower(btrim(coalesce(p_page, '')));
  v_game text := left(btrim(coalesce(p_game_code, '')), 60);
  v_dev  text := lower(btrim(coalesce(p_device, '')));
  v_src  text := lower(btrim(coalesce(p_source, '')));
  v_id   uuid;
begin
  if v_dev not in ('mobile', 'pc') then v_dev := 'unknown'; end if;
  -- รายการค่าที่อนุญาต — กันข้อมูลขยะและกันคนยิงสร้างแถวมั่ว (กติกาเดิมของไฟล์ 52)
  if v_src not in ('hub', 'qr', 'direct') then v_src := 'unknown'; end if;

  -- 'dashboard' เพิ่มเพราะหน้า "ผลการเรียนรู้" ส่งค่านี้มาตลอดแต่ถูกทิ้งเงียบ (บั๊กเดิม)
  -- 'gameopen' เพิ่มใหม่ = ตัวเกมเปิดขึ้นจริง แยกจาก 'game' ที่แปลว่ากดปุ่มจากเว็บกลาง
  if v_page not in ('home','games','game','gameopen','standards','teacher','dashboard',
                    'support','contact','join','admin') then
    return;
  end if;
  if v_page not in ('game', 'gameopen') then v_game := ''; end if;

  -- แยกภาคให้ถูกก่อนบันทึก — ภาค 1 กับภาค 2 ส่งรหัสเดียวกันเป๊ะ ('kanchanaburi2050')
  -- ถ้าไม่แปลง ตัวเลขของสองภาคจะกองรวมกันเป็นก้อนเดียว แยกกลับไม่ได้อีกเลย
  -- gp_resolve_game โยน exception เมื่อรหัสใช้ร่วมกันแต่ไม่ส่งรุ่นมา
  -- ⇒ ต้องกลืนไว้ การนับสถิติห้ามทำให้หน้าเว็บของครูพัง
  if v_game <> '' and coalesce(btrim(p_game_version), '') <> '' then
    begin
      v_id := public.gp_resolve_game(v_game, p_game_version);
      if v_id is not null then
        select code into v_game from public.games where id = v_id;
      end if;
    exception when others then
      null;   -- แยกภาคไม่ได้ = บันทึกด้วยรหัสที่ส่งมา ดีกว่าไม่นับเลย
    end;
  end if;

  insert into public.visit_daily as v (day, page, game_code, device, source, views, visitors)
  values (current_date, v_page, v_game, v_dev, v_src, 1, case when p_new then 1 else 0 end)
  on conflict (day, page, game_code, device, source) do update
    set views    = v.views + 1,
        visitors = v.visitors + case when p_new then 1 else 0 end;
end
$fn$;

-- ตัวเก่าต้องหายไป ไม่งั้น PostgREST เลือกไม่ถูกว่าจะเรียกตัวไหน
-- (ปัญหา "ฟังก์ชันชื่อซ้ำ" แบบเดียวกับที่ไฟล์ 52 เจอและเก็บกวาดไปแล้วครั้งหนึ่ง)
-- ⚠️ ต้อง drop **หลัง** สร้างตัวใหม่เสมอ — ถ้า drop ก่อนแล้วตัวใหม่สร้างไม่สำเร็จ
--    จะไม่เหลือฟังก์ชันเลย สถิติหยุดนับทันที
drop function if exists public.rpc_track_visit(text, text, boolean, text);

revoke all on function public.rpc_track_visit(text, text, boolean, text, text, text) from public;
grant execute on function public.rpc_track_visit(text, text, boolean, text, text, text) to anon, authenticated;

comment on function public.rpc_track_visit(text, text, boolean, text, text, text) is
  'นับการเข้าชม 1 ครั้ง — เรียกได้จากเว็บกลางและจากตัวเกม · p_source บอกว่ามาจากไหน';


-- ============================================================
-- PART 3 — วิวสรุป
--   ต้อง drop ก่อน ไม่ใช่ create or replace เพราะเพิ่มคอลัมน์กลางวิว
--   (Postgres ไม่ยอมให้ replace วิวที่ลำดับ/ชื่อคอลัมน์เปลี่ยน)
-- ============================================================

drop view if exists public.v_game_activity;
drop view if exists public.v_visit_daily;

create or replace view public.v_visit_daily
with (security_invoker = on) as
select day, page, nullif(game_code, '') as game_code, device, source, views, visitors
  from public.visit_daily
 where day >= current_date - 90;

-- สรุปรายเกม — แยก "กดจากเว็บกลาง" ออกจาก "เกมเปิดขึ้นจริง" ให้ชัด
--   click_*    = กดปุ่มเล่นจากเว็บกลาง (ความหมายเดิม ข้อมูลย้อนหลังใช้ต่อได้)
--   open_*     = ตัวเกมเปิดขึ้นจริง (ของใหม่ · รวมคนที่เข้าจาก QR/ลิงก์ตรงด้วย)
--   open_qr / open_direct / open_hub = แยกตามแหล่งที่มา ซึ่งคือสิ่งที่ครูขอ
create or replace view public.v_game_activity
with (security_invoker = on) as
with clicks as (
  select game_code,
         sum(views)                                          as click_all,
         sum(views) filter (where day >= current_date - 6)   as click_7d,
         sum(views) filter (where day >= current_date - 29)  as click_30d,
         sum(views) filter (where device = 'mobile')         as click_mobile,
         sum(views) filter (where device = 'pc')             as click_pc
    from public.visit_daily
   where page = 'game' and game_code <> ''
   group by game_code
), opens as (
  select game_code,
         sum(views)                                          as open_all,
         sum(views) filter (where day >= current_date - 6)   as open_7d,
         sum(views) filter (where day >= current_date - 29)  as open_30d,
         sum(views) filter (where source = 'hub')            as open_hub,
         sum(views) filter (where source = 'qr')             as open_qr,
         sum(views) filter (where source = 'direct')         as open_direct,
         sum(views) filter (where source = 'unknown')        as open_unknown,
         sum(visitors)                                       as open_visitors
    from public.visit_daily
   where page = 'gameopen' and game_code <> ''
   group by game_code
), plays as (
  select g.code                        as game_code,
         count(*)                      as play_all,
         count(distinct p.student_id)  as players_all
    from public.student_game_progress p
    join public.games g on g.id = p.game_id
   group by g.code
)
select g.code as game_code, g.name as game_name, g.status,
       coalesce(c.click_all, 0)     as click_all,
       coalesce(c.click_7d, 0)      as click_7d,
       coalesce(c.click_30d, 0)     as click_30d,
       coalesce(c.click_mobile, 0)  as click_mobile,
       coalesce(c.click_pc, 0)      as click_pc,
       coalesce(o.open_all, 0)      as open_all,
       coalesce(o.open_7d, 0)       as open_7d,
       coalesce(o.open_30d, 0)      as open_30d,
       coalesce(o.open_hub, 0)      as open_hub,
       coalesce(o.open_qr, 0)       as open_qr,
       coalesce(o.open_direct, 0)   as open_direct,
       coalesce(o.open_unknown, 0)  as open_unknown,
       coalesce(o.open_visitors, 0) as open_visitors,
       coalesce(p.play_all, 0)      as play_all,
       coalesce(p.players_all, 0)   as players_all
  from public.games g
  left join clicks c on c.game_code = g.code
  left join opens  o on o.game_code = g.code
  left join plays  p on p.game_code = g.code;


notify pgrst, 'reload schema';


-- ============================================================
-- ตรวจผล — วางต่อท้ายแล้วดูว่าได้ true ทั้งสามบรรทัด
-- ============================================================
-- select exists (select 1 from information_schema.columns
--   where table_schema='public' and table_name='visit_daily' and column_name='source') as "มีคอลัมน์ source";
-- select pg_get_functiondef(oid) like '%gameopen%' as "รับหน้า gameopen แล้ว"
--   from pg_proc where proname='rpc_track_visit';
-- select pg_get_functiondef(oid) like '%dashboard%' as "นับหน้าผลการเรียนรู้แล้ว"
--   from pg_proc where proname='rpc_track_visit';


-- ============================================================
-- ROLLBACK — ถ้าต้องถอย
-- ============================================================
--   รัน 52_VISIT_STATS.sql ซ้ำอีกครั้ง จะได้ฟังก์ชัน 4 พารามิเตอร์และวิวชุดเดิมคืน
--   จากนั้นถ้าอยากถอยโครงสร้างด้วย (ไม่จำเป็น · คอลัมน์ที่เกินไม่รบกวนของเดิม):
--     alter table public.visit_daily drop constraint if exists visit_daily_pkey;
--     alter table public.visit_daily add primary key (day, page, game_code, device);
--     alter table public.visit_daily drop column if exists source;
--   ⚠️ การถอยคอลัมน์ source จะรวมแถวที่แยกตามแหล่งที่มาเข้าด้วยกันไม่ได้
--      ต้องรวมเองก่อน ไม่งั้น add primary key จะล้มเพราะกุญแจซ้ำ:
--        delete from public.visit_daily a using public.visit_daily b
--         where a.ctid < b.ctid and a.day=b.day and a.page=b.page
--           and a.game_code=b.game_code and a.device=b.device;
--      (บรรทัดนี้ **ลบข้อมูล** — อ่านให้เข้าใจก่อนรัน)
