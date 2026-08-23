-- ============================================================
-- 52_VISIT_STATS.sql — เก็บสถิติการเยี่ยมชมเว็บและการเข้าเล่นรายเกม (ฉบับแก้ 2)
-- เกมเพลิน (GamePlearn) · 2026-08-11 · ตามที่ครูสั่ง 11 ส.ค. (บ่าย)
--
-- ฉบับแก้ 2: แยกตัวเลขตาม "ชนิดเครื่อง" (มือถือ/แท็บเล็ต vs คอมพิวเตอร์) ตามที่ครูขอเพิ่ม
--   รันทับของเดิมได้เลย — มีท่อนย้ายโครงสร้างให้ ข้อมูลที่เก็บมาแล้วไม่หาย
--   (แถวเก่าที่ยังไม่รู้ชนิดเครื่องจะกลายเป็น device='unknown' ซึ่งถูกต้องตามความเป็นจริง)
--
-- ที่มา: หน้า Admin ยังไม่มีตัวเลขว่ามีคนเข้าเว็บกี่คน เข้าเกมไหนบ้าง
--        เพราะ **ระบบไม่เคยเก็บข้อมูลนี้เลยสักแถว** ต้องสร้างที่เก็บก่อนถึงจะมีเลขให้ดู
--        (จำนวนการเล่น/ผู้เล่นรายเกมมีอยู่แล้วใน attempts/events — ไม่ต้องเก็บซ้ำ)
--
-- 🔒 หลักที่ยึดในไฟล์นี้ — เก็บให้น้อยที่สุดเท่าที่ตอบคำถามครูได้:
--    ❌ ไม่เก็บ IP · ไม่เก็บ user agent · ไม่เก็บ referrer · ไม่เก็บ cookie
--    ❌ ไม่เก็บรายแถวต่อคน — เก็บเป็น "ตัวนับรายวัน" เท่านั้น ย้อนรอยกลับไปหาคนไม่ได้
--    ✅ นับผู้เยี่ยมชมด้วยธงในเครื่องผู้ใช้เอง (localStorage) วันละครั้ง ไม่มีรหัสประจำตัวส่งขึ้นเซิร์ฟเวอร์
--    เหตุผล: ผู้ใช้ส่วนใหญ่เป็นเด็กประถม การเก็บรอยเท้าดิจิทัลของเด็กเกินจำเป็นคือความเสี่ยง
--    ที่ไม่คุ้มกับประโยชน์ของตัวเลขบนหน้า Admin
--
-- ✅ ไม่ใช้ pgcrypto · idempotent รันซ้ำได้
-- ============================================================


-- ============================================================
-- PART 1 — ตัวนับรายวัน
--   1 แถว = (วัน, หน้า, เกม) · เพิ่มทีละ 1 ผ่าน RPC เท่านั้น
--   ตารางนี้โตวันละไม่กี่สิบแถว ต่อให้ใช้ไปสิบปีก็ยังเล็กกว่า events หนึ่งวัน
-- ============================================================

create table if not exists public.visit_daily (
  day        date    not null default current_date,
  page       text    not null,
  game_code  text    not null default '',        -- ใส่เมื่อ page = 'game' (กดเล่นเกมไหน)
  device     text    not null default 'unknown', -- 'mobile' | 'pc' | 'unknown'
  views      integer not null default 0,         -- จำนวนครั้งที่เปิด
  visitors   integer not null default 0,         -- จำนวนเครื่องที่เปิดครั้งแรกของวันนั้น
  primary key (day, page, game_code, device)
);

-- ── ย้ายโครงสร้างสำหรับฐานที่รันฉบับแรกไปแล้ว (เพิ่มคอลัมน์ + ขยายกุญแจหลัก) ──
--    ไม่ลบข้อมูลเดิม · รันซ้ำได้ · ฐานที่เพิ่งสร้างใหม่จะข้ามท่อนนี้ไปเอง
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='visit_daily' and column_name='device') then
    alter table public.visit_daily add column device text not null default 'unknown';
    alter table public.visit_daily drop constraint if exists visit_daily_pkey;
    alter table public.visit_daily add primary key (day, page, game_code, device);
    raise notice '[ย้ายโครงสร้างแล้ว] visit_daily มีคอลัมน์ device และกุญแจหลักใหม่';
  end if;
