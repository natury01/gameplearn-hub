-- ============================================================
-- 66_STANDARDS_OWNERSHIP.sql — เคาะว่าใครเป็นเจ้าของอะไรในผังตัวชี้วัด
-- เกมเพลิน (GamePlearn) · 2026-08-13 · ตอบคำถามข้อ 6.1 ของแชต [Kan2] ภาค 2 (V.8.50-p2 R6)
--
-- ⚠️ ไฟล์นี้แตะ **ฟังก์ชันเดียว** คือ `public.rpc_publish_standards`
--    เป็นฉบับที่รวมของไฟล์ 53 + 61 ไว้ครบแล้ว — รันทับได้เลย ไม่ว่าจะเคยรัน 61 หรือยัง
--    ไม่แตะตาราง ไม่แตะ policy ไม่แตะข้อมูลที่ซิงก์ไว้แล้ว · idempotent รันซ้ำได้
--
-- ============================================================
-- คำถามของภาค 2 และคำตอบ
-- ============================================================
--
-- ภาค 2 เจอว่ากติกาสองข้อขัดกันเอง:
--   · เอกสารของภาค 1 บอกว่า "ห้ามให้เกมทับของที่ผู้ดูแลแก้ไว้"
--   · ทะเบียนกลางบอกว่า "เจ้าของเกมเท่านั้นที่ระบุได้ว่าเกมวัดอะไร"
--
-- **ทดสอบของจริงก่อนตอบ** (รันบน PostgreSQL 16 จำลอง Supabase) ได้ผลนี้:
--
--   | สถานการณ์ | ของเดิมทำอะไร |
--   |---|---|
--   | แถวที่ผู้ดูแลเพิ่มเองล้วน (เกมไม่เคยส่งรหัสนั้น) | ✅ ปลอดภัย ไม่ถูกลบ ไม่ถูกทับ |
--   | แถวที่เกมส่งมา แล้วผู้ดูแลแก้ข้อความ | 🔴 **ข้อความถูกเกมเขียนทับทุกครั้งที่ส่งซ้ำ** |
--
-- ⇒ ทั้งสองกติกาไม่ได้ขัดกันจริง — มันพูดคนละชั้นของข้อมูล ที่ผ่านมาแค่ไม่มีใครแยกให้ชัด:
--
--   ┌──────────────────────────────────────────────────────────────────────────┐
--   │ **เกมเป็นเจ้าของ "วัดอะไร"**   = ตัวชี้วัดตัวไหนผูกกับเกมนี้ (แถวมี/ไม่มี) │
--   │ **ผู้ดูแลเป็นเจ้าของ "คำที่ครูอ่าน"** = หมายเหตุ · แหล่งหลักฐาน · เกณฑ์   │
--   └──────────────────────────────────────────────────────────────────────────┘
--
-- เหตุผล: เกมรู้ดีที่สุดว่าตัวเองวัดอะไร — เว็บกลางไม่มีสิทธิ์เถียง (กติกาเดิม ไม่เปลี่ยน)
--         แต่ "คำอธิบายที่ครูอ่าน" ผู้ดูแลแก้เพราะ**ตั้งใจ** ส่วนเกมส่งมาเพราะ**อัตโนมัติ**
--         ของที่คนตั้งใจแก้ ห้ามให้ของอัตโนมัติทับ — ไม่งั้นผู้ดูแลจะแก้กี่ครั้งก็หายทุกครั้ง
--         โดยไม่มีอะไรบอก และจะสรุปว่า "หน้า Admin เสีย" ทั้งที่ไม่เสีย
--
-- ============================================================
-- สิ่งที่เปลี่ยนจากไฟล์ 61 — มีจุดเดียว
-- ============================================================
--   แถวที่ `source = 'manual'` (ผู้ดูแลแตะแล้ว):
--     · ช่องที่ผู้ดูแล**กรอกไว้จริง** (ไม่ว่าง) → เก็บของผู้ดูแล เกมทับไม่ได้
--     · ช่องที่ผู้ดูแล**เว้นว่างไว้**          → เติมด้วยของเกมตามเดิม (ว่างไว้ไม่มีประโยชน์กับใคร)
--   แถวที่ `source = 'game-sync'` → เกมทับได้เต็มที่เหมือนเดิมทุกประการ
--
-- และคืนช่องใหม่มาให้เกมรู้ตัว (ท่าเดียวกับ `skipped` ของไฟล์ 61):
--     kept_manual       : อาเรย์ [{code, reason}] — รายการที่ "รับแล้ว แต่ใช้คำของผู้ดูแล"
--     kept_manual_total : จำนวนทั้งหมด
--   ⇒ เกมบอกครูได้ตรง ๆ ว่า "คำอธิบาย 3 รายการใช้ของที่ผู้ดูแลแก้ไว้ ไม่ใช่ของเกม"
--     แทนที่จะให้เจ้าของเกมงงว่าทำไมแก้ข้อความในเกมแล้วหน้าเว็บกลางไม่เปลี่ยน
--
-- ของเดิมอยู่ครบ (`ok` `game_id` `accepted` `sent` `skipped` `skipped_total`)
-- เกมรุ่นที่ยังไม่อ่านช่องใหม่ ทำงานเหมือนเดิมทุกบรรทัด
-- ============================================================


