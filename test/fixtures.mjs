/* ข้อมูลจำลองสำหรับชุดทดสอบเว็บกลาง — รูปเดียวกับที่มุมมองจริงบน Supabase คืนมา */

export const UID = '11111111-1111-4111-8111-111111111111';
export const G1 = 'aaaaaaaa-0000-4000-8000-000000000001';   // เกม ก
export const G2 = 'aaaaaaaa-0000-4000-8000-000000000002';   // เกม ข
export const R1 = 'bbbbbbbb-0000-4000-8000-000000000001';   // ป.4/1
export const R2 = 'bbbbbbbb-0000-4000-8000-000000000002';   // ป.5/1
export const RP = 'bbbbbbbb-0000-4000-8000-0000000000ff';   // ห้องผู้เล่นทั่วไป
export const S1 = 'cccccccc-0000-4000-8000-000000000001';
export const S2 = 'cccccccc-0000-4000-8000-000000000002';
export const SP = 'cccccccc-0000-4000-8000-0000000000ff';   // เด็กในห้องผู้เล่นทั่วไป

export const games = [
  { id: G1, code: 'kanchanaburi2050', name: 'กาญจนบุรี 2050', status: 'published',
    launch_url: 'https://www.gameplearn.com/kan/', dashboard_url: null,
    minimum_grade: 4, maximum_grade: 6, description: 'ผจญภัยเมืองกาญจน์', cover_url: null,
    genre: 'adventure', genre_name: 'ผจญภัย / สำรวจ', genre_icon: '🗺️',
    series: 'กาญจนบุรี', series_order: 1, play_minutes: 120, tags: ['ประวัติศาสตร์'],
    is_featured: true, sort_order: 1, subject_areas: ['สังคมศึกษา ศาสนา และวัฒนธรรม'], subject_codes: ['SO'],
    competencies: ['การคิดขั้นสูง', 'การจัดการตนเอง', 'การสื่อสาร', 'การรวมพลังทำงานเป็นทีม',
      'การเป็นพลเมืองที่เข้มแข็ง', 'การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน'],
    competency_codes: ['HOT', 'SM', 'CM', 'TW', 'CZ', 'SN'], attempts_count: 40, players_count: 20 },
  { id: G2, code: 'kanchanaburi2050-2', name: 'กาญจนบุรี 2050 ภาค 2', status: 'published',
    launch_url: 'https://www.gameplearn.com/kan-adventure2/', dashboard_url: null,
    minimum_grade: 4, maximum_grade: 6, description: 'พิทักษ์สมดุล', cover_url: null,
    genre: 'adventure', genre_name: 'ผจญภัย / สำรวจ', genre_icon: '🛡️',
    series: 'กาญจนบุรี', series_order: 2, play_minutes: 150, tags: ['สิ่งแวดล้อม'],
    is_featured: false, sort_order: 2, subject_areas: ['วิทยาศาสตร์และเทคโนโลยี'], subject_codes: ['SC'],
    competencies: ['การคิดขั้นสูง'], competency_codes: ['HOT'], attempts_count: 10, players_count: 8 },
];

export const rooms = [
  { id: R1, teacher_id: UID, name: 'ป.4/1', grade: 'ป.4', room_no: '1', join_key: 'ABC123',
    school_id: null, academic_year: '2569', listed: true, is_active: true },
  { id: R2, teacher_id: UID, name: 'ป.5/1', grade: 'ป.5', room_no: '1', join_key: 'DEF456',
    school_id: null, academic_year: '2569', listed: false, is_active: true },
  /* ห้องนี้ต้องไม่โผล่ในหน้าครูเลย — ใส่ teacher_id เป็นครูคนนี้โดยตั้งใจ
     เพื่อจำลองกรณีเลวร้ายสุด (ห้องถูกผูกเข้าบัญชีครูไปแล้ว) ซึ่งตัวกรองต้องยังกันอยู่ */
  { id: RP, teacher_id: UID, name: 'ผู้เล่นทั่วไป', grade: null, room_no: null, join_key: 'ZZZ999',
    school_id: null, academic_year: null, listed: false, is_active: true },
];

export const students = [
  { id: S1, classroom_id: R1, student_number: '1', first_name: 'สมชาย', last_name: 'ใจดี',
    character_name: 'นักสำรวจฟ้า', join_pin: null, is_active: true },
  { id: S2, classroom_id: R1, student_number: '2', first_name: 'สมหญิง', last_name: 'เรียนเก่ง',
    character_name: null, join_pin: '1234', is_active: false },
  { id: SP, classroom_id: RP, student_number: null, first_name: 'ผู้เล่น', last_name: 'ทั่วไป',
    character_name: 'guest01', join_pin: null, is_active: true },
];

export const classroom_games = [
  { classroom_id: R1, game_id: G1, is_enabled: true },
  { classroom_id: R1, game_id: G2, is_enabled: true },
  { classroom_id: R2, game_id: G1, is_enabled: true },
  { classroom_id: RP, game_id: G1, is_enabled: true },
];

export const progress = [
  { student_id: S1, game_id: G1, progress_percent: 60, best_score: 80, attempts_count: 3,
    total_play_seconds: 1200, last_played_at: '2026-08-10T10:00:00Z', summary_metrics: {} },
  { student_id: S1, game_id: G2, progress_percent: 20, best_score: 30, attempts_count: 1,
    total_play_seconds: 300, last_played_at: '2026-08-11T10:00:00Z', summary_metrics: {} },
  { student_id: SP, game_id: G1, progress_percent: 100, best_score: 100, attempts_count: 9,
    total_play_seconds: 9999, last_played_at: '2026-08-11T10:00:00Z', summary_metrics: {} },
];

