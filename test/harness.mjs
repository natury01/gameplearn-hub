/* โครงร่างชุดทดสอบเว็บกลาง — เสิร์ฟไฟล์จริงจากโฟลเดอร์ hub แล้วดัก Supabase ด้วยข้อมูลจำลอง
   ทำไมต้องดัก: ไฟล์เว็บชี้ไปโปรเจกต์จริง ทดสอบจึงต้องไม่แตะฐานจริงเด็ดขาด
   และต้องบังคับกรณีที่หาไม่ได้จากฐานจริง (ยังไม่รัน 43 · ภาพเสีย · ห้องผู้เล่นทั่วไปผูกกับครู) */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as F from './fixtures.mjs';

/* V.1.6.6 (บันทึก Code 19 ส.ค. ข้อ 2) — เลิกผูก path เครื่องแชต
   หาโฟลเดอร์เว็บเองตามลำดับ: ① env HUB_ROOT (ชี้เองได้เสมอ)
   ② โฟลเดอร์แม่ของ test/ (โครงในซิป: GAMEPLEARN_HUB/test → GAMEPLEARN_HUB/)
   ③ ../hub ข้างโฟลเดอร์เทสต์ (โครงบนเครื่องพัฒนา: hub-test/ อยู่ข้าง hub/)
   เช็กด้วยไฟล์จริง (index.html + js/config.js) ไม่ใช่เดาจากชื่อ — หาไม่เจอ = หยุดดัง ๆ
   บอกทุกที่ที่ลองแล้ว ไม่เงียบแล้วไปเทสต์โฟลเดอร์ผิด (อันตรายกว่าเทสต์ไม่รัน) */
const _here = path.dirname(fileURLToPath(import.meta.url));
function _findRoot() {
  const tried = [];
  /* [V.1.6.25] เพิ่ม '../public' — ผังใหม่ย้ายไฟล์เว็บลง public/
     คงตัวเลือกเดิมไว้ด้วย เพื่อให้ชุดทดสอบรันกับซิปรุ่นเก่าได้เหมือนเดิม */
  for (const c of [process.env.HUB_ROOT, path.resolve(_here, '..', 'public'),
                   path.resolve(_here, '..'), path.resolve(_here, '..', 'hub')]) {
    if (!c) continue;
    tried.push(c);
    if (fs.existsSync(path.join(c, 'index.html')) && fs.existsSync(path.join(c, 'js', 'config.js'))) return c;
  }
  console.error('❌ หาโฟลเดอร์เว็บกลางไม่เจอ (ต้องมี index.html + js/config.js) — ลองแล้ว:');
  tried.forEach((t) => console.error('   · ' + t));
  console.error('   ตั้ง HUB_ROOT ให้ชี้โฟลเดอร์ที่แตกจากซิป GAMEPLEARN_HUB แล้วรันใหม่');
  process.exit(1);
}
export const ROOT = _findRoot();
/* [V.1.6.25] ผังใหม่ย้ายไฟล์เว็บลง public/ ⇒ "โฟลเดอร์เว็บ" กับ "รากรีโป" ไม่ใช่ที่เดียวกันแล้ว
   ROOT = โฟลเดอร์เว็บ (ที่เสิร์ฟ) · REPO = รากรีโป (ที่ sql/ · test/ · README_DEPLOY.md อยู่)
   ชุดที่อ่านไฟล์ฝั่งพัฒนา ต้องใช้ REPO — ใช้ ROOT จะพังทันทีที่ผังเป็น public/
   (ซึ่งถูกแล้ว: ไฟล์พวกนั้นต้องไม่อยู่ในโฟลเดอร์เว็บ) · ผังเก่า REPO === ROOT ไม่กระทบ */
export const REPO = path.basename(ROOT) === 'public' ? path.dirname(ROOT) : ROOT;

/* เบราว์เซอร์: ① env GP_CHROMIUM ชี้เอง ② path ในเครื่องแชต (ถ้ายังมี — เร็วสุด)
   ③ ปล่อยให้ playwright หาเอง (เครื่องครู: npx playwright install chromium ครั้งเดียว) */
export function launchOpts() {
  if (process.env.GP_CHROMIUM) return { executablePath: process.env.GP_CHROMIUM };
  const local = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return fs.existsSync(local) ? { executablePath: local } : {};
}
const SB = 'https://janoonnhzpwjnxqjvswt.supabase.co';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json', '.md': 'text/plain; charset=utf-8' };

