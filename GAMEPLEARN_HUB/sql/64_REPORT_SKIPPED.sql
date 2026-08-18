-- ============================================================
-- 64_REPORT_SKIPPED.sql — ใบรายงานผลบอกได้ว่า "ตกอะไรไป เพราะอะไร"
-- เกมเพลิน (GamePlearn) · 2026-08-13 · ตามที่แชต [Kan] ภาค 1 ขอในเอกสาร 62/64/65
--
-- ที่มา: ไฟล์ 57 (`rpc_publish_media`) และไฟล์ 61 (`rpc_publish_standards`)
--        คืน `skipped:[{…, reason}]` แล้ว · เหลือท่อสุดท้ายคือใบรายงานผลของนักเรียน
--
-- ⚠️ ไฟล์นี้แตะ **ฟังก์ชันเดียว** คือ `public.rpc_submit_report`
--    ไม่แตะตาราง ไม่แตะข้อมูล ไม่แตะ view ไม่แตะสิทธิ์อ่าน
--    ต้องรัน `43_REPORT_CARDS.sql` มาก่อน (ไฟล์นี้ใช้ตารางและตัวช่วยจากที่นั่นทั้งหมด)
--    ✅ idempotent — รันซ้ำได้ · ย้อนกลับได้ด้วยการรัน 43 ทับ (ดูท้ายไฟล์)
--
-- ============================================================
-- ปัญหาเดิมที่ไฟล์นี้แก้ (อ่านจากโค้ดจริงของ 43 ทั้งไฟล์ก่อนเขียน)
-- ============================================================
--
-- ของเดิมเป็น **"ได้ทั้งหมดหรือไม่ได้เลย"** — รายการเดียวผิด ทั้งคำขอถูกยกเลิก
--
--   1. เกมส่งใบผลสัมฤทธิ์ + ด้านสมรรถนะ 3 ด้าน มาในคำขอเดียว
--   2. ด้านที่ 3 สะกดรหัสผิด → `raise exception`
--   3. **ใบผลสัมฤทธิ์ที่เขียนสำเร็จไปแล้วในข้อ 1 ถูกย้อนกลับไปด้วย**
--      ⇒ เด็กคนนั้นไม่มีคะแนนขึ้นเว็บกลางเลย ทั้งที่ผิดแค่ด้านเดียว
--
-- และข้อความที่ครูได้เห็นเป็น error ดิบภาษาอังกฤษของ PostgreSQL ในหลายกรณี เช่น
--   · `invalid input syntax for type numeric: "ดีมาก"`  (เกมส่งป้ายเกรดมาในช่องคะแนน)
--   · `new row for relation "competency_dim_results" violates check constraint`
--     (เกมส่ง evidence เป็นค่าอื่นนอกจาก scored/observed/self_report)
-- ซึ่งขัดกติกาที่ตกลงกันไว้ว่า **ห้ามโยน error ดิบใส่ครู**
--
-- ============================================================
-- สัญญาใหม่ (ตกลงกับภาค 1 ในเอกสาร 64/65 — ฝั่งเกมทำครึ่งของตัวเองเสร็จแล้วใน V.7.99.30)
-- ============================================================
--
--   ┌──────────────────────────────────────────────────────────────────────┐
--   │ เก็บได้อย่างน้อยหนึ่งอย่าง → คืน ok:true พร้อม skipped ของที่ตก      │
--   │ เก็บไม่ได้เลยแม้แต่อย่างเดียว → โยน error เหมือนเดิมทุกประการ        │
--   └──────────────────────────────────────────────────────────────────────┘
--
-- **`ok:false` ไม่มีวันเกิด** — จงใจ เพื่อให้ฝั่งเกมตัดสินได้ด้วยกฎเดียวที่ไม่กำกวม:
--   · คำขอสำเร็จ (มี ok:true)  = ใบของเด็กคนนี้ขึ้นเว็บกลางแล้ว (อาจไม่ครบ ดู skipped)
--   · คำขอล้ม (error)          = ใบของเด็กคนนี้ไม่ขึ้นเลย → เกมนับว่า "ไม่สำเร็จ"
--
-- ⚠️ เหตุผลที่ **ห้าม**เปลี่ยน "เก็บไม่ได้เลย" ให้เป็น `ok:false` แทน error:
--    ภาค 2 ต่อท่อนี้อยู่ด้วย (ตั้งแต่ V.8.19) และดักด้วย `.catch()` อย่างเดียว
--    ถ้าฐานตอบ 200 พร้อม ok:false ภาค 2 จะนึกว่าสำเร็จ แล้ว**จำลายเซ็นว่าส่งแล้ว**
--    ⇒ ไม่ยิงซ้ำอีกเลย = ข้อมูลเด็กหายเงียบ ๆ ซึ่งคือบั๊กที่ไฟล์นี้ตั้งใจมาแก้พอดี
--
-- รูปร่างที่คืน (ของเดิมอยู่ครบ ไม่มีช่องไหนหายหรือเปลี่ยนความหมาย):
--   ok            : true เสมอ (ดูกล่องบน)
--   game          : รหัสเกมที่ส่งมา                                    ← เดิม
--   achievement   : ใบผลสัมฤทธิ์ **ถูกบันทึกจริง** หรือไม่              ← เดิม *
--   competencies  : จำนวนด้านสมรรถนะที่ **ถูกบันทึกจริง**               ← เดิม *
--   stored        : จำนวนรายการที่บันทึกได้ทั้งหมด (ใบที่ 1 นับเป็น 1)  ← ใหม่
--   partial       : true เมื่อมีของตก (= skipped_total > 0)             ← ใหม่
--   skipped       : อาเรย์ [{part, code, reason, detail}] สูงสุด 25 รายการแรก ← ใหม่
--   skipped_total : จำนวนที่ตกทั้งหมด (บอก "และอีก N รายการ" ได้ตรงแม้อาเรย์ถูกตัด) ← ใหม่
--
--   * ความหมายไม่ได้เปลี่ยนสำหรับผู้เรียกเดิม: ของเดิมถ้ามีอะไรเขียนไม่ได้ ทั้งคำขอจะล้ม
--     ⇒ ทุกกรณีที่ "เคยสำเร็จ" ค่าที่คืนเหมือนเดิมเป๊ะ · เกมรุ่นเก่าที่ยังไม่อ่าน skipped ไม่กระทบ
--
-- เหตุผลที่คืนได้ (ภาษาไทย เอาขึ้นจอครูได้เลย ตามที่ภาค 1 ขอในเอกสาร 65 ข้อ 2):
--   1. ไม่มีรหัสด้านสมรรถนะ
--   2. รหัสซ้ำในคำขอเดียวกัน
--   3. ไม่รู้จักรหัสสมรรถนะ
--   4. ช่องที่ต้องเป็นตัวเลข ส่งมาเป็นอย่างอื่น
--   5. ค่า evidence ไม่อยู่ในสามค่าที่ฐานรับ
--   6. รูปแบบข้อมูลไม่ใช่ที่ตกลงกัน (ใบที่ 1 ไม่ใช่ object · ใบที่ 2 ไม่ใช่อาเรย์)
--   7. ฐานปฏิเสธด้วยเหตุอื่น (มี `detail` เป็นข้อความดิบไว้ให้คนทำระบบดู ไม่ได้เอาขึ้นจอครู)
--
-- ⚠️ สิ่งที่ **ไม่** เปลี่ยน: ยอดรวมทั้งห้อง — ฐานไม่รู้ว่าเกมวนถึงคนที่เท่าไรของห้อง
--    (ภาค 1 ยิงทีละใบ เว้นจังหวะ 120ms · ครูปิดหน้าจอกลางคันได้)
--    ฐานจึงตอบเฉพาะ "ใบนี้ใบเดียว" · ฝั่งเกมสะสมเองแล้วสรุปตอนวนครบห้อง (ทำแล้วใน V.7.99.30)
-- ============================================================


