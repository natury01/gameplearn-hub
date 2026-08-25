-- ============================================================================
-- 85_RESOLVE_GAME_ALL_PIPES.sql — ปิด F4 บนท่อจริง: ทุกท่อเขียนผลต้องแยกภาคด้วย gp_resolve_game
-- (มติครู 25 ส.ค. 2569: ทาง ก · แก้ครบทั้งชุด — จาก HUB_TO_CODE_2026-08-25_สเปก3ข้อ.md)
--
-- ที่มา: F4 ที่ประกาศปิด 18 ส.ค. ปิดผิดท่อ — เทสต์พิสูจน์ rpc_submit_report (ซึ่งเรียก
--   gp_resolve_game) แต่ท่อที่เกมใช้จริงคือ rpc_submit_events ซึ่งหาเกมด้วย code เปล่า ๆ
--   ⇒ ผลภาค 2 ถูกจดเป็นภาค 1 · ตรวจจากสำเนาฐานจริง (SCHEMA_DUMP_2026-08-25.sql)
--   พบท่อที่เป็นโรคเดียวกัน 9 ตัว (8 + rpc_submit_feedback ที่ผู้ตรวจหักล้างพบเพิ่ม) — แก้ทั้งหมด
--
-- หลักการแก้ (สำคัญ — อ่านก่อนสงสัยว่าทำไมไม่เรียก gp_resolve_game ตรง ๆ):
--   gp_resolve_game "ต้องมีรุ่น" เมื่อรหัสถูกใช้ร่วมสองภาค — แต่ทางเข้าเก่าหลายทาง
--   ยังไม่ส่งรุ่นมา (เกมรุ่นที่ครูอัปไปแล้ววันนี้) · ถ้าบังคับทันที ภาค 1 ที่ใช้งานอยู่จะพังกลางเทอม
--   ⇒ ใช้ตัวช่วย gp_game_for: **มีรุ่น = แยกภาคเต็มรูป · ไม่มีรุ่น = พฤติกรรมเดิมทุกไบต์**
--   (ทางเข้าที่ไม่ส่งรุ่นจึงยังทำงานเท่าเดิม — จนกว่าเกมจะส่งรุ่นในรอบถัดไป แล้วถูกเอง)
--
-- ลายเซ็นที่เปลี่ยน (drop แล้วสร้างใหม่ — พารามิเตอร์ใหม่มี default ⇒ ผู้เรียกเก่าไม่พัง):
--   rpc_submit_survey · rpc_submit_item_scores · rpc_kru_assess · rpc_kru_save · rpc_set_save
--   · rpc_submit_feedback (+ p_game_version text default null ต่อท้าย)
-- แก้ในที่ (ลายเซ็นเดิม — รุ่นมีอยู่ในพารามิเตอร์เดิมแล้ว):
--   rpc_submit_events (p_attempt->>'game_version') · rpc_submit_competency (p_game_version)
--   · rpc_submit_peer (p_raw->>'gameVersion')
-- ทะเบียนยกเว้น (เซ็นชื่อ — เหตุผลอยู่ในยามท้ายไฟล์):
--   rpc_split_group · rpc_split_named — คัดลอก game_id จากแถวที่มีอยู่แล้ว ไม่ได้หาเกมจากรหัส
--
-- เนื้อฟังก์ชันนอกจุดแก้ = คัดจากสำเนาฐานจริง (SCHEMA_DUMP_2026-08-25.sql) คำต่อคำ
-- จุดแก้ทุกจุดมีป้าย [85·F4] กำกับ · additive · รันซ้ำได้ · ห่อ transaction (บทเรียน P26)
-- ============================================================================

begin;