const CSP = (function () {
  const m = /Content-Security-Policy:\s*(.+)/.exec(fs.readFileSync(ROOT + '/_headers', 'utf8'));
  return m ? m[1].trim() : '';
})();

export function serve(port) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404); res.end('no'); return;
    }
    /* ส่ง CSP ชุดเดียวกับไฟล์ _headers ที่ Cloudflare ใช้จริง —
       ไม่งั้นเราจะทดสอบเว็บในสภาพที่หลวมกว่าของจริง แล้วของที่ CSP บล็อกจะไปโผล่ตอนขึ้นเว็บจริง
       (อ่านจากไฟล์ _headers ตรง ๆ จะได้ไม่มีวันหลุดจากกัน) */
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(f)] || 'application/octet-stream',
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(fs.readFileSync(f));
  });
  return new Promise((ok) => srv.listen(port, () => ok(srv)));
}

/* 1x1 png จริง — ให้ <img> โหลดสำเร็จ ไม่ใช่ปล่อยให้ทุกใบ error จนแยกกรณีไม่ออก */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

/* opt.has43 = false → จำลอง "ยังไม่ได้รัน 43_REPORT_CARDS.sql" (มุมมองยังไม่มีในฐาน)
   opt.noData = true → รันแล้วแต่ยังไม่มีเกมส่งใบรายงานผลเข้ามา
   opt.noMedia = true → ยังไม่ได้รัน 57_GAME_MEDIA.sql */