-- ============================================================
-- ⚠️⚠️ อ่านก่อนรันไฟล์ 56_STD_CLEANUP_MANUAL.sql ⚠️⚠️
--
-- ตั้งแต่ไฟล์นี้เป็นต้นไป ค่า `source = 'manual'` แบกความหมาย **สองอย่าง**:
--   ก) แถวเก่าที่เว็บกลางกรอกไว้ให้ตอนยังไม่มีระบบซิงก์ (ไฟล์ 51 · ของที่ 56 ตั้งใจมาเก็บกวาด)
--   ข) แถวที่ผู้ดูแล **ตั้งใจแก้ข้อความไว้** และไฟล์นี้กันไม่ให้เกมทับ
--
-- **ไฟล์ 56 ลบแถว `manual` ทุกแถวของเกมที่ซิงก์แล้ว ⇒ ลบทั้ง (ก) และ (ข)**
-- ถ้ารัน 56 โดยไม่ดูก่อน ข้อความที่ผู้ดูแลนั่งแก้ไว้จะหายไปเงียบ ๆ แล้วเกมจะเขียนทับกลับมา
--
-- ⇒ **ก่อนรัน 56 ให้รันคำสั่งดูก่อนใน PART 3 ท้ายไฟล์นี้** (อ่านอย่างเดียว ไม่ลบอะไร)
--   แถวไหนมีข้อความอยู่จริง = ของที่คนตั้งใจเขียน ให้เก็บไว้ อย่าเพิ่งรัน 56
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

  /* ยามกันถอยโดยไม่รู้ตัว — ท่าเดียวกับที่ไฟล์ 61 มี (ตั้งใจถอยยังถอยได้ แต่ถอยโดยไม่รู้ตัวไม่ได้)
     ไฟล์ 71 แยก admin_edited ออกจาก source แล้ว · รันไฟล์ 66 ทับ = ถอยกลับไปใช้ source สองความหมาย
     ⇒ ข้อความที่ผู้ดูแลแก้ไว้บนแถวที่ source='game-sync' จะกลับไปโดนเกมทับ */
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='game_framework_items'
                and column_name='admin_edited') then
    raise exception 'ฐานนี้รันไฟล์ 71_STANDARDS_ADMIN_EDIT.sql ไปแล้ว — รันไฟล์ 66 ทับคือการถอยไฟล์ 71 ทิ้ง (ข้อความที่ผู้ดูแลแก้ไว้บนแถวของเกมจะกลับไปโดนทับ) · ไม่ต้องรันไฟล์ 66 อีก เพราะไฟล์ 71 มีของไฟล์ 66 ครบอยู่แล้ว · ถ้าตั้งใจจะถอยจริง ให้ลบเฉพาะ if exists (… admin_edited …) then … end if; ในบล็อก PART 0 ของไฟล์นี้ (ยามอีกสองตัวในบล็อกเดียวกันให้คงไว้)';
  end if;
