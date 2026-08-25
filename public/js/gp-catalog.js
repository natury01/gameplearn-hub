/* เกมเพลิน — ตัวโหลดแคตตาล็อก + ตัวกรอง (ใช้ร่วมกันได้ทุกหน้า)
 * หลักการ: ตัวกรองทั้งหมดสร้างจาก "ข้อมูลจริงในฐานข้อมูล" ไม่ hard-code รายชื่อเกม/หมวด
 * ทนทาน: ถ้ายังไม่ได้รัน 14_GAME_FILTERS.sql (ยังไม่มี view) จะถอยไปอ่านตาราง games ได้เอง
 * อ้างอิง: 00_PLATFORM_AGREEMENT.md — Catalog อ่านจากทะเบียนเกมเท่านั้น
 */
(function () {
  const G = window.GP;

  /* ไอคอนสำรอง — ใช้เฉพาะตอนเกมยังไม่มี cover_url และไม่มี genre ในฐานข้อมูล */
  const GENRE_ICON = {
    adventure: '🗺️', quiz: '❓', simulation: '⚙️', puzzle: '🧩',
    drill: '⌨️', story: '📖', creative: '🎨', board: '🎲',
  };
  const GENRE_TH = {
    adventure: 'ผจญภัย / สำรวจ', quiz: 'ตอบคำถาม / แข่งตอบ', simulation: 'จำลองสถานการณ์',
    puzzle: 'ปริศนา / ตรรกะ', drill: 'ฝึกทักษะ', story: 'เล่าเรื่อง / ตัดสินใจ',
    creative: 'สร้างสรรค์ / ออกแบบ', board: 'เกมกระดาน / ผลัดกันเล่น',
  };
  const STATUS_TH = { published: 'เปิดใช้งาน', maintenance: 'ปิดปรับปรุงชั่วคราว', testing: 'รุ่นทดสอบ' };

  /* ---------- ชื่อกลุ่มสาระและสมรรถนะ ----------
     ครูสั่งให้ใช้ **ชื่อเต็ม** ทุกที่ที่แสดงให้คนอ่าน — เพราะเป็นชื่อที่ต้องเขียนลงแผนการสอน
     และงานประกันคุณภาพจริง ๆ ชื่อย่อที่เราตั้งเองเอาไปใช้อ้างอิงที่ไหนไม่ได้เลย

     ⚠️ ลำดับการเลือกชื่อที่ถูกต้อง: **ชื่อจากฐานข้อมูลมาก่อนเสมอ**
     (v_game_catalog ส่ง subject_areas / competencies ซึ่งเป็น name_th จากทะเบียนหลักสูตร)
     ตารางข้างล่างเป็นแค่ตัวสำรองตอนฐานส่งมาแต่ "รหัส" — ถ้าหลักสูตรเปลี่ยนชื่อ
     ฐานข้อมูลจะเปลี่ยนตามเอง ส่วนตารางนี้ต้องมาแก้มือ จึงห้ามใช้เป็นตัวหลัก */
  const COMP_FULL = {
    SM: 'การจัดการตนเอง', HOT: 'การคิดขั้นสูง', CM: 'การสื่อสาร',
    TW: 'การรวมพลังทำงานเป็นทีม', CZ: 'การเป็นพลเมืองที่เข้มแข็ง',
    SN: 'การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน',
  };
  const SUBJ_FULL = {
    TH: 'ภาษาไทย', MA: 'คณิตศาสตร์', SC: 'วิทยาศาสตร์และเทคโนโลยี',
    SO: 'สังคมศึกษา ศาสนา และวัฒนธรรม', PE: 'สุขศึกษาและพลศึกษา',
    AR: 'ศิลปะ', OC: 'การงานอาชีพ', FL: 'ภาษาต่างประเทศ',
  };
  /* ชื่อย่อ — เหลือที่ใช้ที่เดียวคือ **ป้ายรอบเรดาร์ 6 แฉก** ซึ่งเป็นกราฟิกที่ใส่ชื่อเต็มไม่ลงจริง ๆ
     (ชื่อเต็มยังอยู่ใน aria-label ของเรดาร์และในแถบด้านล่างกราฟ) ห้ามเอาไปใช้ที่อื่นอีก */
  const COMP_SHORT = {
    SM: 'จัดการตนเอง', HOT: 'คิดขั้นสูง', CM: 'สื่อสาร',
    TW: 'ทำงานเป็นทีม', CZ: 'พลเมืองเข้มแข็ง', SN: 'อยู่กับธรรมชาติ',
  };
  const SUBJ_SHORT = SUBJ_FULL;   /* คงชื่อเดิมไว้ให้โค้ดเก่าเรียกได้ แต่ได้ชื่อเต็มแล้ว */
  const CBE_TOTAL = 6;
  /* ค่าเทียมสำหรับตัวกรอง "ครบ 6 ด้าน" — ขึ้นต้นด้วย __ กันชนกับรหัสสมรรถนะจริง */
  const ALL6 = '__ALL6';

  /* ชื่อที่จะเอาไปแสดง — ฐานส่งชื่อมาก็ใช้ชื่อนั้น · ส่งมาแต่รหัสค่อยเปิดตาราง · ไม่รู้จักก็โชว์รหัสตามจริง
     (ไม่เดาแทนเจ้าของเกม ตามกฎเดิมของแพลตฟอร์ม) */
  const subjectNames = (g) => (g.subject_areas.length ? g.subject_areas
    : g.subject_codes.map((c) => SUBJ_FULL[c] || c));
  const competencyNames = (g) => (g.competencies.length ? g.competencies
    : g.competency_codes.map((c) => COMP_FULL[c] || c));

  /* ช่วงชั้นแบบกว้าง — ต้องให้ผลเหมือน grade_band ใน v_game_catalog เป๊ะ ๆ */
  function gradeBand(g) {
    const lo = g.minimum_grade, hi = g.maximum_grade;
    if (lo == null) return 'ทุกระดับชั้น';
    if (hi != null && hi <= 3) return 'ป.1–3';
    if (lo >= 4 && hi != null && hi <= 6) return 'ป.4–6';
    if (lo >= 7) return 'ม.ต้นขึ้นไป';
    return 'คละระดับชั้น';
  }
  function gradeText(g) {
    if (g.minimum_grade == null && g.maximum_grade == null) return 'ทุกระดับชั้น';
    if (g.minimum_grade === g.maximum_grade) return 'ป.' + g.minimum_grade;
    return 'ป.' + g.minimum_grade + '–' + (g.maximum_grade == null ? '' : g.maximum_grade);
  }

  /* เวลาเล่น — เก็บเป็นนาทีเสมอ แต่แสดงให้อ่านง่าย
     ต่ำกว่า 1 ชม. บอกเป็นนาที · ตั้งแต่ 1 ชม. ขึ้นไปบอกเป็นชั่วโมง
     ("300 นาที" ครูต้องหารเอง กว่าจะรู้ว่าคือ 5 ชั่วโมง = 5 คาบ) */
  function playTime(min) {
    const n = Number(min);
    if (!n || isNaN(n) || n <= 0) return null;
    if (n < 60) return n + ' นาที';
    const h = Math.floor(n / 60), m = Math.round(n % 60);
    if (!m) return h + ' ชั่วโมง';
    return h + ' ชม. ' + m + ' นาที';
  }

  const arr = (v) => (Array.isArray(v) ? v : []);

  /* ---------- โหลดแคตตาล็อก ----------
   * คืนค่า { rows, source } — source บอกว่าได้ข้อมูลครบมิติหรือแบบพื้นฐาน
   *   'view'  = อ่านจาก v_game_catalog (มีครบทุกมิติกรอง)
   *   'basic' = ยังไม่ได้รัน 14_GAME_FILTERS.sql → ได้เฉพาะข้อมูลพื้นฐาน */
  async function loadCatalog(opt) {
    opt = opt || {};
    const statuses = opt.statuses || '(published,maintenance)';
    try {
      const rows = await G.get('/rest/v1/v_game_catalog?select=*&status=in.' + statuses
        + '&order=sort_order.asc,name.asc');
      return { rows: rows.map(normalize), source: 'view' };
    } catch (e) {
      /* view ยังไม่มี (ยังไม่รัน 14_GAME_FILTERS.sql) — ถอยไปอ่านตารางหลัก */
      const rows = await G.get('/rest/v1/games?select=id,code,name,description,launch_url,dashboard_url,'
        + 'cover_url,minimum_grade,maximum_grade,status,current_version&status=in.' + statuses + '&order=name');
      const cov = await coverageTags();
      return { rows: rows.map((g) => normalize(Object.assign({}, g, cov[g.name] || {}))), source: 'basic' };
    }
  }

  /* ป้าย "เกมนี้วัดอะไร" จากทะเบียนความครอบคลุม — ใช้เมื่อยังไม่มี v_game_catalog */
  async function coverageTags() {
    const byGame = {};
    try {
      const cov = await G.get('/rest/v1/v_framework_coverage?select=item_name,item_code,kind,game_names,depth'
        + '&depth=eq.1&games_covering=gt.0');
      arr(cov).forEach(function (c) {
        arr(c.game_names).forEach(function (gn) {
          const b = (byGame[gn] = byGame[gn] || { subject_areas: [], competencies: [] });
          if (c.kind === 'competency') b.competencies.push(c.item_name);
          else b.subject_areas.push(c.item_name);
        });
      });
    } catch (e) { /* ยังไม่ได้รัน 08_ASSESSMENT_CORE.sql — ไม่มีป้ายก็ยังใช้เว็บได้ */ }
    return byGame;
  }

  function normalize(g) {
    const genre = g.genre || null;
    return {
      id: g.id, code: g.code, name: g.name, description: g.description || '',
      topic: g.topic || '',
      launch_url: g.launch_url, dashboard_url: g.dashboard_url, cover_url: g.cover_url,
      minimum_grade: g.minimum_grade, maximum_grade: g.maximum_grade,
      status: g.status, current_version: g.current_version,
      genre: genre,
      genre_name: g.genre_name || (genre ? GENRE_TH[genre] || genre : null),
      genre_icon: g.genre_icon || (genre ? GENRE_ICON[genre] : null),
      series: g.series || null,
      series_order: g.series_order == null ? null : Number(g.series_order),
      play_minutes: g.play_minutes == null ? null : Number(g.play_minutes),
      tags: arr(g.tags),
      is_featured: g.is_featured === true,
      sort_order: g.sort_order == null ? 999 : Number(g.sort_order),
      created_at: g.created_at || null,
      grade_band: g.grade_band || gradeBand(g),
      grade_text: gradeText(g),
      subject_areas: arr(g.subject_areas),
      subject_codes: arr(g.subject_codes),
      competencies: arr(g.competencies),
      competency_codes: arr(g.competency_codes),
      attempts_count: Number(g.attempts_count || 0),
      players_count: Number(g.players_count || 0),
      status_th: STATUS_TH[g.status] || g.status,
      playable: g.status === 'published' && !!g.launch_url,
    };
  }

  /* ---------- สร้างรายการตัวกรองจากเกมที่มีจริง ----------
   * ไม่เรียก v_catalog_filters เพราะคำนวณจาก rows ที่โหลดมาแล้วได้ผลเหมือนกัน
   * และไม่ต้องยิง request เพิ่ม — สำคัญตอนอินเทอร์เน็ตโรงเรียนช้า */
  /* ui: 'chips' = ปุ่มกดทีเดียวติด · 'select' = Dropdown
   *
   * เกณฑ์ที่ใช้เลือก — "มิตินี้โตตามจำนวนเกมไหม":
   *   ระดับชั้น 4 · แนวเกม 8 · กลุ่มสาระ 8 · สมรรถนะ 6  → ตายตัวตามหลักสูตร ไม่โต → ชิป
   *   ชุดเกม · หัวข้อ                                    → โตทุกครั้งที่เพิ่มเกม → Dropdown
   * รวมชิปสูงสุด 26 ตัวตลอดไป ไม่ว่าจะมีกี่เกม จึงไม่ต้องกลัวหน้ายาว
   *
   * กลุ่มสาระ/สมรรถนะกรองด้วย "รหัส" ไม่ใช่ชื่อเต็ม เพราะชื่อเต็มตามหลักสูตรยาวมาก
   * (เช่น "การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน") ชิปจะล้นจอ
   * ถ้าเกมยังไม่มีรหัส (ฐานข้อมูลเก่า) จะถอยไปใช้ชื่อเต็มให้เอง */
  /* ระดับชั้นทีละชั้น ไม่ใช่เป็นช่วง
     เกมที่ระบุ ป.4–6 ต้องเจอทั้งตอนกรอง ป.4 · ป.5 และ ป.6
     ครูสอนห้องเดียว เขาค้นด้วยชั้นที่ตัวเองสอน ไม่ได้ค้นด้วยชื่อช่วง */
  function gradeList(g) {
    const lo = Number(g.minimum_grade), hi = Number(g.maximum_grade);
    if (!lo && !hi) return [];
    const a = lo || hi, b = hi || lo;
    if (!a || !b || b < a || b - a > 12) return [];
    const out = [];
    for (let i = a; i <= b; i++) out.push(String(i));
    return out;
  }
  const gradeLabel = (n) => (Number(n) >= 7 ? 'ม.' + (Number(n) - 6) : 'ป.' + n);

  const DIMENSIONS = [
    { key: 'grade',       label: 'ระดับชั้น', ui: 'chips',
      pick: gradeList,
      labelOf: (v) => gradeLabel(v),
      sortBy: (o) => Number(o.value) },
    { key: 'genre',       label: 'แนวเกม', ui: 'chips',
      pick: (g) => (g.genre ? [g.genre] : []),
      labelOf: (v, g) => (g.genre_icon ? g.genre_icon + ' ' : '') + (g.genre_name || v) },
    { key: 'subject',     label: 'กลุ่มสาระ', ui: 'chips',
      pick: (g) => (g.subject_codes.length ? g.subject_codes : g.subject_areas),
      labelOf: (v) => SUBJ_FULL[v] || v },
    { key: 'competency',  label: 'สมรรถนะหลัก', ui: 'chips',
      /* ALL6 = ตัวเลือกพิเศษ "ครบ 6 ด้าน" สำหรับเกมที่ประเมินได้ทุกด้าน
         ครูที่อยากได้เกมประเมินรอบด้านจะได้กดทีเดียว ไม่ต้องไล่กดทีละด้าน */
      pick: function (g) {
        const codes = g.competency_codes.length ? g.competency_codes : g.competencies;
        return codes.length >= CBE_TOTAL ? [ALL6].concat(codes) : codes;
      },
      labelOf: (v) => (v === ALL6 ? '⭐ ครบ ' + CBE_TOTAL + ' ด้าน'
                                  : (COMP_FULL[v] || String(v).replace(/^สมรรถนะ/, ''))),
      /* ให้ "ครบ 6 ด้าน" อยู่หัวแถวเสมอ ไม่ปนกับด้านย่อย */
      sortBy: (o) => (o.value === ALL6 ? -1 : 0) },
    { key: 'series',      label: 'ชุดเกม', ui: 'select',
      pick: (g) => (g.series ? [g.series] : []) },
    { key: 'tag',         label: 'หัวข้อ', ui: 'select',
      pick: (g) => g.tags },
  ];

  function buildFilters(rows) {
    return DIMENSIONS.map(function (d) {
      const seen = {};
      rows.forEach(function (g) {
        d.pick(g).forEach(function (v) {
          if (v == null || v === '') return;
          if (!seen[v]) seen[v] = { value: v, label: d.labelOf ? d.labelOf(v, g) : v, count: 0 };
          seen[v].count++;
        });
      });
      const rank = d.sortBy || (() => 0);
      const options = Object.keys(seen).map((k) => seen[k])
        .sort((a, b) => rank(a) - rank(b)
          || b.count - a.count
          || String(a.label).localeCompare(String(b.label), 'th'));
      return { key: d.key, label: d.label, ui: d.ui || 'chips', options: options };
    }).filter((d) => d.options.length > 0);
  }

  /* ---------- คัดกรอง ---------- */
  function matches(g, sel, q) {
    if (q) {
      const hay = [g.name, g.description, g.topic, g.series, g.genre_name]
        .concat(g.tags, g.subject_areas, g.competencies).join(' ').toLowerCase();
      if (hay.indexOf(q.toLowerCase()) < 0) return false;
    }
    const has = (list, v) => list.indexOf(v) >= 0;
    /* เกม ป.4–6 ต้องผ่านทั้งตอนเลือก ป.4 · ป.5 และ ป.6 */
    if (sel.grade && !has(gradeList(g), String(sel.grade))) return false;
    if (sel.genre && g.genre !== sel.genre) return false;
    if (sel.series && g.series !== sel.series) return false;
    /* ค่าที่เลือกอาจเป็นรหัส (SC) หรือชื่อเต็ม แล้วแต่ว่าเกมมีรหัสไหม — รับทั้งสองแบบ */
    if (sel.subject && !has(g.subject_codes, sel.subject) && !has(g.subject_areas, sel.subject)) return false;
    if (sel.competency) {
      const codes = g.competency_codes.length ? g.competency_codes : g.competencies;
      if (sel.competency === ALL6) { if (codes.length < CBE_TOTAL) return false; }
      else if (!has(g.competency_codes, sel.competency) && !has(g.competencies, sel.competency)) return false;
    }
    if (sel.tag && !has(g.tags, sel.tag)) return false;
    return true;
  }

  const SORTS = {
    recommended: { label: 'แนะนำ', fn: (a, b) => (b.is_featured - a.is_featured) || (a.sort_order - b.sort_order)
      || String(a.name).localeCompare(String(b.name), 'th') },
    popular:     { label: 'เล่นมากที่สุด', fn: (a, b) => b.attempts_count - a.attempts_count
      || String(a.name).localeCompare(String(b.name), 'th') },
    newest:      { label: 'ใหม่ล่าสุด', fn: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) },
    name:        { label: 'ชื่อ ก–ฮ', fn: (a, b) => String(a.name).localeCompare(String(b.name), 'th') },
  };

  function apply(rows, sel, q, sortKey) {
    const out = rows.filter((g) => matches(g, sel, q));
    const s = SORTS[sortKey] || SORTS.recommended;
    return out.sort(s.fn);
  }

  window.GPCatalog = { loadCatalog, buildFilters, apply, matches, SORTS, DIMENSIONS,
    GENRE_ICON, GENRE_TH, STATUS_TH, CBE_TOTAL, ALL6,
    COMP_FULL, SUBJ_FULL, COMP_SHORT, SUBJ_SHORT,
    subjectNames, competencyNames,
    gradeBand, gradeText, gradeList, gradeLabel, playTime };
})();