export async function stub(page, opt = {}) {
  const calls = [];

  /* [V.1.6.18] กล่องแนะนำการใช้งานขึ้นเองครั้งแรกต่อเครื่อง และเป็นกล่องทึบ
     ⇒ ชุดทดสอบอื่นที่กดปุ่มบนหน้าจะโดนฉากหลังบังทั้งหมด (เจอจริงตอนเพิ่มกล่องนี้:
       4 ชุดที่เคยเขียวกลับแดงพร้อมกันด้วย "gp-tour-back intercepts pointer events")
     ชุดอื่นทดสอบ "ครูที่ใช้งานอยู่แล้ว" จึงตั้งธงว่าเคยเห็นแล้วให้ตั้งแต่ต้น
     ส่วน t_tour.mjs ส่ง { tour: true } มาเพื่อทดสอบประสบการณ์ครั้งแรกของจริง
     ⚠️ ต้องเป็น addInitScript — วิ่งก่อนสคริปต์ของหน้า ถ้าตั้งทีหลังกล่องขึ้นไปแล้ว */
  if (!opt.tour) {
    await page.addInitScript(() => {
      try { localStorage.setItem('gp_tour_seen', '1'); } catch (e) {}
    });
  }
  page.on('console', (m) => { if (m.type() === 'error') calls.push(['CONSOLE_ERROR', m.text()]); });
  page.on('pageerror', (e) => calls.push(['PAGE_ERROR', String(e)]));

  /* ภาพของเกมภาค 1 — ตอบเป็นภาพจริงให้ ยกเว้นตอนตั้ง opt.brokenHost
     (จำลองกรณีครูอัปโหลด index.html แล้วลืมโฟลเดอร์ img/ ซึ่งภาค 1 บอกว่าเกิดได้จริง) */
  await page.route('https://cai-kan.pages.dev/**', (route) =>
    opt.brokenHost ? route.fulfill({ status: 404, body: 'x' })
                   : route.fulfill({ status: 200, contentType: 'image/jpeg', body: PNG }));

  await page.route('https://shots.test/**', (route) => {
    if (route.request().url().includes('bad')) return route.fulfill({ status: 404, body: 'x' });
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });

  await page.route(SB + '/**', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const q = u.pathname + u.search;
    /* เดิมเก็บเนื้อคำขอเฉพาะ POST ⇒ ชุดทดสอบมองไม่เห็นว่า PATCH ส่งอะไรไป
       (เจอตอนทำช่องแก้คำอธิบายในหน้า Admin ซึ่งบันทึกด้วย PATCH) */
    const post = /^(POST|PATCH|PUT|DELETE)$/.test(req.method()) ? (req.postData() || '') : '';
    /* 200 ตัวอักษรไม่พอสำหรับคำขอที่ส่งข้อความยาว ๆ (เช่นบันทึกคำอธิบายรายตัวชี้วัด)
       ตัดที่ 200 แล้ว JSON.parse ในชุดทดสอบจะพังเพราะสตริงขาดกลางคัน */
    calls.push([req.method(), q, post.slice(0, 4000)]);
    const json = (b, status = 200, headers = {}) => route.fulfill({ status,
      contentType: 'application/json', headers, body: JSON.stringify(b) });
    const gone = () => json({ code: '42P01', message: 'relation does not exist' }, 404);
    const has = (t) => u.pathname === '/rest/v1/' + t;
    const inIds = (rows, col) => {
      const m = /(?:^|&)([a-z_]+)=in\.\(([^)]*)\)/.exec(u.search);
      if (!m) return rows;
      const ids = m[2].split(',').map((s) => s.replace(/^"|"$/g, ''));
      return rows.filter((r) => ids.indexOf(r[m[1]]) >= 0);
    };

    if (u.pathname.startsWith('/auth/v1/token')) return json({ access_token: 'tok', refresh_token: 'r', expires_in: 3600, user: { id: F.UID } });
    if (has('teachers')) return json(opt.admin ? F.teacherAdmin : F.teacher);
    if (has('games')) return json(F.games);
    if (has('v_game_catalog')) return json(F.games);
    if (has('classrooms')) return json(F.rooms);
    if (has('schools')) return json([]);
    /* [V.1.6.36] opt.students — เหตุเดียวกับ opt.achieve ข้างล่าง: ชุดกลางมีเด็กใช้งานจริง
       ใน R1 คนเดียว (S2 ปิดใช้งาน) ⇒ เทสต์ที่ต้องการเด็ก active สองคนฉีดชุดของตัวเองแทน */
    if (has('students')) return json(inIds(opt.students || F.students, 'classroom_id'));
    if (has('classroom_games')) return json(inIds(F.classroom_games, 'classroom_id'));
    if (has('student_game_progress')) return json(inIds(F.progress, 'student_id'));
    if (has('events')) return json([], 200, { 'content-range': '0-0/7' });
    if (has('v_classroom_game_summary')) return json(inIds(F.summary, 'classroom_id'));
    if (has('v_student_achievement')) {
      if (opt.has43 === false) return gone();
      /* [V.1.6.21] opt.achieve — ให้เทสต์ฉีดชุดใบผลสัมฤทธิ์ของตัวเองได้
         ตัวอย่างจำลองกลางมีนักเรียนใช้งานจริงในห้อง R1 คนเดียว (S2 ถูกปิดใช้งาน)
         ⇒ ทดสอบ "การกระจายตามช่วงคะแนน" ไม่ได้ ถ้าต้องพึ่งชุดกลาง
         และการไปเพิ่มนักเรียนในชุดกลางจะไปพังข้อที่นับหัวในชุดอื่น */
      return json(opt.noData ? [] : inIds(opt.achieve || F.achieve, 'classroom_id'));
    }
    /* ยังไม่ได้รัน 43 = ไม่มีทั้งสองมุมมอง ไม่ใช่หายไปทีละอัน — จำลองให้ตรงกับฐานจริง */
    if (has('v_student_comp_dims')) {
      if (opt.has43 === false) return gone();
      /* [V.1.6.17] opt.compDims — ให้เทสต์จำลอง "แถวที่เกมส่งมาแล้วแต่ยังสรุประดับไม่ได้"
         ซึ่งภาค 1 เริ่มส่งตั้งแต่ V.7.99.44 ตามที่ครูเคาะ (ติดป้ายแทนการเงียบ) */
      return json(opt.noData ? [] : inIds(opt.compDims || F.compDims, 'classroom_id'));
    }
    if (has('v_student_competency')) return json(opt.noData ? [] : inIds(F.comp, 'classroom_id'));
    /* [V.1.6.18] วิวสถิติรายเกม ฉบับที่ไฟล์ 83 ขยายให้ — มีช่องแยกตามแหล่งที่มา */
    if (has('v_game_activity')) return json(opt.noStats ? [] : F.gameActivity);
    if (has('v_visit_daily')) return json(opt.noStats ? [] : F.visitDaily);
    if (has('game_media')) return opt.noMedia ? gone() : json(opt.p1media ? F.p1Media : F.media);
    if (has('game_framework_items')) {
      /* ฐานที่ยังไม่ได้รันไฟล์ 71 ไม่มีคอลัมน์ admin_edited → PostgREST ตอบ 42703
         จำลองให้ตรง เพื่อพิสูจน์ว่าหน้า Admin ถอยไปทำงานได้เหมือนเดิม ไม่ใช่พังทั้งหน้า */
      if (opt.no71 && u.search.includes('admin_edited')) {
        return json({ code: '42703', message: 'column game_framework_items.admin_edited does not exist' }, 400);
      }
      return json(F.stdMaps);
    }
    /* ⚠️ ต้องอยู่ **หลัง** game_framework_items — has('framework_items') จับชื่อยาวได้ด้วย */
    if (has('framework_items')) return json(F.frameworkItems);
    if (has('assessment_frameworks')) return json([]);
    if (has('v_framework_coverage')) return json([]);
    /* ---- งานรอบ 2: ห้องสาธารณะ (59) + สร้างห้องก่อนล็อกอิน (60) ---- */
    if (has('rpc/rpc_browse_rooms')) {
      if (opt.no59) return json({ code: 'PGRST202', message: 'Could not find the function' }, 404);
      const b = JSON.parse(post || '{}');
      let rows = F.publicRooms.slice();
      if (b.p_school) rows = rows.filter((r) => r._school_id === b.p_school);
      if (b.p_grade) rows = rows.filter((r) => r.grade === b.p_grade);
      if (b.p_year) rows = rows.filter((r) => r.academic_year === b.p_year);
      if (b.p_q) rows = rows.filter((r) => (r.room_name + r.school_name).includes(b.p_q));
      return json(rows.map(({ _school_id, ...r }) => r));
    }
    if (has('rpc/rpc_browse_room_filters')) {
      if (opt.no59) return json({ code: 'PGRST202', message: 'Could not find the function' }, 404);
      return json(F.browseFilters);
    }
    if (has('rpc/rpc_create_room_open')) {
      if (opt.no60) return json({ code: 'PGRST202', message: 'Could not find the function' }, 404);
      const b = JSON.parse(post || '{}');
      const nm = b.p_room_no ? b.p_grade + '/' + b.p_room_no : b.p_grade;
      calls.push(['CREATED', nm, JSON.stringify(b)]);
      return json({ ok: true, id: 'new-room-id', name: nm, join_key: 'QWE789',
        claim_token: 'T'.repeat(64), expires_at: '2026-10-11T00:00:00Z' });
    }
    if (has('rpc/rpc_room_by_claim')) return json({ ok: true, id: 'new-room-id', name: 'ป.2/3', join_key: 'QWE789' });
    if (has('rpc/rpc_claim_room')) {
      if (opt.no60) return json({ code: 'PGRST202', message: 'Could not find the function' }, 404);
      if (opt.claimDead) return json({ code: 'P0001', message: 'กุญแจรับห้องนี้ใช้ไม่ได้แล้ว' }, 400);
      return json({ ok: true, id: 'new-room-id', name: 'ป.2/3' });
    }
    /* ---- หน้าสรุปผลสาธารณะ (ไฟล์ 72) ---- */
    if (u.pathname.startsWith('/rest/v1/rpc/rpc_pub_')) {
      if (opt.no72) return json({ code: 'PGRST202', message: 'Could not find the function' }, 404);
      if (has('rpc/rpc_pub_filters')) return json(F.pubFilters);
      if (has('rpc/rpc_pub_summary')) {
        const b = JSON.parse(post || '{}');
        /* [V.1.6.35] เลือกห้องเล็ก (ป.4/1) = ฐานยามกดค่าเป็น null/[] + ส่ง suppressed_note มาด้วย */
        if (b.p_room === F.R1) {
          return json(Object.assign({}, F.pubSummary, {
            n_students: 3, n_rooms: 1, suppressed: true,
            suppressed_note: 'กลุ่มนี้มีนักเรียนน้อยกว่า 5 คน — ไม่แสดงค่าเฉลี่ยและการกระจาย เพื่อไม่ให้ระบุตัวผู้เรียนได้',
            ach: { n: 3, avg_percent: null, avg_all: 61.8, dist: [] }, units: [],
            comps: (F.pubSummary.comps || []).map((c) => Object.assign({}, c, { avg_score: null })),
          }));
        }
        /* [V.1.6.35] โหมดสองสเกลปน — เปิดด้วย opt.mixedScale */
        if (opt.mixedScale) {
          return json(Object.assign({}, F.pubSummary, {
            scale_mixed: true,
            scales: [{ game: 'กาญจนบุรี 2050 ภาค 1', game_code: 'kanchanaburi2050', scales: [130, 160] }],
          }));
        }
        /* กรองที่ไม่มีผล = คืนก้อนว่าง เพื่อพิสูจน์ว่าหน้าเว็บขึ้นข้อความ ไม่ใช่กราฟเปล่า */
        if (b.p_grade === 'ป.4') {
          return json(Object.assign({}, F.pubSummary,
            { n_students: 0, n_rooms: 0, ach: { n: 0, avg_percent: null, avg_all: 61.8, dist: [] } }));
        }
        return json(F.pubSummary);
      }
      if (has('rpc/rpc_pub_breakdown')) return json(F.pubBreakdown);
    }
    if (has('rpc/rpc_delete_student')) {
      if (opt.no55) return json({ code: 'PGRST202', message: 'Could not find the function' }, 404);
      return json({ ok: true, label: 'สมชาย ใจดี', deleted: { students: 1 } });
    }
    if (has('rpc/rpc_delete_classroom')) {
      if (opt.no55) return json({ code: 'PGRST202', message: 'Could not find the function' }, 404);
      return json({ ok: true, label: 'ป.4/1', students: 2, deleted: { classrooms: 1 } });
    }
    return json([]);
  });
  return calls;
}

