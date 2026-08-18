-- ============================================================
-- 61_STANDARDS_SKIPPED.sql — บอกเกมให้รู้ว่า "รายการไหนตกและเพราะอะไร" ตอนส่งผังมาตรฐาน
-- เกมเพลิน (GamePlearn) · 2026-08-12 · ตามที่ภาค 1 ขอมาในข้อ 4 ของคำตอบเอกสาร 58
--
-- ที่มา: `rpc_publish_media` (ไฟล์ 57) คืน `skipped:[{url, reason}]` มาให้
--   ภาค 1 เอาไปขึ้นข้อความในหน้าห้องเรียนได้ว่า **ใบไหนตก เพราะอะไร** ไม่ใช่แค่ "ตกกี่รายการ"
--   แล้วขอให้ `rpc_publish_standards` (ไฟล์ 53) คืนแบบเดียวกันด้วย — ไฟล์นี้คือของที่ขอ
--
-- ⚠️ ของเดิมข้ามรายการที่ใช้ไม่ได้แบบ **เงียบสนิท** (`continue` เปล่า ๆ 4 จุด)
--    เกมส่งผังไป 15 รายการ ได้ accepted 12 กลับมา แล้วไม่มีใครรู้ว่าอีก 3 หายไปไหน
--    เจ้าของเกมต้องมานั่งเดาเองว่าพิมพ์รหัสผิด หรือเว็บกลางไม่รู้จัก หรือยังไม่ได้รัน SQL ตัวไหน
--
-- สิ่งที่ไฟล์นี้ทำ: **แทนที่ตัวฟังก์ชันอย่างเดียว** พฤติกรรมการเก็บข้อมูลเหมือนเดิมทุกอย่าง
--   ไม่แตะตาราง ไม่แตะ policy ไม่แตะข้อมูลที่ซิงก์ไว้แล้ว · ของที่คืนเพิ่มมี 2 ช่อง:
--     skipped       : อาเรย์ [{code, reason}] (สูงสุด 25 รายการแรก)
--     skipped_total : จำนวนที่ตกทั้งหมด (ใช้บอก "และอีก N รายการ" ได้ตรงแม้อาเรย์ถูกตัด)
--   ของเดิม (ok · game_id · accepted · sent) ยังอยู่ครบ — เกมรุ่นเก่าที่ยังไม่อ่าน skipped ไม่กระทบ
--
-- รันได้ทั้งกรณีรัน 53 มาแล้วและยังไม่ได้รัน (มียามสร้างคอลัมน์/ตารางที่ 53 สร้างไว้ให้ด้วย)
-- ✅ ไม่ใช้ pgcrypto · idempotent รันซ้ำได้
-- ============================================================


-- ============================================================
-- PART 0 — ยามกันรันผิดลำดับ
-- ============================================================

do $guard$
begin
  if not exists (select 1 from information_schema.tables
                  where table_schema='public' and table_name='game_framework_items') then
    raise exception 'ยังไม่มีตาราง game_framework_items — รัน 08_ASSESSMENT_CORE.sql ก่อน';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='gp_resolve_game') then
    raise exception 'ยังไม่มี gp_resolve_game — รัน 43_REPORT_CARDS.sql ก่อน';
  end if;

  /* ⭐ ยามกันถอยโดยไม่รู้ตัว (เพิ่ม 13 ส.ค. 2569 ตามที่แชต [Kan] ภาค 1 ทักในเอกสาร 67)
     ไฟล์ 66 เป็นฉบับที่รวมของไฟล์นี้ไว้ครบแล้ว + กันไม่ให้เกมทับข้อความของผู้ดูแล
     ⇒ **รันไฟล์ 61 ทับหลังจากรัน 66 = ถอยไฟล์ 66 ทิ้ง** ข้อความที่ผู้ดูแลแก้ไว้จะกลับไปโดนเกมทับ

     ทำไมต้องมียาม ไม่ใช่แค่เขียนเตือนในเอกสาร: เอกสาร 62 · 64 · 65 สั่งให้รันไฟล์ 61 ไว้ทั้งสามฉบับ
     ครูที่ไล่ทำตามรายการเก่าให้ครบหลังรัน 66 ไปแล้ว จะถอยโดยไม่มีอะไรฟ้อง —
     ตาราง "ตรวจว่ารันแล้ว" ท้ายไฟล์นี้ก็ยังขึ้น ✅ เพราะมันตรวจแค่ว่ามี skipped_total ไหม
     **ตั้งใจถอยยังถอยได้ แต่ถอยโดยไม่รู้ตัวไม่ได้** */
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='rpc_publish_standards'
                and pg_get_functiondef(p.oid) like '%kept_manual_total%') then
    raise exception 'ฐานนี้รันไฟล์ 66_STANDARDS_OWNERSHIP.sql ไปแล้ว — รันไฟล์ 61 ทับคือการถอยไฟล์ 66 ทิ้ง (ข้อความที่ผู้ดูแลแก้ไว้จะกลับไปโดนเกมเขียนทับ) · ไม่ต้องรันไฟล์ 61 อีก เพราะไฟล์ 66 มีของไฟล์ 61 ครบอยู่แล้ว · ถ้าตั้งใจจะถอยจริง ให้ลบเฉพาะ if exists (… kept_manual_total …) then … end if; ในบล็อก PART 0 ของไฟล์นี้ (ยามอีกสองตัวในบล็อกเดียวกันให้คงไว้ ไม่งั้นจะเสียยามลำดับการรันไปด้วย)';
  end if;