end $guard$;


-- ============================================================
-- PART 1 — ช่องที่ไฟล์ 53 เพิ่มไว้ (ใส่ยามซ้ำ เผื่อรันคนละลำดับ)
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
-- PART 2 — ตัวฟังก์ชัน (ของไฟล์ 61 ทุกบรรทัด + กันคำอธิบายของผู้ดูแล)
--
-- เหตุผลที่ "ตก" (skipped) ยังเป็น 5 อย่างเดิม:
--   1. ไม่มีรหัสตัวชี้วัด · 2. รหัสซ้ำในชุดเดียวกัน · 3. ไม่รู้จักรหัสสมรรถนะ
--   4. ยังไม่ได้ติดตั้งกรอบหลักสูตร · 5. สร้างรายการตัวชี้วัดไม่สำเร็จ
--
-- ⚠️ "รับแล้วแต่ใช้คำของผู้ดูแล" (kept_manual) **ไม่ใช่ของตก** — นับใน accepted ตามปกติ
--    แยกอาเรย์คนละอันโดยตั้งใจ เพื่อไม่ให้เกมที่นับ "ของตก" จากอาเรย์เดียวรายงานครูผิด
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
  v_ach    uuid;
  v_cbe    uuid;
  r        record;
  v_item   uuid;
  v_parent uuid;
  v_ids    uuid[] := '{}';
  v_codes  text[] := '{}';
  v_skip   jsonb  := '[]'::jsonb;
  v_skip_n int    := 0;
  v_man    jsonb  := '[]'::jsonb;          -- รายการที่ใช้คำของผู้ดูแล
  v_man_n  int    := 0;
  v_src    text;                            -- source ของแถวเดิม (ถ้ามี)
  v_keep   text[];                          -- ช่องที่ถูกกันไว้ให้ผู้ดูแลในรายการนี้
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

    -- ⭐ จุดเดียวที่ต่างจากไฟล์ 61 — ดูก่อนว่าแถวนี้ผู้ดูแลแตะไว้หรือยัง
    -- ต้องอ่าน "ก่อน" upsert เพราะหลัง upsert ค่าเดิมหายไปแล้ว จึงบอกไม่ได้ว่ากันช่องไหนไว้บ้าง
    v_src := null; v_keep := '{}';
    select g.source into v_src from public.game_framework_items g
     where g.game_id = v_game and g.item_id = v_item;

    if v_src = 'manual' then
      select
        case when coalesce(nullif(btrim(g.note), ''), '') <> '' and nullif(r.note, '') is not null
                  and btrim(g.note) is distinct from nullif(r.note, '') then array['หมายเหตุ'] else '{}' end
        || case when coalesce(nullif(btrim(g.evidence), ''), '') <> '' and nullif(r.evidence, '') is not null
                  and btrim(g.evidence) is distinct from nullif(r.evidence, '') then array['แหล่งหลักฐาน'] else '{}' end
        || case when coalesce(nullif(btrim(g.criteria), ''), '') <> '' and nullif(r.criteria, '') is not null
                  and btrim(g.criteria) is distinct from nullif(r.criteria, '') then array['เกณฑ์การวัด'] else '{}' end
      into v_keep
      from public.game_framework_items g
      where g.game_id = v_game and g.item_id = v_item;
    end if;

    insert into public.game_framework_items
      (game_id, item_id, weight, note, evidence, criteria, source, synced_at)
    values (v_game, v_item, 1.0, nullif(r.note, ''),
            nullif(r.evidence, ''), nullif(r.criteria, ''), 'game-sync', now())
    on conflict (game_id, item_id) do update
      -- แถวของผู้ดูแล: ช่องที่เขากรอกไว้จริงห้ามทับ · ช่องที่เว้นว่างไว้ เติมด้วยของเกมได้
      -- แถวของเกม (game-sync): ทับได้เต็มที่เหมือนเดิมทุกประการ
      set note      = case when public.game_framework_items.source = 'manual'
                          then coalesce(nullif(btrim(public.game_framework_items.note), ''), excluded.note)
                          else excluded.note end,
          evidence  = case when public.game_framework_items.source = 'manual'
                          then coalesce(nullif(btrim(public.game_framework_items.evidence), ''), excluded.evidence)
                          else excluded.evidence end,
          criteria  = case when public.game_framework_items.source = 'manual'
                          then coalesce(nullif(btrim(public.game_framework_items.criteria), ''), excluded.criteria)
                          else excluded.criteria end,
          source    = case when public.game_framework_items.source = 'manual'
                           then 'manual' else 'game-sync' end,
          synced_at = now();

    if array_length(v_keep, 1) is not null then
      v_man_n := v_man_n + 1;
      if v_man_n <= 25 then
        v_man := v_man || jsonb_build_object('code', r.code,
          /* ⚠️ ข้อความนี้ขึ้นจอครูตรง ๆ (กติกา: reason เอาไปแสดงได้เลย ห้ามแปลอีกที)
             จึงห้ามบอกวิธีที่ยังทำไม่ได้ — ฉบับแรกเขียนว่า "ให้ผู้ดูแลลบข้อความบนหน้า Admin"
             ทั้งที่หน้า Admin ยังไม่มีช่องนั้น ครูจะไปหาแล้วไม่เจอ แล้วสรุปว่าระบบเสีย
             (ภาค 1 ทักมาในเอกสาร 67) · ประโยคนี้จริงทั้งก่อนและหลังหน้า Admin มีช่องนั้น

             V.1.6.1 — ย่อจาก 152 เหลือ 71 ตัวอักษร ตามที่ภาค 1 วัดมาจากจอจริง
             (ให้ตรงกับไฟล์ 71 ที่มาแทนไฟล์นี้ — สองไฟล์ต้องไม่พูดคนละอย่าง)
             เหตุผลเต็มอยู่ในไฟล์ 71 ตรงจุดเดียวกัน */
          'reason', 'ช่อง ' || array_to_string(v_keep, ' · ')
                    || ' ใช้ข้อความของผู้ดูแลเว็บกลาง');
      end if;
    end if;

    v_ids   := v_ids || v_item;
    v_codes := v_codes || r.code;
    v_kept  := v_kept + 1;
  end loop;

  -- ตัดของเก่าที่เกม "เลิกวัดแล้ว" ออก — เฉพาะแถวที่เกมเป็นคนใส่เท่านั้น
  -- (แถว manual ไม่ถูกแตะ — ผู้ดูแลเป็นคนเอาออกเองบนหน้า Admin)
  delete from public.game_framework_items
   where game_id = v_game and source = 'game-sync' and not (item_id = any(v_ids));

  insert into public.standards_publish_log (game_id, game_code, game_version, item_count, payload)
  values (v_game, p_game_code, p_game_version, v_kept, p_items);

  return jsonb_build_object('ok', true, 'game_id', v_game,
    'accepted', v_kept, 'sent', v_n,
    'skipped', v_skip, 'skipped_total', v_skip_n,
    'kept_manual', v_man, 'kept_manual_total', v_man_n);
