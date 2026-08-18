/* โครงร่างชุดทดสอบเว็บกลาง — เสิร์ฟไฟล์จริงจากโฟลเดอร์ hub แล้วดัก Supabase ด้วยข้อมูลจำลอง
   ทำไมต้องดัก: ไฟล์เว็บชี้ไปโปรเจกต์จริง ทดสอบจึงต้องไม่แตะฐานจริงเด็ดขาด
   และต้องบังคับกรณีที่หาไม่ได้จากฐานจริง (ยังไม่รัน 43 · ภาพเสีย · ห้องผู้เล่นทั่วไปผูกกับครู) */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import * as F from './fixtures.mjs';

const ROOT = process.env.HUB_ROOT || '/home/claude/hub';
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
    if (has('students')) return json(inIds(F.students, 'classroom_id'));
    if (has('classroom_games')) return json(inIds(F.classroom_games, 'classroom_id'));
    if (has('student_game_progress')) return json(inIds(F.progress, 'student_id'));
    if (has('events')) return json([], 200, { 'content-range': '0-0/7' });
    if (has('v_classroom_game_summary')) return json(inIds(F.summary, 'classroom_id'));
    if (has('v_student_achievement')) {
      if (opt.has43 === false) return gone();
      return json(opt.noData ? [] : inIds(F.achieve, 'classroom_id'));
    }
    /* ยังไม่ได้รัน 43 = ไม่มีทั้งสองมุมมอง ไม่ใช่หายไปทีละอัน — จำลองให้ตรงกับฐานจริง */
    if (has('v_student_comp_dims')) {
      if (opt.has43 === false) return gone();
      return json(opt.noData ? [] : inIds(F.compDims, 'classroom_id'));
    }
    if (has('v_student_competency')) return json(opt.noData ? [] : inIds(F.comp, 'classroom_id'));
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
  ok.done = () => { console.log(`\n${bad ? '❌' : '✅'} ผ่าน ${n - bad}/${n} ข้อ`); return bad; };
  return ok;
}

export { chromium };
