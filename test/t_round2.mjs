/* ชุดทดสอบ 4 — งานข้อ 4 ของ handover
   4.1 ดูห้องสาธารณะของครูคนอื่น · 4.2 การ์ดห้องแบบหน้าเกม · 4.3 สร้างห้องก่อนล็อกอินแล้วผูกทีหลัง */
import { chromium, serve, stub, login, reporter, realErrors, launchOpts } from './harness.mjs';
import * as F from './fixtures.mjs';

const PORT = 8934, BASE = 'http://localhost:' + PORT;
const srv = await serve(PORT);
const b = await chromium.launch(launchOpts());
const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(opt = {}, hash = '#/', loggedIn = true) {
  const p = await b.newPage({ acceptDownloads: true });
  const calls = await stub(p, opt);
  if (loggedIn) await login(p);
  await p.goto(BASE + '/teacher.html' + hash);
  await sleep(loggedIn ? 1400 : 900);
  return { p, calls };
}

console.log('═══ 1) ห้องสาธารณะของครูคนอื่น (ข้อ 4.1) ═══');
{
  const { p, calls } = await open({}, '#/browse');
  const st = await p.evaluate(() => {
    const t = document.getElementById('content').textContent;
    const rows = [...document.querySelectorAll('#content tbody tr')].map((r) => r.textContent);
    return { rows, text: t,
      filters: ['br-school', 'br-grade', 'br-year'].map((i) => !!document.getElementById(i)),
      nav: !!document.querySelector('.navlinks a[data-nav="#/browse"]'),
      navOn: (document.querySelector('.navlinks a[data-nav="#/browse"]') || {}).className };
  });
  ok('มีเมนู "ห้องของครูคนอื่น" บนแถบหัวเว็บ และไฮไลต์เมื่ออยู่หน้านี้',
    st.nav && /\bon\b/.test(st.navOn), st.navOn);
  ok('เห็นห้องของครูคนอื่นครบ 3 ห้อง', st.rows.length === 3, st.rows.length);
  ok('มีตัวกรอง โรงเรียน · ระดับชั้น · ปีการศึกษา', st.filters.every(Boolean), st.filters);
  ok('ห้องของเราติดป้ายให้หาเจอง่าย', st.rows.some((r) => r.includes('ห้องของเรา')), st.rows[0]);
  ok('บอกจำนวนนักเรียนและค่าเฉลี่ยของห้องคนอื่นได้', st.rows[1].includes('28'), st.rows[1]);
  ok('ห้องที่ยังไม่มีผลขึ้นว่า "ยังไม่มีผล" ไม่ใช่ 0%',
    st.rows[2].includes('ยังไม่มีผล'), st.rows[2]);

  /* เรื่องความเป็นส่วนตัว — ตรวจที่หน้าจอจริง ไม่ใช่เชื่อว่าฝั่ง SQL ทำถูกอย่างเดียว */
  ok('ไม่มีชื่อนักเรียนโผล่บนหน้านี้เลย',
    !st.text.includes('สมชาย') && !st.text.includes('สมหญิง'), st.text.slice(0, 120));
  ok('ไม่มีโค้ดเข้าห้องของใครโผล่', !/[A-Z]{3}\d{3}/.test(st.text), st.text.slice(0, 200));
  ok('เขียนบอกขอบเขตให้ครูรู้ว่าเห็นแค่ห้องที่เจ้าของเปิดไว้',
    st.text.includes('ค้นหาชื่อโรงเรียนได้') && st.text.includes('ไม่แสดงชื่อนักเรียน'), '');

  await p.selectOption('#br-school', F.SCH2);
  await sleep(500);
  const f1 = await p.evaluate(() => [...document.querySelectorAll('#content tbody tr')].length);
  ok('กรองตามโรงเรียนแล้วเหลือห้องเดียว', f1 === 1, f1);
  const optCount = await p.evaluate(() => document.getElementById('br-school').options.length);
  ok('ตัวเลือกตัวกรองไม่หดตามผลที่กรองอยู่ (ไม่งั้นกรองกลับไม่ได้)', optCount === 3, optCount);

  await p.click('#br-clear');
  await sleep(500);
  const f2 = await p.evaluate(() => [...document.querySelectorAll('#content tbody tr')].length);
  ok('ล้างตัวกรองแล้วกลับมาครบ', f2 === 3, f2);

  await p.fill('#br-q', 'ป.5');
  await sleep(700);
  const f3 = await p.evaluate(() => [...document.querySelectorAll('#content tbody tr')].length);
  ok('ค้นด้วยคำได้', f3 === 1, f3);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}
{
  const { p } = await open({ no59: true }, '#/browse');
  const t = await p.evaluate(() => document.getElementById('content').textContent);
  ok('ยังไม่ได้รัน 59 → บอกชื่อไฟล์ที่ต้องรัน และบอกว่าส่วนอื่นยังใช้ได้',
    t.includes('59_ROOM_BROWSE.sql') && t.includes('ส่วนอื่นของเว็บใช้งานได้ตามปกติ'), t.slice(0, 200));
  await p.close();
}