end $guard$;


-- ============================================================
-- PART 1 — ช่องที่ไฟล์ 53 เพิ่มไว้ (ใส่ยามซ้ำ เผื่อยังไม่ได้รัน 53 หรือรันคนละลำดับ)
-- ============================================================

alter table public.game_framework_items add column if not exists source    text not null default 'manual';
alter table public.game_framework_items add column if not exists synced_at timestamptz;
alter table public.game_framework_items add column if not exists evidence  text;
alter table public.game_framework_items add column if not exists criteria  text;

create table if not exists public.standards_publish_log (
  id            bigserial primary key,
  game_id       uuid references public.games(id) on delete cascade,
  game_code     text,
  game_version  text,
  item_count    integer,
  payload       jsonb,
  published_at  timestamptz not null default now()
);
create index if not exists std_log_game_idx on public.standards_publish_log (game_id, published_at desc);
alter table public.standards_publish_log enable row level security;
drop policy if exists std_log_admin_read on public.standards_publish_log;
create policy std_log_admin_read on public.standards_publish_log
  for select to authenticated using (public.is_admin());


-- ============================================================
-- PART 2 — ตัวฟังก์ชัน (ของเดิมทุกบรรทัด + เก็บเหตุผลที่ข้าม)
--
-- เหตุผลที่คืนได้ มี 5 อย่าง เขียนเป็นภาษาที่เอาไปขึ้นหน้าจอครูได้เลย ไม่ต้องแปลอีกที:
--   1. ไม่มีรหัสตัวชี้วัด            — รายการนั้นไม่มี code หรือ code เป็นค่าว่าง
--   2. รหัสซ้ำในชุดเดียวกัน           — ส่ง code เดิมมาสองครั้งในคำขอเดียว (ของหลังทับของหน้า)
--   3. ไม่รู้จักรหัสสมรรถนะนี้        — framework=cbe-core แต่ไม่มีรหัสนั้นในกรอบ
--                                     (เว็บกลางไม่สร้างสมรรถนะใหม่ตามคำสั่งเกม — กติกาเดิม)
--   4. ยังไม่ได้ติดตั้งกรอบหลักสูตร    — ฐานยังไม่มี core-2551-rev2560
--   5. สร้างรายการตัวชี้วัดไม่สำเร็จ   — กรณีที่ไม่ควรเกิด แต่ถ้าเกิดจะได้ไม่เงียบ
-- ============================================================

