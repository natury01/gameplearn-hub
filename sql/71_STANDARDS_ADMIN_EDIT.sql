-- ============================================================
-- 71_STANDARDS_ADMIN_EDIT.sql — ให้ผู้ดูแลแก้ "คำที่ครูอ่าน" ได้จากหน้า Admin
-- เกมเพลิน (GamePlearn) · 13 ส.ค. 2569
--
-- ปิดงานที่ค้างมาตั้งแต่ไฟล์ 66: กติกา "ผู้ดูแลเป็นเจ้าของคำที่ครูอ่าน" ประกาศไว้แล้ว
-- ฐานกันไม่ให้เกมทับแล้ว และทั้งภาค 1 (V.7.99.33) กับภาค 2 (V.8.54-p2) ทำท่อ `kept_manual` รอไว้แล้ว
-- **แต่ยังไม่มีใครได้ใช้เลย เพราะหน้า Admin ไม่มีช่องให้แก้** ⇒ ไฟล์นี้ + หน้า Admin รุ่นใหม่ปิดจบ
--
-- ⚠️ ไฟล์นี้ **แทนที่ไฟล์ 66** — มีของ 53 + 61 + 66 ครบในตัว รันทับได้เลย
--    ไม่แตะข้อมูลที่ซิงก์ไว้แล้ว · เพิ่มคอลัมน์เดียว · idempotent รันซ้ำได้
--    ต้องรัน `43_REPORT_CARDS.sql` และ `37_GAME_ADMIN_FIELDS.sql` มาก่อน
--
-- ============================================================
-- ⭐ สิ่งที่เปลี่ยนจากไฟล์ 66 — เลิกใช้ `source` เป็นสองความหมาย
-- ============================================================
--
-- ไฟล์ 66 ยืม `source='manual'` มาแปลว่า "ผู้ดูแลแก้ข้อความไว้" ซึ่งทำให้ค่านั้นแบกสองงาน:
--   ก) **ใครเป็นเจ้าของแถว** — ใช้ตัดสินว่าตอนเกมเลิกส่ง จะลบแถวนั้นไหม
--   ข) **ใครเป็นเจ้าของข้อความ** — ใช้ตัดสินว่าเกมทับข้อความได้ไหม
--
-- พอสองงานอยู่ในค่าเดียว จึงเกิดผลข้างเคียงสองข้อ:
--   · ผู้ดูแลแค่เติมหมายเหตุให้ตัวชี้วัดหนึ่ง ⇒ แถวนั้นกลายเป็น "ของมือ" ⇒ **เกมเอาออกไม่ได้อีกเลย**
--   · ไฟล์ `56_STD_CLEANUP_MANUAL.sql` ลบแถว manual ทุกแถว ⇒ ลบข้อความที่ผู้ดูแลตั้งใจเขียนไปด้วย
--
-- ⇒ ไฟล์นี้แยกออกเป็นคนละช่อง:
--
--   ┌────────────────────────────────────────────────────────────────────────┐
--   │ `source`        = ใครเป็นเจ้าของ **แถว**      (ความหมายเดิมของไฟล์ 53) │
--   │ `admin_edited`  = ผู้ดูแลเป็นเจ้าของ **ข้อความ** ของแถวนี้ (ช่องใหม่)   │
--   └────────────────────────────────────────────────────────────────────────┘
--
-- **ผลพลอยได้ที่สำคัญ: ไฟล์ 56 กลับมาปลอดภัยเกือบทั้งหมด** — `manual` แปลว่า
-- "แถวที่คนเพิ่มเอง" อย่างเดียวเหมือนเดิม (เหลือกรณีเดียวที่ต้องดูก่อน — ดู PART 4)
--
-- กติกาที่ประกาศไว้ในไฟล์ 66 **ไม่เปลี่ยนสักตัวอักษร** และช่องที่คืนให้เกม
-- (`kept_manual` / `kept_manual_total`) เหมือนเดิมทุกอย่าง ⇒ **ทั้งสองภาคไม่ต้องแก้อะไรเลย**
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
end $guard$;