-- ============================================================
-- PART 1 — ตัวช่วยเล็ก ๆ: "ข้อความนี้เอาไปเป็นตัวเลขไม่ได้ใช่ไหม"
--
-- ต้องมีเพราะการ cast ล้มกลางคำสั่ง insert = ทั้งคำขอตาย ก่อนจะได้เขียน skipped
-- จึงต้องถามก่อนแตะฐาน · ว่าง/ไม่ส่ง = ไม่ผิด (แปลว่าเกมไม่ได้วัดช่องนั้น ซึ่งถูกต้องตามกติกา)
-- ============================================================

create or replace function public.gp_num_bad(p_text text)
returns boolean language plpgsql immutable as $$
declare v numeric;
begin
  if nullif(btrim(coalesce(p_text, '')), '') is null then return false; end if;
  v := p_text::numeric;
  return false;
exception when others then
  return true;
end $$;

create or replace function public.gp_int_bad(p_text text)
returns boolean language plpgsql immutable as $$
declare v integer;
begin
  if nullif(btrim(coalesce(p_text, '')), '') is null then return false; end if;
  v := p_text::integer;
  return false;
exception when others then
  return true;
end $$;

comment on function public.gp_num_bad is
  'true = ข้อความนี้ส่งมาแล้วแต่แปลงเป็นตัวเลขไม่ได้ (ว่าง/ไม่ส่ง = false) — ใช้กันคำขอทั้งใบตายเพราะช่องเดียว';