end $$;

comment on function public.rpc_publish_standards(text, text, jsonb) is
  'รับผังตัวชี้วัดจากเกม — เกมเป็นเจ้าของ "วัดอะไร" · ผู้ดูแลเป็นเจ้าของ "คำอธิบายที่ครูอ่าน" (ช่องที่ผู้ดูแลกรอกไว้ เกมทับไม่ได้)';

revoke all on function public.rpc_publish_standards(text, text, jsonb) from public;
grant execute on function public.rpc_publish_standards(text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';


-- ============================================================
-- PART 3 — ตรวจว่ารันแล้วได้ผลจริง
-- ============================================================

select 'คืนช่อง kept_manual แล้วหรือยัง' as รายการ,
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname='public' and p.proname='rpc_publish_standards'
                            and pg_get_functiondef(p.oid) like '%kept_manual_total%')
            then '✅ คืนแล้ว' else '❌ ยังเป็นฉบับเดิม' end as ผล
union all
select 'ยังคืน skipped ของไฟล์ 61 อยู่ (ห้ามหาย)',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname='public' and p.proname='rpc_publish_standards'
                            and pg_get_functiondef(p.oid) like '%skipped_total%')
            then '✅ ยังอยู่' else '❌ หายไป' end
union all
select 'จำนวนแถวที่ผู้ดูแลเป็นเจ้าของอยู่ตอนนี้',
       coalesce((select count(*)::text from public.game_framework_items where source='manual'), '0');

