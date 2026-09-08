/* ชุดทดสอบ 2 — หน้าครู: ห้องผู้เล่นทั่วไป · ปุ่มลบ · ท่อข้อมูล · สวิตช์เกม · ตัวกรองรายเกม
   (ข้อ 3.2 · 3.3 · 3.4 · 3.5 · 3.7) */
import { chromium, serve, stub, login, reporter, realErrors, launchOpts } from './harness.mjs';
import * as F from './fixtures.mjs';
import fs from 'fs';

const PORT = 8932, BASE = 'http://localhost:' + PORT;
const srv = await serve(PORT);
const b = await chromium.launch(launchOpts());
const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(opt = {}, hash = '#/') {
  const p = await b.newPage();
  const calls = await stub(p, opt);
  await login(p);
  await p.goto(BASE + '/teacher.html' + hash);
  await p.waitForSelector('#v-app:not(.hidden)', { timeout: 20000 });
  await p.waitForFunction(() => !document.querySelector('#content .loading'), null, { timeout: 20000 });
  await sleep(400);
  return { p, calls };
}

console.log('═══ 1) ห้อง "ผู้เล่นทั่วไป" ต้องไม่โผล่ที่หน้าครูเลย (ข้อ 3.3) ═══');
{
  const { p } = await open();
  const st = await p.evaluate(() => ({
    /* อ่านจาก <main> ไม่ใช่ body — textContent ของ body ลากเนื้อในแท็ก <script> มาด้วย
       ซึ่งมีชื่อห้องอยู่ในโค้ดตัวกรองเองอยู่แล้ว (จะกลายเป็นตกทั้งที่หน้าจอถูกต้อง) */
    body: document.getElementById('page-main').textContent,
    tiles: [...document.querySelectorAll('.tile')].map((t) => t.textContent.trim()),
    pickOpts: [...(document.getElementById('room-pick') || { options: [] }).options].map((o) => o.textContent),
  }));
  ok('ไม่มีคำว่า "ผู้เล่นทั่วไป" ที่ไหนในหน้าเลย', !st.body.includes('ผู้เล่นทั่วไป'), st.tiles);
  ok('ไม่มีโค้ดห้องผู้เล่นทั่วไปหลุดออกมา', !st.body.includes('ZZZ999'));
  ok('กล่อง "ห้องเรียน" นับ 2 ห้อง ไม่ใช่ 3', /ห้องเรียน\s*2/.test(st.tiles.join('|')), st.tiles);
  ok('ตัวเลือกห้องมีแค่ห้องของครูจริง', st.pickOpts.length === 3
    && !st.pickOpts.join('|').includes('ผู้เล่นทั่วไป'), st.pickOpts);
  ok('เด็กในห้องนั้นไม่ถูกนับเป็นนักเรียนของครู (2 คน ไม่ใช่ 3)',
    /นักเรียน\s*1/.test(st.tiles.join('|')), st.tiles);

  await p.goto(BASE + '/teacher.html#/rooms');
  await p.waitForFunction(() => !document.querySelector('#content .loading'), null, { timeout: 20000 });
  await sleep(300);
  const rm = await p.evaluate(() => document.getElementById('content').textContent);
  ok('หน้า "สร้าง/จัดการห้องเรียน" ก็ไม่มีห้องนั้น',
    !rm.includes('ผู้เล่นทั่วไป') && !rm.includes('ZZZ999'));

  /* เปิดตรงด้วยลิงก์ก็ต้องเข้าไม่ได้ */
  await p.goto(BASE + '/teacher.html#/room/' + F.RP);
  await sleep(900);
  const hash = await p.evaluate(() => location.hash);
  ok('ลิงก์ตรงเข้าห้องผู้เล่นทั่วไปถูกเด้งกลับหน้ารวม', hash === '#/' || hash === '', { hash });
  await p.close();
}

console.log('\n═══ 2) กล่องบอกสถานะท่อข้อมูล (ข้อ 3.4) ═══');
{
  const { p } = await open({ has43: false });
  const t = await p.evaluate(() => document.getElementById('content').textContent);
  ok('ยังไม่ได้รัน 43 → บอกว่าต้องรัน 43 และบอกว่าไม่ใช่ความผิดพลาดของหน้าจอ',
    t.includes('ยังไม่ได้รัน') && t.includes('43_REPORT_CARDS.sql')
    && t.includes('ไม่ใช่ความผิดพลาดของหน้าจอ'), t.slice(0, 200));
  ok('ไม่ได้บอกให้รอเกมส่งข้อมูล (คนละกรณี)', !t.includes('รออีกฝั่งส่งข้อมูล'), t.slice(0, 200));
  await p.click('[data-tab="comp"]'); await sleep(400);
  const t2 = await p.evaluate(() => document.getElementById('content').textContent);
  ok('แท็บสมรรถนะก็ขึ้นกล่องเดียวกัน', t2.includes('ยังไม่ได้รัน') && t2.includes('43_REPORT_CARDS.sql'));
  await p.close();
}
{
  const { p } = await open({ noData: true });
  const t = await p.evaluate(() => document.getElementById('content').textContent);
  ok('รัน 43 แล้วแต่ยังไม่มีข้อมูล → บอกให้เปิดหน้าครูของเกมสักครั้ง',
    t.includes('รออีกฝั่งส่งข้อมูล') && t.includes('เปิดหน้าครูของเกม'), t.slice(0, 240));
  ok('ไม่ได้บอกให้ไปรัน 43 ซ้ำ', !t.includes('ยังไม่ได้รัน'), t.slice(0, 240));
  await p.close();
}
{
  const { p } = await open();
  const t = await p.evaluate(() => document.getElementById('content').textContent);
  ok('มีข้อมูลแล้ว → ไม่มีกล่องเตือนมากวน',
    !t.includes('ยังไม่ได้รัน') && !t.includes('รออีกฝั่งส่งข้อมูล'), t.slice(0, 160));
  await p.close();
}

console.log('\n═══ 3) ตัวกรองรายเกมบน Dashboard (ข้อ 3.7) ═══');
{
  const { p } = await open();
  const st0 = await p.evaluate(() => ({
    hasGamePick: !!document.getElementById('game-pick'),
    opts: [...document.getElementById('game-pick').options].map((o) => o.textContent),
    tiles: [...document.querySelectorAll('.tile')].map((t) => t.textContent.trim()),
    ach: document.getElementById('content').textContent.includes('กาญจนบุรี 2050 ภาค 2'),
  }));
  ok('มีช่องเลือกเกมคู่กับช่องเลือกห้อง', st0.hasGamePick, st0);
  ok('รายชื่อเกม = เกมที่เปิดใช้จริง (ทุกเกม + 2 เกม)', st0.opts.length === 3, st0.opts);
  ok('ยังไม่กรอง: กล่อง "เกมที่ใช้งาน" = 2', /เกมที่ใช้งาน\s*2/.test(st0.tiles.join('|')), st0.tiles);

  await p.selectOption('#game-pick', F.G1);
  await sleep(400);
  const st1 = await p.evaluate(() => ({
    tiles: [...document.querySelectorAll('.tile')].map((t) => t.textContent.trim()),
    body: document.getElementById('content').textContent,
  }));
  ok('เลือกเกมเดียว: "เกมที่ใช้งาน" = 1', /เกมที่ใช้งาน\s*1/.test(st1.tiles.join('|')), st1.tiles);
  ok('ความคืบหน้าเฉลี่ยคิดเฉพาะเกมนั้น (60% ไม่ใช่ 40%)',
    /ความคืบหน้าเฉลี่ย\s*60/.test(st1.tiles.join('|')), st1.tiles);

  /* [V.1.6.18 · ครูสั่ง] สองช่องเดิมเป็นตัวเลขเชิงระบบ ไม่ใช่การเรียนรู้ — ถอดออกแล้ว
     ข้อเดิมสองข้อที่ยึดช่องพวกนั้น เขียนใหม่ให้คุมเรื่องเดียวกันกับช่องใหม่
     (เรื่องที่ต้องคุมคือ "ตัวกรองเกมทำให้ตัวเลขแคบลงจริง" ไม่ใช่ชื่อช่อง) */
  ok('ช่อง "รอบที่ส่งผล" ถูกถอดออกจากแถบสรุปแล้ว (ยังดูได้ที่หน้ารายคน)',
    !/รอบที่ส่งผล/.test(st1.tiles.join('|')), st1.tiles);
  ok('ช่อง "บันทึกการเล่นสะสม" ถูกถอดออกแล้ว',
    !/บันทึกการเล่นสะสม/.test(st1.tiles.join('|')), st1.tiles);
  ok('มีช่อง "ประเมินแล้ว" บอกเป็นสัดส่วนคน ไม่ใช่จำนวนใบ',
    /ประเมินแล้ว\s*\d+\/\d+\s*คน/.test(st1.tiles.join('|')), st1.tiles);
  ok('⭐ "สมรรถนะที่สรุปได้" ตัดเหลือของเกมที่กรอง (1/6 ไม่ใช่ 2/6)',
    /สมรรถนะที่สรุปได้\s*1\/6/.test(st1.tiles.join('|')), st1.tiles);
  ok('⭐ ยกเลิกตัวกรองแล้วกลับเป็น 2/6 — พิสูจน์ว่าตัวเลขขยับตามตัวกรองจริง',
    /สมรรถนะที่สรุปได้\s*2\/6/.test(st0.tiles.join('|')), st0.tiles);

  await p.click('[data-tab="comp"]'); await sleep(400);
  /* ดูที่แถวสมรรถนะจริง ไม่ใช่ทั้งหน้า — ชื่อเกมโผล่ในช่องเลือกเกมอยู่แล้วโดยธรรมชาติ */
  const c1 = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.c6row')].map((r) => r.textContent.trim());
    return { sm: rows.find((t) => t.includes('การจัดการตนเอง')) || '',
      hot: rows.find((t) => t.includes('การคิดขั้นสูง')) || '' };
  });
  ok('แท็บสมรรถนะกรองตามเกมด้วย — ด้าน "จัดการตนเอง" ที่มาจากภาค 2 ไม่เหลือคะแนนเมื่อเลือกภาค 1',
    c1.sm.includes('ยังไม่มีเกมวัดด้านนี้'), c1);
  ok('ด้านที่มาจากเกมที่เลือกยังมีคะแนนอยู่', /72/.test(c1.hot), c1);

  await p.click('[data-tab="ach"]'); await sleep(300);
  await p.selectOption('#room-pick', F.R2);
  await sleep(400);
  const st2 = await p.evaluate(() => ({
    game: document.getElementById('game-pick') ? document.getElementById('game-pick').value : null,
    opts: document.getElementById('game-pick')
      ? [...document.getElementById('game-pick').options].length : 0,
  }));
  ok('เปลี่ยนห้องแล้วตัวกรองเกมถูกล้าง ไม่ค้างเกมที่ห้องใหม่ไม่มี',
    st2.game === null || st2.game === '', st2);
  await p.close();
}