-- ============================================================
-- PART 2 — rpc_submit_report ฉบับที่บอกได้ว่าตกอะไรไป
--   ลายเซ็นเดิมทุกตัวอักษร · security definer เหมือนเดิม · สิทธิ์เดิม
-- ============================================================

create or replace function public.rpc_submit_report(
  p_game_code    text,
  p_game_version text,
  p_student      uuid,
  p_achievement  jsonb default null,
  p_competencies jsonb default null,
  p_run_id       text default 'live')
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_game_id uuid;
  v_run     text := coalesce(nullif(btrim(p_run_id), ''), 'live');
  v_n       int := 0;                       -- ด้านสมรรถนะที่บันทึกสำเร็จ
  v_ach_ok  boolean := false;               -- ใบผลสัมฤทธิ์บันทึกสำเร็จหรือไม่
  v_score numeric; v_max numeric; v_pct numeric;
  r        jsonb;
  v_code   text; v_lv integer;
  v_codes  text[] := '{}';                  -- รหัสที่รับไปแล้วในคำขอนี้ (ใช้จับรหัสซ้ำ)
  v_skip   jsonb := '[]'::jsonb;
  v_skip_n int := 0;
  v_first  text := null;                    -- เหตุผลแรก (ใช้ตอนต้องโยน error เพราะเก็บไม่ได้เลย)
  v_ach_ts timestamptz := null;             -- computed_at ของใบที่ 1 (ใช้เป็นค่าสำรองของใบที่ 2)
  v_bad    text;