export const summary = [
  { classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050', avg_progress: 60,
    students_played: 1, avg_best_score: 80, total_attempts: 3 },
  { classroom_id: R1, game_id: G2, game_name: 'กาญจนบุรี 2050 ภาค 2', avg_progress: 20,
    students_played: 1, avg_best_score: 30, total_attempts: 1 },
];

export const achieve = [
  { student_id: S1, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050',
    game_version: 'V.7.99', score: 120, max_score: 150, percent: 80, grade_label: 'ดีมาก',
    progress_percent: 60, unit_scores: { '1': 10, _boss: 25 }, criteria_note: null, is_legacy: false },
];

/* [V.1.6.21] ชุดสำหรับทดสอบ "การกระจายตามช่วงคะแนน" โดยเฉพาะ
   ผูกกับ S1 คนเดียวแต่คนละเกม ⇒ ไม่ต้องเพิ่มนักเรียนในชุดกลาง
   (การเพิ่มนักเรียนจะไปพังข้อที่นับหัวในชุดทดสอบอื่น) */
export const achieveSpread = [
  { student_id: S1, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050',
    game_version: 'V.7.99', score: 60, max_score: 150, percent: 40, grade_label: 'ต้องปรับปรุง',
    progress_percent: 30, unit_scores: { '1': 5 }, criteria_note: null, is_legacy: false },
  { student_id: S2, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050',
    game_version: 'V.7.99', score: 98, max_score: 150, percent: 65, grade_label: 'พอใช้',
    progress_percent: 50, unit_scores: { '1': 8 }, criteria_note: null, is_legacy: false },
  { student_id: SP, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050',
    game_version: 'V.7.99', score: 120, max_score: 150, percent: 85, grade_label: 'ดีเยี่ยม',
    progress_percent: 70, unit_scores: { '1': 10 }, criteria_note: null, is_legacy: false },
];

/* [V.1.6.36 · ใบ HUB — ตัวหารปนยุค] เกม ก ปนสองเต็ม (ดิบ 120 เท่ากันเป๊ะ แต่ % คนละฐาน —
   เคสจริงที่ทำให้เกณฑ์เกียรติบัตร 80% ตัดสินไม่ได้) · เกม ข สะอาด (เต็มเดียว)
   ⇒ ป้ายต้องระบุเฉพาะเกม ก · ใช้ S1/S2 เดิม ไม่เพิ่มนักเรียน (กติกาหัว achieveSpread) */
/* คู่กับ achieveMixed: S2 ต้องเปิดใช้งาน — เด็กปิดใช้งานถูก achRows กรองทิ้ง (ถูกกติกา)
   แล้วการปนสเกลจะมองไม่เห็น · ใช้เฉพาะเทสต์ 12 ผ่าน opt.students ไม่แตะชุดกลาง */
export const studentsAllOn = students.map((s) => ({ ...s, is_active: true }));

export const achieveMixed = [
  { student_id: S1, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050',
    game_version: 'V.7.99', score: 120, max_score: 160, percent: 75, grade_label: 'ดี',
    progress_percent: 60, unit_scores: { '1': 10 }, criteria_note: null, is_legacy: false },
  { student_id: S2, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050',
    game_version: 'V.7.99', score: 120, max_score: 130, percent: 92.3, grade_label: 'ดีเยี่ยม',
    progress_percent: 65, unit_scores: { '1': 10 }, criteria_note: null, is_legacy: false },
  { student_id: S1, classroom_id: R1, game_id: G2, game_name: 'กาญจนบุรี 2050 ภาค 2',
    game_version: 'V.8.84', score: 90, max_score: 130, percent: 69.2, grade_label: 'พอใช้',
    progress_percent: 40, unit_scores: { '1': 7 }, criteria_note: null, is_legacy: false },
];

export const compDims = [
  { student_id: S1, classroom_id: R1, comp_code: 'HOT', game_name: 'กาญจนบุรี 2050',
    score: 72, level: 5, level_label: 'สามารถ', sub_scores: { ctc: 70, stm: 74 },
    evidence: 'game', decided_by: 'system', system_score: 72, criteria_note: null },
  { student_id: S1, classroom_id: R1, comp_code: 'SM', game_name: 'กาญจนบุรี 2050 ภาค 2',
    score: 64, level: 4, level_label: 'กำลังพัฒนา', sub_scores: { 'sm-a': 60 },
    evidence: 'game', decided_by: 'system', system_score: 64, criteria_note: null },
];

/* [V.1.6.39] ชุดสำหรับแท็บวิจัยโดยเฉพาะ (opt.compDims): คีย์จริงแบบที่ฐานส่ง — 'HT-CTC' มีคำนำหน้า ·
   'CZ-B' → cz1 · 'SM-C' ต้องไม่นับเข้า sm2 อีก · TW ทุกแถว level null ⇒ แถว "หลักฐานไม่เพียงพอ" */
export const compDimsRS = compDims.concat([
  { student_id: S1, classroom_id: R1, comp_code: 'CZ', game_name: 'กาญจนบุรี 2050',
    score: 61, level: 4, level_label: 'กำลังพัฒนา', sub_scores: { 'CZ-B': 50, 'CZ-A': 62 },
    evidence: 'game', decided_by: 'system', system_score: 61, criteria_note: null },
  { student_id: S1, classroom_id: R1, comp_code: 'SM', game_name: 'กาญจนบุรี 2050',
    score: 58, level: 5, level_label: 'สามารถ', sub_scores: { 'SM-C': 40, 'SM-B': 90 },
    evidence: 'game', decided_by: 'system', system_score: 58, criteria_note: null },
  { student_id: S1, classroom_id: R1, comp_code: 'HOT', game_name: 'กาญจนบุรี 2050',
    score: 72, level: 5, level_label: 'สามารถ', sub_scores: { 'HT-CTC': 60, 'HT-PRB': 80 },
    evidence: 'game', decided_by: 'system', system_score: 72, criteria_note: null },
  { student_id: S1, classroom_id: R1, comp_code: 'TW', game_name: 'กาญจนบุรี 2050',
    score: null, level: null, level_label: null, sub_scores: null,
    evidence: 'scored', decided_by: 'game', system_score: null, criteria_note: 'บทเรียนชุดนี้ยังไม่มีด่านที่วัดด้านนี้โดยตรง' },
]);