-- ── ยามกันรันผิดลำดับ + ยามข้อมูล: resolver ต้อง "แยกสองภาคได้จริงบนฐานนี้" ──
-- (ผู้ตรวจหักล้าง 25 ส.ค. ชี้: gp_resolve_game คืนภาค 1 เงียบ ๆ ถ้าแถวภาค 2 ไม่ได้ตั้ง
--  score_code — การมีฟังก์ชันอยู่ไม่พอ ต้องพิสูจน์กับข้อมูลจริงก่อนสลับท่อทั้งชุด)
do $$
declare v_p1 uuid; v_p2 uuid;
begin
  if to_regprocedure('public.gp_resolve_game(text,text)') is null then
    raise exception 'ยังไม่มี gp_resolve_game ในฐานนี้ — รันชุด SQL หลัก (43/82) ก่อน แล้วค่อยรันไฟล์นี้';
  end if;
  select id into v_p1 from public.games where code = 'kanchanaburi2050';
  if v_p1 is null then
    raise exception 'ไม่มีแถวเกมฐาน kanchanaburi2050 ในตาราง games — ตรวจฐานก่อน';
  end if;
  begin
    v_p2 := public.gp_resolve_game('kanchanaburi2050', '-p2-');
  exception when others then
    raise exception 'resolver แยกภาคไม่ได้ (%) — แถวภาค 2 ต้องตั้ง score_code+season_tag ก่อน: update games set score_code=''kanchanaburi2050'', season_tag=''-p2-'' where code=''kanchanaburi2050-p2''; แล้วรันไฟล์นี้ใหม่', sqlerrm;
  end;
  if v_p2 is null or v_p2 = v_p1 then
    raise exception 'resolver คืนภาคผิด: รุ่นที่มีป้าย -p2- ได้แถวภาค 1 — แถวภาค 2 ยังไม่ได้ตั้งค่า แก้ด้วย: update games set score_code=''kanchanaburi2050'', season_tag=''-p2-'' where code=''kanchanaburi2050-p2''; แล้วรันไฟล์นี้ใหม่';
  end if;
  if public.gp_resolve_game('kanchanaburi2050', 'V.7.99.57') is distinct from v_p1 then
    raise exception 'resolver คืนภาคฐานผิด: รุ่นภาค 1 ไม่ได้แถวภาค 1 — ตรวจว่า season_tag ของแถว kanchanaburi2050 เป็น null';
  end if;
end $$;

-- ── ตัวช่วยกลาง: มีรุ่น = แยกภาค · ไม่มีรุ่น = พฤติกรรมเดิม ─────────────────────
create or replace function public.gp_game_for(p_code text, p_version text)
 returns uuid
 language plpgsql
 stable
as $function$
declare v uuid;
begin
  if coalesce(btrim(p_version), '') <> '' then
    return public.gp_resolve_game(p_code, p_version);   -- แยกภาคเต็มรูป (raise ไทยเมื่อรุ่นเพี้ยน)
  end if;
  -- ทางเข้าเก่าที่ยังไม่ส่งรุ่น: ทำแบบที่ทุกท่อเคยทำ (code ตรงตัว) — ห้ามเปลี่ยนจนกว่าเกมส่งรุ่น
  select id into v from public.games where code = p_code;
  return v;
end $function$;

-- ════════════════ กลุ่มแก้ในที่ (ลายเซ็นเดิม) ════════════════