-- ============================================================
-- PART 1 — ช่องใหม่ + ย้ายของเดิมมาให้ครบ
--
-- ย้ายข้อมูล: แถวที่ไฟล์ 66 กันไว้อยู่แล้ว (source='manual' และมีข้อความจริง)
-- ถือว่าผู้ดูแลเป็นเจ้าของข้อความ ⇒ ตั้ง admin_edited = true ให้เลย
-- **ห้ามข้ามขั้นนี้** ไม่งั้นข้อความที่ไฟล์ 66 กันไว้จะกลับไปโดนเกมทับในการส่งครั้งถัดไป
-- ============================================================

alter table public.game_framework_items add column if not exists source       text not null default 'manual';
alter table public.game_framework_items add column if not exists synced_at    timestamptz;
alter table public.game_framework_items add column if not exists evidence     text;
alter table public.game_framework_items add column if not exists criteria     text;
alter table public.game_framework_items add column if not exists admin_edited boolean not null default false;

comment on column public.game_framework_items.admin_edited is
  'true = ข้อความ (note/evidence/criteria) เป็นของผู้ดูแลเว็บกลาง เกมทับไม่ได้ · แยกจาก source ซึ่งบอกว่าใครเป็นเจ้าของแถว';

update public.game_framework_items
   set admin_edited = true
 where admin_edited = false
   and source = 'manual'
   and (coalesce(btrim(note), '') <> '' or coalesce(btrim(evidence), '') <> ''
        or coalesce(btrim(criteria), '') <> '');

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
-- PART 2 — สิทธิ์ให้หน้า Admin แก้ข้อความได้
--
-- policy 3 ตัวมาจาก 37_GAME_ADMIN_FIELDS.sql อยู่แล้ว — ใส่ซ้ำเผื่อยังไม่ได้รัน 37
-- (ยิงซ้ำไม่เสียหาย เพราะ drop-if-exists ก่อนทุกตัว)
-- ⚠️ policy อย่างเดียวไม่พอ — ต้องมี table grant ด้วย ไม่งั้นได้ 403 ทั้งที่ policy ถูก
-- ============================================================

drop policy if exists gfi_admin_insert on public.game_framework_items;
create policy gfi_admin_insert on public.game_framework_items
  for insert to authenticated with check (public.is_admin());

drop policy if exists gfi_admin_update on public.game_framework_items;
create policy gfi_admin_update on public.game_framework_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists gfi_admin_delete on public.game_framework_items;
create policy gfi_admin_delete on public.game_framework_items
  for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.game_framework_items to authenticated;


-- ============================================================
-- PART 3 — rpc_publish_standards ฉบับที่ 3
--   ของไฟล์ 61 (skipped) + ไฟล์ 66 (กันข้อความผู้ดูแล) ครบ
--   ต่างจาก 66 จุดเดียว: ดู `admin_edited` แทน `source`
-- ============================================================