/* [V.1.6.40] แถวสอบด่าน 8 — S1 มีเลขครั้ง: ครั้งที่ 1 = 25 (ผ่าน 21) แม้ครั้งที่ 2 ได้ 30 · S2 ไร้เลขครั้ง: แถวแรกตามเวลา 15 (ไม่ผ่าน) 🚩 noAtt
   ⇒ ผ่าน 1 จาก 2 คนที่สอบแล้ว · ธง 1/2 · ⛔ ถ้าอ่านค่าสูงสุดหรือ _boss จะได้ 2/2 — เทสต์นี้กันไว้ */
/* [V.1.6.42] การ์ดผลสัมฤทธิ์อ่าน unit_scores._boss_first ที่เกมคำนวณ — S1 ใบ .79 (25 ผ่าน) · S2 ใบเก่า .76 (มี _boss ไม่มี _boss_first = รอใบผลรุ่นใหม่)
   · S2 ยังมีใบภาค 2 ที่มี _boss_first 30 — ต้องไม่ถูกนับ (คนละเครื่องมือวัด · ถ้าหลุดจะกลายเป็นผ่าน 2 จาก 2) */
export const S3B = 'cccccccc-0000-4000-8000-000000000003';
export const S4B = 'cccccccc-0000-4000-8000-000000000004';
export const S5B = 'cccccccc-0000-4000-8000-000000000005';
export const studentsBoss3 = studentsAllOn.concat([
  { ...studentsAllOn[0], id: S3B, student_number: '3', first_name: 'สมศักดิ์', last_name: 'ไม่พบครั้งแรก' },
  { ...studentsAllOn[0], id: S4B, student_number: '4', first_name: 'สมพร', last_name: 'ใบแปดศูนย์ไม่มีช่อง' },
  { ...studentsAllOn[0], id: S5B, student_number: '5', first_name: 'สมใจ', last_name: 'ศูนย์จริง' },
]);
export const achieveBossFirst = [
  /* S4B: ใบ .80 — เกมส่ง null และไม่ส่งคีย์ _boss_first ⇒ "ไม่ทราบครั้งที่ 1 (เกมระบุ)" ไม่ใช่ "รอใบผลรุ่นใหม่" */
  { student_id: S4B, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050', game_version: 'V.7.99.80-IX2050-2569.102',
    score: 90, max_score: 130, percent: 69.2, grade_label: 'พอใช้', progress_percent: 70,
    unit_scores: { '1': 9, _boss: 21 }, criteria_note: null, is_legacy: false },
  /* S5B: ใบ .80 — _boss_first = 0 จริง (เกม .80 ส่ง 0 เฉพาะเมื่อสอบครั้งแรกได้ 0 จริง) ⇒ ต้องนับเข้าฐานเป็น 0 (ไม่ผ่าน) */
  { student_id: S5B, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050', game_version: 'V.7.99.80-IX2050-2569.102',
    score: 60, max_score: 130, percent: 46.2, grade_label: 'ยังไม่ถึงเกณฑ์', progress_percent: 60,
    unit_scores: { '1': 6, _boss: 21, _boss_first: 0 }, criteria_note: null, is_legacy: false },
  /* S3B: เกมส่ง _boss_first = 0 ทั้งที่ _boss = 21 (ค่าตั้งต้นเมื่อไม่พบครั้งที่ 1 — รอบหก) ⇒ ต้องเป็น "ไม่ทราบ" ไม่ใช่ 0 */
  { student_id: S3B, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050', game_version: 'V.7.99.79-IX2050-2569.101',
    score: 95, max_score: 130, percent: 73.1, grade_label: 'ดี', progress_percent: 75,
    unit_scores: { '1': 9, _boss: 21, _boss_first: 0 }, criteria_note: null, is_legacy: false },
  { student_id: S1, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050', game_version: 'V.7.99.79-IX2050-2569.101',
    score: 100, max_score: 130, percent: 76.9, grade_label: 'ดี', progress_percent: 80,
    unit_scores: { '1': 10, _boss: 25, _boss_first: 25 }, criteria_note: null, is_legacy: false },
  { student_id: S2, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050', game_version: 'V.7.99.76-IX2050-2569.100',
    score: 90, max_score: 130, percent: 69.2, grade_label: 'พอใช้', progress_percent: 70,
    unit_scores: { '1': 9, _boss: 21 }, criteria_note: null, is_legacy: false },
  { student_id: S2, classroom_id: R1, game_id: G2, game_name: 'กาญจนบุรี 2050 ภาค 2', game_version: 'V.8.84-p2-2569.148',
    score: 80, max_score: 130, percent: 61.5, grade_label: 'พอใช้', progress_percent: 50,
    unit_scores: { '1': 8, _boss: 30, _boss_first: 30 }, criteria_note: null, is_legacy: false },
];

