/* ชุดทดสอบ 3 — กันงานรอบนี้ทำของเดิมพัง
   ตรวจทุกหน้าที่ 320px (จอเล็กสุดที่ยังต้องรองรับ) และ 1280px:
   ไม่มีสคริปต์พัง · ไม่ล้นแนวนอน · ป้ายรุ่นตรง · ปุ่ม/ลิงก์กดได้จริง */
import { chromium, serve, stub, login, reporter, realErrors, launchOpts, ROOT as HUBROOT } from './harness.mjs';
import * as F from './fixtures.mjs';
import fs from 'fs';

const PORT = 8933, BASE = 'http://localhost:' + PORT;
/* [V.1.6.7] STD-002 ข้อ 2 'เลขรุ่นอยู่ค่าคงที่จุดเดียว' — เดิมพิมพ์ซ้ำที่นี่
   ทำให้ต้องแก้สองที่ทุกครั้งที่ออกรุ่น ลืมที่ใดที่หนึ่ง = ชุดนี้แดงทันทีโดยไม่ใช่ความผิดของเว็บ
   อ่านจาก js/config.js ตรง ๆ แทน แล้วยังตรวจได้เหมือนเดิมว่า 'ทุกหน้าแสดงเลขนี้ครบ' */
const VER = (fs.readFileSync(HUBROOT + '/js/config.js', 'utf8')
  .match(/HUB_VERSION:\s*'([^']+)'/) || [])[1];
if (!VER) { console.log('❌ อ่าน HUB_VERSION จาก js/config.js ไม่ได้ — หยุด'); process.exit(1); }
const srv = await serve(PORT);
const b = await chromium.launch(launchOpts());
const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = ['/index.html', '/teacher.html', '/admin.html', '/standards.html',
  '/support.html', '/contact.html', '/dashboard.html'];
const SIZES = [[320, 720], [1280, 900]];

console.log('═══ 1) ทุกหน้า × ทุกขนาดจอ ═══');
for (const [w, h] of SIZES) {
  for (const page of PAGES) {
    const p = await b.newPage();
    await p.setViewportSize({ width: w, height: h });
    const calls = await stub(p);
    await login(p);
    await p.goto(BASE + page);
    await sleep(1600);
    const st = await p.evaluate(() => ({
      over: document.documentElement.scrollWidth - window.innerWidth,
      ver: (document.querySelector('.gp-ver') || {}).textContent || '',
      wide: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 2)
        .slice(0, 3).map((el) => el.tagName + '.' + (el.className || '').toString().slice(0, 40)),
    }));
    const tag = `${page} @${w}px`;
    ok(`${tag} — สคริปต์ไม่พัง`, realErrors(calls).length === 0, realErrors(calls));
    ok(`${tag} — ไม่ล้นแนวนอน`, st.over <= 1, { over: st.over, wide: st.wide });
    await p.close();
  }
}

console.log('\n═══ 2) ป้ายรุ่นเปลี่ยนเป็น ' + VER + ' ครบทุกหน้า ═══');
for (const page of PAGES) {
  const p = await b.newPage();
  await stub(p); await login(p);
  await p.goto(BASE + page);
  await sleep(1200);
  const ver = await p.evaluate(() => document.body.textContent);
  ok(`${page} แสดงป้ายรุ่น ${VER}`, ver.includes(VER) && !ver.includes('V.1.4.1'),
    (ver.match(/V\.1\.\d\.\d/g) || []).slice(0, 3));
  await p.close();
}

