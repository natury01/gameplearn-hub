/* ชุดทดสอบ 7 — หน้าสรุปผลรวมสาธารณะ `dashboard.html` (ไฟล์ 72)

   สองอย่างที่ชุดนี้ต้องพิสูจน์ให้ได้ และสำคัญกว่าเรื่องสวยงาม:
   1. **เปิดดูได้จริงโดยไม่ล็อกอิน** — ไม่มีที่ไหนในหน้านี้แนบโทเคนครูไปกับคำขอ
   2. **ไม่มีอะไรที่ระบุตัวเด็กโผล่บนจอ** — หน้านี้เปิดสาธารณะ ถ้าหลุดคือหลุดกับคนทั้งอินเทอร์เน็ต */
import { chromium, serve, stub, login, reporter, realErrors, launchOpts } from './harness.mjs';
import * as F from './fixtures.mjs';

const PORT = 8937, BASE = 'http://localhost:' + PORT;
const srv = await serve(PORT);
const b = await chromium.launch(launchOpts());
const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(opt, withLogin) {
  const p = await b.newPage();
  const calls = await stub(p, opt || {});
  if (withLogin) await login(p);
  await p.goto(BASE + '/dashboard.html');
  await sleep(1500);
  return { p, calls };
}

console.log('═══ 1) เปิดดูได้โดยไม่ต้องล็อกอิน ═══');
{
  const { p, calls } = await open();          /* ไม่เรียก login() เลย */
  const st = await p.evaluate(() => ({
    stats: document.querySelectorAll('.stat').length,
    charts: document.querySelectorAll('.chartbox svg').length,
    text: (document.getElementById('page-main') || {}).textContent || '',
    err: (document.getElementById('err') || {}).textContent || '',
  }));
  ok('⭐ ไม่ล็อกอินก็เห็นตัวเลขและกราฟครบ', st.stats >= 5 && st.charts >= 3, st);
  ok('ไม่มีข้อความผิดพลาดค้างบนหน้า', !st.err, st.err);
  ok('บอกผู้ใช้ตรง ๆ ว่าหน้านี้ไม่ต้องเข้าสู่ระบบ', st.text.includes('ไม่ต้องเข้าสู่ระบบ'), '');
  /* คำขอทุกใบต้องใช้คีย์ anon — ห้ามมีใบไหนแนบโทเคนของครู */
  const rpcCalls = calls.filter((c) => String(c[1]).includes('/rpc/rpc_pub_'));
  ok('ยิงไปที่ RPC สาธารณะทั้ง 3 ตัว', rpcCalls.length >= 3, rpcCalls.map((c) => c[1]));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 2) ⭐ ไม่มีอะไรที่ระบุตัวเด็กบนหน้าสาธารณะ ═══');
{
  const { p, calls } = await open(null, true);   /* ล็อกอินด้วย เพื่อพิสูจน์ว่าหน้าไม่เปลี่ยนพฤติกรรม */
  const body = await p.evaluate(() => (document.getElementById('page-main') || {}).textContent || '');
  const banned = ['สมชาย', 'ใจดี', 'เด็ก', 'AAA111', 'BBB222', 'ZZZ999', 'ผู้เล่นทั่วไป'];
  const hit = banned.filter((w) => body.includes(w));
  ok('⭐ ไม่มีชื่อนักเรียน · โค้ดห้อง · ห้องผู้เล่นทั่วไป โผล่บนหน้า', hit.length === 0, hit);
  ok('บอกไว้บนหน้าเลยว่าไม่มีชื่อนักเรียนและไม่จัดอันดับ',
    body.includes('ไม่มีชื่อนักเรียน') && body.includes('ไม่จัดอันดับ'), '');
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 3) ตัวเลขที่ฐานส่งมา ขึ้นจอครบและตรง ═══');
{
  const { p } = await open();
  const t = await p.evaluate(() => (document.getElementById('content') || {}).textContent || '');
  ok('ผลสัมฤทธิ์เฉลี่ยขึ้นตรงตามที่ฐานส่งมา', t.includes('64.3%'), t.slice(0, 160));
  ok('มีค่าเฉลี่ยรวมทั้งระบบไว้เทียบ (ไม่ใช่มีแต่ของตัวเอง)', t.includes('61.8'), '');
  ok('จำนวนนักเรียน/ห้อง/โรงเรียน/เกม ครบทั้งสี่ตัว',
    t.includes('12') && t.includes('นักเรียนที่มีผล') && t.includes('ห้องเรียน')
    && t.includes('โรงเรียน') && t.includes('เกมที่มีผล'), '');
  ok('การกระจายผลสัมฤทธิ์ครบ 5 ช่วง',
    ['ดีเยี่ยม', 'ดี (70', 'พอใช้', 'ผ่านเกณฑ์', 'ต้องช่วยเหลือ'].every((x) => t.includes(x)), '');
  ok('⭐ แยกคะแนนเก็บ/คะแนนสอบให้ตามที่เกมส่งมา',
    t.includes('คะแนนเก็บ') && t.includes('คะแนนสอบ'), '');
  ok('บอกว่าชื่อช่องมาจากเกม ไม่ใช่เว็บกลางตั้งเอง', t.includes('ชื่อช่องมาจากเกมโดยตรง'), '');
  /* [V.1.6.31 · A7+ข้อ C] เส้นทางกราฟ % ต้องถูกรันจริง (ผู้ตรวจหักล้างจับได้ว่าชุดเดิม
     fixture รูปเก่าทำให้กิ่งนี้ไม่เคยถูกทดสอบเลยทั้งที่แบตเตอรี่เขียว) */
  ok('⭐ แท่งคะแนนเก็บเป็น % ของเพดานช่องนั้น (60/80 → 75%)', t.includes('75%'), '');
  ok('มีคำอธิบายว่าแท่งเทียบเป็น % ของคะแนนเต็ม', t.includes('% ของคะแนนเต็ม'), '');
  /* [V.1.6.32 · ครูทัก + สเปก HUB] ล็อกกติกาป้าย/ลำดับสองทาง:
     ป้ายที่แสดง (text) ต้องไม่มี "ด่านที่ N"/"(เต็ม N)" · ชื่อเต็มต้องอยู่ใน tooltip (title)
     · ลำดับแท่งเรียงด้วยเลขด่าน (fixture จงใจส่ง 10 มาก่อน 2 แบบที่ฐานเรียงข้อความจริง) */
  const lb = await p.evaluate(() => {
    const box = [...document.querySelectorAll('.chartbox svg')]
      .find((s) => (s.getAttribute('aria-label') || '').includes('ร้อยละของคะแนนเต็ม'));
    const texts = box ? [...box.querySelectorAll('text')].map((x) => x.textContent) : [];
    const titles = box ? [...box.querySelectorAll('title')].map((x) => x.textContent) : [];
    return { texts, titles };
  });
  ok('⭐ ป้ายแท่งไม่มีเลขด่านและ "(เต็ม N)" แล้ว (ครูสั่งถอด)',
    lb.texts.length > 0 && !lb.texts.some((x) => /ด่านที่\s*\d|\(เต็ม/.test(x)), JSON.stringify(lb.texts.slice(0, 6)));
  ok('⭐ ชื่อเต็มจากเกมยังอยู่ครบใน tooltip (กติกาเหล็กไม่แตก)',
    lb.titles.some((x) => x.includes('ด่านที่ 10 มินิเกม จัดการน้ำในเขื่อน (เต็ม 10)')), '');
  const i2 = lb.texts.findIndex((x) => x.includes('สุสานทหารสัมพันธมิตร'));
  const i10 = lb.texts.findIndex((x) => x.includes('จัดการน้ำในเขื่อน'));
  ok('⭐ ลำดับแท่งเรียงตามเลขด่านจริง (ด่าน 2 มาก่อนด่าน 10 แม้ฐานส่ง 10 มาก่อน)',
    i2 >= 0 && i10 >= 0 && i2 < i10, 'i2=' + i2 + ' i10=' + i10);
  const btnW = await p.evaluate(() => {
    const b = document.getElementById('f-clear');
    const s = b ? getComputedStyle(b) : null;
    return s ? { js: s.justifySelf, w: b.getBoundingClientRect().width } : null;
  });
  ok('ปุ่มล้างตัวกรองไม่ยืดเต็มช่องกริด (justify-self:start)',
    Boolean(btnW && btnW.js === 'start' && btnW.w < 190), JSON.stringify(btnW));
  ok('⭐ ช่องภาค 2 ที่ไม่บอกเพดาน ไปอยู่ตาราง ไม่ปนแกนกราฟ', t.includes('น้ำตกเอราวัณ'), '');
  ok('ตารางบอกชื่อเกมที่ไม่บอกเพดาน ไม่ใช่แค่ "บางเกม"', t.includes('ภาค 2 ไม่ได้บอกคะแนนเต็ม'), '');
  /* [V.1.6.31 · A6] สไตล์ของชิปที่เลือกต้องมีจริงใน CSS ไม่ใช่แค่ attribute ถูก
     (ผู้ตรวจหักล้างจับได้: เปลี่ยน attribute แล้วไม่มี .chip[aria-selected] ใน CSS = ชิปหน้าตาเหมือนกันหมด) */
  const chipStyle = await p.evaluate(() => {
    const on = document.querySelector('.chip[aria-selected="true"]');
    const off = document.querySelector('.chip[aria-selected="false"]');
    return { on: on ? getComputedStyle(on).backgroundColor : null,
      off: off ? getComputedStyle(off).backgroundColor : null };
  });
  ok('⭐ ชิปที่เลือกมีพื้นสีต่างจากตัวที่ไม่เลือกจริง (CSS จับ aria-selected)',
    Boolean(chipStyle.on && chipStyle.off && chipStyle.on !== chipStyle.off),
    JSON.stringify(chipStyle));
  await p.close();
}

console.log('\n═══ 4) สมรรถนะ 6 ด้าน — ด้านที่ยังไม่มีเกมวัด ต้องไม่ขึ้นเป็น 0 ═══');
{
  const { p } = await open();
  const st = await p.evaluate(() => {
    const secs = [...document.querySelectorAll('section.card')];
    const s = secs.find((x) => x.textContent.includes('สมรรถนะหลัก 6 ด้าน'));
    return { txt: s ? s.textContent : '',
      svgLabels: s ? [...s.querySelectorAll('svg text')].map((t) => t.textContent) : [],
      legend: s ? s.querySelectorAll('.vlegend').length : 0 };
  });
  ok('มีครบทั้ง 6 ด้าน ไม่ใช่เฉพาะด้านที่มีข้อมูล',
    ['การจัดการตนเอง', 'การคิดขั้นสูง', 'การสื่อสาร', 'การรวมพลัง', 'พลเมือง', 'ธรรมชาติ']
      .every((x) => st.txt.includes(x)), st.txt.slice(0, 200));
  ok('⭐ ด้านที่ยังไม่มีเกมวัด เขียนว่า "ยังไม่มีเกมวัดด้านนี้" ไม่ใช่เลข 0',
    st.txt.includes('ยังไม่มีเกมวัดด้านนี้'), st.svgLabels.slice(0, 20));
  ok('มีคำอธิบายสัญลักษณ์ เพราะกราฟนี้มีสองชุดข้อมูล (ค่าที่เลือก + ค่าเฉลี่ยรวม)',
    st.legend === 1, st.legend);
  ok('บอกว่าไม่รวมผลที่นักเรียนประเมินตนเอง', st.txt.includes('ประเมินตนเอง'), '');
  await p.close();
}

console.log('\n═══ 5) แยกตามกลุ่ม 4 แบบ — กดแล้วยิงใหม่จริง ═══');
{
  const { p, calls } = await open();
  const tabs = await p.evaluate(() =>
    [...document.querySelectorAll('[data-group]')].map((x) => x.getAttribute('data-group')));
  ok('มีปุ่มครบ 4 แบบ: โรงเรียน · ชั้น · ห้องเรียน · เกม',
    tabs.join(',') === 'school,grade,classroom,game', tabs);
  const before = calls.filter((c) => String(c[1]).includes('rpc_pub_breakdown')).length;
  await p.click('[data-group="classroom"]');
  await sleep(900);
  const after = calls.filter((c) => String(c[1]).includes('rpc_pub_breakdown')).length;
  const body = JSON.parse(calls.filter((c) => String(c[1]).includes('rpc_pub_breakdown')).pop()[2] || '{}');
  ok('กดแล้วยิงคำขอใหม่จริง', after === before + 1, { before, after });
  ok('ส่งกลุ่มที่เลือกไปให้ฐานถูกตัว', body.p_group === 'classroom', body);
  /* [V.1.6.31 · A6] เปลี่ยนมาตรฐานจาก aria-pressed → aria-selected (รวมให้ตรงหน้าครู)
     ล็อกกติกาใหม่ "สองทาง" ไม่ใช่แค่กลับด้านคำตอบ: ของใหม่ต้องมี และของเก่าต้องหายไปจริง
     + roving tabindex ต้องทำงาน (ตัวเลือกอยู่ = 0 · ตัวอื่น = -1) */
  const aria = await p.evaluate(() => {
    const on = document.querySelector('[data-group="classroom"]');
    const off = document.querySelector('[data-group="school"]');
    return { sel: on && on.getAttribute('aria-selected'),
      pressedGone: !document.querySelector('[role="tab"][aria-pressed]'),
      tabOn: on && on.getAttribute('tabindex'), tabOff: off && off.getAttribute('tabindex') };
  });
  ok('ปุ่มที่เลือกอยู่บอกสถานะให้โปรแกรมอ่านหน้าจอ (aria-selected)', aria.sel === 'true', aria);
  ok('มาตรฐานเก่า aria-pressed หายไปจริง (ไม่เหลือสองมาตรฐาน)', aria.pressedGone === true, aria);
  ok('roving tabindex: ตัวเลือกอยู่ 0 · ตัวอื่น -1', aria.tabOn === '0' && aria.tabOff === '-1', aria);
  ok('บอกว่าเรียงตามชื่อ ไม่ใช่ตามคะแนน (ไม่จัดอันดับ)',
    (await p.evaluate(() => document.getElementById('content').textContent)).includes('เรียงตามชื่อ'), '');
  await p.close();
}

console.log('\n═══ 6) ตัวกรอง — เลือกแล้วต้องกรองจริง และบอกเมื่อไม่มีผล ═══');
{
  const { p, calls } = await open();
  const opts = await p.evaluate(() => ({
    school: document.getElementById('f-school').options.length,
    grade: document.getElementById('f-grade').options.length,
    game: document.getElementById('f-game').options.length }));
  ok('เติมตัวเลือกจากฐานให้ครบ (โรงเรียน 2 + ทุกโรงเรียน)', opts.school === 3, opts);
  ok('ตัวเลือกชั้นและเกมถูกเติมด้วย', opts.grade === 3 && opts.game === 2, opts);

  await p.selectOption('#f-grade', 'ป.4');     /* ชั้นที่ไม่มีผล */
  await sleep(1000);
  const st = await p.evaluate(() => ({
    txt: document.getElementById('content').textContent,
    scope: (document.getElementById('scope-note') || {}).textContent || '' }));
  /* [V.1.6.8] เดิมเช็คข้อความตายตัวคำเดียว — พอหน้าจอแยก "ไม่มีใบผลสัมฤทธิ์" ออกจาก
     "ไม่มีอะไรเลย" (เพื่อไม่ทิ้งกราฟสมรรถนะที่ฐานส่งมาแล้ว) ข้อนี้จะแดงทั้งที่พฤติกรรมดีขึ้น
     เขียนใหม่ให้ตรวจ "เจตนา" แทนคำ และเข้มขึ้นด้วยการยืนยันว่ากราฟเปล่าไม่ถูกวาดจริง */
  ok('⭐ กรองแล้วไม่มีผล = บอกเป็นข้อความ ไม่ใช่กราฟเปล่า ๆ',
    /ยังไม่มี(ผล|ใบผลสัมฤทธิ์)ในกลุ่มที่เลือก/.test(st.txt)
      && !st.txt.includes('กระจายตามช่วงคะแนน'), st.txt.slice(0, 200));
  ok('บอกวิธีแก้ให้ด้วย ไม่ใช่แจ้งว่าว่างเฉย ๆ', st.txt.includes('ลองเลือก'), '');
  ok('บอกว่ากำลังดูขอบเขตไหนอยู่', st.scope.includes('ป.4'), st.scope);
  const body = JSON.parse(calls.filter((c) => String(c[1]).includes('rpc_pub_summary')).pop()[2] || '{}');
  ok('ส่งตัวกรองไปให้ฐานจริง', body.p_grade === 'ป.4', body);
  await p.close();
}

console.log('\n═══ 7) ดูเป็นตารางได้ (ข้อบังคับด้านการเข้าถึง) ═══');
{
  const { p } = await open();
  await p.click('#tg-table');
  await sleep(500);
  const st = await p.evaluate(() => ({
    tables: document.querySelectorAll('#content table').length,
    svgs: document.querySelectorAll('#content svg').length,
    txt: document.getElementById('content').textContent }));
  ok('⭐ สลับเป็นตารางได้ — ตัวเลขทุกตัวอ่านได้โดยไม่ต้องพึ่งสี', st.tables >= 3 && st.svgs === 0, st);
  ok('ตารางสมรรถนะยังบอกว่าด้านไหนยังไม่มีเกมวัด', st.txt.includes('ยังไม่มีเกมวัดด้านนี้'), '');
  await p.click('#tg-table');
  await sleep(500);
  const back = await p.evaluate(() => document.querySelectorAll('#content svg').length);
  ok('สลับกลับเป็นกราฟได้', back >= 3, back);
  await p.close();
}

console.log('\n═══ 8) ฐานที่ยังไม่ได้รันไฟล์ 72 — ต้องบอกให้รู้ ไม่ใช่หน้าเปล่า ═══');
{
  const { p, calls } = await open({ no72: true });
  const st = await p.evaluate(() => ({
    err: (document.getElementById('err') || {}).textContent || '',
    on: (document.getElementById('err') || {}).className || '' }));
  ok('ขึ้นข้อความบอกว่าต้องรันไฟล์ 72 ก่อน', st.err.includes('72_PUBLIC_DASHBOARD.sql'), st);
  ok('บอกด้วยว่าเป็นงานของผู้ดูแลระบบ และรันครั้งเดียว',
    st.err.includes('ผู้ดูแลระบบ') && st.err.includes('ครั้งเดียว'), st.err);
  ok('กล่องข้อความถูกเปิดให้เห็นจริง', st.on.includes('on'), st.on);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 9) จอเล็ก 320px และหัวเว็บ ═══');
{
  const p = await b.newPage();
  await p.setViewportSize({ width: 320, height: 720 });
  const calls = await stub(p);
  await p.goto(BASE + '/dashboard.html');
  await sleep(1500);
  const st = await p.evaluate(() => ({
    over: document.documentElement.scrollWidth - window.innerWidth,
    nav: !!document.querySelector('.navlinks a[href="dashboard.html"]'),
    btn: !!document.getElementById('new-room-btn') }));
  ok('จอ 320px ไม่ล้นแนวนอน', st.over <= 1, st);
  ok('มีเมนู "สรุปผลรวม" บนหัวเว็บ', st.nav, st);
  ok('ปุ่มสร้างห้องเรียนยังอยู่บนหัวเว็บหน้านี้ด้วย', st.btn, st);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}


console.log('\n═══ สถิติการเข้าถึงเกม — ป้ายแหล่งที่มา (V.1.6.18) ═══');
/* ครูสั่ง: "อยากให้เก็บสถิติจากการเข้าถึงเกมเลย ปัจจุบันเก็บแค่จากการเข้าจากหน้าเว็บไซต์"
   ⇒ ลิงก์เล่นเกมต้องติดป้าย src=hub เพื่อให้ตัวเกมรายงานกลับได้ว่าคนนี้มาจากเว็บ
   คนที่ไม่มีป้าย = มาจาก QR หรือลิงก์ที่ครูส่งต่อ ซึ่งคือกลุ่มที่ครูมองไม่เห็นมาตลอด
   ถ้าป้ายหาย ตัวเลข "จากเว็บ" จะเป็น 0 ตลอดโดยหน้าจอดูปกติทุกอย่าง = พังเงียบ */
{
  const p = await b.newPage();
  const calls = await stub(p);
  await p.goto(BASE + '/index.html');
  await sleep(1500);
  const links = await p.evaluate(() =>
    [...document.querySelectorAll('a[data-game-play]')].map((a) => a.getAttribute('href')));
  ok('หน้าแรกมีลิงก์เล่นเกมให้ตรวจจริง (กันเคสไม่มีลิงก์แล้วข้อล่างเขียวหลอก)',
    links.length > 0, links);
  ok('⭐ ลิงก์เล่นเกมทุกอันติดป้าย src=hub', links.every((h) => /[?&]src=hub/.test(h || '')), links);
  ok('ป้ายไม่ทับพารามิเตอร์เดิมของลิงก์ (ใช้ & เมื่อมี ? อยู่แล้ว)',
    links.every((h) => !/\?.*\?/.test(h || '')), links);

  /* ติดป้ายซ้ำต้องไม่ได้ป้ายสองอัน — MutationObserver วิ่งทุกครั้งที่ DOM ขยับ */
  const twice = await p.evaluate(() => {
    document.body.appendChild(document.createElement('span'));
    return [...document.querySelectorAll('a[data-game-play]')]
      .map((a) => (a.getAttribute('href').match(/src=hub/g) || []).length);
  });
  ok('DOM ขยับซ้ำ ๆ แล้วป้ายไม่ซ้อนกัน', twice.every((c) => c === 1), twice);

  const trk = calls.filter((c) => String(c[1]).includes('rpc_track_visit'));
  ok('มีคำขอนับสถิติจริง', trk.length > 0, trk.length);
  ok('⭐ ทุกคำขอนับสถิติแนบ p_source มาด้วย (ไม่งั้นกองรวมใน unknown หมด)',
    trk.every((c) => { try { return JSON.parse(c[2]).p_source === 'hub'; } catch (e) { return false; } }),
    trk.map((c) => c[2]).slice(0, 3));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

await b.close(); srv.close();
process.exit(ok.done());