console.log('\n═══ 2) การ์ดห้องแบบหน้าเกม (ข้อ 4.2) ═══');
{
  const { p, calls } = await open({}, '#/rooms');
  const st = await p.evaluate(() => ({
    share: document.querySelectorAll('[data-share]').length,
    csv: document.querySelectorAll('[data-csv]').length,
    sheet: document.querySelectorAll('[data-sheet]').length,
    edit: document.querySelectorAll('[data-edit-room]').length,
    del: document.querySelectorAll('[data-del-room]').length,
    order: [...document.querySelectorAll('.roomrow .rr-act .btn, .roomrow .rr-act a')]
      .slice(0, 6).map((x) => x.textContent.trim()),
  }));
  ok('แถวปุ่มครบ: ดูผล · แชร์ · แก้ไข · CSV · ปิดห้อง · ลบ', st.share === 2 && st.csv === 2, st);
  ok('ปุ่มลบอยู่ท้ายแถวเสมอ ไม่ติดกับปุ่มที่กดบ่อย',
    /ลบห้อง/.test(st.order[st.order.length - 1]), st.order);

  await p.evaluate(() => document.querySelector('[data-share]').click());
  await sleep(250);
  const sh = await p.evaluate(() => {
    const box = document.querySelector('[data-sharebox]');
    const link = box.querySelector('input');
    const msg = box.querySelector('textarea');
    return { open: !box.classList.contains('hidden'), link: link && link.value,
      msg: msg && msg.value, copyBtns: box.querySelectorAll('[data-copy]').length };
  });
  ok('กดแชร์แล้วได้ลิงก์ ?join=โค้ด ที่กดเข้าห้องได้เลย',
    sh.open && /\/\?join=ABC123$/.test(sh.link), sh.link);
  ok('มีข้อความสำเร็จรูปพร้อมส่งในไลน์กลุ่ม',
    sh.msg.includes('ป.4/1') && sh.msg.includes('ABC123') && sh.msg.includes('เลือกชื่อตัวเอง'), sh.msg);
  ok('มีปุ่มคัดลอกทั้งลิงก์และข้อความ', sh.copyBtns === 2, sh);

  /* ส่งออก CSV จริง — และต้องรอดจาก CSP ชุดเดียวกับของจริงที่เซิร์ฟเวอร์ทดสอบส่งมาด้วย */
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 8000 }),
    p.evaluate(() => document.querySelector('[data-csv]').click()),
  ]);
  const fname = dl.suggestedFilename();
  const body = (await import('fs')).readFileSync(await dl.path(), 'utf8');
  ok('ดาวน์โหลด CSV ได้จริง (ไม่ถูก CSP บล็อก)', !!fname, fname);
  /* ชื่อไฟล์ต้องเป็นอังกฤษล้วน — Chromium ทิ้งชื่อที่มีอักษรไทยแล้วเซฟเป็น "download" เฉย ๆ
     (วัดจริงแล้วทั้ง locale en-US และ th-TH) · ต้องยังบอกได้ว่าเป็นห้องไหน */
  ok('ชื่อไฟล์เป็นอังกฤษล้วน ไม่โดนเบราว์เซอร์ทิ้งชื่อ',
    /^[\x20-\x7E]+$/.test(fname) && fname !== 'download', fname);
  ok('ชื่อไฟล์ยังบอกได้ว่าห้องไหน (ระดับชั้นย่อ + โค้ดห้อง)',
    fname === 'GamePlearn-P4-1-ABC123.csv', fname);
  ok('มี BOM นำหน้า — Excel บนวินโดวส์อ่านภาษาไทยไม่เพี้ยน', body.charCodeAt(0) === 0xFEFF, body.slice(0, 8));
  ok('หัวตารางและข้อมูลนักเรียนครบ',
    body.includes('เลขที่') && body.includes('สมชาย') && body.includes('ปิดการใช้งาน'), body.slice(0, 200));
  ok('ใช้ CRLF ตามที่ Excel ต้องการ', body.includes('\r\n'), JSON.stringify(body.slice(0, 60)));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 3) สร้างห้องก่อนล็อกอิน แล้วผูกทีหลัง (ข้อ 4.3) ═══');
{
  const { p, calls } = await open({}, '', false);
  const st0 = await p.evaluate(() => ({
    login: !document.getElementById('v-login').classList.contains('hidden'),
    btn: !!document.getElementById('btn-open-room'),
  }));
  ok('หน้า login มีทางสร้างห้องโดยไม่ต้องล็อกอิน', st0.login && st0.btn, st0);

  await p.click('#btn-open-room');
  await sleep(200);
  const form = await p.evaluate(() => {
    const t = document.getElementById('open-room-form').textContent;
    return { grade: !!document.getElementById('or-grade'), school: !!document.getElementById('or-school'),
      listed: !!document.getElementById('or-listed'),
      warnBrowser: t.includes('ผูกอยู่กับเบราว์เซอร์ตัวนี้'),
      warnPrivacy: t.includes('ไม่ควรใส่ชื่อ-นามสกุลจริง') };
  });
  ok('ฟอร์มมีช่องครบเหมือนฟอร์มปกติ', form.grade && form.school && form.listed, form);
  ok('เตือนตรง ๆ ว่าห้องผูกกับเบราว์เซอร์ตัวนี้จนกว่าจะผูกบัญชี', form.warnBrowser, form);
  ok('คำเตือนความเป็นส่วนตัวเรื่องชื่อจริงยังอยู่ (โหมดค้นหาได้)', form.warnPrivacy, form);

  await p.click('#or-go');
  await sleep(300);
  const noGrade = await p.evaluate(() => document.getElementById('err').textContent);
  ok('ไม่ใส่ระดับชั้นแล้วกดสร้าง = เตือน ไม่ยิงไปฐาน',
    noGrade.includes('ระดับชั้น') && !calls.some((c) => c[0] === 'CREATED'), noGrade);

  await p.fill('#or-grade', 'ป.2');
  await p.fill('#or-no', '3');
  await p.fill('#or-school', 'โรงเรียนทดสอบ');
  await p.click('#or-go');
  await sleep(600);
  const made = calls.filter((c) => c[0] === 'CREATED');
  const after = await p.evaluate(() => ({
    flash: document.getElementById('flash').textContent,
    claims: JSON.parse(localStorage.getItem('gp_room_claims') || '[]'),
    listed: document.getElementById('claim-list').textContent,
  }));
  ok('สร้างห้องสำเร็จ ส่งค่าที่กรอกไปครบ', made.length === 1 && made[0][2].includes('โรงเรียนทดสอบ'), made);
  ok('ขึ้นชื่อห้องและโค้ดให้ครูเห็นทันที',
    after.flash.includes('ป.2/3') && after.flash.includes('QWE789'), after.flash);
  ok('เก็บกุญแจรับห้องไว้ในเครื่อง 1 ใบ',
    after.claims.length === 1 && after.claims[0].token.length === 64, after.claims);
  ok('โชว์รายการห้องที่ยังไม่ได้ผูกบัญชี พร้อมโค้ดให้ใช้ได้เลย',
    after.listed.includes('ป.2/3') && after.listed.includes('QWE789'), after.listed);
  await p.close();
}