/* ต้องฝังเซสชันก่อนหน้าจะเริ่มรัน ไม่ใช่ตั้งทีหลังแล้วค่อยเปลี่ยน hash
   เพราะเปลี่ยนแค่ hash เบราว์เซอร์ไม่โหลดหน้าใหม่ boot() จึงไม่ได้ทำงานอีกรอบ */
export async function login(page) {
  await page.addInitScript((uid) => {
    localStorage.setItem('gp_hub_sess', JSON.stringify({
      access_token: 'tok', refresh_token: 'r', user_id: uid, expires_at: Date.now() + 3600000 }));
  }, F.UID);
}

/* "error" ที่นับว่าเป็นบั๊กจริง = สคริปต์พังหรือ console.error ของโค้ดเราเอง
   ไม่นับ 404 ของทรัพยากร เพราะชุดทดสอบนี้จงใจให้ภาพใบหนึ่งเสียและจงใจให้ตาราง game_media หาย
   (นั่นคือกรณีที่ต้องพิสูจน์ว่าเว็บรับมือได้ ไม่ใช่กรณีที่ต้องไม่เกิด) */
export function realErrors(calls) {
  return calls.filter((c) => c[0] === 'PAGE_ERROR'
    || (c[0] === 'CONSOLE_ERROR' && !/Failed to load resource/i.test(c[1])));
}

export function reporter() {
  let bad = 0, n = 0;
  const ok = (label, cond, extra) => {
    n++;
    if (!cond) bad++;
    console.log((cond ? '  ✅ ' : '  ❌ ') + label
      + (!cond && extra !== undefined ? '\n       → ' + JSON.stringify(extra).slice(0, 400) : ''));
  };
  /* [V.1.6.7] STD-006 ข้อ 1 — ชุดที่รัน 0 ข้อ (ตายกลางทางก่อนถึงข้อแรก หรือเงื่อนไข
     ครอบทั้งชุดไม่เข้า) ต้องเป็นแดง ไม่ใช่ "ผ่าน 0/0 ข้อ" ซึ่งอ่านแล้วเข้าใจว่าผ่าน */
  ok.done = () => {
    if (n === 0) { console.log('\n❌ ชุดนี้ไม่ได้ตรวจข้อใดเลย (0 ข้อ) — นับเป็นแดงตาม STD-006 ข้อ 1'); return 1; }
    console.log(`\n${bad ? '❌' : '✅'} ผ่าน ${n - bad}/${n} ข้อ`); return bad;
  };
  return ok;
}

export { chromium };