console.log('\n═══ 4) สวิตช์เปิด/ปิดเกมอยู่ในหน้าห้อง ไม่ใช่ในรายการห้อง (ข้อ 3.5) ═══');
{
  const { p, calls } = await open({}, '#/room/' + F.R1);
  const st = await p.evaluate(() => ({
    switches: document.querySelectorAll('[data-assign]').length,
    heading: document.getElementById('content').textContent.includes('เกมที่เปิดให้ห้องนี้'),
    note: document.getElementById('content').textContent.includes('ผลการเล่นที่บันทึกไว้แล้วไม่หายไปไหน'),
    checked: [...document.querySelectorAll('[data-assign]')].filter((x) => x.checked).length,
  }));
  ok('หน้าห้องมีสวิตช์ครบทุกเกมในทะเบียน', st.switches === 2, st);
  ok('มีหัวข้อกำกับและบอกว่าปิดแล้วข้อมูลไม่หาย', st.heading && st.note, st);
  ok('สวิตช์ติดตรงกับที่เปิดไว้จริง', st.checked === 2, st);

  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const yBefore = await p.evaluate(() => window.scrollY);
  await p.evaluate(() => document.querySelectorAll('[data-assign]')[1].click());
  await sleep(900);
  const after = await p.evaluate(() => ({ y: window.scrollY,
    still: !!document.querySelector('[data-assign]') }));
  const posted = calls.filter((c) => c[0] === 'POST' && c[1].includes('classroom_games'));
  ok('กดสวิตช์แล้วบันทึกลงฐานจริง', posted.length === 1 && posted[0][2].includes('"is_enabled":false'), posted);
  const reload = calls.filter((c) => c[0] === 'GET' && c[1].includes('classroom_games')
    && c[1].includes('classroom_id=in.'));
  ok('โหลดกลับเฉพาะห้องของฉัน ไม่ดึงทั้งตาราง', reload.length >= 1
    && !calls.some((c) => c[0] === 'GET' && /classroom_games\?select=\*$/.test(c[1])), reload);
  ok('หน้าไม่เด้งขึ้นบนสุดหลังกดสวิตช์', Math.abs(after.y - yBefore) < 80 && after.still, { yBefore, after });

  const inList = await p.evaluate(async () => {
    location.hash = '#/rooms';
    await new Promise((r) => setTimeout(r, 700));
    return document.querySelectorAll('[data-assign]').length;
  });
  ok('รายการห้องไม่มีสวิตช์ (ตามที่ครูสั่ง)', inList === 0, { inList });
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 5) ปุ่มลบนักเรียน — ยืนยันสองจังหวะ (ข้อ 3.2) ═══');
{
  const { p, calls } = await open({}, '#/room/' + F.R1);
  const has = await p.evaluate(() => ({
    del: document.querySelectorAll('[data-del-stu]').length,
    off: document.querySelectorAll('[data-off-stu]').length }));
  ok('มีปุ่มลบทุกแถว และปุ่มปิดการใช้งานยังอยู่ครบ', has.del === 2 && has.off === 2, has);

  await p.evaluate(() => document.querySelector('[data-del-stu]').click());
  await sleep(200);
  const box = await p.evaluate(() => {
    const tr = document.querySelector('[data-sedit]');
    return { open: !tr.classList.contains('hidden'), text: tr.textContent,
      go: !!tr.querySelector('[data-del-stu-go]') };
  });
  ok('จังหวะที่ 1: กางกล่องยืนยัน ยังไม่ลบ', box.open && box.go
    && !calls.some((c) => c[1].includes('rpc_delete_student')), box.text.slice(0, 80));
  ok('บอกว่าจะเสียอะไรบ้างเป็นตัวเลขจริง', /ความคืบหน้ารายเกม 2 รายการ/.test(box.text), box.text.slice(0, 300));
  ok('บอกใบรายงานผลและผลสมรรถนะที่จะหายด้วย',
    /ใบรายงานผล 1 ใบ/.test(box.text) && /ผลสมรรถนะรายด้าน 2 รายการ/.test(box.text), box.text.slice(0, 300));
  ok('แนะนำ "ปิดการใช้งาน" เป็นทางเลือกที่เบากว่า', box.text.includes('ปิดการใช้งาน'), '');
  ok('บอกว่าฐานเก็บสำเนาไว้ที่ deletion_log', box.text.includes('deletion_log'), '');

  await p.evaluate(() => document.querySelector('[data-del-stu-no]').click());
  await sleep(150);
  const closed = await p.evaluate(() => document.querySelector('[data-sedit]').classList.contains('hidden'));
  ok('กดยกเลิกแล้วกล่องหุบ ไม่มีอะไรถูกลบ', closed
    && !calls.some((c) => c[1].includes('rpc_delete_student')));

  await p.evaluate(() => document.querySelector('[data-del-stu]').click());
  await sleep(150);
  await p.evaluate(() => document.querySelector('[data-del-stu-go]').click());
  await sleep(900);
  const done = calls.filter((c) => c[1].includes('rpc_delete_student'));
  const flash = await p.evaluate(() => {
    const f = document.getElementById('flash');
    return { on: f.classList.contains('on'), text: f.textContent };
  });
  ok('จังหวะที่ 2: เรียก rpc_delete_student จริง พร้อม id ของคนที่เลือก',
    done.length === 1 && done[0][2].includes(F.S1), done);
  ok('ขึ้นข้อความยืนยันหลังลบ และข้อความไม่หายไปกับการวาดหน้าใหม่',
    flash.on && flash.text.includes('ลบ') && flash.text.includes('deletion_log'), flash);

  /* สลับโหมดแก้ไข↔ลบ ต้องไม่ต้องกดสองครั้ง */
  await p.evaluate(() => document.querySelector('[data-del-stu]').click());
  await sleep(120);
  await p.evaluate(() => document.querySelector('[data-edit-stu]').click());
  await sleep(120);
  const sw = await p.evaluate(() => {
    const tr = document.querySelector('[data-sedit]');
    return { open: !tr.classList.contains('hidden'), mode: tr.dataset.mode,
      isForm: !!tr.querySelector('[data-save-stu]') };
  });
  ok('กล่องลบเปิดอยู่แล้วกด "แก้ไข" → สลับเป็นฟอร์มแก้ไขทันที ไม่ใช่หุบเฉย ๆ',
    sw.open && sw.mode === 'edit' && sw.isForm, sw);
  await p.close();
}

console.log('\n═══ 6) ปุ่มลบห้อง — ปุ่มที่เคยกดแล้วเงียบ (ข้อ 3.2) ═══');
{
  const { p, calls } = await open({}, '#/rooms');
  await p.evaluate(() => document.querySelector('[data-del-room]').click());
  await sleep(200);
  const box = await p.evaluate(() => {
    const el = document.querySelector('[data-delbox]');
    return { open: !el.classList.contains('hidden'), text: el.textContent,
      go: !!el.querySelector('[data-del-room-go]') };
  });
  ok('จังหวะที่ 1: กางกล่องยืนยัน (เดิมกดแล้วไม่มีอะไรเกิดขึ้นเลย)', box.open && box.go, box);
  ok('บอกจำนวนนักเรียนและผลที่จะหายจริง',
    /นักเรียน.{0,10}2.{0,10}คน/.test(box.text) && box.text.includes('ใบรายงานผลจากเกม'), box.text.slice(0, 300));
  ok('แนะนำ "ปิดห้องชั่วคราว" เป็นทางเลือก', box.text.includes('ปิดห้องชั่วคราว'), '');
  ok('ยังไม่ลบจนกว่าจะกดยืนยัน', !calls.some((c) => c[1].includes('rpc_delete_classroom')));

  await p.evaluate(() => document.querySelector('[data-del-room-go]').click());
  await sleep(900);
  const done = calls.filter((c) => c[1].includes('rpc_delete_classroom'));
  const flash = await p.evaluate(() => document.getElementById('flash').textContent);
  ok('จังหวะที่ 2: เรียก rpc_delete_classroom จริง', done.length === 1, done);
  ok('ขึ้นข้อความยืนยันพร้อมจำนวนนักเรียนที่ลบไป', flash.includes('ลบห้อง') && flash.includes('2 คน'), flash);
  await p.close();
}

console.log('\n═══ 7) ยังไม่ได้รัน 55 — ต้องบอกครูให้รู้ว่าต้องทำอะไร ═══');
{
  const { p } = await open({ no55: true }, '#/rooms');
  await p.evaluate(() => document.querySelector('[data-del-room]').click());
  await sleep(150);
  await p.evaluate(() => document.querySelector('[data-del-room-go]').click());
  await sleep(700);
  const err = await p.evaluate(() => document.getElementById('err').textContent);
  ok('บอกชื่อไฟล์ SQL ที่ต้องรัน ไม่ใช่ปล่อยข้อความภาษาอังกฤษของฐานข้อมูล',
    err.includes('55_DELETE_ROOM_STUDENT.sql'), err);
  await p.close();
}