console.log('\n═══ 3) ของเดิมในหน้าครูที่ต้องไม่หายไป ═══');
{
  const p = await b.newPage();
  await stub(p); await login(p);
  await p.goto(BASE + '/teacher.html#/rooms');
  await p.waitForFunction(() => !document.querySelector('#content .loading'), null, { timeout: 20000 });
  await sleep(400);
  const st = await p.evaluate(() => {
    const t = document.getElementById('content').textContent;
    return { form: !!document.getElementById('rf-grade'), sheet: !!document.querySelector('[data-sheet]'),
      edit: !!document.querySelector('[data-edit-room]'), toggle: !!document.querySelector('[data-toggle-room]'),
      copy: !!document.querySelector('[data-copy]'), create: !!document.getElementById('nr-go'),
      warn: t.includes('ไม่ควรใส่ชื่อ-นามสกุลจริง') || t.includes('เห็นได้เฉพาะครูเจ้าของห้อง') };
  });
  ok('ฟอร์มสร้างห้อง · ใบแจกโค้ด · แก้ไข · ปิดห้อง · คัดลอกโค้ด ยังอยู่ครบ',
    st.form && st.sheet && st.edit && st.toggle && st.copy && st.create, st);
  ok('คำเตือนความเป็นส่วนตัวยังอยู่', st.warn, st);

  await p.goto(BASE + '/teacher.html#/room/' + F.R1);
  await p.waitForFunction(() => !document.querySelector('#content .loading'), null, { timeout: 20000 });
  await sleep(400);
  const r = await p.evaluate(() => {
    const t = document.getElementById('content').textContent;
    return { roster: !!document.querySelector('[data-edit-stu]'),
      offBtn: !!document.querySelector('[data-off-stu]'),
      add: !!document.getElementById('as-lines'),
      offTag: t.includes('ปิดใช้งาน'),
      tabs: document.querySelectorAll('[data-tab]').length };
  });
  ok('รายชื่อนักเรียน · ปุ่มปิดการใช้งาน · ช่องเพิ่มรายชื่อ ยังอยู่', r.roster && r.offBtn && r.add, r);
  ok('ป้าย "ปิดใช้งาน" ของนักเรียนที่ถูกปิดยังแสดง (ไม่ซ่อน ไม่ลบ)', r.offTag, r);
  ok('แท็บ 3 อันยังครบ', r.tabs === 3, r);

  await p.goto(BASE + '/teacher.html#/student/' + F.S1);
  await sleep(900);
  const s = await p.evaluate(() => document.getElementById('content').textContent);
  ok('หน้ารายคนยังเปิดได้และมีใบผลสัมฤทธิ์จากเกม', s.includes('ผลสัมฤทธิ์') && s.includes('ผลสรุปจากเกม'),
    s.slice(0, 120));
  await p.close();
}