-- ⚠️ ดูก่อนรันไฟล์ 56 — แถวเหล่านี้คือ "ของที่คนตั้งใจเขียน" ไม่ใช่ของเก่าที่ควรเก็บกวาด
--    (ว่างเปล่า = ไม่มีอะไรต้องห่วง รันไฟล์ 56 ได้ตามปกติ)
select i.code                        as "รหัสรายการ",
       g.code                        as "รหัสเกม",
       left(gfi.note, 50)            as "หมายเหตุ",
       left(gfi.evidence, 50)        as "แหล่งหลักฐาน",
       left(gfi.criteria, 50)        as "เกณฑ์การวัด"
  from public.game_framework_items gfi
  join public.framework_items i on i.id = gfi.item_id
  join public.games g on g.id = gfi.game_id
 where gfi.source = 'manual'
   and (coalesce(btrim(gfi.note),'') <> '' or coalesce(btrim(gfi.evidence),'') <> ''
        or coalesce(btrim(gfi.criteria),'') <> '')
 order by g.code, i.code;


-- ============================================================
-- ROLLBACK — กลับไปฉบับที่เกมทับข้อความของผู้ดูแลได้
-- ============================================================
-- รัน `61_STANDARDS_SKIPPED.sql` ทับอีกครั้ง — **แต่ไฟล์ 61 มียามกันไว้แล้ว**
-- ตั้งแต่ 13 ส.ค. 2569 ไฟล์ 61 จะหยุดเองพร้อมข้อความ ถ้าฐานนี้รันไฟล์ 66 ไปแล้ว
-- (เพราะครูอาจไล่ทำตามเอกสาร 62/64/65 ที่สั่งให้รัน 61 แล้วถอยไฟล์นี้ทิ้งโดยไม่รู้ตัว)
-- ⇒ **ถ้าตั้งใจถอยจริง** ให้ลบ **เฉพาะ** `if exists (… kept_manual_total …) then … end if;`
--   ในบล็อก PART 0 ของไฟล์ 61 แล้วค่อยรัน
--   ⚠️ **อย่าลบทั้งบล็อก** — ในบล็อกนั้นมียามอีกสองตัว (ต้องมีตาราง `game_framework_items` ·
--   ต้องมี `gp_resolve_game`) ซึ่งถ้าหายไปด้วย ฐานที่ยังไม่ได้รัน `43` จะได้ error ดิบของ PostgreSQL
--   แทนข้อความไทยที่เตรียมไว้ (ภาค 1 ทักมาในเอกสาร 71)
-- ⚠️ ไม่มีตารางหรือข้อมูลใดถูกแตะในไฟล์นี้ — ย้อนกลับแล้วไม่มีอะไรเสีย
--    (ข้อความของผู้ดูแลที่ถูกกันไว้แล้ว จะกลับไปโดนทับในการส่งครั้งถัดไป)
-- ============================================================