console.log('\n═══ 8) หน้า Admin เห็นห้องผู้เล่นทั่วไปแทน แต่ไม่แจกโค้ด ═══');
{
  const p = await b.newPage();
  const calls = await stub(p);
  await login(p);
  await p.goto(BASE + '/admin.html');
  await sleep(1200);
  const st = await p.evaluate(() => {
    const t = [...document.querySelectorAll('.tab')].find((x) => x.getAttribute('data-tab') === 'rooms');
    if (t) t.click();
    return new Promise((r) => setTimeout(() => r({
      wrap: (document.getElementById('rm-wrap') || {}).textContent || '',
      stat: (document.getElementById('rm-stat') || {}).textContent || '',
    }), 1200));
  });
  ok('หน้า Admin เห็นห้องผู้เล่นทั่วไป', st.wrap.includes('ผู้เล่นทั่วไป'), st.wrap.slice(0, 200));
  ok('แต่ไม่แสดงโค้ดห้อง', !st.wrap.includes('ZZZ999') && st.wrap.includes('ไม่แจกโค้ด'), st.wrap.slice(0, 300));
  ok('ไม่ติดป้าย "ยังไม่มีเจ้าของ" ให้ห้องนั้น', st.wrap.includes('ไม่ใช่ห้องของครู'), st.wrap.slice(0, 300));
  ok('สรุปยอดแยกให้เห็นว่ามีผู้เล่นทั่วไปกี่คน', st.stat.includes('ผู้เล่นทั่วไป'), st.stat);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}


console.log('\n═══ 9) สมรรถนะสามสถานะ — "ยังไม่มีหลักฐาน" ต้องไม่ปนกับ "เก็บอยู่แต่ยังสรุปไม่ได้" ═══');
/* ที่มา: ครูรายงาน 20 ส.ค. ว่าสมรรถนะภาค 1 ขึ้นแค่ด้านการคิดขั้นสูง ด้านอื่นเขียนว่า
   "ยังไม่มีเกมวัดด้านนี้" ทั้งที่เกมวัดอยู่ ต้นเหตุมีสองชั้น:
     ฝั่งเกม  — ด้านที่หลักฐานยังไม่พอ ไม่ส่งแถวขึ้นมาเลย (แก้ที่ภาค 1 V.7.99.44)
     ฝั่งเว็บ — ต่อให้ส่งขึ้นมา ก็ถูกกรอง level != null ทิ้งตั้งแต่ต้น (แก้ในรุ่นนี้)
   ชุดนี้คุมฝั่งเว็บ: เมื่อได้แถวที่ไม่มีระดับ ต้องแยกให้ครูเห็นว่าเป็นคนละเรื่องกัน */
{
  const partialDims = [
    { student_id: F.S1, classroom_id: F.R1, comp_code: 'HOT', game_name: 'กาญจนบุรี 2050',
      score: 72, level: 5, level_label: 'สามารถ', sub_scores: { ctc: 70 },
      evidence: 'scored', decided_by: 'system', system_score: 72, criteria_note: 'คะแนนรวม HOTS' },
    /* เกมส่งมาแล้ว แต่หลักฐานยังไม่พอสรุประดับ */
    { student_id: F.S1, classroom_id: F.R1, comp_code: 'CZ', game_name: 'กาญจนบุรี 2050',
      score: null, level: null, level_label: null, sub_scores: null,
      evidence: 'scored', decided_by: 'game', system_score: null,
      criteria_note: 'หลักฐานยังไม่พอสรุประดับ — มี 2 ชิ้น ต้องการอย่างน้อย 4 ชิ้น' },
    /* เกมไม่มีด่านที่วัดด้านนี้โดยตรง — บอกเหตุผล ไม่ใช่เงียบ */
    { student_id: F.S1, classroom_id: F.R1, comp_code: 'TW', game_name: 'กาญจนบุรี 2050',
      score: null, level: null, level_label: null, sub_scores: null,
      evidence: 'scored', decided_by: 'game', system_score: null,
      criteria_note: 'บทเรียนชุดนี้ยังไม่มีด่านที่วัดด้านนี้โดยตรง · มีเพียงหลักฐานประกอบ' },
  ];
  const p = await b.newPage();
  const calls = await stub(p, { compDims: partialDims });
  await login(p);
  await p.goto(BASE + '/teacher.html#/student/' + F.S1);
  await sleep(1600);
  /* อ่าน "ตารางสมรรถนะรวมข้ามเกม" ทีละแถว ไม่ใช่ข้อความทั้งหน้า
     เพราะการ์ดรายด้านด้านล่างแสดงเหตุผลอยู่ก่อนแล้ว ⇒ อ่านทั้งหน้าจะเขียวโดยไม่พิสูจน์อะไร
     จุดที่ครูเห็นปัญหาคือตารางนี้ ซึ่งเดิมกรองแถวที่ยังไม่มีระดับทิ้งตั้งแต่ต้น */
  const cross = await p.evaluate(() => {
    const h = [...document.querySelectorAll('h2.section-title')]
      .find((x) => /ภาพรวมทุกเกม/.test(x.textContent));
    if (!h) return null;
    const tb = h.nextElementSibling && h.nextElementSibling.querySelector('table.gol tbody');
    if (!tb) return null;
    const rows = {};
    [...tb.rows].forEach((tr) => { rows[(tr.cells[0] || {}).textContent.trim()] = tr.textContent; });
    return rows;
  });
  const txt = await p.evaluate(() => document.body.innerText);
  const rowOf = (frag) => {
    const k = cross && Object.keys(cross).find((x) => x.indexOf(frag) >= 0);
    return k ? cross[k] : null;
  };

  ok('ตารางสมรรถนะรวมข้ามเกมมีอยู่จริง (กันเคสหาไม่เจอแล้วข้อล่างเขียวหลอก)',
    !!cross && Object.keys(cross).length >= 6, cross && Object.keys(cross));
  ok('⭐ ด้านพลเมืองที่เกมส่งมาแล้วแต่หลักฐานยังไม่พอ — ต้องขึ้นว่ากำลังเก็บ',
    /กำลังเก็บ/.test(rowOf('พลเมือง') || ''), rowOf('พลเมือง'));
  ok('⭐ และต้องไม่ถูกเหมาว่า "ยังไม่มีหลักฐานจากเกมใดเลย" (นี่คือข้อที่ครูทักมา)',
    !/ยังไม่มีหลักฐานจากเกมใดเลย/.test(rowOf('พลเมือง') || ''), rowOf('พลเมือง'));
  ok('⭐ บอกเหตุผลที่ยังสรุปไม่ได้ในแถวนั้นเลย ครูไม่ต้องเลื่อนหา',
    /ต้องการอย่างน้อย 4 ชิ้น/.test(rowOf('พลเมือง') || ''), rowOf('พลเมือง'));
  ok('⭐ ด้านทีมที่เกมไม่ได้วัด ก็ต้องบอกเหตุผลในตารางนี้ ไม่ใช่เงียบ',
    /ยังไม่มีด่านที่วัดด้านนี้โดยตรง/.test(rowOf('ทีม') || ''), rowOf('ทีม'));
  ok('ด้านที่สรุประดับได้แล้ว ยังแสดงระดับตามปกติ — ของใหม่ต้องไม่กลบของเดิม',
    /ระดับ 5/.test(rowOf('คิดขั้นสูง') || ''), rowOf('คิดขั้นสูง'));
  ok('ด้านที่ไม่มีแถวจากเกมใดเลย ยังขึ้นข้อความเดิมของมัน (สามสถานะครบจริง)',
    /ยังไม่มีหลักฐานจากเกมใดเลย/.test(rowOf('สื่อสาร') || ''), rowOf('สื่อสาร'));
  ok('ห้ามขึ้นป้าย "ระดับ –" ให้แถวที่ยังไม่มีระดับ (ครูจะนึกว่าข้อมูลเสีย)',
    !/ระดับ\s*–/.test(txt), txt.slice(0, 700));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}