CREATE OR REPLACE FUNCTION public.rpc_submit_events(p_join_key text, p_student uuid, p_pin text, p_game_code text, p_attempt jsonb, p_events jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_game uuid; v_attempt uuid; e jsonb;
        v_last_stage text; v_dur int; v_score numeric; v_prog numeric; v_metrics jsonb;
begin
  if not _student_ok(p_student, p_join_key, p_pin) then raise exception 'ยืนยันตัวนักเรียนไม่ผ่าน (โค้ด/PIN)'; end if;
  -- [85·F4] เดิม: select id from games where code = p_game_code (ไม่แยกภาค — ต้นเหตุ F4)
  v_game := public.gp_game_for(p_game_code, p_attempt->>'game_version');
  if v_game is null then raise exception 'ไม่พบเกม %', p_game_code; end if;
  insert into attempts(student_id, game_id, session_id, attempt_no, is_first, game_version, started_at, ended_at)
    values (p_student, v_game, p_attempt->>'session_id', nullif(p_attempt->>'attempt_no','')::int,
            (p_attempt->>'is_first')::boolean, p_attempt->>'game_version', now(), now())
    returning id into v_attempt;
  if p_events is not null then
    for e in select * from jsonb_array_elements(p_events) loop
      insert into events(attempt_id, student_id, game_id, stage_id, kind, question_id, correct, credit, score, raw)
        values (v_attempt, p_student, v_game, e->>'stage_id', e->>'kind', e->>'question_id',
                (e->>'correct')::boolean, nullif(e->>'credit','')::numeric, nullif(e->>'score','')::numeric, e->'raw');
      v_last_stage := coalesce(e->>'stage_id', v_last_stage);
    end loop;
  end if;

  -- [GamePlearn v1.0] อัปเดตชั้นสรุปสำหรับ Dashboard ข้ามเกม
  v_dur     := nullif(p_attempt->>'duration_seconds','')::int;
  v_score   := nullif(p_attempt->>'score','')::numeric;
  v_prog    := nullif(p_attempt->>'progress_percent','')::numeric;
  v_metrics := p_attempt->'metrics';
  insert into student_game_progress as sgp
    (student_id, game_id, current_activity_id, progress_percent, best_score,
     total_play_seconds, attempts_count, summary_metrics, last_played_at, updated_at)
  values
    (p_student, v_game, v_last_stage, coalesce(v_prog, 0), v_score,
     coalesce(v_dur, 0), 1, coalesce(v_metrics, '{}'::jsonb), now(), now())
  on conflict (student_id, game_id) do update set
    current_activity_id = coalesce(excluded.current_activity_id, sgp.current_activity_id),
    progress_percent = case when v_prog is null then sgp.progress_percent
                            else greatest(sgp.progress_percent, v_prog) end,
    best_score = case when v_score is null then sgp.best_score
                      else greatest(coalesce(sgp.best_score, 0), v_score) end,
    total_play_seconds = sgp.total_play_seconds + coalesce(v_dur, 0),
    attempts_count = sgp.attempts_count + 1,
    summary_metrics = case when v_metrics is null then sgp.summary_metrics
                           else sgp.summary_metrics || v_metrics end,
    last_played_at = now(), updated_at = now();

  return v_attempt;
end; $function$
;

CREATE OR REPLACE FUNCTION public.rpc_submit_competency(p_game_code text, p_game_version text, p_student uuid, p_scores jsonb, p_run_id text DEFAULT 'live'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_game_id uuid;
  v_total numeric; v_lv integer;
  v_ctc numeric; v_stm numeric; v_crt numeric; v_prb numeric;
  v_elig boolean;
begin
  if p_student is null then raise exception 'ต้องระบุนักเรียน'; end if;

  -- [85·F4] เดิม: select id from games where code = p_game_code — มี p_game_version อยู่แล้วแต่ไม่ใช้
  v_game_id := public.gp_game_for(p_game_code, p_game_version);
  if v_game_id is null then
    raise exception 'ไม่พบเกม % — ต้องลงทะเบียนเกมในตาราง games ก่อน', p_game_code;
  end if;

  if not exists (select 1 from public.students s where s.id = p_student) then
    raise exception 'ไม่พบนักเรียนรหัสนี้';
  end if;

  v_total := nullif(p_scores->>'total','')::numeric;
  v_ctc   := nullif(p_scores->>'ctc','')::numeric;
  v_stm   := nullif(p_scores->>'stm','')::numeric;
  v_crt   := nullif(p_scores->>'crt','')::numeric;
  v_prb   := nullif(p_scores->>'prb','')::numeric;
  v_elig  := coalesce((p_scores->>'research_eligible')::boolean, false);

  -- เกมส่ง level มาเองใช้ของเกม · ไม่ส่งมาจึงคิดให้ด้วยเกณฑ์กลาง
  v_lv := nullif(p_scores->>'level','')::integer;
  if v_lv is null then
    v_lv := public.gp_level_of(v_total, v_elig, v_ctc, v_stm, v_crt, v_prb);
  end if;

  insert into public.competency_results (
    student_id, game_id, run_id, game_version,
    a, b, c, d, total, ctc, stm, crt, prb,
    level, data_status, research_eligible, detail, computed_at)
  values (
    p_student, v_game_id, coalesce(nullif(p_run_id,''), 'live'), nullif(p_game_version,''),
    nullif(p_scores->>'a','')::numeric, nullif(p_scores->>'b','')::numeric,
    nullif(p_scores->>'c','')::numeric, nullif(p_scores->>'d','')::numeric,
    v_total, v_ctc, v_stm, v_crt, v_prb,
    v_lv, nullif(p_scores->>'data_status',''), v_elig,
    p_scores->'detail', now())
  on conflict (student_id, game_id, run_id) do update set
    game_version = excluded.game_version,
    a = excluded.a, b = excluded.b, c = excluded.c, d = excluded.d,
    total = excluded.total,
    ctc = excluded.ctc, stm = excluded.stm, crt = excluded.crt, prb = excluded.prb,
    level = excluded.level, data_status = excluded.data_status,
    research_eligible = excluded.research_eligible,
    detail = excluded.detail, computed_at = now();

  return jsonb_build_object('ok', true, 'game', p_game_code, 'level', v_lv, 'total', v_total);
end $function$
;

CREATE OR REPLACE FUNCTION public.rpc_submit_peer(p_join_key text, p_rater uuid, p_pin text, p_target uuid, p_game_code text, p_raw jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_game uuid; v_room uuid; v_room2 uuid; v_attempt uuid; v_score numeric;
begin
  -- 1) ตรวจสิทธิ์ "คนประเมิน" ด้วย PIN ของตัวเอง (ตัวเดียวกับที่ใช้บันทึกคะแนนปกติ)
  if not _student_ok(p_rater, p_join_key, p_pin) then
    raise exception 'ยืนยันตัวผู้ประเมินไม่ผ่าน (โค้ด/PIN)';
  end if;

  -- 2) คนประเมินกับคนที่ถูกประเมินต้องอยู่ห้องเดียวกัน และประเมินตัวเองไม่ได้
  if p_rater = p_target then raise exception 'ประเมินตัวเองไม่ได้'; end if;
  select classroom_id into v_room  from students where id = p_rater;
  select classroom_id into v_room2 from students where id = p_target;
  if v_room is null or v_room2 is null or v_room <> v_room2 then
    raise exception 'ประเมินได้เฉพาะเพื่อนร่วมห้องเดียวกัน';
  end if;

  -- [85·F4] เดิม: select id from games where code = p_game_code — รุ่นมีใน p_raw อยู่แล้ว
  v_game := public.gp_game_for(p_game_code, p_raw->>'gameVersion');
  if v_game is null then raise exception 'ไม่พบเกม %', p_game_code; end if;

  v_score := coalesce((p_raw->>'peerTeam')::numeric, 0)
           + coalesce((p_raw->>'peerRole')::numeric, 0)
           + coalesce((p_raw->>'peerListen')::numeric, 0);

  -- 3) ประเมินซ้ำได้ — ลบผลเดิมของ "ผู้ประเมินคนเดิม → คนเดิม" ก่อน ไม่ให้คะแนนบวกทับกัน
  delete from events
   where student_id = p_target and kind = 'peer' and raw->>'peerBy' = p_rater::text;

  insert into attempts(student_id, game_id, session_id, attempt_no, is_first, game_version, started_at, ended_at)
    values (p_target, v_game, 'peer', null, false, p_raw->>'gameVersion', now(), now())
    returning id into v_attempt;

  insert into events(attempt_id, student_id, game_id, stage_id, kind, question_id, correct, credit, score, raw)
    values (v_attempt, p_target, v_game, 'peer', 'peer', null, null, null, v_score, p_raw);

  return v_attempt;