/* [V.1.6.45] เพื่อนประเมิน — คีย์จริงของเกม: TW 3 ข้อ (ทุกรุ่น) + 5 ด้าน ด้านละ 1 ข้อ (V.7.80+) หน้า 0–4
   S1: เพื่อน 2 คนประเมิน · TW = (4+3+4 + 3+3+3)/6 = 3.33 → ระดับ 5 · HT = 2 → ระดับ 4 · SM/CM/CZ/NS ไม่มีคีย์ → – */
export const eventsPeer = [
  { student_id: S1, game_id: G1, kind: 'peer', score: 3, raw: { peerBy: 'p-1', peerTeam: 4, peerRole: 3, peerListen: 4, peerHT: 2 }, created_at: '2026-08-20T09:00:00Z' },
  { student_id: S1, game_id: G1, kind: 'peer', score: 3, raw: { peerBy: 'p-2', peerTeam: 3, peerRole: 3, peerListen: 3 }, created_at: '2026-08-21T09:00:00Z' },
];

export const eventsBoss = [
  { student_id: S1, game_id: G1, kind: 'boss', score: 25, raw: { attemptNo: '1' }, created_at: '2026-08-20T09:00:00Z' },
  { student_id: S1, game_id: G1, kind: 'boss', score: 30, raw: { attemptNo: '2' }, created_at: '2026-08-21T09:00:00Z' },
  { student_id: S2, game_id: G1, kind: 'boss', score: 15, raw: {}, created_at: '2026-08-20T10:00:00Z' },
  { student_id: S2, game_id: G1, kind: 'boss', score: 28, raw: {}, created_at: '2026-08-22T10:00:00Z' },
];

export const comp = [
  { student_id: S1, classroom_id: R1, game_code: 'kanchanaburi2050', game_name: 'กาญจนบุรี 2050',
    game_version: 'V.7.99', total: 72, level: 5, ctc: 70, stm: 74, crt: 68, prb: 71,
    is_legacy: false, research_eligible: true },
];

export const media = [
  { game_id: G1, url: 'https://shots.test/g1-a.png', caption: 'ด่าน 1 นักสืบสะพานแคว',
    alt: 'สะพานข้ามแม่น้ำแคว', sort_order: 1 },
  { game_id: G1, url: 'https://shots.test/g1-b.png', caption: 'ด่าน 3 ถ้ำกระแซ',
    alt: 'ทางรถไฟเลียบหน้าผา', sort_order: 3 },
  { game_id: G1, url: 'https://shots.test/g1-bad.png', caption: 'ด่านที่ภาพเสีย',
    alt: '', sort_order: 4 },
  /* http:// ต้องถูกคัดทิ้งฝั่งหน้าเว็บ ไม่ใช่ปล่อยให้เป็นช่องว่างในสไลด์ */
  { game_id: G1, url: 'http://shots.test/insecure.png', caption: 'ไม่ปลอดภัย', alt: '', sort_order: 5 },
  /* เกม ข มีภาพใบเดียว = ต้องไม่กลายเป็นสไลด์ */
  { game_id: G2, url: 'https://shots.test/g2-only.png', caption: 'ภาพเดียว', alt: '', sort_order: 1 },
];

/* ครูทั่วไป — ใช้เป็นค่าเริ่มต้นของทุกชุด เพราะเป็นผู้ใช้ส่วนใหญ่จริง ๆ
   ⚠️ อย่าเปลี่ยนตัวนี้เป็น admin เพื่อให้ชุดหน้า Admin ผ่าน — บัญชีผู้ดูแลมีปุ่มสลับโหมด
   เพิ่มบนหัวเว็บอีกใบ ซึ่งจะทำให้ชุดที่วัดหัวเว็บของ "ครูทั่วไป" เปลี่ยนความหมายไปเงียบ ๆ */
export const teacher = [{ id: UID, email: 'kru@test.th', display_name: 'ครูทดสอบ', is_anonymous: false }];

/* บัญชีผู้ดูแล — หน้า Admin ตรวจ teachers.role ก่อนเปิดประตู (admin.html ~บรรทัด 320)
   เปิดด้วยธง stub(page, { admin: true }) เท่านั้น */
export const teacherAdmin = [{ id: UID, email: 'kru@test.th', display_name: 'ครูทดสอบ',
  role: 'admin', is_anonymous: false }];

/* ---- งานรอบ 2 ---- */
export const SCH1 = '66666666-0000-4000-8000-000000000001';
export const SCH2 = '66666666-0000-4000-8000-000000000002';

/* รูปเดียวกับที่ rpc_browse_rooms คืนมา — สังเกตว่า **ไม่มี** ชื่อนักเรียนและไม่มี join_key
   ชุดทดสอบยืนยันเรื่องนี้ด้วย ไม่ใช่เชื่อว่าฝั่ง SQL ทำถูกอย่างเดียว */
export const publicRooms = [
  { id: R1, room_name: 'ป.4/1', grade: 'ป.4', academic_year: '2569',
    school_name: 'โรงเรียนบ้านกาญจน์', students_on: 1, games_on: 2, avg_progress: 40,
    is_mine: true, _school_id: SCH1 },
  { id: 'zzzz-1', room_name: 'ป.5/2', grade: 'ป.5', academic_year: '2569',
    school_name: 'โรงเรียนบ้านกาญจน์', students_on: 28, games_on: 1, avg_progress: 72.5,
    is_mine: false, _school_id: SCH1 },
  { id: 'zzzz-2', room_name: 'ป.6/1', grade: 'ป.6', academic_year: '2568',
    school_name: 'โรงเรียนวัดใหม่', students_on: 15, games_on: 1, avg_progress: null,
    is_mine: false, _school_id: SCH2 },
];