begin
  -- ── ด่านแรก: เรื่องที่ทำให้ทั้งคำขอใช้ไม่ได้จริง ๆ → โยน error เหมือนเดิมทุกข้อ ──
  -- (ข้อความไทยเดิมของไฟล์ 43 ยกมาทั้งหมด ไม่แก้ถ้อยคำ เพื่อไม่ให้ฝั่งเกมที่จับข้อความอยู่พัง)
  if p_student is null then raise exception 'ต้องระบุนักเรียน'; end if;
  if v_run = 'LEGACY-SHEETS' then
    raise exception 'run_id LEGACY-SHEETS สงวนไว้สำหรับข้อมูลนำเข้าจากชีตเท่านั้น';
  end if;
  if p_achievement is null and (p_competencies is null
      or (jsonb_typeof(p_competencies) = 'array' and jsonb_array_length(p_competencies) = 0)) then
    raise exception 'ต้องส่งอย่างน้อยหนึ่งใบ: p_achievement หรือ p_competencies';
  end if;

  v_game_id := public.gp_resolve_game(p_game_code, p_game_version);
  if v_game_id is null then
    raise exception 'ไม่พบเกม % — ต้องลงทะเบียนเกมในตาราง games ก่อน', p_game_code;
  end if;
  if not exists (select 1 from public.students s where s.id = p_student) then
    raise exception 'ไม่พบนักเรียนรหัสนี้';
  end if;

  -- computed_at ของใบที่ 1 — อ่านเมื่อเป็น object เท่านั้น
  -- (`->> ` บน jsonb ที่เป็นอาเรย์จะโยน error ทันที ซึ่งจะทำให้ทั้งใบตายก่อนได้เขียน skipped)
  if jsonb_typeof(p_achievement) = 'object' then
    v_ach_ts := public.gp_ts(p_achievement->>'computed_at');
  end if;

  -- ════════════════ ใบที่ 1: ผลสัมฤทธิ์ ════════════════
  if p_achievement is not null then
    if jsonb_typeof(p_achievement) <> 'object' then
      v_bad := 'ใบผลสัมฤทธิ์ต้องเป็นข้อมูลชุดเดียว (object) — ได้รับ '
               || jsonb_typeof(p_achievement);
      v_skip_n := v_skip_n + 1; v_first := coalesce(v_first, v_bad);
      if v_skip_n <= 25 then
        v_skip := v_skip || jsonb_build_object('part', 'achievement', 'code', null, 'reason', v_bad);
      end if;
    else
      -- ช่องตัวเลขทุกช่องต้องอ่านออกก่อน ถึงจะแตะฐาน
      v_bad := null;
      if public.gp_num_bad(p_achievement->>'score') then
        v_bad := 'ใบผลสัมฤทธิ์: ช่องคะแนน (score) ต้องเป็นตัวเลข — ได้รับ "'
                 || left(p_achievement->>'score', 40) || '"';
      elsif public.gp_num_bad(p_achievement->>'max_score') then
        v_bad := 'ใบผลสัมฤทธิ์: ช่องคะแนนเต็ม (max_score) ต้องเป็นตัวเลข — ได้รับ "'
                 || left(p_achievement->>'max_score', 40) || '"';
      elsif public.gp_num_bad(p_achievement->>'percent') then
        v_bad := 'ใบผลสัมฤทธิ์: ช่องร้อยละ (percent) ต้องเป็นตัวเลข — ได้รับ "'
                 || left(p_achievement->>'percent', 40) || '"';
      elsif public.gp_num_bad(p_achievement->>'progress_percent') then
        v_bad := 'ใบผลสัมฤทธิ์: ช่องความคืบหน้า (progress_percent) ต้องเป็นตัวเลข — ได้รับ "'
                 || left(p_achievement->>'progress_percent', 40) || '"';
      end if;

      if v_bad is not null then
        v_skip_n := v_skip_n + 1; v_first := coalesce(v_first, v_bad);
        if v_skip_n <= 25 then
          v_skip := v_skip || jsonb_build_object('part', 'achievement', 'code', null, 'reason', v_bad);
        end if;
      else
        begin
          v_score := nullif(p_achievement->>'score','')::numeric;
          v_max   := nullif(p_achievement->>'max_score','')::numeric;
          v_pct   := nullif(p_achievement->>'percent','')::numeric;
          if v_pct is null and v_score is not null and coalesce(v_max, 0) > 0 then
            v_pct := round(v_score / v_max * 100, 1);
          end if;

          insert into public.achievement_results (
            student_id, game_id, run_id, game_version,
            score, max_score, percent, grade_label, progress_percent,
            unit_scores, criteria_note, detail, computed_at)
          values (
            p_student, v_game_id, v_run, nullif(p_game_version,''),
            v_score, v_max, v_pct,
            nullif(p_achievement->>'grade_label',''),
            nullif(p_achievement->>'progress_percent','')::numeric,
            p_achievement->'unit_scores',
            nullif(p_achievement->>'criteria_note',''),
            p_achievement->'detail',
            coalesce(v_ach_ts, now()))
          on conflict (student_id, game_id, run_id) do update set
            game_version = excluded.game_version,
            score = excluded.score, max_score = excluded.max_score, percent = excluded.percent,
            grade_label = excluded.grade_label, progress_percent = excluded.progress_percent,
            unit_scores = excluded.unit_scores, criteria_note = excluded.criteria_note,
            detail = excluded.detail, computed_at = excluded.computed_at;

          v_ach_ok := true;
        exception when others then
          -- ตาข่ายชั้นสุดท้าย: ฐานปฏิเสธด้วยเหตุที่ยังไม่ได้ดักไว้
          -- reason = ไทย (ขึ้นจอครูได้) · detail = ข้อความดิบไว้ให้คนทำระบบอ่าน
          v_bad := 'ใบผลสัมฤทธิ์บันทึกไม่สำเร็จ — ฐานข้อมูลปฏิเสธรายการนี้';
          v_skip_n := v_skip_n + 1; v_first := coalesce(v_first, v_bad);
          if v_skip_n <= 25 then
            v_skip := v_skip || jsonb_build_object('part', 'achievement', 'code', null,
              'reason', v_bad, 'detail', left(SQLERRM, 300));
          end if;
        end;
      end if;
    end if;
  end if;

  -- ════════════════ ใบที่ 2: สมรรถนะรายด้าน ════════════════
  if p_competencies is not null then
    if jsonb_typeof(p_competencies) <> 'array' then
      v_bad := 'ใบสมรรถนะต้องเป็นอาเรย์ของรายการ — ได้รับ ' || jsonb_typeof(p_competencies);
      v_skip_n := v_skip_n + 1; v_first := coalesce(v_first, v_bad);
      if v_skip_n <= 25 then
        v_skip := v_skip || jsonb_build_object('part', 'competency', 'code', null, 'reason', v_bad);
      end if;
    else
      for r in select * from jsonb_array_elements(p_competencies) loop
        v_bad := null;

        if jsonb_typeof(r) <> 'object' then
          v_bad := 'รายการสมรรถนะต้องเป็นข้อมูลชุดเดียว (object) — ได้รับ ' || jsonb_typeof(r);
          v_code := null;
        else
          v_code := public.gp_comp_code(r->>'code');

          -- 1) ไม่มีรหัส
          if v_code is null or v_code = '' then
            v_code := null;
            v_bad := 'ไม่มีรหัสด้านสมรรถนะ — รายการนี้ไม่มีช่อง code หรือใส่มาเป็นค่าว่าง';

          -- 2) รหัสซ้ำในคำขอเดียวกัน (ของเดิมเขียนทับกันเงียบ ๆ เหลือใบสุดท้าย)
          elsif v_code = any(v_codes) then
            v_bad := 'รหัส "' || v_code || '" ซ้ำกับรายการก่อนหน้าในคำขอเดียวกัน — '
                     || 'เก็บของที่ส่งมาก่อนไว้';

          -- 3) รหัสต้องเป็นของจริง (ชุดกลาง หรือ depth-1 ที่ลงทะเบียนไว้)
          elsif v_code not in ('SM','HOT','CM','TW','CZ','SN')
             and not exists (select 1 from public.framework_items i
                              where i.code = v_code and i.depth = 1) then
            v_bad := 'ไม่รู้จักรหัสสมรรถนะ "' || v_code || '" (แปลง HT→HOT · NS→SN ให้แล้ว) — '
                     || 'ใช้ SM·HOT·CM·TW·CZ·SN หรือรหัส depth-1 ที่ลงทะเบียนไว้ในกรอบ';

          -- 4) ช่องตัวเลข
          elsif public.gp_num_bad(r->>'score') then
            v_bad := 'ด้าน ' || v_code || ': ช่องคะแนน (score) ต้องเป็นตัวเลข — ได้รับ "'
                     || left(r->>'score', 40) || '"';
          elsif public.gp_int_bad(r->>'level') then
            v_bad := 'ด้าน ' || v_code || ': ช่องระดับ (level) ต้องเป็นจำนวนเต็ม — ได้รับ "'
                     || left(r->>'level', 40) || '"';
          elsif public.gp_num_bad(r->>'system_score') then
            v_bad := 'ด้าน ' || v_code || ': ช่อง system_score ต้องเป็นตัวเลข — ได้รับ "'
                     || left(r->>'system_score', 40) || '"';
          elsif public.gp_int_bad(r->>'system_level') then
            v_bad := 'ด้าน ' || v_code || ': ช่อง system_level ต้องเป็นจำนวนเต็ม — ได้รับ "'
                     || left(r->>'system_level', 40) || '"';

          -- 5) evidence ต้องอยู่ในสามค่าที่ตารางรับ (ของเดิมชนกับ check constraint เป็นภาษาอังกฤษ)
          elsif coalesce(nullif(r->>'evidence',''), 'scored')
                not in ('scored','observed','self_report') then
            v_bad := 'ด้าน ' || v_code || ': ค่า evidence "' || left(r->>'evidence', 40)
                     || '" ไม่ถูกต้อง — ใช้ scored (คิดจากคะแนน) · observed (สังเกตพฤติกรรมในเกม) '
                     || '· self_report (แบบประเมินตนเอง)';
          end if;
        end if;

        if v_bad is not null then
          v_skip_n := v_skip_n + 1; v_first := coalesce(v_first, v_bad);
          if v_skip_n <= 25 then
            v_skip := v_skip || jsonb_build_object('part', 'competency', 'code', v_code, 'reason', v_bad);
          end if;
          continue;
        end if;

        begin
          v_lv := nullif(r->>'level','')::integer;

          insert into public.competency_dim_results (
            student_id, game_id, run_id, comp_code, game_version,
            score, level, level_label, sub_scores, evidence,
            decided_by, system_level, system_score, criteria_note, detail, computed_at)
          values (
            p_student, v_game_id, v_run, v_code, nullif(p_game_version,''),
            nullif(r->>'score','')::numeric,
            v_lv,
            coalesce(nullif(r->>'level_label',''), public.gp_level_label(v_lv)),
            r->'sub_scores',
            coalesce(nullif(r->>'evidence',''), 'scored'),
            case when coalesce(nullif(r->>'decided_by',''), 'game') = 'teacher' then 'teacher' else 'game' end,
            nullif(r->>'system_level','')::integer,
            nullif(r->>'system_score','')::numeric,
            nullif(r->>'criteria_note',''),
            r->'detail',
            coalesce(public.gp_ts(r->>'computed_at'), v_ach_ts, now()))
          on conflict (student_id, game_id, run_id, comp_code) do update set
            game_version = excluded.game_version,
            score = excluded.score, level = excluded.level, level_label = excluded.level_label,
            sub_scores = excluded.sub_scores, evidence = excluded.evidence,
            decided_by = excluded.decided_by,
            system_level = excluded.system_level, system_score = excluded.system_score,
            criteria_note = excluded.criteria_note, detail = excluded.detail,
            computed_at = excluded.computed_at;

          v_codes := v_codes || v_code;
          v_n := v_n + 1;
        exception when others then
          v_bad := 'ด้าน ' || v_code || ' บันทึกไม่สำเร็จ — ฐานข้อมูลปฏิเสธรายการนี้';
          v_skip_n := v_skip_n + 1; v_first := coalesce(v_first, v_bad);
          if v_skip_n <= 25 then
            v_skip := v_skip || jsonb_build_object('part', 'competency', 'code', v_code,
              'reason', v_bad, 'detail', left(SQLERRM, 300));
          end if;
        end;
      end loop;
    end if;
  end if;

  -- ════════════════ เก็บไม่ได้เลย = คำขอนี้ล้ม (เหมือนของเดิมทุกประการ) ════════════════
  -- ห้ามคืน 200 พร้อม ok:false — ดูเหตุผลในหัวไฟล์ (ภาค 2 ดักด้วย .catch อย่างเดียว)
  if not v_ach_ok and v_n = 0 then
    raise exception 'บันทึกใบรายงานผลไม่ได้เลยสักรายการ — %', coalesce(v_first, 'ไม่ทราบสาเหตุ');
  end if;

  return jsonb_build_object(
    'ok', true, 'game', p_game_code,
    'achievement', v_ach_ok,
    'competencies', v_n,
    'stored', v_n + (case when v_ach_ok then 1 else 0 end),
    'partial', v_skip_n > 0,
    'skipped', v_skip,
    'skipped_total', v_skip_n);
