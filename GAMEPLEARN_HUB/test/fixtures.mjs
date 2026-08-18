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
export const stdMaps = [
  { game_id: G1, item_id: 'i1', admin_edited: false, note: 'ด่าน 1 · 3 · 8', evidence: 'คำตอบข้อ 4-7 ในด่านสะพานข้ามแม่น้ำแคว และผังสรุปเหตุการณ์ที่นักเรียนเรียงเอง',
    criteria: 'ตอบถูกตั้งแต่ 3 ใน 4 ข้อขึ้นไป = ผ่าน · เรียงลำดับเหตุการณ์ถูกครบ = ดีเยี่ยม',
    framework_items: { id: 'i1', code: 'ส 5.1 ป.4/1', name_th: 'สืบค้นและอธิบายลักษณะทางกายภาพของจังหวัดตนเอง',
      depth: 2, sort_order: 1, parent_id: null,
      assessment_frameworks: { code: 'core-2551-rev2560', kind: 'achievement',
        name_th: 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง พ.ศ. 2560)', status: 'active' } } },
  { game_id: G1, item_id: 'i2', admin_edited: false, note: 'ด่าน 10 ช่องเขาขาด', evidence: 'บันทึกการตัดสินใจของนักเรียนในสถานการณ์จำลอง 3 จุด',
    criteria: 'เลือกโดยอ้างหลักฐานในเกมได้อย่างน้อย 2 ใน 3 จุด = ผ่าน',
    framework_items: { id: 'i2', code: 'ส 4.2 ป.4/2', name_th: 'อธิบายเหตุการณ์สำคัญในประวัติศาสตร์ท้องถิ่นและผลที่เกิดขึ้น',
      depth: 2, sort_order: 2, parent_id: null,
      assessment_frameworks: { code: 'core-2551-rev2560', kind: 'achievement',
        name_th: 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง พ.ศ. 2560)', status: 'active' } } },
  { game_id: G1, item_id: 'c1', admin_edited: false, note: 'ทุกด่านที่มีคำถามปลายเปิด', evidence: 'คำตอบอัตนัยและร่องรอยการแก้ปัญหาที่เกมบันทึกไว้',
    criteria: 'คิดจากคะแนนรวม 100 → ≥80 ระดับ 6 · 65-79 ระดับ 5 · 50-64 ระดับ 4',
    framework_items: { id: 'c1', code: 'HOT', name_th: 'การคิดขั้นสูง', depth: 1, sort_order: 2, parent_id: null,
      assessment_frameworks: { code: 'cbe-core', kind: 'competency', name_th: 'กรอบสมรรถนะหลัก 6 ประการ', status: 'active' } } },
  { game_id: G1, item_id: 'c1a', admin_edited: false, note: null, evidence: null, criteria: null,
    framework_items: { id: 'c1a', code: 'HT-CTC', name_th: 'การคิดอย่างมีวิจารณญาณ', depth: 2, sort_order: 1, parent_id: 'c1',
      assessment_frameworks: { code: 'cbe-core', kind: 'competency', name_th: 'กรอบสมรรถนะหลัก 6 ประการ', status: 'active' } } },
  { game_id: G1, item_id: 'c1b', admin_edited: false, note: null, evidence: null, criteria: null,
    framework_items: { id: 'c1b', code: 'HT-PRB', name_th: 'การคิดแก้ปัญหา', depth: 2, sort_order: 2, parent_id: 'c1',
      assessment_frameworks: { code: 'cbe-core', kind: 'competency', name_th: 'กรอบสมรรถนะหลัก 6 ประการ', status: 'active' } } },
  { game_id: G1, item_id: 'c2', admin_edited: false, note: 'ด่าน 14 กาญจนบุรี 2050', evidence: 'ผลการเลือกนโยบายเมืองและเหตุผลที่นักเรียนให้ไว้',
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
  rooms_with_data: 3,
};
export const pubSummary = {
  scope: {}, n_schools: 2, n_rooms: 3, n_games: 1, n_students: 12,
  ach: { n: 14, avg_percent: 64.3, avg_all: 61.8,
    dist: [{ band: '80-100', label: 'ดีเยี่ยม (80–100)', n: 3 },
           { band: '70-79', label: 'ดี (70–79)', n: 4 },
           { band: '60-69', label: 'พอใช้ (60–69)', n: 3 },
           { band: '50-59', label: 'ผ่านเกณฑ์ (50–59)', n: 2 },
           { band: '0-49', label: 'ต้องช่วยเหลือ (ต่ำกว่า 50)', n: 2 }] },
  comps: [
    { code: 'SM', name: 'การจัดการตนเอง', n_students: 9, avg_score: 71.2, avg_all: 68.0 },
    { code: 'HOT', name: 'การคิดขั้นสูง', n_students: 12, avg_score: 62.0, avg_all: 64.5 },
    { code: 'CM', name: 'การสื่อสาร', n_students: 0, avg_score: null, avg_all: null },
    { code: 'TW', name: 'การรวมพลังทำงานเป็นทีม', n_students: 0, avg_score: null, avg_all: null },
    { code: 'CZ', name: 'การเป็นพลเมืองที่เข้มแข็ง', n_students: 5, avg_score: 55.4, avg_all: 57.1 },
    { code: 'SN', name: 'การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน', n_students: 7, avg_score: 70.0, avg_all: 66.2 },
  ],
  units: [{ name: 'คะแนนเก็บ', n: 14, avg: 60.0 }, { name: 'คะแนนสอบ', n: 14, avg: 17.3 }],
  updated_at: '2026-08-12T09:00:00Z',
};
export const pubBreakdown = [
  { key: 'a', label: 'โรงเรียนบ้านกาญจน์', sub: null, n_students: 8, n_results: 9, avg_percent: 66.1, comp_avg: 64.0, comp_students: 8 },
  { key: 'b', label: 'โรงเรียนวัดใหม่', sub: null, n_students: 4, n_results: 5, avg_percent: 60.9, comp_avg: 61.2, comp_students: 4 },
];