end; $function$
;

-- ════════════════ กลุ่มเพิ่มพารามิเตอร์รุ่น (drop ลายเซ็นเดิม → สร้างใหม่) ════════════════
-- ⚠️ ต้อง drop ก่อน — create or replace ที่ลายเซ็นต่างจะกลายเป็น overload ซ้อนสองตัว
--    แล้ว PostgREST เลือกไม่ถูก (PGRST203) ทั้งที่ตั้งใจจะแทนที่

drop function if exists public.rpc_submit_survey(text, uuid, text, text, text, jsonb, jsonb, numeric, text);
CREATE OR REPLACE FUNCTION public.rpc_submit_survey(p_join_key text, p_student uuid, p_pin text, p_game_code text, p_kind text, p_payload jsonb, p_dims jsonb, p_overall numeric, p_interpretation text, p_game_version text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_game uuid; v_id uuid;
begin
  if p_student is not null and not _student_ok(p_student, p_join_key, p_pin) then raise exception 'ยืนยันตัวนักเรียนไม่ผ่าน'; end if;
  -- [85·F4] เดิม: select id from games where code = p_game_code
  v_game := public.gp_game_for(p_game_code, p_game_version);
  insert into surveys(student_id, game_id, kind, payload, dims, overall, interpretation)
    values (p_student, v_game, p_kind, p_payload, p_dims, p_overall, p_interpretation) returning id into v_id;
  return v_id;
end; $function$
;

drop function if exists public.rpc_submit_item_scores(text, uuid, text, text, jsonb, text);
CREATE OR REPLACE FUNCTION public.rpc_submit_item_scores(p_join_key text, p_student uuid, p_pin text, p_game_code text, p_items jsonb, p_run_id text DEFAULT 'live'::text, p_game_version text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_game uuid; e jsonb; v_item uuid; n int := 0;
begin
  if not _student_ok(p_student, p_join_key, p_pin) then raise exception 'ยืนยันตัวนักเรียนไม่ผ่าน'; end if;
  -- [85·F4] เดิม: select id from games where code = p_game_code
  v_game := public.gp_game_for(p_game_code, p_game_version);
  if v_game is null then raise exception 'ไม่พบเกม %', p_game_code; end if;

  for e in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    select i.id into v_item
    from framework_items i
    join assessment_frameworks f on f.id = i.framework_id
    where f.code = (e->>'framework') and i.code = (e->>'code');
    if v_item is null then continue; end if;   -- ข้ามรายการที่ไม่รู้จัก ไม่ทำให้ทั้งชุดล้ม

    insert into student_item_scores as t
      (student_id, game_id, item_id, run_id, score, max_score, level, level_label, evidence, computed_at)
    values (p_student, v_game, v_item, coalesce(p_run_id, 'live'),
            nullif(e->>'score','')::numeric, coalesce(nullif(e->>'max_score','')::numeric, 100),
            nullif(e->>'level','')::int, e->>'level_label',
            coalesce(e->'evidence', '{}'::jsonb), now())
    on conflict (student_id, game_id, item_id, run_id) do update set
      score = excluded.score, max_score = excluded.max_score,
      level = coalesce(excluded.level, t.level),
      level_label = coalesce(excluded.level_label, t.level_label),
      evidence = t.evidence || excluded.evidence,
      computed_at = now();
    n := n + 1;
  end loop;
  return n;
end; $function$
;

drop function if exists public.rpc_kru_assess(uuid, jsonb, text);
CREATE OR REPLACE FUNCTION public.rpc_kru_assess(p_student uuid, p_payload jsonb, p_game_code text DEFAULT 'kanchanaburi2050'::text, p_game_version text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_room uuid; v_teacher uuid; v_game uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบครูก่อน'; end if;
  select st.classroom_id into v_room from students st where st.id = p_student;
  if v_room is null then raise exception 'ไม่พบนักเรียน'; end if;
  select c.teacher_id into v_teacher from classrooms c where c.id = v_room;
  if v_teacher is distinct from auth.uid() and not _is_app_admin() then
    raise exception 'บันทึกได้เฉพาะครูเจ้าของห้องเท่านั้น';
  end if;
  -- [85·F4] เดิม: select g.id from games g where g.code = p_game_code
  v_game := public.gp_game_for(p_game_code, p_game_version);
  delete from surveys s where s.student_id = p_student and s.kind = 'kru_assess';
  insert into surveys(student_id, game_id, kind, payload)
    values (p_student, v_game, 'kru_assess', coalesce(p_payload, '{}'::jsonb))
    returning surveys.id into v_id;
  return v_id;
end; $function$
;

drop function if exists public.rpc_kru_save(uuid, text, jsonb, text);
CREATE OR REPLACE FUNCTION public.rpc_kru_save(p_student uuid, p_kind text, p_payload jsonb, p_game_code text DEFAULT 'kanchanaburi2050'::text, p_game_version text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_room uuid; v_teacher uuid; v_game uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบครูก่อน'; end if;
  if coalesce(p_kind,'') not in ('kru_assess','kru_final') then
    raise exception 'ชนิดข้อมูลไม่ถูกต้อง';
  end if;
  select st.classroom_id into v_room from students st where st.id = p_student;
  if v_room is null then raise exception 'ไม่พบนักเรียน'; end if;
  select c.teacher_id into v_teacher from classrooms c where c.id = v_room;
  if v_teacher is distinct from auth.uid() and not _is_app_admin() then
    raise exception 'บันทึกได้เฉพาะครูเจ้าของห้องเท่านั้น';
  end if;
  -- [85·F4] เดิม: select g.id from games g where g.code = p_game_code
  v_game := public.gp_game_for(p_game_code, p_game_version);
  delete from surveys s where s.student_id = p_student and s.kind = p_kind;
  insert into surveys(student_id, game_id, kind, payload)
    values (p_student, v_game, p_kind, coalesce(p_payload, '{}'::jsonb))
    returning surveys.id into v_id;
  return v_id;
end; $function$
;

drop function if exists public.rpc_set_save(text, uuid, text, jsonb, numeric, numeric, text);
CREATE OR REPLACE FUNCTION public.rpc_set_save(p_join_key text, p_student uuid, p_pin text, p_blob jsonb, p_collected numeric, p_boss numeric, p_game_code text DEFAULT 'kanchanaburi2050'::text, p_game_version text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_game uuid; v_prog numeric;
begin
  if not _student_ok(p_student, p_join_key, p_pin) then raise exception 'ยืนยันตัวนักเรียนไม่ผ่าน'; end if;
  update students set
    save_blob = coalesce(p_blob, save_blob),
    collected_score = greatest(coalesce(collected_score, 0), coalesce(p_collected, 0)),
    boss_score = greatest(coalesce(boss_score, 0), coalesce(p_boss, 0)),
    save_updated_at = now()
  where id = p_student;

  -- [GamePlearn v1.0] อัปเดตชั้นสรุป
  -- [85·F4] เดิม: select id from games where code = p_game_code
  v_game := public.gp_game_for(p_game_code, p_game_version);
  if v_game is not null then
    v_prog := least(100, round(coalesce(
      (select count(*) from jsonb_object_keys(p_blob->'stages')), 0) * 100.0 / 8));
    insert into student_game_progress as sgp
      (student_id, game_id, progress_percent, best_score, summary_metrics, last_played_at, updated_at)
    values
      (p_student, v_game, coalesce(v_prog, 0), coalesce(p_collected, 0),
       jsonb_build_object('collectedScore', coalesce(p_collected, 0), 'bossScore', coalesce(p_boss, 0)),
       now(), now())
    on conflict (student_id, game_id) do update set
      progress_percent = greatest(sgp.progress_percent, coalesce(v_prog, 0)),
      best_score = greatest(coalesce(sgp.best_score, 0), coalesce(p_collected, 0)),
      summary_metrics = sgp.summary_metrics || jsonb_build_object(
        'collectedScore', greatest(coalesce((sgp.summary_metrics->>'collectedScore')::numeric, 0), coalesce(p_collected, 0)),
        'bossScore',      greatest(coalesce((sgp.summary_metrics->>'bossScore')::numeric, 0), coalesce(p_boss, 0))),
      last_played_at = now(), updated_at = now();
  end if;
  return true;
end; $function$
;

-- ── rpc_submit_feedback — โรคเดียวกันตัวที่ 9 (ผู้ตรวจหักล้าง 25 ส.ค. พบว่าหลุดยาม:
--    เขียน feedback.game_id ด้วย code เปล่า ๆ และตาราง feedback ไม่อยู่ในลิสต์ยามเดิม) ──
drop function if exists public.rpc_submit_feedback(text, text, text, text, text, jsonb);
CREATE OR REPLACE FUNCTION public.rpc_submit_feedback(p_kind text, p_message text, p_game_code text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_contact text DEFAULT NULL::text, p_meta jsonb DEFAULT '{}'::jsonb, p_game_version text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_game uuid;
  v_id uuid;
  v_recent int;
begin
  -- ตรวจความถูกต้องขั้นต้น
  if p_kind is null or p_kind not in ('question','bug','idea','other') then
    raise exception 'ประเภทข้อความไม่ถูกต้อง';
  end if;
  if p_message is null or length(btrim(p_message)) < 10 then
    raise exception 'กรุณาเขียนรายละเอียดอย่างน้อย 10 ตัวอักษร';
  end if;

  -- กันสแปมแบบหยาบ ๆ: ทั้งระบบรับได้ไม่เกิน 30 ข้อความต่อนาที
  -- (สูงพอสำหรับใช้งานจริงทั้งโรงเรียน แต่หยุดสคริปต์ยิงรัวได้)
  select count(*) into v_recent
  from public.feedback
  where created_at > now() - interval '1 minute';
  if v_recent >= 30 then
    raise exception 'ระบบกำลังรับข้อความจำนวนมาก กรุณาลองใหม่อีกครั้งในอีกสักครู่';
  end if;

  if p_game_code is not null and p_game_code <> '' then
    v_game := public.gp_game_for(p_game_code, p_game_version);   -- [85·F4] เดิม: code ตรง ๆ
  end if;

  insert into public.feedback (kind, message, game_id, name, contact, meta)
  values (
    p_kind,
    left(btrim(p_message), 2000),
    v_game,
    nullif(left(btrim(coalesce(p_name, '')), 80), ''),
    nullif(left(btrim(coalesce(p_contact, '')), 120), ''),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$function$
;

-- ── คืนสิทธิ์เรียกให้ตัวที่ drop+สร้างใหม่ (drop ทำ grant เดิมหายด้วย — ฐานจำลอง PG เปล่า
--    จับไม่ได้เพราะให้ PUBLIC โดยปริยาย แต่บนฐานจริงต้องชัดแจ้ง) + ตัวช่วยใหม่ ──
grant execute on function public.gp_game_for(text, text) to anon, authenticated;
grant execute on function public.rpc_submit_survey(text, uuid, text, text, text, jsonb, jsonb, numeric, text, text) to anon, authenticated;
grant execute on function public.rpc_submit_item_scores(text, uuid, text, text, jsonb, text, text) to anon, authenticated;
grant execute on function public.rpc_kru_assess(uuid, jsonb, text, text) to anon, authenticated;
grant execute on function public.rpc_kru_save(uuid, text, jsonb, text, text) to anon, authenticated;
grant execute on function public.rpc_set_save(text, uuid, text, jsonb, numeric, numeric, text, text) to anon, authenticated;
grant execute on function public.rpc_submit_feedback(text, text, text, text, text, jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- ============================================================================
-- ตรวจผล + ยามทะเบียน (อ่านอย่างเดียว — รันต่อท้ายได้เลย · รันซ้ำเมื่อไรก็ได้)
-- ยาม: ฟังก์ชันที่เขียนลงตารางผูก game_id ต้องเรียก gp_resolve_game หรือ gp_game_for
--       ยกเว้นได้เฉพาะที่ "เซ็นชื่อ" ไว้ในทะเบียนข้างล่างพร้อมเหตุผล (สเปกข้อ 2 ของ HUB)
-- ============================================================================
-- ขอบเขตที่ยามนี้พิสูจน์ได้ (อย่าใช้เขียวของยามแทนการรีวิวโค้ด):
--   · จับเฉพาะ INSERT ตรง ๆ ใน source — dynamic SQL (execute format) · ฟังก์ชัน SQL แบบ
--     BEGIN ATOMIC (prosrc ว่าง) · UPDATE ที่ย้าย game_id — regex มองไม่เห็น
--   · เกณฑ์ ✅ = "มีการเรียก resolver ที่ไหนสักแห่งใน source" ไม่ใช่ "เรียกถูกจุดทุก insert"
with exempt(fn, why) as (values
  ('rpc_split_group',  'คัดลอก game_id จากแถว events ที่มีอยู่แล้ว — ไม่ได้หาเกมจากรหัส'),
  ('rpc_split_named',  'คัดลอก game_id จากแถว events ที่มีอยู่แล้ว — ไม่ได้หาเกมจากรหัส')
),
writers as (
  select p.proname, prosrc
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f','p')
    and prosrc ~* 'insert\s+into\s+(public\.)?(attempts|events|surveys|feedback|competency_results|competency_dim_results|achievement_results|student_item_scores|student_game_progress|game_media|game_framework_items|standards_publish_log)\M'
)
select w.proname as ฟังก์ชันที่เขียนตารางผูกเกม,
       case when w.prosrc ~* 'gp_resolve_game|gp_game_for' then '✅ แยกภาคแล้ว'
            when e.fn is not null then '📝 ยกเว้น: ' || e.why
            else '❌ ยังไม่แยกภาค — ห้ามปล่อยผ่าน' end as สถานะ
from writers w left join exempt e on e.fn = w.proname
order by (case when w.prosrc ~* 'gp_resolve_game|gp_game_for' then 2 when e.fn is not null then 1 else 0 end), w.proname;

-- ผลที่ต้องเห็น: ไม่มีแถว ❌ · ✅ 12 ตัว · 📝 ยกเว้น 2 ตัว (split_group/named)
-- (วิธีนับ: จาก dump 25 ส.ค. 97 ฟังก์ชัน — 9 ตัวที่ไฟล์นี้แก้ + submit_report + publish_media
--  + publish_standards = 12 · ฐานที่มีฟังก์ชันเพิ่มภายหลังเลขอาจสูงกว่า — ห้ามต่ำกว่า)

-- ยามบังคับสายตา: มี ❌ เมื่อไร ให้ระเบิดเป็น error เลย ไม่ใช่รอคนอ่านตาราง
-- (ผู้ตรวจหักล้าง: ตารางเฉย ๆ บนฐานจริงไม่มีใครบังคับอ่าน — do-block นี้บังคับให้)
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ' · ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f','p')
    and prosrc ~* 'insert\s+into\s+(public\.)?(attempts|events|surveys|feedback|competency_results|competency_dim_results|achievement_results|student_item_scores|student_game_progress|game_media|game_framework_items|standards_publish_log)\M'
    and prosrc !~* 'gp_resolve_game|gp_game_for'
    and p.proname not in ('rpc_split_group','rpc_split_named');
  if v_bad is not null then
    raise exception 'ยามทะเบียน: ฟังก์ชันเขียนตารางผูกเกมโดยไม่แยกภาค — % (แก้ให้เรียก gp_game_for หรือเซ็นชื่อยกเว้นพร้อมเหตุผลในไฟล์ 85)', v_bad;
  end if;
end $$;

-- ============================================================================
-- ROLLBACK (ถ้าต้องถอน — คืนนิยามเดิมจาก SCHEMA_DUMP_2026-08-25.sql ของแต่ละฟังก์ชัน
-- อย่าลบทิ้งเฉย ๆ: ท่อพวกนี้คือเส้นส่งข้อมูลจริงของเกม)
-- -- drop function if exists public.gp_game_for(text, text);
-- -- แล้ววาง CREATE OR REPLACE ฉบับเดิมของทั้ง 8 ตัวจาก dump (Q5)
-- ============================================================================