end $$;

-- ชนิดเครื่องที่ยอมรับ — กันค่าขยะจากคำขอที่ปลอมมา
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'visit_device_ck') then
    alter table public.visit_daily
      add constraint visit_device_ck check (device in ('mobile','pc','unknown'));
  end if;
end $$;

comment on table public.visit_daily is
  'ตัวนับการเยี่ยมชมรายวัน — ไม่มีข้อมูลส่วนบุคคลใด ๆ ย้อนกลับไปหาผู้ใช้รายคนไม่ได้';

alter table public.visit_daily enable row level security;

-- อ่านได้เฉพาะผู้ดูแล · ไม่มี policy insert/update/delete เลย
-- ทางเดียวที่เขียนได้คือ RPC ด้านล่าง ซึ่งเพิ่มได้อย่างเดียว แก้ค่าย้อนหลังไม่ได้
drop policy if exists visit_admin_read on public.visit_daily;
create policy visit_admin_read on public.visit_daily
  for select to authenticated using (public.is_admin());


-- ============================================================
-- PART 2 — RPC บันทึกการเยี่ยมชม (anon เรียกได้ — ทุกหน้าเรียกตอนโหลด)
--
--   p_page       ต้องอยู่ในรายการที่อนุญาตเท่านั้น กันข้อมูลขยะและกันคนยิงสร้างแถวมั่ว
--   p_game_code  ใส่เฉพาะตอน page='game' · ตัดที่ 60 ตัวอักษร
--   p_new        true = เครื่องนี้เพิ่งเปิดเว็บครั้งแรกของวัน (ฝั่งหน้าเว็บเป็นคนตัดสิน)
--
--   ⚠️ ตัวเลขนี้เป็น "ตัวชี้วัดคร่าว ๆ" ไม่ใช่สถิติที่กันการปลอมได้
--   ใครก็ตามที่ถือคีย์ anon (ซึ่งเปิดเผยอยู่ในหน้าเว็บ) ยิงเพิ่มตัวเลขได้
--   ถ้าวันหนึ่งต้องใช้ตัวเลขนี้ในงานวิจัยหรือรายงานที่มีผลจริง ต้องเปลี่ยนไปใช้
--   บริการวัดผลที่กันการปลอมได้ — เขียนไว้ตรงนี้เพื่อไม่ให้มีใครเผลออ้างเกินจริง
-- ============================================================