export const browseFilters = [
  { kind: 'school', value: SCH1, label: 'โรงเรียนบ้านกาญจน์', n: 2 },
  { kind: 'school', value: SCH2, label: 'โรงเรียนวัดใหม่', n: 1 },
  { kind: 'grade', value: 'ป.4', label: 'ป.4', n: 1 },
  { kind: 'grade', value: 'ป.5', label: 'ป.5', n: 1 },
  { kind: 'grade', value: 'ป.6', label: 'ป.6', n: 1 },
  { kind: 'year', value: '2569', label: '2569', n: 2 },
  { kind: 'year', value: '2568', label: '2568', n: 1 },
];

/* ---- ชุดภาพจริงที่ภาค 1 ส่งมา (คำตอบเอกสาร 58) ----
   14 ด่าน · 16:9 1200×675 · ชื่อด่านเป็น caption · เรียง sort 1-14 ตามที่เด็กเจอบนแผนที่
   ที่อยู่ภาพคิดจาก location ของหน้าครูที่เปิดอยู่ จึงเป็นโดเมนของเกม ณ ตอนที่ส่ง */
const P1 = 'https://cai-kan.pages.dev/img/';
export const p1Media = [
  ['1', 'ด่าน 1 สะพานข้ามแม่น้ำแคว', 'สะพานเหล็กข้ามแม่น้ำ มีรถไฟจอดอยู่'],
  ['2', 'ด่าน 2 สุสานทหารสัมพันธมิตร', 'ลานหญ้ากว้างมีแผ่นจารึกเรียงเป็นแถว'],
  ['3', 'ด่าน 3 ถ้ำกระแซ สะพานเลียบผา', 'ทางรถไฟเลียบหน้าผาริมแม่น้ำ'],
  ['mg1', 'ด่าน 6 หอจดหมายเหตุ เรียงเหตุการณ์', 'ช่องวางเรียงลำดับเหตุการณ์ 1-5'],
  ['4', 'ด่าน 7 น้ำตกเอราวัณ', 'แผงจัดกลุ่มการ์ดหน้าน้ำตกหินปูน'],
  ['5', 'ด่าน 8 เขื่อนศรีนครินทร์', 'สันเขื่อนดินขนาดใหญ่กับอ่างเก็บน้ำ'],
  ['mg2', 'ด่าน 10 จัดการน้ำในเขื่อน', 'แผงควบคุมระดับน้ำและมาตรวัด'],
  ['6', 'ด่าน 11 เขื่อนวชิราลงกรณ', 'เขื่อนคอนกรีตกับทะเลสาบเหนือเขื่อน'],
  ['7', 'ด่าน 12 น้ำพุร้อนหินดาด', 'บ่อน้ำพุร้อนกลางแมกไม้'],
  ['hellfire', 'ด่าน 13 ช่องเขาขาด', 'ช่องหินที่ถูกสกัดเป็นทางเดินแคบ'],
  ['pilok', 'ด่าน 14 เหมืองปิล๊อก-อีต่อง', 'หมู่บ้านบนเขาในหมอก'],
  ['8', 'ด่าน 15 ต้นจามจุรียักษ์', 'ต้นไม้ใหญ่แผ่กิ่งก้านคลุมลาน'],
  ['water', 'ด่านพิเศษ ปริศนาสายน้ำ', 'ลำน้ำกับปริศนาที่ต้องแก้'],
  ['balance2050', 'ด่านสุดท้าย กาญจนบุรี 2050 พิทักษ์สมดุล', 'แผงข่าวและตัวเลือกนโยบายเมือง'],
].map(([k, caption, alt], i) => ({ game_id: G1, url: P1 + 'stage_' + k + '.jpg',
  caption, alt, sort_order: i + 1 }));

/* ---- รายการ depth-1 ของกรอบ (หน้า Admin แปลงรหัส → uuid ก่อนติ๊ก) ----
   id ของ HOT/SN ตั้งให้ตรงกับ stdMaps เพื่อให้ "ติ๊กไว้แล้ว" ตรงกับผังที่เกมส่งมาจริง */
export const frameworkItems = [
  { id: 'fi-SO', code: 'SO', depth: 1 }, { id: 'fi-SC', code: 'SC', depth: 1 },
  { id: 'fi-SM', code: 'SM', depth: 1 }, { id: 'c1',    code: 'HOT', depth: 1 },
  { id: 'fi-CM', code: 'CM', depth: 1 }, { id: 'fi-TW', code: 'TW', depth: 1 },
  { id: 'fi-CZ', code: 'CZ', depth: 1 }, { id: 'c2',    code: 'SN', depth: 1 },
];

/* ---- ข้อมูลผังมาตรฐานแบบที่ฐานจริงคืนมา (ใช้ตรวจหน้ามาตรฐาน + หน้า Admin) ----
   game_id / item_id / admin_edited เติมให้ตอนทำไฟล์ 71 — หน้า Admin ต้องใช้ทั้งสามช่อง
   หน้ามาตรฐานไม่ได้อ่านช่องพวกนี้ จึงไม่กระทบชุดเดิม */
/* [V.1.6.18] เติม source ให้ตรงกับฐานจริง (มีมาตั้งแต่ไฟล์ 53 แต่ตัวอย่างเดิมไม่มี)
   'game-sync' = เกมประกาศเองว่าวัดข้อนี้ · 'manual' = ผู้ดูแลกรอกไว้ในทะเบียน
   แถวสุดท้ายตั้งเป็น manual โดยตั้งใจ — เลียนเคสจริงที่ครูเจอ:
   กลุ่มสาระที่เกมไม่เคยอ้างว่าวัด โผล่บนการ์ด และตัวเกมลบเองไม่ได้
   (rpc_publish_standards ลบเฉพาะ source='game-sync' — ไฟล์ 71 บรรทัด 356) */