console.log('\n═══ 10) แท็บผลสัมฤทธิ์ — กราฟการกระจาย + กดดูรายชื่อ (V.1.6.21) ═══');
/* ครูสั่ง: "แท็บผลสัมฤทธิ์ควรแสดงกราฟของคะแนนผลสัมฤทธิ์รวม และมีตัวกรองเหมือนแท็บสมรรถนะ"

   ผมเลือก **กราฟการกระจาย** ไม่ใช่กราฟค่าเฉลี่ย โดยตั้งใจ:
   ห้องที่เด็กครึ่งหนึ่งได้ 90 อีกครึ่งได้ 30 กับห้องที่ทุกคนได้ 60
   มีค่าเฉลี่ยเท่ากันเป๊ะ แต่เป็นคนละสถานการณ์การสอนโดยสิ้นเชิง
   — อันแรกต้องแยกกลุ่มสอน อันหลังต้องทบทวนทั้งห้อง
   ⇒ ค่าเฉลี่ยตัวเดียวซ่อนสิ่งที่ครูต้องรู้ที่สุด */
{
  const p = await b.newPage();
  const calls = await stub(p, { achieve: F.achieveSpread });
  await login(p);
  await p.goto(BASE + '/teacher.html');
  await sleep(1600);

  const st = await p.evaluate(() => {
    const bar = document.querySelector('.lvbar');
    const keys = [...document.querySelectorAll('[data-ach-band]')].map((x) => ({
      band: x.getAttribute('data-ach-band'), txt: x.textContent.trim(), tag: x.tagName }));
    return { hasBar: !!bar, segs: bar ? bar.children.length : 0, keys };
  });
  ok('แท็บผลสัมฤทธิ์มีแถบการกระจาย ไม่ใช่แค่ค่าเฉลี่ยตัวเดียว', st.hasBar, st.segs);
  ok('⭐ กระจายเป็นหลายช่วงจริง (40% กับ 85% คนละช่วง)', st.segs >= 2, st.segs);
  ok('⭐ ช่วงคะแนนตรงกับที่ฐานใช้ (ไฟล์ 72) — หน้าครูกับหน้าสาธารณะต้องพูดตรงกัน',
    st.keys.some((k) => k.txt.includes('ยังไม่ถึงเกณฑ์ (ต่ำกว่า 50)'))
    && st.keys.some((k) => k.txt.includes('ดีเยี่ยม (80–100)')), st.keys.map((k) => k.txt));
  ok('⭐ เรียง "ยังไม่ถึงเกณฑ์" ขึ้นก่อน — ครูเปิดหน้านี้เพื่อหาคนที่ต้องช่วย',
    (st.keys[0] || {}).band === 'low', st.keys.map((k) => k.band));
  ok('ช่วงคะแนนกดได้ (เป็นปุ่ม ไม่ใช่ข้อความเฉย ๆ)',
    st.keys.length > 0 && st.keys.every((k) => k.tag === 'BUTTON'), st.keys.map((k) => k.tag));
  /* นักเรียนที่ครูปิดใช้งานต้องไม่โผล่ในการกระจาย — กติกาเดิมของทั้งระบบ
     (ตัวอย่างมี S2 ที่ถูกปิด ได้ 65% ซึ่งอยู่ช่วง "พอใช้") */
  ok('⭐ นักเรียนที่ถูกปิดใช้งานไม่ถูกนับในการกระจาย (กติกาเดิมของระบบ)',
    !st.keys.some((k) => k.txt.includes('พอใช้')), st.keys.map((k) => k.txt));

  await p.click('[data-ach-band="low"]');
  await sleep(400);
  const opened = await p.evaluate(() => {
    const box = document.querySelector('.achnames');
    return { shown: box && box.style.display !== 'none', txt: box ? box.textContent : '' };
  });
  ok('⭐⭐ กดที่ช่วงคะแนนแล้วเห็น**รายชื่อ** — สถิติที่กดไม่ได้ ครูต้องไปไล่หาเองอีกรอบ',
    opened.shown && /สมชาย|ใจดี/.test(opened.txt), opened.txt.slice(0, 160));
  ok('บอกเปอร์เซ็นต์รายคนด้วย ครูจะได้รู้ว่าห่างเกณฑ์แค่ไหน',
    /40(\.0)?%/.test(opened.txt), opened.txt.slice(0, 160));

  await p.click('[data-ach-band="low"]');
  await sleep(300);
  const closed = await p.evaluate(() => {
    const box = document.querySelector('.achnames');
    return box && box.style.display === 'none';
  });
  ok('กดซ้ำที่ช่วงเดิมแล้วปิด — ไม่ต้องหาปุ่มปิด', closed, closed);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 11) ตารางรายคนหน้าเดียว + แท็บเทียบเกณฑ์ (V.1.6.22) ═══');