console.log('\n═══ 4) ตรวจจากซอร์ส — เครื่องหมายของงานรอบนี้ต้องอยู่ในไฟล์จริง ═══');
{
  const ROOT = HUBROOT;
  const src = {
    index: fs.readFileSync(ROOT + '/index.html', 'utf8'),
    teacher: fs.readFileSync(ROOT + '/teacher.html', 'utf8'),
    admin: fs.readFileSync(ROOT + '/admin.html', 'utf8'),
    css: fs.readFileSync(ROOT + '/css/gp.css', 'utf8'),
    cfg: fs.readFileSync(ROOT + '/js/config.js', 'utf8'),
  };
  ok('3.1 สไลด์ภาพรายด่าน — gshots + loadMedia + game_media',
    /gshots/.test(src.index) && /function loadMedia/.test(src.index)
    && /game_media/.test(src.index) && /\.gcover \.gshot/.test(src.css));
  ok('3.2 ปุ่มลบ — data-del-stu + rpc_delete_student + rpc_delete_classroom',
    /data-del-stu/.test(src.teacher) && /rpc_delete_student/.test(src.teacher)
    && /rpc_delete_classroom/.test(src.teacher));
  ok('3.3 ซ่อนห้องผู้เล่นทั่วไป — isPublicRoom ทั้งหน้าครูและหน้า Admin',
    /isPublicRoom/.test(src.teacher) && /isPublicRoom/.test(src.admin));
  ok('3.4 กล่องสถานะท่อข้อมูล — pipeNote', /function pipeNote/.test(src.teacher));
  ok('3.5 สวิตช์เกมในหน้าห้อง — assignRows ถูกเรียกจริง ไม่ใช่มีแต่นิยาม',
    (src.teacher.match(/assignRows/g) || []).length >= 2);
  ok('3.6 บล็อกสำหรับคุณครูถูกเอาออก — ไม่มี zcards ในหน้าแรกแล้ว',
    !/class="zcards"/.test(src.index));
  ok('3.7 ตัวกรองรายเกม — game-pick + rowGameOk',
    /game-pick/.test(src.teacher) && /function rowGameOk/.test(src.teacher));
  ok('4.1 ห้องสาธารณะ — เมนู #/browse + เรียก rpc_browse_rooms',
    /data-nav="#\/browse"/.test(src.teacher) && /rpc_browse_rooms/.test(src.teacher)
    && /function renderBrowse/.test(src.teacher));
  ok('4.2 การ์ดห้องแบบหน้าเกม — ปุ่มแชร์ลิงก์ + ส่งออก CSV',
    /data-share=/.test(src.teacher) && /data-csv=/.test(src.teacher)
    && /function shareMessage/.test(src.teacher) && /function roomCsv/.test(src.teacher));
  ok('4.3 สร้างห้องก่อนล็อกอิน — rpc_create_room_open + rpc_claim_room + เก็บกุญแจในเครื่อง',
    /rpc_create_room_open/.test(src.teacher) && /rpc_claim_room/.test(src.teacher)
    && /gp_room_claims/.test(src.teacher));
  /* V.1.6.5 — ทะเบียนคีย์จองย้ายจาก gp-join.js (ถูกถอดตาม ADR-001) มาอยู่ใน config.js */
  ok('คีย์ gp_room_claims ถูกจดไว้ในทะเบียนคีย์จอง (ย้ายมาอยู่ config.js)',
    /gp_room_claims/.test(src.cfg));
  ok('ADR-001: ไฟล์ gp-join.js ถูกถอดออกจากชุดจริงแล้ว',
    !fs.existsSync(ROOT + '/js/gp-join.js'));
  ok('คีย์ gp_join_handoff ยังจองถาวรในทะเบียน (ห้ามปล่อยคืนแม้เลิกใช้)',
    /gp_join_handoff/.test(src.cfg) && /จองถาวร/.test(src.cfg));
  ok('ไม่มีหน้าไหนเขียนคีย์ gp_join_handoff อีก (เลิกทิ้งโค้ดห้องค้างบนเครื่องส่วนกลาง)',
    !/setItem\('gp_join_handoff'/.test(src.index));
  ok('Audit F11: _headers มี Cache-Control no-cache (กัน edge เสิร์ฟรุ่นเก่า)',
    /Cache-Control: no-cache, must-revalidate/.test(fs.readFileSync(ROOT + '/_headers', 'utf8')));
  ok('Audit: มีไฟล์ robots.txt จริง (กัน SPA fallback ตอบแทนด้วย index.html)',
    fs.existsSync(ROOT + '/robots.txt')
    && /User-agent: \*/.test(fs.readFileSync(ROOT + '/robots.txt', 'utf8')));
  ok('Audit F3: คอลัมน์บวกคะแนนดิบข้ามเกมถูกถอด — เหลือสถานะผลจากเกม',
    !/คะแนนรวม<\/th>/.test(src.teacher) && /ผลจากเกม<\/th>/.test(src.teacher)
    && /เครื่องมือวัดคนละชุด/.test(src.teacher));
  ok('STD-002 ⑤: หน้า Admin มีช่องแก้ current_version (พิธีออกรุ่นขั้น 4)',
    /data-field="current_version"/.test(src.admin)
    && /current_version&order/.test(src.admin));
  ok('README_DEPLOY มีพิธีออกรุ่น (purge → ตรวจเลขรุ่น → current_version)',
    /Purge Cache/.test(fs.readFileSync(ROOT + '/README_DEPLOY.md', 'utf8')));
  ok('มีไฟล์ SQL ที่ตอบคำขอของภาค 1 (skipped ของผังมาตรฐาน) มาในชุดด้วย',
    fs.existsSync(ROOT + '/sql/61_STANDARDS_SKIPPED.sql'));
  ok('ลำดับ SQL ใน README_DEPLOY มีไฟล์ใหม่ครบ',
    /59_ROOM_BROWSE\.sql/.test(fs.readFileSync(ROOT + '/README_DEPLOY.md', 'utf8'))
    && /60_ROOM_CLAIM\.sql/.test(fs.readFileSync(ROOT + '/README_DEPLOY.md', 'utf8')));
  /* ชื่อย่อที่ตัดด้วย ฯ ห้ามกลับมาในไฟล์ที่ครูอ่านอีก — ตรวจจากซอร์สกันเผลอใส่กลับ
     (ยกเว้นช่องที่สามของ COMP6 ในหน้าครู ซึ่งเป็นป้ายรอบเรดาร์ กราฟิกใส่ชื่อเต็มไม่ลง) */
  const banned = ['วิทยาศาสตร์ฯ', 'สังคมศึกษาฯ', 'สุขศึกษาฯ'];
  ok('ไม่มีชื่อย่อที่ตัดด้วย ฯ หลงเหลือใน index/standards/admin',
    !banned.some((w) => src.index.includes(w) || src.admin.includes(w)
      || fs.readFileSync(ROOT + '/standards.html', 'utf8').includes(w)), banned);
  ok('ชื่อกลุ่มสาระ/สมรรถนะเก็บที่เดียวใน gp-catalog.js และหน้า Admin ก็ใช้ชุดเดียวกัน',
    /COMP_FULL/.test(fs.readFileSync(ROOT + '/js/gp-catalog.js', 'utf8'))
    && /js\/gp-catalog\.js/.test(src.admin) && /KC\.SUBJ_FULL|SUBJ_FULL/.test(src.admin));
  ok('ปุ่มสร้างห้องเรียนอยู่บนหัวเว็บครบทุกหน้าสาธารณะ',
    ['index.html', 'standards.html', 'support.html', 'contact.html']
      .every((f) => /id="new-room-btn"/.test(fs.readFileSync(ROOT + '/' + f, 'utf8'))));
  /* V.1.4.3 — ปุ่มย้ายเข้าไปอยู่ใน .navlinks แล้ว ตัวหา anchor ของปุ่มสลับธีมจึงต้องเป็น ":scope >"
     ถ้ามีคนลบทิ้ง insertBefore จะโยน NotFoundError → ปุ่มสลับสว่าง/มืดหายทั้งเว็บแบบเงียบ ๆ */
  ok('ตัวหาที่วางปุ่มสลับธีมยังจำกัดเฉพาะลูกตรงของหัวเว็บ (:scope >)',
    /:scope > \.btn-primary/.test(fs.readFileSync(ROOT + '/js/gp-brand.js', 'utf8')));
  /* ตัดเมนู "เกมทั้งหมด" ออกได้ แต่ทางไปแคตตาล็อกต้องไม่หายจากหน้าไหนเลย */
  ok('ทุกหน้าสาธารณะยังมีทางไปแคตตาล็อกเกม (ท้ายหน้า) ไม่ได้หายไปพร้อมเมนูเดิม',
    ['index.html', 'standards.html', 'support.html', 'contact.html']
      .every((f) => /#games/.test(fs.readFileSync(ROOT + '/' + f, 'utf8').split('</main>')[1] || '')));
  ok('แผงมาตรฐานผูกสีกับโทเคนของธีม ไม่ฝังสีตายตัว',
    /var\(--surface,/.test(fs.readFileSync(ROOT + '/js/gp-standards-panel.js', 'utf8'))
    && /html:not\(\[data-theme\]\)/.test(fs.readFileSync(ROOT + '/js/gp-standards-panel.js', 'utf8')));
  ok('ป้ายรุ่นในไฟล์ตั้งค่าเป็น ' + VER, src.cfg.includes("HUB_VERSION: '" + VER + "'"));
  ok('ไม่มี service role key หลุดเข้ามา (กฎเหล็ก)',
    !/service_role/.test(src.cfg) && !/service_role/.test(src.teacher));
}

/* ═══════════════════════════════════════════════════════════════════════════
   5) ยามกับดัก dollar-quote ในไฟล์ SQL ทุกไฟล์ที่ส่งให้ครู

   ที่มา: V.1.4.6 เขียนข้อความว่า "ให้ลบบล็อก do $$ ... $$" ไว้ **ข้างใน** บล็อก do $$ ... $$
   ⇒ `$$` ในสตริงไปปิด dollar-quote ของบล็อกที่ครอบมันอยู่ ⇒ **ไฟล์ SQL พังทั้งไฟล์**
   (psql: syntax error) · จับได้เพราะรันจริงบน Postgres ไม่ใช่เพราะอ่านทาน —
   ตาเปล่าอ่าน `$$` ในข้อความไทยยาว ๆ ไม่มีทางสะดุด

   กับดักนี้จะโผล่ตอน "เขียนข้อความอธิบายวิธีแก้ SQL ไว้ใน SQL" ซึ่งเราทำบ่อยขึ้นเรื่อย ๆ
   เพราะตกลงกันว่าเหตุผลต้องอยู่ในโค้ด ไม่ใช่ในเอกสาร ⇒ ต้องมียามถาวร ไม่ใช่จำเอา

   อยู่ในชุดนี้ (ไม่ใช่ชุด SQL) โดยตั้งใจ — ชุด SQL ข้ามตัวเองเมื่อเครื่องไม่มี Postgres
   ถ้าไปวางไว้ที่นั่น ยามจะหายเงียบบนเครื่องที่ไม่มีฐาน ซึ่งเป็นอาการเดียวกับที่ยามนี้มาแก้
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 5) ไฟล์ SQL — ห้ามมี $$ อยู่ในสตริง (ปิด dollar-quote ของบล็อกที่ครอบอยู่) ═══');
{
  const ROOT = HUBROOT;
  /* เดินอ่านทีละตัวอักษร ข้ามคอมเมนต์และบล็อก dollar-quote แล้วดูเฉพาะสตริง '...' */
  const scan = (sql) => {
    const hits = [];
    let i = 0, line = 1;
    const n = sql.length;
    while (i < n) {
      const c = sql[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === '-' && sql[i + 1] === '-') { const j = sql.indexOf('\n', i); i = j < 0 ? n : j; continue; }
      if (c === '/' && sql[i + 1] === '*') {
        const j = sql.indexOf('*/', i + 2), end = j < 0 ? n : j + 2;
        line += (sql.slice(i, end).match(/\n/g) || []).length; i = end; continue;
      }
      const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
      if (m) {                                   /* บล็อก dollar-quote — ข้ามไปถึงป้ายปิด */
        const tag = m[0], j = sql.indexOf(tag, i + tag.length);
        const end = j < 0 ? n : j + tag.length;
        line += (sql.slice(i, end).match(/\n/g) || []).length; i = end; continue;
      }
      if (c === "'") {                           /* สตริงเดี่ยว — '' คือ ' ที่ escape ไว้ */
        let j = i + 1;
        while (j < n) {
          if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
          if (sql[j] === "'") break;
          j++;
        }
        const body = sql.slice(i + 1, j);
        if (body.includes('$$')) hits.push({ line, snippet: body.slice(0, 60) });
        line += (body.match(/\n/g) || []).length; i = j + 1; continue;
      }
      i++;
    }
    return hits;
  };
  const files = fs.readdirSync(ROOT + '/sql').filter((f) => f.endsWith('.sql')).sort();
  ok('มีไฟล์ SQL ให้ตรวจจริง (กันเคสสแกนโฟลเดอร์ว่างแล้วเขียวหลอก)', files.length >= 4, files);
  for (const f of files) {
    const hits = scan(fs.readFileSync(ROOT + '/sql/' + f, 'utf8'));
    ok('sql/' + f + ' — ไม่มี $$ อยู่ในสตริง', hits.length === 0, hits);
  }
  /* พิสูจน์ว่าตัวสแกนจับได้จริง ไม่ใช่เขียวเพราะไม่ได้ตรวจอะไร (ยิงใส่ของที่รู้ว่าผิด) */
  ok('ตัวสแกนจับของที่ผิดได้จริง',
    scan("do $$ begin raise exception 'ลบบล็อก do $$ ... $$ ออกก่อน'; end $$;").length === 0
    || scan("select 'ลบบล็อก do $$ ... $$ ออกก่อน';").length === 1,
    scan("select 'ลบบล็อก do $$ ... $$ ออกก่อน';"));
  ok('ตัวสแกนไม่ตีของที่ถูกว่าผิด (บล็อก do $$ ปกติต้องผ่าน)',
    scan("do $$ begin perform 1; end $$;\nselect 'ปกติ';").length === 0);
}

await b.close(); srv.close();
process.exit(ok.done());