end $$;

comment on function public.rpc_submit_report(text,text,uuid,jsonb,jsonb,text) is
  'รับใบรายงานผลของนักเรียนหนึ่งคน — เก็บได้เท่าไรเก็บ ที่เหลือคืนมาใน skipped พร้อมเหตุผลภาษาไทย · เก็บไม่ได้เลย = โยน error';

revoke all on function public.rpc_submit_report(text,text,uuid,jsonb,jsonb,text) from public;
grant execute on function public.rpc_submit_report(text,text,uuid,jsonb,jsonb,text) to anon, authenticated;

notify pgrst, 'reload schema';


-- ============================================================
-- PART 3 — ตรวจว่ารันแล้วได้ผลจริง (รันแล้วอ่านผลได้เลย ไม่ต้องเดา)
-- ============================================================

select 'ฟังก์ชัน rpc_submit_report มีอยู่' as รายการ,
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = 'rpc_submit_report')
            then '✅ มี' else '❌ ไม่มี — รัน 43_REPORT_CARDS.sql ก่อน' end as ผล
union all
select 'คืนช่อง skipped แล้วหรือยัง',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = 'rpc_submit_report'
                            and pg_get_functiondef(p.oid) like '%skipped_total%')
            then '✅ คืนแล้ว' else '❌ ยังเป็นฉบับเดิม' end