/* ---- ล็อกอินแล้วต้องผูกให้อัตโนมัติ ---- */
{
  const p = await b.newPage();
  const calls = await stub(p);
  await p.addInitScript(() => {
    localStorage.setItem('gp_room_claims', JSON.stringify([{ token: 'T'.repeat(64), name: 'ป.2/3', join_key: 'QWE789' }]));
  });
  await login(p);
  await p.goto(BASE + '/teacher.html');
  await sleep(1600);
  const st = await p.evaluate(() => ({
    flash: document.getElementById('flash').textContent,
    claims: JSON.parse(localStorage.getItem('gp_room_claims') || '[]'),
  }));
  const claimed = calls.filter((c) => c[1].includes('rpc_claim_room'));
  ok('ล็อกอินแล้วผูกห้องให้อัตโนมัติ ไม่ต้องให้ครูไปหาปุ่มเอง', claimed.length === 1, claimed);
  ok('บอกครูว่าผูกห้องไหนไปแล้ว', st.flash.includes('ป.2/3'), st.flash);
  ok('กุญแจที่ใช้แล้วถูกลบทิ้ง ไม่ค้างยิงซ้ำทุกครั้งที่เปิดหน้า', st.claims.length === 0, st.claims);
  ok('ผูกก่อนโหลดข้อมูล — คำสั่งผูกมาก่อนคำขอห้องเรียน',
    calls.findIndex((c) => c[1].includes('rpc_claim_room'))
      < calls.findIndex((c) => c[1].includes('classrooms?select')), '');
  await p.close();
}
{
  /* กุญแจที่ใช้ไม่ได้แล้ว (ผูกไปแล้ว/หมดอายุ) ต้องถูกทิ้ง ไม่ค้างกวนใจทุกครั้งที่เปิดหน้า */
  const p = await b.newPage();
  await stub(p, { claimDead: true });
  await p.addInitScript(() => {
    localStorage.setItem('gp_room_claims', JSON.stringify([{ token: 'T'.repeat(64), name: 'ป.2/3' }]));
  });
  await login(p);
  await p.goto(BASE + '/teacher.html');
  await sleep(1500);
  const claims = await p.evaluate(() => JSON.parse(localStorage.getItem('gp_room_claims') || '[]'));
  ok('กุญแจที่ฐานบอกว่าใช้ไม่ได้แล้ว ถูกทิ้ง', claims.length === 0, claims);
  await p.close();
}
{
  /* ยังไม่ได้รัน 60 = ห้ามทิ้งกุญแจ ไม่งั้นครูเสียห้องเพราะ SQL ยังไม่ได้รัน */
  const p = await b.newPage();
  await stub(p, { no60: true });
  await p.addInitScript(() => {
    localStorage.setItem('gp_room_claims', JSON.stringify([{ token: 'T'.repeat(64), name: 'ป.2/3' }]));
  });
  await login(p);
  await p.goto(BASE + '/teacher.html');
  await sleep(1500);
  const st = await p.evaluate(() => ({
    claims: JSON.parse(localStorage.getItem('gp_room_claims') || '[]'),
    err: document.getElementById('err').textContent,
  }));
  ok('ยังไม่ได้รัน 60 → **ไม่ทิ้งกุญแจ** และบอกชื่อไฟล์ที่ต้องรัน',
    st.claims.length === 1 && st.err.includes('60_ROOM_CLAIM.sql'), st);
  ok('บอกครูด้วยว่าห้องยังอยู่ ไม่ได้หายไปไหน', st.err.includes('ห้องยังอยู่ครบ'), st.err);
  await p.close();
}
{
  const { p } = await open({ no60: true }, '', false);
  await p.click('#btn-open-room');
  await sleep(200);
  await p.fill('#or-grade', 'ป.2');
  await p.click('#or-go');
  await sleep(500);
  const err = await p.evaluate(() => document.getElementById('err').textContent);
  ok('ยังไม่ได้รัน 60 แล้วกดสร้างห้อง → บอกชื่อไฟล์ที่ต้องรัน',
    err.includes('60_ROOM_CLAIM.sql'), err);
  await p.close();
}

await b.close(); srv.close();
process.exit(ok.done());
