-- ============================================================
-- 82_REPORT_SENDER_PROOF.sql — ปิด F2: ยามพิสูจน์ผู้ส่งใบรายงานผล
-- เกมเพลิน (GamePlearn) · 20 ส.ค. 2569 · โดย Claude Code ตามคำสั่งครู "ปิด F2"
--
-- ปัญหาที่ปิด (F2 / ADR-006 — ค้างมาตั้งแต่ต้น):
--   public.rpc_submit_report เป็น security definer และ **ไม่ตรวจว่าใครเป็นคนเรียก**
--   ⇒ ใครก็ตามที่ยิง RPC นี้ได้ เขียนใบรายงานผล (คะแนน + ระดับสมรรถนะ)
--     ให้นักเรียนคนไหนก็ได้ ขอแค่รู้ uuid ของเด็ก
--   ⇒ และเด็กมี uuid ของเพื่อนทั้งห้องอยู่ในเครื่องอยู่แล้ว จากรายชื่อห้องเรียน
--
-- ยามที่ใส่: ผู้เรียกต้องเป็น **ครูเจ้าของห้องของนักเรียนคนนั้น** หรือผู้ดูแลระบบ
--   ตรงกับความจริงของท่อส่งวันนี้: ท่อวิ่งจากหน้าครูของเกม ขณะครูล็อกอินอยู่
--   ใช้รูปแบบเดียวกับ RLS ของตารางใบรายงานผลในไฟล์ 43 (PART 6) ทุกประการ
--
-- 🔎 สิ่งที่ยามนี้ **ไม่ได้** ทำให้:
--   ไม่ได้เปิดทางให้ "เด็กส่งผลของตัวเองอัตโนมัติ" เพราะนักเรียนไม่มีบัญชี auth
--   (เข้าห้องด้วยโค้ด/PIN ไม่ใช่การล็อกอิน) ⇒ ยังไม่มีตัวตนให้ยามตรวจ
--   การทำอัตโนมัติเต็มรูปเป็นงานคนละก้อน ต้องออกแบบตัวตนของนักเรียนก่อน
--
-- ผลข้างเคียงที่ตั้งใจ: ถ้าครูเปิดดู "ห้องสาธารณะของครูคนอื่น" แล้วท่อส่งทำงาน
--   จากนี้จะถูกปฏิเสธ (เดิมเขียนทับข้อมูลห้องคนอื่นได้เงียบ ๆ) — นี่คือสิ่งที่ควรเป็น
--
-- ต้องรัน 43_REPORT_CARDS.sql และ 64_REPORT_SKIPPED.sql ก่อน (ไฟล์นี้ต่อยอดจากฉบับของ 64) · idempotent รันซ้ำได้ · ไม่แตะข้อมูลที่มีอยู่
-- ============================================================

-- ยามกันรันผิดลำดับ
do $guard$
begin
  if to_regprocedure('public.rpc_submit_report(text,text,uuid,jsonb,jsonb,text)') is null then
    raise exception E'ยังไม่มี rpc_submit_report — ต้องรัน 43_REPORT_CARDS.sql ก่อนไฟล์นี้';
  end if;
  if to_regprocedure('public.is_admin()') is null then
    raise exception E'ยังไม่มี is_admin() — ต้องรัน 15_SITE_PAGES.sql ก่อนไฟล์นี้';
  end if;
  -- ⚠️ ไฟล์ 64 เขียนทับ rpc_submit_report ด้วยฉบับที่ใหม่กว่าไฟล์ 43 (เพิ่มช่อง skipped/partial)
  --    ไฟล์นี้ต่อยอดจาก "ฉบับของ 64" ⇒ ถ้ายังไม่ได้รัน 64 ต้องหยุด ไม่งั้นจะถอยของ 64 ทิ้ง
  if (select pg_get_functiondef(oid) not like '%skipped_total%'
        from pg_proc where proname = 'rpc_submit_report' limit 1) then
    raise exception E'ต้องรัน 64_REPORT_SKIPPED.sql ก่อนไฟล์นี้ — ไม่งั้นช่อง skipped/partial จะหายไป';
  end if;
end
$guard$;


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

  -- ══ [F2 · ADR-006 · 20 ส.ค. 2569] ยามพิสูจน์ผู้ส่ง ══════════════════════
  --  ก่อนหน้านี้ฟังก์ชันนี้เป็น security definer ที่ "ใครยิงก็เขียนได้"
  --  ⇒ ใครก็ตามที่มี uuid ของนักเรียน เขียนใบรายงานผลให้คนนั้นได้
  --    และเด็กมี uuid ของเพื่อนทั้งห้องอยู่ในเครื่องอยู่แล้วจากรายชื่อห้อง
  --    ⇒ เด็กเขียนคะแนนให้กันได้ · เขียนทับคะแนนตัวเองได้ · คนนอกก็ทำได้ถ้ารู้ uuid
  --
  --  ใครมีสิทธิ์เขียนจริง: "ครูเจ้าของห้องของนักเรียนคนนั้น" เท่านั้น (หรือผู้ดูแล)
  --  ซึ่งตรงกับความจริงของระบบวันนี้ — ท่อส่งวิ่งจากหน้าครูของเกม ขณะครูล็อกอินอยู่
  --  ใช้รูปแบบเดียวกับ RLS ของตารางใบรายงานผลในไฟล์นี้ (ส่วน PART 6) เป๊ะ
  --
  --  หมายเหตุที่ต้องรู้: นักเรียน**ไม่มีบัญชี auth** (เข้าห้องด้วยโค้ด/PIN)
  --  ⇒ เปิดให้ "เด็กส่งผลของตัวเอง" ยังทำไม่ได้ด้วยยามนี้ ต้องมีตัวตนของเด็กก่อน
  --    (เป็นงานคนละก้อน — จดไว้กันเข้าใจผิดว่าปิด F2 แล้วได้อัตโนมัติเต็มรูปทันที)
  if not (
       public.is_admin()
       or exists (
            select 1
              from public.students s
              join public.classrooms c on c.id = s.classroom_id
             where s.id = p_student
               and c.teacher_id = auth.uid()))
  then
    raise exception 'ไม่มีสิทธิ์ส่งใบรายงานผลของนักเรียนคนนี้ — ต้องเป็นครูเจ้าของห้อง';
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

notify pgrst, 'reload schema';


-- ============================================================
-- ตรวจผล — วางต่อท้ายแล้วดูว่าได้ true ทั้งสองบรรทัด
-- ============================================================
-- select prosecdef as "เป็น security definer (ควรเป็น true)"
--   from pg_proc where proname = 'rpc_submit_report';
-- select pg_get_functiondef(oid) like '%ต้องเป็นครูเจ้าของห้อง%' as "มียามพิสูจน์ผู้ส่งแล้ว"
--   from pg_proc where proname = 'rpc_submit_report';


-- ============================================================
-- ROLLBACK — ถ้าต้องถอยกลับเป็นแบบไม่มียาม (ไม่แนะนำ: เปิดช่องโหว่คืน)
-- ============================================================
--   วิธีถอย: รัน **64_REPORT_SKIPPED.sql** ซ้ำอีกครั้ง (ไม่ใช่ 43 — 43 เป็นฉบับเก่ากว่า
--   ถ้ารัน 43 จะเสียช่อง skipped/partial ของ 64 ไปด้วย)
--   ไฟล์ 64 จะ create or replace ทับฟังก์ชันกลับเป็นฉบับไม่มียามตามเดิม
--   (ไม่มีข้อมูลใดถูกแตะ ทั้งไฟล์นี้และการถอย)