union all
select 'สิทธิ์เรียก (ต้องมีทั้ง anon และ authenticated)',
       case when has_function_privilege('anon',
              'public.rpc_submit_report(text,text,uuid,jsonb,jsonb,text)', 'execute')
             and has_function_privilege('authenticated',
              'public.rpc_submit_report(text,text,uuid,jsonb,jsonb,text)', 'execute')
            then '✅ ครบ' else '❌ ขาด' end;

-- ► ทดลองด้วยมือ (แทน <uuid นักเรียนจริง> ก่อนรัน):
--   select public.rpc_submit_report(
--     'kanchanaburi2050', 'V.7.99.30-IX2050-2569.71', '<uuid นักเรียนจริง>',
--     p_achievement  := '{"score":78,"max_score":100,"grade_label":"ดีมาก"}'::jsonb,
--     p_competencies := '[{"code":"HT","score":72,"level":5},
--                         {"code":"XX","score":50},
--                         {"code":"TW","level":"สูง"},
--                         {"code":"HOT","score":1}]'::jsonb);
--   ต้องได้ stored = 2 · partial = true · skipped 3 รายการ พร้อมเหตุผลไทยคนละแบบ
--   (XX = ไม่รู้จักรหัส · TW = ระดับไม่ใช่จำนวนเต็ม · HOT = ซ้ำกับ HT ที่แปลงเป็น HOT ไปแล้ว)


-- ============================================================
-- ROLLBACK — กลับไปฉบับเดิม
-- ============================================================
-- รัน `43_REPORT_CARDS.sql` ทับอีกครั้ง (ฟังก์ชันจะกลับเป็นฉบับ "ได้ทั้งหมดหรือไม่ได้เลย")
-- ตัวช่วยที่ไฟล์นี้เพิ่มไว้ลบทิ้งต่างหากได้ ถ้าไม่อยากให้ค้าง:
--   drop function if exists public.gp_num_bad(text);
--   drop function if exists public.gp_int_bad(text);
-- ⚠️ ไม่มีตารางหรือข้อมูลใดถูกแตะในไฟล์นี้ — ย้อนกลับแล้วไม่มีอะไรเสีย
-- ============================================================
