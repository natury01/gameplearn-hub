/* ชุดทดสอบ 2 — หน้าครู: ห้องผู้เล่นทั่วไป · ปุ่มลบ · ท่อข้อมูล · สวิตช์เกม · ตัวกรองรายเกม
   (ข้อ 3.2 · 3.3 · 3.4 · 3.5 · 3.7) */
import { chromium, serve, stub, login, reporter, realErrors, launchOpts } from './harness.mjs';
import * as F from './fixtures.mjs';

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
  ok('รอบที่ส่งผลตัดเหลือของเกมนั้น (3 ไม่ใช่ 4)', /รอบที่ส่งผล\s*3/.test(st1.tiles.join('|')), st1.tiles);
  ok('ความคืบหน้าเฉลี่ยคิดเฉพาะเกมนั้น (60% ไม่ใช่ 40%)',
    /ความคืบหน้าเฉลี่ย\s*60/.test(st1.tiles.join('|')), st1.tiles);
  ok('"บันทึกการเล่นสะสม" แสดง – เพราะแยกรายเกมไม่ได้',
    /บันทึกการเล่นสะสม\s*–/.test(st1.tiles.join('|')), st1.tiles);

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

await b.close(); srv.close();
process.exit(ok.done());