/* ครูสั่ง: "เอาจุดเด่นของ Dashboard ภาค 1 และ ภาค 2 มาปรับใช้ใน Dashboard กลาง
   คือดูรายชื่อ ผลสัมฤทธิ์ สมรรถนะ ได้ในหน้าเดียว และมีแท็บเทียบเกณฑ์ ครู/เพื่อน/ตนเอง"

   ของเดิมแยกสองแท็บ ⇒ ครูที่อยากรู้ว่า "เด็กคนนี้เป็นยังไง"
   ต้องสลับแท็บไปมาแล้วจำเลขข้ามหน้าเอง */
{
  const p = await b.newPage();
  const calls = await stub(p);
  await login(p);
  await p.goto(BASE + '/teacher.html#/room/' + F.R1);
  await sleep(1800);

  const uni = await p.evaluate(() => {
    const t = document.querySelector('table.utable');
    if (!t) return { none: true };
    const rows = [...t.querySelectorAll('thead tr')].map((r) =>
      [...r.children].map((c) => ({ txt: c.textContent.trim(), span: c.getAttribute('colspan') })));
    const dots = [...t.querySelectorAll('.c6dot')].map((d) => ({
      txt: d.textContent.trim(), bg: getComputedStyle(d).backgroundColor }));
    return { none: false, headRows: rows.length, groups: rows[0] || [], subs: rows[1] || [],
      dots, bodyRows: t.querySelectorAll('tbody tr.urow').length };
  });
  ok('หน้าห้องมีตารางรวมรายคน', !uni.none, uni);
  ok('⭐ หัวตารางสองชั้น — ชั้นบนคือชื่อกลุ่ม (โครงเดียวกับภาค 2)',
    uni.headRows === 2, uni.headRows);
  ok('⭐ กลุ่ม "ผลสัมฤทธิ์" กับ "สมรรถนะหลัก" อยู่ตารางเดียวกัน ไม่ต้องสลับแท็บ',
    (uni.groups || []).some((g) => /ผลสัมฤทธิ์|คะแนนเก็บ/.test(g.txt))
    && (uni.groups || []).some((g) => /สมรรถนะหลัก/.test(g.txt)), uni.groups);
  ok('สมรรถนะครบ 6 คอลัมน์',
    (uni.groups || []).some((g) => Number(g.span) === 6), uni.groups.map((g) => g.span));
  ok('มีแถวนักเรียนจริง', uni.bodyRows >= 1, uni.bodyRows);
  ok('⭐ ระดับสมรรถนะแสดงเป็นวงกลมมีสีประจำด้าน (จุดเด่นของภาค 1 ที่ครูชม)',
    uni.dots.length >= 1 && uni.dots.every((d) => /rgb/.test(d.bg)), uni.dots);

  /* แตะแถว → กางรายละเอียดตรงนั้น ไม่เด้งไปหน้าใหม่ */
  const before = await p.evaluate(() => location.hash);
  await p.click('tr.urow');
  await sleep(500);
  const opened = await p.evaluate(() => {
    const det = document.querySelector('[data-udet]:not(.hidden)');
    return { open: !!det, txt: det ? det.textContent.slice(0, 120) : '', hash: location.hash };
  });
  ok('⭐⭐ แตะแถวแล้วกางรายละเอียดในที่เดิม', opened.open, opened.txt);
  ok('ไม่เด้งออกจากหน้าห้อง — ครูยังเทียบกับเพื่อนในห้องได้',
    opened.hash === before, { before, after: opened.hash });

  await p.click('tr.urow');
  await sleep(400);
  const closed = await p.evaluate(() => !document.querySelector('[data-udet]:not(.hidden)'));
  ok('แตะซ้ำแล้วปิด', closed, closed);

  /* แท็บเทียบเกณฑ์ */
  await p.click('[data-tab="cmp"]');
  await sleep(900);
  const cmp = await p.evaluate(() => {
    const t = document.querySelector('table.cmptable');
    if (!t) return { none: true };
    const chips = [...t.querySelectorAll('.cmpchip')].length;
    const sts = [...t.querySelectorAll('.cmpst')].map((x) => x.textContent.trim());
    /* ⚠️ ต้องเจาะคำอธิบาย "ของตารางเทียบเกณฑ์" ไม่ใช่ตัวแรกที่เจอในหน้า
       เพราะตารางรวมด้านบนก็มี .panel-note ของตัวเอง (เจอจริงตอนเขียนชุดนี้) */
    let note = '';
    for (let el = t.parentElement; el; el = el.nextElementSibling) {
      const nt = el.querySelector && el.querySelector('.panel-note');
      if (nt) { note = nt.textContent; break; }
      if (el.classList && el.classList.contains('panel-note')) { note = el.textContent; break; }
    }
    return { none: false, chips, sts: [...new Set(sts)], note };
  });
  ok('⭐ มีแท็บเทียบเกณฑ์ (ครู/เพื่อน/ตนเอง) ตามที่ครูขอ', !cmp.none, cmp);
  ok('แต่ละช่องมีสี่ชิป — เกม · ครู · เพื่อน · ตนเอง',
    !cmp.none && cmp.chips >= 4 && cmp.chips % 4 === 0, cmp.chips);
  ok('⭐ บอกสถานะการสอดคล้อง ไม่ใช่วางตัวเลขเรียงกันเฉย ๆ',
    !cmp.none && cmp.sts.length > 0, cmp.sts);
  ok('⭐ แหล่งเดียวต้องไม่ขึ้นว่า "สอดคล้อง" — ไม่มีอะไรให้สอดคล้องด้วย',
    !cmp.sts.includes('สอดคล้อง') || cmp.sts.some((x) => /แหล่งเดียว|ยังไม่มีหลักฐาน/.test(x)),
    cmp.sts);
  ok('อธิบายว่า – แปลว่าไม่มีข้อมูล ไม่ใช่ศูนย์', /ไม่ใช่ศูนย์/.test(cmp.note), cmp.note.slice(0, 140));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('═══ 10) [V.1.6.34 · D2] แท็บข้อมูลวิจัย ═══');
{
  const { p, calls } = await open({}, '#/room/' + F.R1);
  await p.click('[data-tab="research"]');
  await sleep(300);
  const rs = await p.evaluate(() => {
    const main = document.getElementById('page-main').textContent;
    const covRows = [...document.querySelectorAll('tr.rs-ok, tr.rs-wait, tr.rs-none')].length;
    return {
      main,
      covRows,
      tab: !!document.querySelector('[data-tab="research"][aria-selected="true"]'),
      subst: main.includes('▲'),
    };
  });
  ok('แท็บ 🔬 ข้อมูลวิจัย เปิดได้และ aria-selected ตาม', rs.tab, '');
  ok('ตารางความครอบคลุมมีครบ 22 องค์ประกอบ (กรอบ STD-008)', rs.covRows === 22, rs.covRows);
  ok('⛔ ไม่มีคำต้องห้าม "ครบทุกด้านย่อย" (ท้าย STD-008 — ทะเบียนยังเป็นร่าง)',
    !rs.main.includes('ครบทุกด้านย่อย'), '');
  ok('ก2: ช่องที่ยังไม่มีผล บอกเหตุ ไม่ใช่ช่องว่างเงียบ',
    /ยังไม่มีผลรายองค์ส่งขึ้นมา|ไม่ได้แปลว่านักเรียนทำไม่ได้/.test(rs.main), '');
  ok('[V.1.6.39] เกณฑ์ผ่านประกาศตรง ๆ ว่าครูเคาะแล้ว (ระดับ 5 · 7 ก.ย.) และช่อง B4 ยังบอกว่ารอ',
    rs.main.includes('เกณฑ์ผ่าน = ระดับ 5') && rs.main.includes('ครูเคาะ 7 ก.ย.') && /B4/.test(rs.main), '');
  ok('[V.1.6.39] ไม่มีหมายเหตุหมดอายุค้าง (รอครูเคาะ · รอผลสำรวจ 94 · 29 ส.ค.)',
    !/รอครูเคาะ|รอผลสำรวจ|ฐานจริง 29 ส\.ค\.|ร่าง 29 ส\.ค\./.test(rs.main), '');
  ok('รอบเล่นซ้ำถูกกำกับว่า "ไม่ใช่ตัววัดการเรียนรู้" (บทเรียนไทล์ที่ถูกถอด)',
    rs.main.includes('ไม่ใช่ตัววัดการเรียนรู้'), '');
  ok('ธงชวนดูใช้ภาษา "ชวนช่วย" ไม่ใช่ตัดสิทธิ์', /ชวน(ครูเข้าไป)?ดู|ไม่ใช้ตัดสิทธิ์/.test(rs.main), '');
  ok('คีย์ด้านย่อยจากเกมถูกจับคู่เข้ากรอบ (fixtures: ctc→ht1 · sm-a→sm1 ต้องมีเลขคน)',
    await p.evaluate(() => {
      const rows = [...document.querySelectorAll('tr.rs-ok, tr.rs-wait, tr.rs-none')];
      const cell = (code) => { const r = rows.find((x) => x.textContent.includes(code)); return r ? r.lastElementChild.textContent : ''; };
      return /1\/\d+/.test(cell('ht1')) && /1\/\d+/.test(cell('sm1'));
    }), '');
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 12) [V.1.6.36 · ใบ HUB] ตัวหารปนยุคฝั่งหน้าครู — ป้าย · ตัวหารรายคน · ส่งออก · เกียรติบัตร ═══');
{
  /* ต้องฉีด students ด้วย — ชุดกลาง S2 ปิดใช้งาน แถว 130 ของเขาจะถูก achRows กรองทิ้ง
     (พฤติกรรมถูก: เด็กปิดใช้งานไม่ควรขับป้าย — เทสต์แรกที่ลืมข้อนี้แดง 4 ข้อพร้อมกัน) */
  const { p, calls } = await open({ achieve: F.achieveMixed, students: F.studentsAllOn });

  /* (1) การ์ดสรุปหน้าแรก: ป้ายขึ้น + ระบุเฉพาะเกมที่ปนจริง */
  const warn = await p.evaluate(() =>
    [...document.querySelectorAll('#content .note-warn')].map((e) => e.textContent).join(' || '));
  ok('การ์ดสรุปขึ้นป้ายสองเกณฑ์ + บอกค่าเต็มทั้งสอง (130 และ 160)',
    warn.includes('สองเกณฑ์คะแนนปนกัน') && warn.includes('เต็ม 130 และ 160'), warn.slice(0, 120));
  ok('ป้ายระบุเฉพาะเกมที่ปน — เกม ข (เต็มเดียว) ต้องไม่ถูกพาดพิง',
    warn.includes('กาญจนบุรี 2050') && !warn.includes('ภาค 2'), warn.slice(0, 120));

  /* (2) กดช่วงคะแนน → % รายคนพกตัวหาร (แบบ :2881) */
  await p.click('[data-ach-band]');
  await sleep(250);
  const names = await p.evaluate(() => {
    const box = document.querySelector('[data-ach-names]');
    return box ? box.textContent : '';
  });
  ok('รายชื่อรายคนโชว์ตัวหารข้าง % (มี "(เต็ม")', names.includes('(เต็ม '), names.slice(0, 100));

  /* (3) แท็บเกียรติบัตร: ach80 ถูกปิด + สลับกลับ finish + บอกเหตุผล */
  await p.goto(BASE + '/teacher.html#/room/' + F.R1);
  await p.waitForFunction(() => !document.querySelector('#content .loading'), null, { timeout: 20000 });
  await sleep(300);
  await p.click('[data-tab="cert"]');
  await sleep(400);
  const cert = await p.evaluate(() => {
    const sel = document.querySelector('[data-cert-rule]');
    const o80 = sel ? [...sel.options].find((o) => o.value === 'ach80') : null;
    return { has: !!sel, off: o80 ? o80.disabled : null, cur: sel ? sel.value : null,
      note: [...document.querySelectorAll('#content .note-warn')].map((e) => e.textContent).join(' ') };
  });
  ok('ตัวเลือกเกณฑ์ 80 ถูก disabled จริง (ไม่ใช่แค่เตือน)', cert.has && cert.off === true, cert);
  ok('เกณฑ์ที่ใช้อยู่ถอยกลับค่าเริ่มต้น finish ไม่ค้างที่ 80', cert.cur === 'finish', cert.cur);
  ok('มีกล่องเหตุผล: ปิดชั่วคราว + ดิบเท่ากันได้ใบต่างกัน + ทางออก',
    cert.note.includes('ปิดชั่วคราว') && cert.note.includes('คะแนนดิบเท่ากัน')
    && cert.note.includes('เปิดหน้าห้องเรียนในเกม'), cert.note.slice(0, 150));

  /* (4) ไฟล์ส่งออกผลสัมฤทธิ์พกคะแนนดิบ+คะแนนเต็ม */
  await p.evaluate(() => {
    window.__blob = null;
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { window.__blob = b; return orig(b); };
  });
  await p.click('[data-export-room="' + F.R1 + '|ach"]');
  await sleep(600);
  const csv = await p.evaluate(async () => (window.__blob ? await window.__blob.text() : ''));
  ok('CSV มีหัว "คะแนนดิบ" และ "คะแนนเต็ม"', csv.includes('คะแนนดิบ') && csv.includes('คะแนนเต็ม'), csv.split('\n')[0]);
  ok('CSV เห็นตัวหารทั้งสองยุคจริง (160 และ 130 ในคอลัมน์)', csv.includes('160') && csv.includes('130'), '');
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}
{
  /* ตัวคุมลบ (negative control): สเกลเดียว → ไม่มีป้าย · ach80 เลือกได้ตามปกติ
     — กันยามแดงตลอดกาล (ยามที่ไม่เคยเขียวคือยามที่ไม่มีใครเชื่อ) */
  const { p } = await open({ achieve: F.achieveSpread });
  const home = await p.evaluate(() => document.getElementById('content').textContent);
  ok('สเกลเดียว: ไม่มีป้ายสองเกณฑ์', !home.includes('สองเกณฑ์คะแนนปนกัน'), '');
  await p.goto(BASE + '/teacher.html#/room/' + F.R1);
  await p.waitForFunction(() => !document.querySelector('#content .loading'), null, { timeout: 20000 });
  await sleep(300);
  await p.click('[data-tab="cert"]');
  await sleep(400);
  const st = await p.evaluate(() => {
    const sel = document.querySelector('[data-cert-rule]');
    const o80 = sel ? [...sel.options].find((o) => o.value === 'ach80') : null;
    return { off: o80 ? o80.disabled : null, txt: o80 ? o80.textContent : '' };
  });
  ok('สเกลเดียว: เกณฑ์ 80 เปิดใช้ได้ ไม่ติดคำ "ปิดชั่วคราว"',
    st.off === false && !st.txt.includes('ปิดชั่วคราว'), st);
  await p.close();
}

console.log('\n═══ 13) [V.1.6.39 · ใบ HUB 7 ก.ย. ×3] หน้าวิจัย: คีย์ HT จริง · ถอน SM-C · %รายระดับ+ฐาน · การ์ด 70% · ตัวกรองห้อง ═══');
{
  const { p, calls } = await open({ compDims: F.compDimsRS }, '#/room/' + F.R1);
  await p.click('[data-tab="research"]');
  await sleep(350);
  const st = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('tr.rs-ok, tr.rs-wait, tr.rs-none')];
    const cell = (code) => { const r = rows.find((x) => x.textContent.includes(code)); return r ? r.textContent : ''; };
    const lvTable = [...document.querySelectorAll('table.gol.small')].map((tb) => tb.textContent).join(' || ');
    return { ht1: cell('ht1'), cz1: cell('cz1'), sm2: cell('sm2'), tw1: cell('tw1'), cm2: cell('cm2'),
      lv: lvTable, main: document.getElementById('page-main').textContent,
      pick: !!document.getElementById('room-pick'), jump: !!document.querySelector('#room-pick[data-room-jump]'),
      selVal: (document.getElementById('room-pick') || {}).value };
  });
  ok('🔴 คีย์ HT-CTC (มีคำนำหน้า) ถูกนับเข้า ht1 แล้ว — ไม่ใช่ศูนย์', /1\/\d+/.test(st.ht1), st.ht1.slice(-30));
  ok('cz1 = ✅ แปลงเป็นระดับได้ (CZ-B → cz1) และมีเลขคน', st.cz1.includes('แปลงเป็นระดับได้') && /1\/\d+/.test(st.cz1), st.cz1.slice(-40));
  ok('⛔ sm2 ไม่นับ SM-C อีกแล้ว (จ2 ปฏิเสธ) — ต้องว่างอย่างซื่อสัตย์', st.sm2.includes('ยังไม่มีผลรายองค์') && st.sm2.includes('ปฏิเสธ'), st.sm2.slice(-60));
  ok('tw1 สถานะ 🟠 มีหลักฐานแต่ยังไม่มีเกณฑ์ (ไม่ใช่ 🟢)', st.tw1.includes('ยังไม่มีเกณฑ์แปลงเป็นคะแนน') && !st.tw1.includes('🟢'), st.tw1.slice(0, 60));
  ok('cm2 = 🔴 ยังไม่มีเครื่องมือวัด + บอกว่าคีย์ CM-B ไหลจริง รอ [PLAN] (PLAN 23:2x)', st.cm2.includes('ยังไม่มีเครื่องมือวัด') && st.cm2.includes('รอ [PLAN]'), '');
  ok('[V.1.6.40] ทะเบียนตรึง ✅6 · 🔴4 ตาม PLAN 23:2x (ห้ามใช้เลขชุดอื่น)', await p.evaluate(() => ({ ok: document.querySelectorAll('tr.rs-ok').length, none: document.querySelectorAll('tr.rs-none').length })).then((c) => c.ok === 6 && c.none === 4), await p.evaluate(() => [document.querySelectorAll('tr.rs-ok').length, document.querySelectorAll('tr.rs-none').length]));
  ok('ตารางระดับมีคอลัมน์ ฐาน + ผ่านระดับ 5 + ไม่มีผลด้านนี้', /ฐาน/.test(st.lv) && /ผ่านระดับ 5/.test(st.lv) && /ไม่มีผลด้านนี้/.test(st.lv), '');
  ok('⛔ TW ทั้งฐานสรุปไม่ได้ → ทั้งแถว "หลักฐานไม่เพียงพอ" ไม่พิมพ์ 0.0%', st.lv.includes('หลักฐานไม่เพียงพอ') && !st.lv.includes('0 (0.0%)'), '');
  ok('ฐาน < 5 → ไม่แสดง % (fixtures 1 คน) แต่มีเศษ/ส่วน', !/\(\d+\.\d%\)/.test(st.lv) && /1\/1/.test(st.lv), st.lv.slice(0, 120));
  ok('[V.1.6.40] การ์ดผลสัมฤทธิ์ = แบบทดสอบหลังเรียน (ด่าน 8 เต็ม 30) ไม่ใช่คะแนนเก็บ 130', st.main.includes('ผลสัมฤทธิ์จากแบบทดสอบหลังเรียน') && !st.main.includes('ทำแบบทดสอบได้ 70% ขึ้นไป'), '');
  ok('[V.1.6.40] จัดหน้า 3 ชั้น: สรุปอยู่บนสุด → รายคน → ตาราง 22 องค์พับใน <details>', (() => { const a = st.main.indexOf('ผลสัมฤทธิ์จากแบบทดสอบหลังเรียน'), b = st.main.indexOf('ระดับพร้อมจำนวนหลักฐาน'), c = st.main.indexOf('ความครอบคลุม 22'); return a > -1 && a < b && b < c; })(), '');
  ok('[V.1.6.40] ตาราง 22 องค์อยู่ใน details (พับได้ ไม่หาย)', await p.evaluate(() => !!document.querySelector('details.rs-ref table.gol')), '');
  ok('หัวตารางยึด Rubric ฉบับที่ ๓', st.main.includes('Rubric ฉบับที่ ๓'), '');
  ok('ตัวกรองห้องโผล่บนแท็บวิจัยของหน้าห้อง (แบบเด้ง) และเลือกห้องปัจจุบันอยู่', st.pick && st.jump && st.selVal === F.R1, st.selVal);
  await p.click('[data-tab="ach"]'); await sleep(250);
  ok('แท็บอื่นของหน้าห้องไม่มีช่องเลือกห้อง (มติเดิมคงอยู่)', await p.evaluate(() => !document.getElementById('room-pick')), '');
  await p.click('[data-tab="research"]'); await sleep(250);
  await p.selectOption('#room-pick', F.R2); await sleep(400);
  ok('เลือกห้องอื่นจากแท็บวิจัย → เด้งไปหน้าห้องนั้น (แท็บค้างเดิม)', await p.evaluate(() => location.hash) === '#/room/' + F.R2, await p.evaluate(() => location.hash));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 13b) [V.1.6.43] ตารางวิจัยรายระดับ: ผ่านระดับ 5 เด่น · ป้ายสีระดับ · ตารางรายเกมไม่ตัด 6 แถว ═══');
{
  const { p, calls } = await open({ compDims: F.compDimsRS, students: F.studentsAllOn }, '#/room/' + F.R1);
  await p.click('[data-tab="research"]'); await sleep(900);
  const hd = await p.evaluate(() => Array.from(document.querySelectorAll('table.rs-lv thead th')).map((x) => x.textContent.trim()));
  ok('⭐ "ผ่านระดับ 5" อยู่ถัดจากฐาน (คอลัมน์ 3) — ตัวเลขที่เล่มใช้ต้องเด่นสุด', hd[2] === 'ผ่านระดับ 5', hd);
  const pills = await p.evaluate(() => document.querySelectorAll('table.rs-lv tbody .lvpill').length);
  ok('ตัวเลขรายระดับเป็นป้ายสีตามระดับ (คงเลขในป้าย)', pills > 0, pills);
  const zeroColored = await p.evaluate(() => Array.from(document.querySelectorAll('table.rs-lv tbody td')).filter((td) => /ยังไม่มีผล|หลักฐานไม่เพียงพอ/.test(td.textContent) && td.querySelector('.lvpill')).length);
  ok('ช่องว่าง/หลักฐานไม่เพียงพอ ไม่มีป้ายสีระดับ (ว่าง ≠ ระดับต่ำ)', zeroColored === 0, zeroColored);
  /* [V.1.6.43 · ใบ AUDIT 13:3x ข้อ 4] เลือกเกม → ส่วนสมรรถนะตามกรอบต้องบอกว่าแยกเกมไม่ได้ ไม่วาดเลขรวมทุกเกมเงียบ ๆ */
  await p.click('[data-tab="comp"]'); await sleep(500);
  const gpSel = await p.evaluate(() => { const s = document.getElementById('game-pick'); if (!s) return 'no-picker'; const o = Array.from(s.options).find((x) => x.value); if (!o) return 'no-option'; s.value = o.value; s.dispatchEvent(new Event('change')); return 'ok'; });
  await sleep(700);
  const cmpTxt = await p.evaluate(() => (document.getElementById('content') || {}).textContent || '');
  ok('⭐ [.43] เลือกเกมแล้ว ส่วนสมรรถนะตามกรอบบอกว่า "ยังแยกรายเกมไม่ได้" (ไม่วาดเลขรวมทุกเกมเงียบ ๆ) — ' + gpSel, gpSel !== 'ok' || /ยังแยกรายเกมไม่ได้/.test(cmpTxt), cmpTxt.slice(0, 160));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 14) [V.1.6.40] ปุ่มอัปเดตผลจากเกม (this.TIMEOUT) · ผลสัมฤทธิ์ = คะแนนสอบครั้งแรก ═══');
{
  const { p, calls } = await open({ achieve: F.achieveBossFirst, events: F.eventsBoss, students: F.studentsBoss3 }, '#/room/' + F.R1);
  /* (1) _ensureFrame ของจริงต้องได้ iframe — เดิม this.TIMEOUT undefined ⇒ ปฏิเสธใน 0 ms ทุกครั้ง */
  const fr = await p.evaluate(async () => {
    const t0 = performance.now();
    try { const f = await window.GameRefresh._ensureFrame(location.origin + '/support.html'); return { ok: f && f.tagName === 'IFRAME', ms: Math.round(performance.now() - t0), to: window.GameRefresh.FRAME_TIMEOUT }; }
    catch (e) { return { ok: false, err: String(e) }; }
  });
  ok('🔴 _ensureFrame เปิด iframe จริงสำเร็จ (บั๊ก this.TIMEOUT ตั้งแต่ .36 ปิดแล้ว)', fr.ok === true, fr);
  ok('FRAME_TIMEOUT เป็นตัวเลข ≥ 15000 (เครื่องครูช้ากว่าเครื่องพัฒนา)', typeof fr.to === 'number' && fr.to >= 15000, fr.to);
  /* ตัวคุมลบ: ถ้าเพดานเป็น 0 ต้องปฏิเสธจริง (พิสูจน์ว่าเทสต์ข้อบนแดงได้) */
  const neg = await p.evaluate(async () => {
    const keep = window.GameRefresh.FRAME_TIMEOUT; window.GameRefresh.FRAME_TIMEOUT = 1; window.GameRefresh.cleanup();
    try { await window.GameRefresh._ensureFrame(location.origin + '/standards.html?x=' + Date.now()); return 'resolved'; }
    catch (e) { return 'rejected'; } finally { window.GameRefresh.FRAME_TIMEOUT = keep; window.GameRefresh.cleanup(); }
  });
  ok('ตัวคุมลบ: เพดาน 1 ms → ปฏิเสธ (ยามไม่ได้เขียวตลอดกาล)', neg === 'rejected', neg);
  /* (2) กดปุ่มกับเกมที่ URL ข้ามโดเมน → เหตุผลต้องอ่านออก ไม่ใช่ 'อัปเดตไม่สำเร็จ' ลอย ๆ */
  await p.click('#gr-go'); await sleep(1500);
  const msg = await p.evaluate(() => (document.getElementById('gr-msg') || {}).textContent || '');
  ok('เหตุผลที่ล้มบอกขั้นที่ล้ม (เกมข้ามโดเมน → ข้อความบอกเหตุ) ไม่ใช่ "อัปเดตไม่สำเร็จ" ลอย ๆ', (msg.includes('ยังไม่ได้ตั้งที่อยู่หน้าครูของเกม') || msg.includes('ยังไม่ได้เปิดเกมที่รองรับ')) && !/อัปเดตไม่สำเร็จ\s*$/.test(msg.trim()), msg.slice(0, 160));
  /* (3) [V.1.6.42 · ใบ AUDIT/PLAN 8 ก.ย.] การ์ดผลสัมฤทธิ์อ่าน unit_scores._boss_first ช่องเดียว — ไม่อ่าน events ไม่คำนวณเอง */
  await p.click('[data-tab="research"]'); await sleep(900);
  const bc = await p.evaluate(() => (document.querySelector('[id^="rs-boss70-"]') || {}).textContent || '');
  ok('⭐ อ่านจากช่องที่เกมส่ง: ผ่าน 1 จาก 2 คนที่มีคะแนนในช่อง (S1 = 25 ผ่าน · S5B ใบ .80 ครั้งแรก 0 จริง = นับเป็น 0 ไม่ผ่าน) — S2 ใบเก่าไม่มีช่อง ไม่ถูกเดา', /1 คน ของผู้ที่มีคะแนนในช่อง \(1 จาก 2 คน/.test(bc), bc.slice(0, 300));
  ok('⭐ [.45 · ครูสั่ง ข้อ 1] ตัวหลัก = ของทั้งห้อง ไม่ตัดใคร: 20.0% (1 จาก 5 คน) — สองตัวหารขึ้นคู่กันเสมอ', /20\.0% ของทั้งห้อง \(1 จาก 5 คน — ไม่ตัดใคร\)/.test(bc), bc.slice(0, 300));
  ok('⭐ [.45 · ครูสั่ง ข้อ 1] บรรทัด "ยังไม่มีผลสอบ n คน" ติดกัน (5 − 2 = 3) และป้ายบอกว่าเกมใช้ค่าสูงสุดของแถวครั้งที่ 1 (P-CODE-12)', /ยังไม่มีผลสอบ 3 คน/.test(bc) && /คะแนนสูงสุด/.test(bc) && !/คนที่มีคะแนนสอบครั้งแรก/.test(bc), bc.slice(0, 400));
  ok('⭐ ใบเก่าก่อน .79 ขึ้น "รอใบผลรุ่นใหม่ 1 คน" — ไม่ถอยไปคำนวณจาก events (กติกา AUDIT)', /รอใบผลรุ่นใหม่ 1 คน/.test(bc), bc.slice(0, 300));
  ok('⭐ ใบภาค 2 ที่มี _boss_first 30 ไม่ถูกนับ (ถ้าหลุดจะเป็น 2 จาก 2)', !/2 จาก 2/.test(bc), bc.slice(0, 200));
  ok('การ์ดไม่ยิงอ่าน events อีก (เลิกมีสามที่คิดเลขเดียวกัน)', !calls.some((c) => /\/rest\/v1\/events\?kind=eq\.boss/.test(c.url || String(c))), calls.filter((c) => /events/.test(c.url || String(c))).length);
  ok('บรรทัด "ยังไม่ได้ทำแบบทดสอบ" ติดตัวเลข', /ยังไม่ได้ทำแบบทดสอบ 0 คน จาก 5 คนในห้อง/.test(bc), bc.slice(0, 300));
  ok('⭐ [.44 · คำชี้ขาด AUDIT] ใบ .79 ที่ _boss_first = 0 ∧ _boss = 21 (S3B) + ใบ .80 ที่ไม่มีคีย์ (S4B) → "ไม่ทราบคะแนนครั้งที่ 1 · 2 คน (ยืนยันจาก events…)" ไม่เข้าฐาน', /ไม่ทราบคะแนนครั้งที่ 1 · 2 คน \(ยืนยันจาก events/.test(bc), bc.slice(0, 400));
  ok('⭐ [.44] ถ้อยคำบนจอไม่มีคำว่า "ได้ 0"/"ระบุครั้งแรก 0" (ตามคำชี้ขาด)', !/ระบุครั้งแรก 0|ได้ 0/.test(bc), bc.slice(0, 400));
  ok('⭐ [.44] ใบ .80 ไม่มีคีย์ ไม่ถูกจัดเป็น "รอใบผลรุ่นใหม่" (ยังคงเป็น 1 คน = S2 ใบ .76)', /รอใบผลรุ่นใหม่ 1 คน/.test(bc), bc.slice(0, 400));
  ok('ฐาน < 5 → แสดงจำนวน ไม่แสดง % (ฝั่งผู้มีคะแนน n=2) · ฝั่งทั้งห้อง n=5 แสดง % ได้ · หัวการ์ดบอกว่าเกมเป็นผู้คิด', /1 คน ของผู้ที่มีคะแนนในช่อง \(1 จาก 2 คน — ฐานต่ำกว่า 5 คน ไม่แสดงร้อยละ\)/.test(bc) && /เกมเป็นผู้คิด/.test(bc) && (bc.match(/\d+\.\d%/g) || []).length === 1, bc.slice(0, 160));  /* (70%) ในเชิงอรรถไม่ใช่ค่าเฉลี่ย — ค่าเฉลี่ยมีทศนิยมเสมอ */
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 15) [V.1.6.45] ครูสั่ง 4 ข้อ 8 ก.ย. เย็น: ช่องเพื่อนอ่านคีย์จริง · เกียรติบัตร space-between · หน้าวิจัย 1:2 + ชื่อด้านสั้น ═══');
{
  const { p, calls } = await open({ events: F.eventsPeer, compDims: F.compDimsRS, students: F.studentsAllOn }, '#/room/' + F.R1);
  await p.click('[data-tab="cmp"]'); await sleep(900);
  const peer = await p.evaluate((sid) => {
    const a = document.querySelector('table.cmptable a[href="#/student/' + sid + '"]'); const tr = a && a.closest('tr');
    if (!tr) return { none: true };
    const heads = Array.from(document.querySelectorAll('table.cmptable thead tr:first-child th')).slice(2).map((x) => x.textContent.trim());
    const cells = Array.from(tr.querySelectorAll('td')).slice(2);
    const byDim = {};
    cells.forEach((td, k) => {
      const chip = Array.from(td.querySelectorAll('.cmpchip')).find((c) => /^เพื่อน:/.test(c.getAttribute('title') || ''));
      byDim[heads[k]] = chip ? chip.getAttribute('title') : null;
    });
    const note = (document.querySelector('.cmp-peer-note') || {}).textContent || '';
    return { none: false, byDim, note };
  }, F.S1);
  ok('⭐ [ข้อ 2] ช่องเพื่อน "ทำงานเป็นทีม" อ่าน peerTeam/peerRole/peerListen จากเพื่อน 2 คน → เฉลี่ย 3.33 → ระดับ 5 (เดิมว่างเพราะหา raw.TW)',
    !peer.none && peer.byDim['ทำงานเป็นทีม'] === 'เพื่อน: ระดับ 5', peer.byDim);
  ok('⭐ [ข้อ 2] ด้านที่มีคีย์ V.7.80 (peerHT = 2) → ระดับ 4 · ด้านที่ไม่มีคีย์ (SM/CM/CZ/NS) = – ไม่เดา',
    !peer.none && peer.byDim['คิดขั้นสูง'] === 'เพื่อน: ระดับ 4'
      && ['จัดการตนเอง', 'สื่อสาร', 'พลเมือง', 'ธรรมชาติ'].every((k) => /ยังไม่มีข้อมูล/.test(peer.byDim[k] || 'ยังไม่มีข้อมูล')), peer.byDim);
  ok('[ข้อ 2] ป้ายบอกว่าเพื่อนประเมินทีม 3 ข้อทุกรุ่น อีก 5 ด้านเฉพาะ V.7.80 ขึ้นไป และช่องว่างไม่ใช่ศูนย์', /ทำงานเป็นทีม 3 ข้อ/.test(peer.note) && /V\.7\.80/.test(peer.note) && /ไม่ใช่ศูนย์/.test(peer.note), peer.note.slice(0, 160));
  await p.click('[data-tab="research"]'); await sleep(900);
  const rs = await p.evaluate(() => {
    const top = document.querySelector('.rs-top');
    const cols = top ? getComputedStyle(top).gridTemplateColumns.trim().split(/\s+/) : [];
    const first = Array.from(document.querySelectorAll('table.rs-lv tbody tr td:first-child')).map((x) => x.textContent.trim());
    return { has: !!top, cols, w: window.innerWidth, first };
  });
  ok('⭐ [ข้อ 4] ชั้นสรุปหน้าวิจัยเป็น 2 คอลัมน์ (การ์ด 1 ส่วน · ตาราง 2 ส่วน) บนจอกว้าง', rs.has && rs.cols.length === 2 && parseFloat(rs.cols[1]) > parseFloat(rs.cols[0]) * 1.5, rs);
  ok('[ข้อ 4] คอลัมน์ "ด้าน" ใช้ชื่อสั้น (C6_SHORT) ไม่ใช่ชื่อเต็ม', rs.first.length > 0 && rs.first.every((x) => x.length <= 14), rs.first);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}
{
  /* [ข้อ 3] เกียรติบัตรเปิดหน้าต่างใหม่ด้วย document.write — ตรวจที่ซอร์สสตริง CSS โดยตรง */
  const src = fs.readFileSync(new URL('../public/teacher.html', import.meta.url), 'utf8');
  ok('⭐ [ข้อ 3] .in ของเกียรติบัตรมี justify-content:space-between และ .sign เลิก margin-top:auto (ที่ว่างไม่กองเป็นก้อนเดียว)',
    /\.in\{[^}]*justify-content:space-between[^}]*\}/.test(src) && !/\.sign\{margin-top:auto/.test(src) && /\.sign\{margin-top:0/.test(src));
}

console.log('\n═══ 16) [V.1.6.46] การ์ดคู่ ครั้งแรก→ครั้งสุดท้าย (view เดียว) · ป้ายผลสัมฤทธิ์ตามรุ่นใบ .82 ═══');
{
  const { p, calls } = await open({ bossPair: F.bossPair5, achieve: F.achieveV82, students: F.studentsBoss3 }, '#/room/' + F.R1);
  await p.click('[data-tab="research"]'); await sleep(900);
  const t = await p.evaluate(() => {
    const pair = document.querySelector('[id^="rs-bosspair-"]'), top = document.querySelector('.rs-top');
    return { pair: pair ? pair.textContent : '', boss: (document.querySelector('[id^="rs-boss70-"]') || {}).textContent || '',
      before: !!(pair && top && (pair.compareDocumentPosition(top) & Node.DOCUMENT_POSITION_FOLLOWING)) };
  });
  ok('⭐ การ์ดคู่มี และอ่านจาก view v_student_boss_pair — ไม่ยิง events kind=boss เอง (กติกา .42)',
    t.pair.length > 0 && calls.some((c) => /v_student_boss_pair/.test(c[1])) && !calls.some((c) => /events\?kind=eq\.boss/.test(c[1])));
  ok('⭐ ครั้งแรก 2 จาก 5 · ครั้งสุดท้าย 4 จาก 5 — ฐานเดียวกัน แถวห้องอื่นและแถวเกมภาค 2 (-p2) ไม่ปน',
    /ครั้งแรกที่บันทึกไว้:[^]*?2 จาก 5 คน/.test(t.pair) && /ครั้งสุดท้ายที่บันทึกไว้:[^]*?4 จาก 5 คน/.test(t.pair), t.pair.slice(0, 260));
  ok('เฉลี่ย 14.60 → 25.00 · ต่างเฉลี่ย +10.40 (ร้อยละแสดงได้เพราะฐาน 5)', /14\.60/.test(t.pair) && /25\.00/.test(t.pair) && /\+10\.40/.test(t.pair) && /%/.test(t.pair), t.pair.slice(0, 400));
  ok('สูงขึ้น 4 · เท่าเดิม 1 · ต่ำลง 0 · ยังไม่ถึงเกณฑ์แม้สอบซ้ำ 1 (ห้ามตัดประโยคนี้ — PLAN)',
    /สูงขึ้น 4 คน/.test(t.pair) && /เท่าเดิม 1 คน/.test(t.pair) && /ต่ำลง 0 คน/.test(t.pair) && /ยังไม่ถึงเกณฑ์แม้สอบซ้ำ 1 คน/.test(t.pair));
  ok('จำนวนครั้ง: มัธยฐาน 3 (พิสัย 1–12) · แจกแจง 1/2/1/1', /มัธยฐาน 3 ครั้ง \(พิสัย 1–12\)/.test(t.pair)
    && /สอบ 1 ครั้ง 1 คน · 2–4 ครั้ง 2 คน · 5–9 ครั้ง 1 คน · 10 ครั้งขึ้นไป 1 คน/.test(t.pair), t.pair.slice(300, 700));
  ok('⭐ การ์ดคู่อยู่ก่อน .rs-top (สิ่งแรกของชั้นสรุป — AUDIT)', t.before === true);
  /* [V.1.6.47 · ครูสั่ง 23:4x] ตารางระดับ 5 ระดับ + ดีขึ้นไป (ACH_BANDS บน 30) · first [10,21,5,15,22] · last [25,21,29,20,30] */
  const bands = await p.evaluate(() => Array.from(document.querySelectorAll('#rs-bosspair-bands tbody tr')).map((tr) => Array.from(tr.cells).map((td) => td.textContent.trim())));
  ok('⭐ [.47] ตารางระดับมี 6 แถว (5 ระดับ + ดีขึ้นไป) ชื่อและช่วงคะแนนบน 30 ถูก (24/21/18/15)', bands.length === 6
    && bands.map((r) => r[0]).join('|') === 'ยังไม่ถึงเกณฑ์|ผ่าน|พอใช้|ดี|ดีเยี่ยม|ระดับดีขึ้นไป (ถึงเกณฑ์ 21/30)'
    && bands.map((r) => r[1]).join('|') === '0–14|15–17|18–20|21–23|24–30|21–30', bands);
  ok('⭐ [.47] ครั้งแรก: ยังไม่ถึง 2 (40.0%) · ผ่าน 1 · พอใช้ 0 · ดี 2 · ดีเยี่ยม 0 · ดีขึ้นไป 2 (40.0%)',
    bands.map((r) => r[2]).join('|') === '2|1|0|2|0|2' && bands[0][3] === '40.0%' && bands[5][3] === '40.0%', bands);
  ok('⭐ [.47] ครั้งสุดท้าย: ยังไม่ถึง 0 · ผ่าน 0 · พอใช้ 1 · ดี 1 · ดีเยี่ยม 3 (60.0%) · ดีขึ้นไป 4 (80.0%)',
    bands.map((r) => r[4]).join('|') === '0|0|1|1|3|4' && bands[4][5] === '60.0%' && bands[5][5] === '80.0%', bands);
  ok('[.47] ผลรวมทุกระดับ = ฐาน 5 ทั้งสองคอลัมน์ (ไม่มีใครตกหล่น/นับซ้ำ)',
    bands.slice(0, 5).reduce((s, r) => s + Number(r[2]), 0) === 5 && bands.slice(0, 5).reduce((s, r) => s + Number(r[4]), 0) === 5);
  ok('ไม่มีคำต้องห้ามในการ์ดคู่ (ก่อนเรียน/หลังเรียน/รายบุคคล/pre-test/post-test)', !/ก่อนเรียน|หลังเรียน|รายบุคคล|pre-?test|post-?test/i.test(t.pair));
  ok('ป้ายบังคับอยู่ในการ์ด: ชุดข้อสอบเดิม 30 ข้อ · ร่วมกันบนเครื่องเดียว · องค์ประกอบกลุ่ม · ไม่ใช้เลขครั้งของเครื่อง',
    /ชุดข้อสอบเดิม 30 ข้อ/.test(t.pair) && /ร่วมกันบนเครื่องเดียว/.test(t.pair) && /องค์ประกอบกลุ่ม/.test(t.pair) && /ไม่ใช้เลขครั้งของเครื่อง/.test(t.pair));
  ok('⭐ ใบผล .82 ทุกคน → ป้ายการ์ดผลสัมฤทธิ์บอก "นิยาม ข" และไม่มี "คะแนนสูงสุด"', /นิยาม ข/.test(t.boss) && !/คะแนนสูงสุด/.test(t.boss), t.boss.slice(-400));
  ok('ใบ .82 ทุกคนมีช่อง → ไม่มีบรรทัด "ไม่ทราบคะแนนครั้งที่ 1" · ของผู้มีคะแนน 2 จาก 5 (S2 21 · S5B 22)', !/ไม่ทราบคะแนนครั้งที่ 1/.test(t.boss) && /2 จาก 5 คน/.test(t.boss), t.boss.slice(0, 300));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}
{
  /* ฐาน < 5 → จำนวนเท่านั้น · ใบผลปน .80/.82 → เห็นทั้งสองบรรทัด · ฐานยังไม่รัน 106 → บอกตรง ๆ ไม่พัง */
  const { p, calls } = await open({ bossPair: F.bossPair5.slice(0, 4), achieve: F.achieveBossFirst.concat([F.achieveV82[0]]), students: F.studentsBoss3 }, '#/room/' + F.R1);
  await p.click('[data-tab="research"]'); await sleep(900);
  const t = await p.evaluate(() => ({ pair: (document.querySelector('[id^="rs-bosspair-"]') || {}).textContent || '', boss: (document.querySelector('[id^="rs-boss70-"]') || {}).textContent || '' }));
  ok('⭐ ฐาน 4 คน → แสดงจำนวน ไม่มีเครื่องหมาย % ในการ์ดคู่ (รวมตารางระดับ: ช่อง % เป็น –) และบอกว่าฐานต่ำกว่า 5', /จาก 4 คน/.test(t.pair) && !/%/.test(t.pair) && /ฐานต่ำกว่า 5 คน/.test(t.pair) && /ระดับดีขึ้นไป/.test(t.pair), t.pair.slice(0, 300));
  ok('ใบผลปนรุ่น (.76/.79/.80 + .82) → เห็นทั้งป้าย "นิยาม ข" และป้าย "คะแนนสูงสุด" พร้อมคำแนะนำอัปใบผล', /นิยาม ข/.test(t.boss) && /คะแนนสูงสุด/.test(t.boss) && /รุ่นก่อน \.82/.test(t.boss), t.boss.slice(-500));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
  const { p: p2, calls: c2 } = await open({ no106: true, students: F.studentsBoss3 }, '#/room/' + F.R1);
  await p2.click('[data-tab="research"]'); await sleep(900);
  const t2 = await p2.evaluate(() => ({ pair: (document.querySelector('[id^="rs-bosspair-"]') || {}).textContent || '', top: !!document.querySelector('.rs-top') }));
  ok('ฐานยังไม่รัน 106 → การ์ดคู่บอก "ขอครูรัน_106" · ชั้นสรุปที่เหลือยังขึ้นปกติ', /ขอครูรัน_106/.test(t2.pair) && t2.top === true, t2.pair);
  ok('สคริปต์ไม่พัง (view หาย = 404 ที่ถูกกลืนอย่างตั้งใจ)', realErrors(c2).length === 0, realErrors(c2));
  await p2.close();
}

await b.close(); srv.close();
process.exit(ok.done());
