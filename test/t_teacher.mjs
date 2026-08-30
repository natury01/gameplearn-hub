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
    st.keys.some((k) => k.txt.includes('ต้องช่วยเหลือ (ต่ำกว่า 50)'))
    && st.keys.some((k) => k.txt.includes('ดีเยี่ยม (80–100)')), st.keys.map((k) => k.txt));
  ok('⭐ เรียง "ต้องช่วยเหลือ" ขึ้นก่อน — ครูเปิดหน้านี้เพื่อหาคนที่ต้องช่วย',
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
    (uni.groups || []).some((g) => /ผลสัมฤทธิ์/.test(g.txt))
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
  ok('สองช่องที่รอเกณฑ์/ท่อ ประกาศตรง ๆ ว่ารออะไร (B4 · ขอครูรัน_94/A7)',
    rs.main.includes('ขอครูรัน_94') && /B4/.test(rs.main), '');
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

await b.close(); srv.close();
process.exit(ok.done());