create or replace function public.rpc_publish_standards(
  p_game_code    text,
  p_game_version text,
  p_items        jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
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
  v_man    jsonb  := '[]'::jsonb;
  v_man_n  int    := 0;
  v_owned  boolean;
  v_keep   text[];
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

    -- ⭐ ดูก่อน upsert ว่าข้อความของแถวนี้เป็นของผู้ดูแลหรือยัง
    -- (หลัง upsert ค่าเดิมหายไปแล้ว จึงบอกไม่ได้ว่ากันช่องไหนไว้บ้าง)
    v_owned := false; v_keep := '{}';
    select g.admin_edited into v_owned from public.game_framework_items g
     where g.game_id = v_game and g.item_id = v_item;

    if coalesce(v_owned, false) then
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
      -- แถวที่ผู้ดูแลเป็นเจ้าของข้อความ: ช่องที่กรอกไว้จริงห้ามทับ · ช่องที่เว้นว่างไว้ เติมของเกมได้
      -- แถวอื่น: เกมทับได้เต็มที่เหมือนเดิมทุกประการ
      set note      = case when public.game_framework_items.admin_edited
                          then coalesce(nullif(btrim(public.game_framework_items.note), ''), excluded.note)
                          else excluded.note end,
          evidence  = case when public.game_framework_items.admin_edited
                          then coalesce(nullif(btrim(public.game_framework_items.evidence), ''), excluded.evidence)
                          else excluded.evidence end,
          criteria  = case when public.game_framework_items.admin_edited
                          then coalesce(nullif(btrim(public.game_framework_items.criteria), ''), excluded.criteria)
                          else excluded.criteria end,
          -- ⚠️ `source` ไม่ถูกแตะโดยแถวที่มีอยู่แล้ว — ความหมายเดิม (เจ้าของแถว) ไม่เปลี่ยน
          source    = case when public.game_framework_items.source = 'manual'
                           then 'manual' else 'game-sync' end,
          synced_at = now();

    if array_length(v_keep, 1) is not null then
      v_man_n := v_man_n + 1;
      if v_man_n <= 25 then
        v_man := v_man || jsonb_build_object('code', r.code,
          /* ⚠️ ข้อความนี้ขึ้นจอครูตรง ๆ (กติกา: reason เอาไปแสดงได้เลย ห้ามแปลอีกที)
             จึงห้ามบอกวิธีที่ยังทำไม่ได้ — และห้ามยาวเกินความจำเป็นด้วย

             V.1.6.1 — ย่อจาก 152 เหลือ 71 ตัวอักษร (–53%) ตามที่ภาค 1 วัดมาจากจอจริง
             ตัดสองท่อนที่ไม่ได้เพิ่มข้อมูลให้ครู:
               • "รับไว้แล้ว แต่…" — ของชิ้นนี้อยู่ในอาเรย์ `kept_manual` และนับใน `accepted` อยู่แล้ว
                 เกมทั้งสองภาคขึ้นหัวก้อนว่า "รับไว้แล้ว" ครั้งเดียวเหนือรายการ
               • "ถ้าต้องการเปลี่ยนให้แจ้งผู้ดูแลเว็บกลาง" — เกมพิมพ์บรรทัดนี้ท้ายก้อนอยู่แล้วหนึ่งครั้ง
                 ซ้ำทุกแถวจึงกลายเป็นกำแพงข้อความ (ครูมี 20 ตัวชี้วัด = อ่านประโยคเดิม 20 รอบ)
             ที่เหลือไว้คือสองอย่างที่ต่างกันทุกแถวและครูต้องรู้: **ช่องไหน** และ **ของใคร**
             ห้ามยาวขึ้นอีก — มียามความยาวคุมอยู่ใน test/sql/t_sql.sh

             📏 V.1.6.3 — ที่มาของเพดาน 90 ตัวอักษร (เดิมเป็นตัวเลขที่เผื่อไว้เฉย ๆ ไม่มีที่มา)
             ภาค 1 วัดความสูงกล่องบนจอครูจริง (896×319 = จอแนวนอนเตี้ย เคสหนักสุด):
                 ความยาว reason │ 3 รายการ │ 7 รายการขึ้นไป
                 ───────────────┼─────────┼────────────────
                   42 ตัวอักษร  │    –    │  45%
                   71 (ปัจจุบัน)│   38%   │  45%   ← 42 กับ 71 ตัดบรรทัดเท่ากัน สูงเท่ากัน
                  152 (ของเดิม) │   57%   │  63%
             ⇒ V.1.6.4 ภาค 1 ยิง 90 ตัวอักษรวัดตรง ๆ ให้แล้ว: **142px = 45% พอดี** (ไม่ต้องลดเพดาน)
                และความสูงแบนอยู่ที่ 45% ตั้งแต่ 71 ถึง 130 ตัวอักษร

             ⛔ แต่ **ห้ามขยับเพดานขึ้นไปใกล้ 130** — ภาค 1 เจอว่าขอบขั้นบันไดไม่ใช่จำนวนตัวอักษร
             ภาษาไทยมีสระบน/ล่างที่ไม่กินความกว้าง ⇒ ข้อความสระน้อยกว้างกว่าข้อความสระเยอะที่ยาวเท่ากัน
             เขาวัดได้ว่า **124 ตัวอักษร (สระน้อย) = 63% แต่ 126 ตัวอักษร (สระเยอะ) = 45%**
             ยาวกว่า 2 ตัวอักษรแต่เตี้ยกว่าหนึ่งขั้นเต็ม ⇒ เลข 130 เป็นขอบของ "ข้อความชุดนั้น"
             ไม่ใช่ขอบของระบบ · ขอบที่แคบที่สุดที่วัดได้จริงคือ **124**
             เพดาน 90 จึงห่างขอบแคบสุด 34 ตัวอักษร = ปลอดภัยแม้ข้อความจะสระน้อย
             ขยับขึ้นไปใกล้ 130 = เพดานที่บางครั้งกันบางครั้งไม่กัน ซึ่งแย่กว่าไม่มีเพดาน

             ⚠️ เพดานนี้เป็น **ตัวแทนของความสูงบนจอเกม** ซึ่งอยู่คนละฝั่งกับตัวเลข —
             ถ้าเกมเปลี่ยนขนาดตัวอักษร ความกว้างกล่อง หรือจำนวนแถวที่แสดง เพดานนี้จะเก่าทันที
             ข้อตกลง: **ภาค 1 เป็นคนวัดใหม่แล้วบอกว่าควรขยับไหม** (เขารับปากไว้ในเอกสารตอบ V.1.6.1)
             ฝั่งฐานห้ามขยับเพดานเองโดยไม่มีตัวเลขจากจอจริงมารองรับ

             🚫 และห้ามพึ่งให้เกมตัดข้อความให้ — ภาค 1 ยืนยันว่า **ไม่ได้ตัด `reason` ที่จุดใดเลย**
             โดยตั้งใจ (ตัดกลางประโยค = ครูอ่านได้ครึ่งเดียวโดยที่ฐานไม่รู้ว่าถูกตัด)
             ภาค 2 ก็ไม่ตัด ใช้กล่องเลื่อนแทน ⇒ **ความสั้นเป็นหน้าที่ของฐานฝ่ายเดียว**

             ⛔ V.1.6.2 — สัญญาที่ห้ามผิด: **เหตุเดียวกัน ต้องคืนข้อความเท่ากันทุกไบต์**
             ห้ามเติมรหัสตัวชี้วัด (`r.code`) หรืออะไรที่ต่างกันรายแถวลงในประโยคนี้
             แม้จะดูมีเหตุผลก็ตาม — เกมภาค 2 ตัดข้อความที่ซ้ำกันออกก่อนขึ้นจอครู
             (เขาวัดมาแล้วว่าถ้าไม่ตัด ครูอ่านประโยคเดิม 3 รอบติดกัน กินจอ 39%)
             ตัวตัดซ้ำนั้นทำงานได้เพราะสตริงเท่ากันเป๊ะ · เติมรหัสเข้าไปเมื่อไร
             มันจะเลิกทำงานเงียบ ๆ และไม่มีใครรู้จนกว่าครูจะเจอกำแพงข้อความอีกรอบ
             รหัสตัวชี้วัดอยู่ในช่อง `code` ของแต่ละรายการอยู่แล้ว เกมหยิบไปใช้ได้ตรงนั้น
             มีเทสต์คุมสองด้าน: เหตุเดียวกัน = 1 ข้อความ · เหตุต่างกัน = คนละข้อความ */
          'reason', 'ช่อง ' || array_to_string(v_keep, ' · ')
                    || ' ใช้ข้อความของผู้ดูแลเว็บกลาง');
      end if;
    end if;

    v_ids   := v_ids || v_item;
    v_codes := v_codes || r.code;
    v_kept  := v_kept + 1;
  end loop;

  -- ตัดของเก่าที่เกม "เลิกวัดแล้ว" ออก — เฉพาะแถวที่เกมเป็นคนใส่เท่านั้น
  -- (ไม่ดู admin_edited โดยตั้งใจ: ผู้ดูแลเติมหมายเหตุ ไม่ได้แปลว่าเกมยังวัดตัวชี้วัดนั้นอยู่
  --  เกมเลิกวัดเมื่อไร แถวก็ควรหายไปพร้อมหมายเหตุของมัน — หมายเหตุนั้นพูดถึงตัวชี้วัดตัวนี้)
  delete from public.game_framework_items
   where game_id = v_game and source = 'game-sync' and not (item_id = any(v_ids));

  insert into public.standards_publish_log (game_id, game_code, game_version, item_count, payload)
  values (v_game, p_game_code, p_game_version, v_kept, p_items);

  return jsonb_build_object('ok', true, 'game_id', v_game,
    'accepted', v_kept, 'sent', v_n,
    'skipped', v_skip, 'skipped_total', v_skip_n,
    'kept_manual', v_man, 'kept_manual_total', v_man_n);
end $fn$;

comment on function public.rpc_publish_standards(text, text, jsonb) is
  'รับผังตัวชี้วัดจากเกม — เกมเป็นเจ้าของ "วัดอะไร" · ผู้ดูแลเป็นเจ้าของ "คำที่ครูอ่าน" (ช่องที่ admin_edited=true เกมทับไม่ได้)';

revoke all on function public.rpc_publish_standards(text, text, jsonb) from public;
grant execute on function public.rpc_publish_standards(text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';


-- ============================================================
-- PART 4 — ตรวจผล + คำสั่งดูก่อนรันไฟล์ 56
-- ============================================================

select 'คอลัมน์ admin_edited' as รายการ,
       case when exists (select 1 from information_schema.columns
                          where table_schema='public' and table_name='game_framework_items'
                            and column_name='admin_edited') then '✅ มีแล้ว' else '❌ ไม่มี' end as ผล
union all
select 'ฟังก์ชันดู admin_edited แล้ว (ไม่ใช่ source)',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_publish_standards'
                            and pg_get_functiondef(p.oid) like '%admin_edited%')
            then '✅ ใช่' else '❌ ยังเป็นฉบับเก่า' end
union all
select 'ยังคืน skipped และ kept_manual ครบ (ห้ามหาย)',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname='rpc_publish_standards'
                            and pg_get_functiondef(p.oid) like '%skipped_total%'
                            and pg_get_functiondef(p.oid) like '%kept_manual_total%')
            then '✅ ครบ' else '❌ ขาด' end
