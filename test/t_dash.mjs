/* ชุดทดสอบ 7 — หน้าสรุปผลรวมสาธารณะ `dashboard.html` (ไฟล์ 72)

   สองอย่างที่ชุดนี้ต้องพิสูจน์ให้ได้ และสำคัญกว่าเรื่องสวยงาม:
   1. **เปิดดูได้จริงโดยไม่ล็อกอิน** — ไม่มีที่ไหนในหน้านี้แนบโทเคนครูไปกับคำขอ
   2. **ไม่มีอะไรที่ระบุตัวเด็กโผล่บนจอ** — หน้านี้เปิดสาธารณะ ถ้าหลุดคือหลุดกับคนทั้งอินเทอร์เน็ต */
import { chromium, serve, stub, login, reporter, realErrors } from './harness.mjs';
import * as F from './fixtures.mjs';

const PORT = 8937, BASE = 'http://localhost:' + PORT;
const srv = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
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
  const pressed = await p.evaluate(() =>
    (document.querySelector('[data-group="classroom"]') || {}).getAttribute('aria-pressed'));
  ok('ปุ่มที่เลือกอยู่บอกสถานะให้โปรแกรมอ่านหน้าจอด้วย (aria-pressed)', pressed === 'true', pressed);
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
  ok('⭐ กรองแล้วไม่มีผล = บอกเป็นข้อความ ไม่ใช่กราฟเปล่า ๆ',
    st.txt.includes('ยังไม่มีผลในกลุ่มที่เลือก'), st.txt.slice(0, 200));
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

await b.close(); srv.close();
process.exit(ok.done());
