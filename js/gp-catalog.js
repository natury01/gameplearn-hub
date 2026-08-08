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
  const DIMENSIONS = [
    { key: 'grade_band',  label: 'ระดับชั้น',   pick: (g) => (g.grade_band ? [g.grade_band] : []) },
    { key: 'genre',       label: 'แนวเกม',      pick: (g) => (g.genre ? [g.genre] : []),
      labelOf: (v, g) => (g.genre_icon ? g.genre_icon + ' ' : '') + (g.genre_name || v) },
    { key: 'series',      label: 'ชุดเกม',      pick: (g) => (g.series ? [g.series] : []) },
    { key: 'subject',     label: 'กลุ่มสาระ',   pick: (g) => g.subject_areas },
    { key: 'competency',  label: 'สมรรถนะ',     pick: (g) => g.competencies },
    { key: 'tag',         label: 'หัวข้อ',      pick: (g) => g.tags },
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
      const options = Object.keys(seen).map((k) => seen[k])
        .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label), 'th'));
      return { key: d.key, label: d.label, options: options };
    }).filter((d) => d.options.length > 0);
  }

  /* ---------- คัดกรอง ---------- */
  function matches(g, sel, q) {
    if (q) {
      const hay = [g.name, g.description, g.series, g.genre_name]
        .concat(g.tags, g.subject_areas, g.competencies).join(' ').toLowerCase();
      if (hay.indexOf(q.toLowerCase()) < 0) return false;
    }
    const has = (list, v) => list.indexOf(v) >= 0;
    if (sel.grade_band && g.grade_band !== sel.grade_band) return false;
    if (sel.genre && g.genre !== sel.genre) return false;
    if (sel.series && g.series !== sel.series) return false;
    if (sel.subject && !has(g.subject_areas, sel.subject)) return false;
    if (sel.competency && !has(g.competencies, sel.competency)) return false;
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
    GENRE_ICON, GENRE_TH, STATUS_TH, gradeBand, gradeText };
})();