union all
select 'สิทธิ์ให้ผู้ดูแลแก้ข้อความ (ต้องได้ 3 policy)',
       (select count(*)::text from pg_policies
         where schemaname='public' and tablename='game_framework_items'
           and policyname like 'gfi_admin_%')
union all
select 'แถวที่ผู้ดูแลเป็นเจ้าของข้อความอยู่ตอนนี้',
       (select count(*)::text from public.game_framework_items where admin_edited);

-- ⚠️ ดูก่อนรันไฟล์ 56 — **แคบลงมากแล้วหลังจากแยก admin_edited ออกจาก source**
--    เหลือกรณีเดียว: แถวที่ผู้ดูแลเพิ่มเองด้วยมือ (source='manual') **และ** เขียนข้อความไว้
--    ผลว่างเปล่า = รันไฟล์ 56 ได้ตามปกติ ไม่มีข้อความของใครหาย
select i.code                 as "รหัสรายการ",
       g.code                 as "รหัสเกม",
       left(gfi.note, 50)     as "หมายเหตุ",
       left(gfi.evidence, 50) as "แหล่งหลักฐาน",
       left(gfi.criteria, 50) as "เกณฑ์การวัด"
  from public.game_framework_items gfi
  join public.framework_items i on i.id = gfi.item_id
  join public.games g on g.id = gfi.game_id
 where gfi.admin_edited and gfi.source = 'manual'
 order by g.code, i.code;


