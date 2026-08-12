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
    is_featured: true, sort_order: 1, subject_areas: ['สังคมศึกษา'], subject_codes: ['SO'],
    competencies: [], competency_codes: ['HOT', 'SM'], attempts_count: 40, players_count: 20 },
  { id: G2, code: 'kanchanaburi2050-2', name: 'กาญจนบุรี 2050 ภาค 2', status: 'published',
    launch_url: 'https://www.gameplearn.com/kan-adventure2/', dashboard_url: null,
    minimum_grade: 4, maximum_grade: 6, description: 'พิทักษ์สมดุล', cover_url: null,
    genre: 'adventure', genre_name: 'ผจญภัย / สำรวจ', genre_icon: '🛡️',
    series: 'กาญจนบุรี', series_order: 2, play_minutes: 150, tags: ['สิ่งแวดล้อม'],
    is_featured: false, sort_order: 2, subject_areas: ['วิทยาศาสตร์'], subject_codes: ['SC'],
    competencies: [], competency_codes: ['HOT'], attempts_count: 10, players_count: 8 },
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

export const compDims = [
  { student_id: S1, classroom_id: R1, comp_code: 'HOT', game_name: 'กาญจนบุรี 2050',
    score: 72, level: 5, level_label: 'สามารถ', sub_scores: { ctc: 70, stm: 74 },
    evidence: 'game', decided_by: 'system', system_score: 72, criteria_note: null },
  { student_id: S1, classroom_id: R1, comp_code: 'SM', game_name: 'กาญจนบุรี 2050 ภาค 2',
    score: 64, level: 4, level_label: 'กำลังพัฒนา', sub_scores: { 'sm-a': 60 },
    evidence: 'game', decided_by: 'system', system_score: 64, criteria_note: null },
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

export const teacher = [{ id: UID, email: 'kru@test.th', display_name: 'ครูทดสอบ', is_anonymous: false }];

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
  ['bridge', 'ด่าน 1 สะพานข้ามแม่น้ำแคว', 'สะพานเหล็กข้ามแม่น้ำ มีรถไฟจอดอยู่'],
  ['cemetery', 'ด่าน 2 สุสานทหารสัมพันธมิตร', 'ลานหญ้ากว้างมีแผ่นจารึกเรียงเป็นแถว'],
  ['krasae', 'ด่าน 3 ถ้ำกระแซ สะพานเลียบผา', 'ทางรถไฟเลียบหน้าผาริมแม่น้ำ'],
  ['erawan', 'ด่าน 4 น้ำตกเอราวัณ', 'น้ำตกหินปูนเจ็ดชั้นกลางป่า'],
  ['srinagarindra', 'ด่าน 5 เขื่อนศรีนครินทร์', 'สันเขื่อนดินขนาดใหญ่กับอ่างเก็บน้ำ'],
  ['vajiralongkorn', 'ด่าน 6 เขื่อนวชิราลงกรณ', 'เขื่อนคอนกรีตกับทะเลสาบเหนือเขื่อน'],
  ['hindad', 'ด่าน 7 น้ำพุร้อนหินดาด', 'บ่อน้ำพุร้อนกลางแมกไม้'],
  ['chamchuri', 'ด่าน 8 ต้นจามจุรียักษ์', 'ต้นไม้ใหญ่แผ่กิ่งก้านคลุมลาน'],
  ['monbridge', 'ด่าน 9 สะพานมอญ & เมืองบาดาล', 'สะพานไม้ยาวข้ามลำน้ำ'],
  ['hellfire', 'ด่าน 10 ช่องเขาขาด', 'ช่องหินที่ถูกสกัดเป็นทางเดินแคบ'],
  ['pilok', 'ด่าน 11 เหมืองปิล๊อก-อีต่อง', 'หมู่บ้านบนเขาในหมอก'],
  ['mg1', 'ด่าน 12 เรียงเหตุการณ์ประวัติศาสตร์', 'กระดานการ์ดเรียงลำดับเหตุการณ์'],
  ['mg2', 'ด่าน 13 จัดการน้ำในเขื่อน', 'หน้าจอควบคุมระดับน้ำในเขื่อน'],
  ['balance2050', 'ด่าน 14 กาญจนบุรี 2050: พิทักษ์สมดุล', 'แผงข่าวและตัวเลือกนโยบายเมือง'],
].map(([k, caption, alt], i) => ({ game_id: G1, url: P1 + 'stage_' + k + '.jpg',
  caption, alt, sort_order: i + 1 }));
