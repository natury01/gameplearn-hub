/* ชุดทดสอบ 3 — กันงานรอบนี้ทำของเดิมพัง
   ตรวจทุกหน้าที่ 320px (จอเล็กสุดที่ยังต้องรองรับ) และ 1280px:
   ไม่มีสคริปต์พัง · ไม่ล้นแนวนอน · ป้ายรุ่นตรง · ปุ่ม/ลิงก์กดได้จริง */
import { chromium, serve, stub, login, reporter, realErrors } from './harness.mjs';
import * as F from './fixtures.mjs';
import fs from 'fs';

const PORT = 8933, BASE = 'http://localhost:' + PORT;
const VER = 'V.1.4.4';
const srv = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = ['/index.html', '/teacher.html', '/admin.html', '/standards.html',
  '/support.html', '/contact.html'];
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
  const ROOT = process.env.HUB_ROOT || '/home/claude/hub';
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
  ok('คีย์ gp_room_claims ถูกจดไว้ในรายการคีย์จองของแพลตฟอร์ม (กันเกมใช้ชื่อซ้ำ)',
    /gp_room_claims/.test(fs.readFileSync(ROOT + '/js/gp-join.js', 'utf8')));
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

await b.close(); srv.close();
process.exit(ok.done());