-- ============================================================
-- ROLLBACK — กลับไปฉบับไฟล์ 66
-- ============================================================
-- 1. รัน `66_STANDARDS_OWNERSHIP.sql` ทับ — **แต่ไฟล์ 66 มียามกันไว้แล้ว**
--    มันจะหยุดเองพร้อมข้อความถ้าฐานนี้รันไฟล์ 71 ไปแล้ว
--    ⇒ ถ้าตั้งใจถอยจริง ให้ลบเฉพาะ `if exists (… admin_edited …) then … end if;`
--      ในบล็อก PART 0 ของไฟล์ 66 (ยามอีกสองตัวในบล็อกเดียวกันให้คงไว้) แล้วค่อยรัน
-- 2. คอลัมน์ `admin_edited` ทิ้งไว้ได้ ไม่มีอะไรอ่านมันแล้ว · จะลบก็ได้:
--    alter table public.game_framework_items drop column if exists admin_edited;
--    ⚠️ ลบแล้ว ไฟล์ 66 จะกลับไปดู source='manual' ⇒ ข้อความที่ผู้ดูแลแก้ไว้
--       บนแถวที่ source='game-sync' จะกลับไปโดนเกมทับ (แถวที่ source='manual' ยังกันได้เหมือนเดิม)
-- ⚠️ ไม่มีข้อมูลใดถูกลบในไฟล์นี้ — ย้อนกลับแล้วข้อความยังอยู่ครบ
-- ============================================================