create or replace function public.rpc_track_visit(
  p_page      text,
  p_game_code text    default null,
  p_new       boolean default false,
  p_device    text    default null      -- 'mobile' | 'pc' · ไม่ส่ง = 'unknown'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page text := lower(btrim(coalesce(p_page, '')));
  v_game text := left(btrim(coalesce(p_game_code, '')), 60);
  v_dev  text := lower(btrim(coalesce(p_device, '')));
begin
  if v_dev not in ('mobile','pc') then v_dev := 'unknown'; end if;
  -- รายการหน้าที่อนุญาต — เพิ่มหน้าใหม่ต้องมาเพิ่มตรงนี้ด้วย (ตั้งใจให้เป็นแบบนั้น)
  if v_page not in ('home','games','game','standards','teacher','support','contact','join','admin') then
    return;
  end if;
  if v_page <> 'game' then v_game := ''; end if;

  insert into public.visit_daily as v (day, page, game_code, device, views, visitors)
  values (current_date, v_page, v_game, v_dev, 1, case when p_new then 1 else 0 end)
  on conflict (day, page, game_code, device) do update
    set views    = v.views + 1,
        visitors = v.visitors + case when p_new then 1 else 0 end;
end $$;

-- ตัวเก่า 3 พารามิเตอร์ถูกทิ้งไว้ไม่ได้ — PostgREST จะเลือกไม่ถูกว่าจะเรียกตัวไหน
-- (ปัญหา "ฟังก์ชันชื่อซ้ำ" แบบเดียวกับที่เตือนไว้ในไฟล์ 48 — ที่นี่เรารู้ตัวจึงเก็บกวาดเอง)
drop function if exists public.rpc_track_visit(text, text, boolean);

revoke all on function public.rpc_track_visit(text, text, boolean, text) from public;
grant execute on function public.rpc_track_visit(text, text, boolean, text) to anon, authenticated;


-- ============================================================
-- PART 3 — วิวสรุปสำหรับหน้า Admin
--   security_invoker = on → RLS ของ visit_daily บังคับต่อ (ผู้ดูแลเท่านั้นที่อ่านได้)
-- ============================================================

-- ⚠️ ต้อง drop ก่อน ไม่ใช่ create or replace — ฉบับแก้ 2 เพิ่มคอลัมน์ device เข้ากลางวิว
--    Postgres ไม่ยอมให้ replace วิวที่ลำดับ/ชื่อคอลัมน์เปลี่ยน (ERROR: cannot change name of view column)
--    วิวสองตัวนี้ไม่มีอะไรพึ่งพา ทิ้งแล้วสร้างใหม่จึงปลอดภัย (ข้อมูลอยู่ในตาราง ไม่ได้อยู่ในวิว)
drop view if exists public.v_game_activity;
drop view if exists public.v_visit_daily;

-- 3.1 รายวัน 90 วันล่าสุด (ทำกราฟ/ตารางย้อนหลัง)
create or replace view public.v_visit_daily
with (security_invoker = on) as
select day, page, nullif(game_code, '') as game_code, device, views, visitors
  from public.visit_daily
 where day >= current_date - 90;

-- 3.2 สรุปรายเกม: การเยี่ยมชม (กดเล่น) + การเล่นจริง (จาก attempts) ในตารางเดียว
--     ตั้งใจวางคู่กัน เพราะสองเลขนี้ตอบคนละคำถาม —
--     "กดเล่นกี่ครั้ง" กับ "เล่นจนมีผลกี่รอบ" ต่างกันมาก และส่วนต่างคือสิ่งที่น่าสนใจที่สุด
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
), plays as (
  select g.code                                       as game_code,
         count(*)                                     as play_all,
         count(distinct p.student_id)                 as players_all
    from public.student_game_progress p
    join public.games g on g.id = p.game_id
   group by g.code
)
select g.code as game_code, g.name as game_name, g.status,
       coalesce(c.click_all, 0)  as click_all,
       coalesce(c.click_7d, 0)   as click_7d,
       coalesce(c.click_30d, 0)  as click_30d,
       coalesce(c.click_mobile, 0) as click_mobile,
       coalesce(c.click_pc, 0)     as click_pc,
       coalesce(p.play_all, 0)   as play_all,
       coalesce(p.players_all, 0) as players_all
  from public.games g
  left join clicks c on c.game_code = g.code
  left join plays  p on p.game_code = g.code;

notify pgrst, 'reload schema';


-- ============================================================
-- PART 4 — ตรวจผล
-- ============================================================

select 'ตาราง visit_daily' as รายการ,
       case when exists (select 1 from information_schema.tables
                          where table_schema='public' and table_name='visit_daily')
            then '✅ มีแล้ว' else '❌ ไม่มี' end as ค่า
union all
select 'RPC rpc_track_visit',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_track_visit')
            then '✅ มีแล้ว' else '❌ ไม่มี' end
union all
select 'จำนวนแถวที่เก็บไว้แล้ว', count(*)::text from public.visit_daily;

-- ► เปิดหน้าเว็บสัก 2-3 หน้า แล้วรันบรรทัดนี้ ต้องเห็นตัวเลขขยับ:
--   select * from visit_daily order by day desc, views desc;
-- ► ดูสัดส่วนมือถือ/คอมพิวเตอร์:
--   select device, sum(views) from visit_daily group by device;

-- ============================================================
-- ROLLBACK
-- ============================================================
-- drop view if exists public.v_game_activity, public.v_visit_daily;
-- drop function if exists public.rpc_track_visit(text, text, boolean);
-- drop table if exists public.visit_daily;   -- ⚠️ ลบตารางนี้ = สถิติที่สะสมไว้หายถาวร
-- ============================================================