create or replace function public.rpc_publish_standards(
  p_game_code    text,
  p_game_version text,
  p_items        jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game   uuid;
  v_n      int;
  v_kept   int := 0;
  v_ach    uuid;   -- framework id ของหลักสูตรแกนกลาง
  v_cbe    uuid;   -- framework id ของกรอบสมรรถนะ
  r        record;
  v_item   uuid;
  v_parent uuid;
  v_ids    uuid[] := '{}';
  v_codes  text[] := '{}';                 -- รหัสที่รับไปแล้วในรอบนี้ (ใช้จับรหัสซ้ำ)
  v_skip   jsonb  := '[]'::jsonb;
  v_skip_n int    := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items ต้องเป็นอาเรย์ของรายการ';
  end if;
  v_n := jsonb_array_length(p_items);
  if v_n > 200 then
    raise exception 'ส่งได้ไม่เกิน 200 รายการต่อครั้ง (ส่งมา %)', v_n;
  end if;

  v_game := public.gp_resolve_game(p_game_code, p_game_version);
  if v_game is null then
    raise exception 'ไม่พบเกมรหัส % (รุ่น %) ในทะเบียน', p_game_code, p_game_version;
  end if;

  select id into v_ach from public.assessment_frameworks where code = 'core-2551-rev2560';
  select id into v_cbe from public.assessment_frameworks where code = 'cbe-core';

  for r in
    select
      left(btrim(coalesce(x->>'code', '')), 60)                     as code,
      left(btrim(coalesce(x->>'name', '')), 400)                    as name_th,
      lower(coalesce(nullif(btrim(x->>'framework'), ''), 'core-2551-rev2560')) as fw,
      upper(coalesce(nullif(btrim(x->>'subject'), ''), 'SO'))       as subject,
      left(btrim(coalesce(x->>'note', '')), 400)                    as note,
      left(btrim(coalesce(x->>'evidence', '')), 600)                as evidence,
      left(btrim(coalesce(x->>'criteria', '')), 600)                as criteria,
      coalesce((x->>'sort')::int, 0)                                as sort_order
    from jsonb_array_elements(p_items) x
  loop
    v_item := null;

    if r.code is null or r.code = '' then
      v_skip_n := v_skip_n + 1;
      if v_skip_n <= 25 then
        v_skip := v_skip || jsonb_build_object('code', '(ว่าง)',
          'reason', 'ไม่มีรหัสตัวชี้วัด — รายการนี้ไม่มีช่อง code หรือใส่มาเป็นค่าว่าง');
      end if;
      continue;
    end if;

    if r.code = any(v_codes) then
      v_skip_n := v_skip_n + 1;
      if v_skip_n <= 25 then
        v_skip := v_skip || jsonb_build_object('code', r.code,
          'reason', 'รหัสซ้ำกับรายการก่อนหน้าในชุดเดียวกัน — เก็บของที่ส่งมาก่อนไว้');
      end if;
      continue;
    end if;

    if r.fw = 'cbe-core' then
      -- สมรรถนะ: ต้องมีอยู่แล้วในกรอบ (เว็บกลางไม่สร้างสมรรถนะใหม่ตามคำสั่งเกม)
      -- แปลงรหัสให้ตรงมาตรฐานกลางก่อน (HT→HOT · NS→SN) ด้วยตัวแปลงตัวเดียวกับใบรายงานผล
      select id into v_item from public.framework_items
       where framework_id = v_cbe and code = public.gp_comp_code(r.code);
      if v_item is null then
        v_skip_n := v_skip_n + 1;
        if v_skip_n <= 25 then
          v_skip := v_skip || jsonb_build_object('code', r.code,
            'reason', 'ไม่รู้จักรหัสสมรรถนะ "' || public.gp_comp_code(r.code)
                      || '" ในกรอบ cbe-core (แปลง HT→HOT · NS→SN ให้แล้ว) — '
                      || 'เว็บกลางไม่สร้างสมรรถนะใหม่ตามคำสั่งเกม ต้องเพิ่มในกรอบก่อน');
        end if;
        continue;
      end if;
    else
      if v_ach is null then
        v_skip_n := v_skip_n + 1;
        if v_skip_n <= 25 then
          v_skip := v_skip || jsonb_build_object('code', r.code,
            'reason', 'ฐานข้อมูลยังไม่มีกรอบหลักสูตรแกนกลาง core-2551-rev2560 — รัน 08_ASSESSMENT_CORE.sql ก่อน');
        end if;
        continue;
      end if;

      -- ตัวชี้วัด: สร้างให้ถ้ายังไม่มี · ผูกใต้กลุ่มสาระที่ระบุ
      select id into v_parent from public.framework_items
       where framework_id = v_ach and code = r.subject;

      insert into public.framework_items
        (framework_id, code, parent_id, depth, name_th, sort_order)
      values (v_ach, r.code, v_parent, case when v_parent is null then 1 else 2 end,
              coalesce(nullif(r.name_th, ''), r.code), r.sort_order)
      on conflict (framework_id, code) do update
        set name_th    = coalesce(nullif(excluded.name_th, ''), public.framework_items.name_th),
            parent_id  = coalesce(excluded.parent_id, public.framework_items.parent_id),
            sort_order = excluded.sort_order
      returning id into v_item;

      if v_item is null then
        select id into v_item from public.framework_items
         where framework_id = v_ach and code = r.code;
      end if;
    end if;

    if v_item is null then
      v_skip_n := v_skip_n + 1;
      if v_skip_n <= 25 then
        v_skip := v_skip || jsonb_build_object('code', r.code,
          'reason', 'สร้างรายการตัวชี้วัดไม่สำเร็จ — กรณีนี้ไม่ควรเกิด แจ้งผู้ดูแลระบบ');
      end if;
      continue;
    end if;

    insert into public.game_framework_items
      (game_id, item_id, weight, note, evidence, criteria, source, synced_at)
    values (v_game, v_item, 1.0, nullif(r.note, ''),
            nullif(r.evidence, ''), nullif(r.criteria, ''), 'game-sync', now())
    on conflict (game_id, item_id) do update
      set note      = excluded.note,
          evidence  = excluded.evidence,
          criteria  = excluded.criteria,
          source    = case when public.game_framework_items.source = 'manual'
                           then 'manual' else 'game-sync' end,
          synced_at = now();

    v_ids   := v_ids || v_item;
    v_codes := v_codes || r.code;
    v_kept  := v_kept + 1;
  end loop;

  -- ตัดของเก่าที่เกม "เลิกวัดแล้ว" ออก — เฉพาะแถวที่เกมเป็นคนใส่เท่านั้น
  delete from public.game_framework_items
   where game_id = v_game and source = 'game-sync' and not (item_id = any(v_ids));

  insert into public.standards_publish_log (game_id, game_code, game_version, item_count, payload)
  values (v_game, p_game_code, p_game_version, v_kept, p_items);

  return jsonb_build_object('ok', true, 'game_id', v_game,
    'accepted', v_kept, 'sent', v_n,
    'skipped', v_skip, 'skipped_total', v_skip_n);
end $$;

revoke all on function public.rpc_publish_standards(text, text, jsonb) from public;
grant execute on function public.rpc_publish_standards(text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';


-- ============================================================
-- PART 3 — ตรวจผล
-- ============================================================

select 'RPC rpc_publish_standards' as รายการ,
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_publish_standards')
            then '✅ มีแล้ว' else '❌ ไม่มี' end as ค่า
union all
select 'คืนช่อง skipped แล้วหรือยัง',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_publish_standards'
                            and pg_get_functiondef(p.oid) like '%skipped_total%')
            then '✅ ฉบับใหม่แล้ว' else '❌ ยังเป็นฉบับเดิม' end
union all
select 'ผังที่เกมส่งมาเองตอนนี้', count(*)::text
  from public.game_framework_items where source = 'game-sync';

-- ► ทดสอบด้วยมือได้ (ไม่เขียนอะไรลงฐานถ้ารหัสไม่ผ่านทุกตัว):
--   select public.rpc_publish_standards('kanchanaburi2050','V.7.99.28',
--     '[{"code":"","name":"ไม่มีรหัส"},{"code":"XX","framework":"cbe-core"}]'::jsonb);
--   ต้องได้ skipped 2 รายการพร้อมเหตุผลเป็นภาษาไทย

-- ============================================================
-- ROLLBACK — กลับไปใช้ฉบับของไฟล์ 53
-- ============================================================
-- รันไฟล์ 53_STANDARDS_SYNC.sql ทับอีกครั้ง (ฟังก์ชันจะกลับเป็นฉบับที่ไม่คืน skipped)
-- ตาราง/คอลัมน์/ข้อมูลไม่ต้องแตะ ไฟล์นี้ไม่ได้เปลี่ยนอะไรในนั้น
-- ============================================================