export const stdMaps = [
  { game_id: G1, item_id: 'i1', source: 'game-sync', admin_edited: false, note: 'ด่าน 1 · 3 · 8', evidence: 'คำตอบข้อ 4-7 ในด่านสะพานข้ามแม่น้ำแคว และผังสรุปเหตุการณ์ที่นักเรียนเรียงเอง',
    criteria: 'ตอบถูกตั้งแต่ 3 ใน 4 ข้อขึ้นไป = ผ่าน · เรียงลำดับเหตุการณ์ถูกครบ = ดีเยี่ยม',
    framework_items: { id: 'i1', code: 'ส 5.1 ป.4/1', name_th: 'สืบค้นและอธิบายลักษณะทางกายภาพของจังหวัดตนเอง',
      depth: 2, sort_order: 1, parent_id: null,
      assessment_frameworks: { code: 'core-2551-rev2560', kind: 'achievement',
        name_th: 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง พ.ศ. 2560)', status: 'active' } } },
  { game_id: G1, item_id: 'i2', source: 'game-sync', admin_edited: false, note: 'ด่าน 10 ช่องเขาขาด', evidence: 'บันทึกการตัดสินใจของนักเรียนในสถานการณ์จำลอง 3 จุด',
    criteria: 'เลือกโดยอ้างหลักฐานในเกมได้อย่างน้อย 2 ใน 3 จุด = ผ่าน',
    framework_items: { id: 'i2', code: 'ส 4.2 ป.4/2', name_th: 'อธิบายเหตุการณ์สำคัญในประวัติศาสตร์ท้องถิ่นและผลที่เกิดขึ้น',
      depth: 2, sort_order: 2, parent_id: null,
      assessment_frameworks: { code: 'core-2551-rev2560', kind: 'achievement',
        name_th: 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง พ.ศ. 2560)', status: 'active' } } },
  { game_id: G1, item_id: 'c1', source: 'game-sync', admin_edited: false, note: 'ทุกด่านที่มีคำถามปลายเปิด', evidence: 'คำตอบอัตนัยและร่องรอยการแก้ปัญหาที่เกมบันทึกไว้',
    criteria: 'คิดจากคะแนนรวม 100 → ≥80 ระดับ 6 · 65-79 ระดับ 5 · 50-64 ระดับ 4',
    framework_items: { id: 'c1', code: 'HOT', name_th: 'การคิดขั้นสูง', depth: 1, sort_order: 2, parent_id: null,
      assessment_frameworks: { code: 'cbe-core', kind: 'competency', name_th: 'กรอบสมรรถนะหลัก 6 ประการ', status: 'active' } } },
  { game_id: G1, item_id: 'c1a', source: 'game-sync', admin_edited: false, note: null, evidence: null, criteria: null,
    framework_items: { id: 'c1a', code: 'HT-CTC', name_th: 'การคิดอย่างมีวิจารณญาณ', depth: 2, sort_order: 1, parent_id: 'c1',
      assessment_frameworks: { code: 'cbe-core', kind: 'competency', name_th: 'กรอบสมรรถนะหลัก 6 ประการ', status: 'active' } } },
  { game_id: G1, item_id: 'c1b', source: 'game-sync', admin_edited: false, note: null, evidence: null, criteria: null,
    framework_items: { id: 'c1b', code: 'HT-PRB', name_th: 'การคิดแก้ปัญหา', depth: 2, sort_order: 2, parent_id: 'c1',
      assessment_frameworks: { code: 'cbe-core', kind: 'competency', name_th: 'กรอบสมรรถนะหลัก 6 ประการ', status: 'active' } } },
  { game_id: G1, item_id: 'c2', source: 'manual', admin_edited: false, note: 'ด่าน 14 กาญจนบุรี 2050', evidence: 'ผลการเลือกนโยบายเมืองและเหตุผลที่นักเรียนให้ไว้',
    criteria: 'รักษาสมดุลทั้ง 3 ด้านไม่ต่ำกว่าเกณฑ์ = ผ่าน',
    framework_items: { id: 'c2', code: 'SN', name_th: 'การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน',
      depth: 1, sort_order: 6, parent_id: null,
      assessment_frameworks: { code: 'cbe-core', kind: 'competency', name_th: 'กรอบสมรรถนะหลัก 6 ประการ', status: 'active' } } },
];

/* ---- หน้าสรุปผลสาธารณะ (ไฟล์ 72) — รูปร่างเดียวกับที่ RPC คืนจริง ---- */
export const pubFilters = {
  schools: [{ id: SCH1, name: 'โรงเรียนบ้านกาญจน์' }, { id: SCH2, name: 'โรงเรียนวัดใหม่' }],
  grades: ['ป.4', 'ป.5'], years: ['2569'],
  games: [{ code: 'kanchanaburi2050', name: 'กาญจนบุรี 2050' }],
  /* [V.1.6.35] รายการห้องสำหรับตัวกรองใหม่ — ห้องแรกจงใจสังกัดโรงเรียน 1/ป.4
     ห้องที่สามสังกัดโรงเรียน 2/ป.5 เพื่อทดสอบการย่อรายการตามตัวกรองกว้าง */
  rooms: [
    { id: R1, name: 'ป.4/1', school: SCH1, grade: 'ป.4', year: '2569' },
    { id: R2, name: 'ป.4/2', school: SCH1, grade: 'ป.4', year: '2569' },
    { id: 'aaaaaaaa-0000-4000-8000-000000000305', name: 'ป.5/1', school: SCH2, grade: 'ป.5', year: '2569' },
  ],
  rooms_with_data: 3,
};
export const pubSummary = {
  scope: {}, n_schools: 2, n_rooms: 3, n_games: 1, n_students: 12,
  ach: { n: 14, avg_percent: 64.3, avg_all: 61.8,
    dist: [{ band: '80-100', label: 'ดีเยี่ยม (80–100)', n: 3 },
           { band: '70-79', label: 'ดี (70–79)', n: 4 },
           { band: '60-69', label: 'พอใช้ (60–69)', n: 3 },
           { band: '50-59', label: 'ผ่าน (50–59)', n: 2 },
           { band: '0-49', label: 'ยังไม่ถึงเกณฑ์ (ต่ำกว่า 50)', n: 2 }] },
  /* [V.1.6.37 · ซ9] สามสถานะจริงของฐาน: TW = เกมส่ง score null ให้ 12 คน (insufficient — ห้ามอ่านว่า
     "ไม่มีการประเมิน") · CM = ไม่มีแถวเลย (none) · ที่เหลือ ok · n_old_version = 0 ทุกด้านในชุดปกติ */
  comps: [
    { code: 'SM', name: 'การจัดการตนเอง', n_students: 9, n_rows: 9, avg_score: 71.2, avg_all: 68.0, status: 'ok', note: null, n_old_version: 0 },
    { code: 'HOT', name: 'การคิดขั้นสูง', n_students: 12, n_rows: 12, avg_score: 62.0, avg_all: 64.5, status: 'ok', note: null, n_old_version: 0 },
    { code: 'CM', name: 'การสื่อสาร', n_students: 0, n_rows: 0, avg_score: null, avg_all: null, status: 'none', note: 'ยังไม่มีผลสรุปด้านนี้ส่งขึ้นมา', n_old_version: 0 },
    { code: 'TW', name: 'การรวมพลังทำงานเป็นทีม', n_students: 0, n_rows: 12, avg_score: null, avg_all: null, status: 'insufficient',
      note: 'หลักฐานไม่เพียงพอ — มีการเก็บข้อมูลด้านนี้แล้ว แต่ยังไม่มีผู้เรียนที่ได้ระดับจากเกม', n_old_version: 0 },
    { code: 'CZ', name: 'การเป็นพลเมืองที่เข้มแข็ง', n_students: 5, n_rows: 5, avg_score: 55.4, avg_all: 57.1, status: 'ok', note: null, n_old_version: 0 },
    { code: 'SN', name: 'การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน', n_students: 7, n_rows: 7, avg_score: 70.0, avg_all: 66.2, status: 'ok', note: null, n_old_version: 0 },
  ],
  /* [V.1.6.37 · ซ8] คะแนนเต็มต่อเกม (ทุกเกม) — หน้าเว็บใช้เขียนป้ายตัวหารใต้กราฟการกระจาย */
  full_marks: [{ game: 'กาญจนบุรี 2050', game_code: 'kanchanaburi2050', max_score: 130, n: 12 }],
  /* [V.1.6.31 · ข้อ C] รูปใหม่ตาม SQL 88: แถวติด game/game_code · ชื่อช่องภาค 1 มี "(เต็ม N)"
     ภาค 2 ไม่มี (ของจริงเป็นแบบนี้ — ผู้ตรวจหักล้างเปิดซิปทั้งสองเกมยืนยัน)
     ⇒ ชุดนี้บังคับให้ทางเดิน "กราฟ %" + "คอลัมน์เกม" + "ตารางช่องไร้เพดาน" ถูกรันจริงในเทสต์ */
  /* [V.1.6.32] แถว "ด่านที่ 10" มาก่อน "ด่านที่ 2" โดยตั้งใจ — ฐานเรียงแบบข้อความส่งมาแบบนี้จริง
     หน้าเว็บต้องเรียงใหม่ด้วยเลขด่าน (10 ต้องไปอยู่หลัง 2) — เทสต์ล็อกไว้ */
  units: [
    { game: 'กาญจนบุรี 2050 ภาค 1', game_code: 'kanchanaburi2050', name: 'คะแนนเก็บ (เต็ม 80)', n: 14, avg: 60.0 },
    { game: 'กาญจนบุรี 2050 ภาค 1', game_code: 'kanchanaburi2050', name: 'คะแนนสอบ (เต็ม 30)', n: 14, avg: 17.3 },
    { game: 'กาญจนบุรี 2050 ภาค 1', game_code: 'kanchanaburi2050', name: 'ด่านที่ 10 มินิเกม จัดการน้ำในเขื่อน (เต็ม 10)', n: 5, avg: 9.5 },
    { game: 'กาญจนบุรี 2050 ภาค 1', game_code: 'kanchanaburi2050', name: 'ด่านที่ 2 สุสานทหารสัมพันธมิตร (เต็ม 10)', n: 6, avg: 8.3 },
    { game: 'กาญจนบุรี 2050 ภาค 2', game_code: 'kanchanaburi2050-p2', name: 'ด่านที่ 5 น้ำตกเอราวัณ', n: 9, avg: 13.0 },
  ],
  updated_at: '2026-08-12T09:00:00Z',
};
export const pubBreakdown = [
  { key: 'a', label: 'โรงเรียนบ้านกาญจน์', sub: null, n_students: 8, n_results: 9, avg_percent: 66.1, comp_avg: 64.0, comp_students: 8 },
  { key: 'b', label: 'โรงเรียนวัดใหม่', sub: null, n_students: 4, n_results: 5, avg_percent: 60.9, comp_avg: 61.2, comp_students: 4 },
];

/* [V.1.6.18] สถิติการเข้าถึงเกม — รูปแบบเดียวกับที่วิวจริงคืนมาหลังรันไฟล์ 83
   เกม ก อัปรุ่นที่ส่งสถิติแล้ว (มีช่อง open_*) · เกม ข ยังไม่อัป (ไม่มีคีย์เลย)
   ⇒ ใช้ตรวจว่าหน้าจอขึ้น – ให้เกมที่ยังไม่อัป ไม่ใช่ขึ้น 0 ซึ่งคนละความหมาย */
export const gameActivity = [
  { game_code: 'g-alpha', game_name: 'กาญจนบุรี 2050', status: 'published',
    click_all: 40, click_7d: 9, click_30d: 25, click_mobile: 22, click_pc: 18,
    open_all: 31, open_7d: 7, open_30d: 20,
    open_hub: 18, open_qr: 9, open_direct: 4, open_unknown: 0, open_visitors: 25,
    play_all: 12, players_all: 5 },
  { game_code: 'g-beta', game_name: 'กาญจนบุรี 2050 ภาค 2', status: 'published',
    click_all: 6, click_7d: 2, click_30d: 4, click_mobile: 4, click_pc: 2,
    play_all: 3, players_all: 2 },
];

export const visitDaily = [
  { day: '2026-08-23', page: 'home', game_code: null, device: 'pc', source: 'hub', views: 12, visitors: 8 },
  { day: '2026-08-23', page: 'dashboard', game_code: null, device: 'mobile', source: 'hub', views: 5, visitors: 4 },
  { day: '2026-08-23', page: 'gameopen', game_code: 'g-alpha', device: 'mobile', source: 'qr', views: 9, visitors: 7 },
];

/* [V.1.6.46] แถวจาก v_student_boss_pair (ขอครูรัน_106) — 5 คนในห้อง R1 (studentsBoss3)
   คาดหวัง: ครั้งแรกผ่าน 2/5 (S2 21 · S5B 22) · ครั้งสุดท้ายผ่าน 4/5 (S4B 20 ตก) · เฉลี่ย 14.60 → 25.00 (+10.40)
   สูงขึ้น 4 · เท่าเดิม 1 · ต่ำลง 0 · ครั้งต่อคน [6,1,12,3,2] ⇒ มัธยฐาน 3 · พิสัย 1–12 · แจกแจง 1/2–4/5–9/≥10 = 1/2/1/1 */
export const bossPair5 = [
  { classroom_id: R1, student_id: S1,  game_id: G1, game_code: 'kanchanaburi2050', first_score: 10, last_score: 25, first_at: '2026-07-23T02:14:00Z', last_at: '2026-08-28T04:15:00Z', n_exams: 6 },
  { classroom_id: R1, student_id: S2,  game_id: G1, game_code: 'kanchanaburi2050', first_score: 21, last_score: 21, first_at: '2026-08-28T04:18:00Z', last_at: '2026-08-28T04:18:00Z', n_exams: 1 },
  { classroom_id: R1, student_id: S3B, game_id: G1, game_code: 'kanchanaburi2050', first_score: 5,  last_score: 29, first_at: '2026-08-07T03:58:00Z', last_at: '2026-08-26T07:30:00Z', n_exams: 12 },
  { classroom_id: R1, student_id: S4B, game_id: G1, game_code: 'kanchanaburi2050', first_score: 15, last_score: 20, first_at: '2026-08-26T03:24:00Z', last_at: '2026-08-28T04:16:00Z', n_exams: 3 },
  { classroom_id: R1, student_id: S5B, game_id: G1, game_code: 'kanchanaburi2050', first_score: 22, last_score: 30, first_at: '2026-08-26T07:12:00Z', last_at: '2026-08-28T04:20:00Z', n_exams: 2 },
  /* [ผู้ตรวจอิสระ 22:5x] แถวเกมภาค 2 ของ S1 (game_code -p2) — ถ้าหลุดเข้าการ์ด S1 จะกลายเป็น 1 → 1 (ครั้งสุดท้ายผ่านเหลือ 3/5 · เฉลี่ยเปลี่ยน) */
  { classroom_id: R1, student_id: S1, game_id: G2, game_code: 'kanchanaburi2050-p2', first_score: 1, last_score: 1, first_at: '2026-07-01T00:00:00Z', last_at: '2026-09-01T00:00:00Z', n_exams: 9 },
  /* แถวของห้องอื่น — ต้องไม่ถูกนับเมื่อดูห้อง R1 */
  { classroom_id: 'bbbbbbbb-0000-4000-8000-000000000002', student_id: 'cccccccc-0000-4000-8000-000000000099', game_id: G1, game_code: 'kanchanaburi2050', first_score: 30, last_score: 30, first_at: '2026-08-01T00:00:00Z', last_at: '2026-08-01T00:00:00Z', n_exams: 1 },
];
/* [V.1.6.46] ใบผล .82 ครบทุกคน (นิยาม ข — เกมส่ง _boss_first ทุกคนที่มีแถวสอบ) ⇒ การ์ดผลสัมฤทธิ์ต้องขึ้นป้าย "นิยาม ข" ไม่ใช่ "คะแนนสูงสุด" และไม่มีบรรทัด "ไม่ทราบ" */
export const achieveV82 = [S1, S2, S3B, S4B, S5B].map((sid, i) => ({
  student_id: sid, classroom_id: R1, game_id: G1, game_name: 'กาญจนบุรี 2050', game_version: 'V.7.99.82-IX2050-2569.104',
  score: 90, max_score: 130, percent: 69.2, grade_label: 'พอใช้', progress_percent: 70,
  unit_scores: { '1': 9, _boss: 21, _boss_first: [12, 21, 5, 15, 22][i] }, criteria_note: null, is_legacy: false,
}));
