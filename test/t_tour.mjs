/* ══════════════════════════════════════════════════════════════════════
   t_tour.mjs — กล่องแนะนำการใช้งาน 4 ขั้น (V.1.6.18)

   ครูสั่ง: "ควรมีการแนะนำแบบคร่าว ๆ เป็นป๊อปอัปขึ้นก่อนเข้าเว็บไหม
            เช่น สร้างห้อง > ส่งลิงก์/code > นักเรียนเล่น > ดูคะแนน
            ฉบับสั้น ๆ เข้าใจ โดยไม่ต้องอ่านเยอะ"

   ชุดนี้ตรวจสิ่งที่ทำให้ป๊อปอัป "ช่วย" แทนที่จะ "กวน" — สามเรื่องที่พลาดกันบ่อยที่สุด:
     1. ปิดไม่ได้ / ปิดยาก  → ตรวจว่าปิดได้ครบสี่ทาง
     2. ขึ้นซ้ำทุกครั้ง      → ตรวจว่าขึ้นครั้งเดียวต่อเครื่อง
     3. ปิดแล้วหาไม่เจออีก  → ตรวจว่ามีทางเรียกกลับมาดู
   บวกข้อที่คนทำเว็บมักลืม: คนใช้คีย์บอร์ดต้องไม่ติดอยู่หลังกล่อง
   ══════════════════════════════════════════════════════════════════════ */
import { chromium, serve, stub, reporter, realErrors, launchOpts } from './harness.mjs';

const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 8941, BASE = 'http://localhost:' + PORT;
const srv = await serve(PORT);
const b = await chromium.launch(launchOpts());

console.log('═══ 1) ครั้งแรกที่เข้าเว็บ — กล่องต้องขึ้นเอง และอ่านจบได้ในตาเดียว ═══');
{
  const p = await b.newPage();
  const calls = await stub(p, { tour: true });
  await p.goto(BASE + '/index.html');
  await sleep(900);
  const st = await p.evaluate(() => {
    const box = document.querySelector('.gp-tour');
    if (!box) return { none: true };
    const steps = [...box.querySelectorAll('.gp-tour-step')].map((s) => s.textContent.trim());
    return {
      none: false,
      steps,
      role: box.getAttribute('role'),
      modal: box.getAttribute('aria-modal'),
      labelled: !!document.getElementById(box.getAttribute('aria-labelledby') || 'x'),
      /* ไม่มีสไลด์/ปุ่มถัดไป = เห็นทั้งกระบวนการในตาเดียว ตามที่ครูขอ */
      hasNext: /ถัดไป|next/i.test(box.textContent),
      focusInBox: box.contains(document.activeElement),
      cta: (box.querySelector('.btn-primary') || {}).getAttribute
        ? box.querySelector('.btn-primary').getAttribute('href') : null,
    };
  });
  ok('กล่องแนะนำขึ้นเองตอนเข้าเว็บครั้งแรก', !st.none, st);
  ok('มีครบ 4 ขั้นตามที่ครูสั่ง', st.steps && st.steps.length === 4, st.steps);
  ok('ขั้นที่ 1 = สร้างห้องเรียน', /สร้างห้องเรียน/.test((st.steps || [])[0] || ''), st.steps);
  ok('ขั้นที่ 2 = ส่งโค้ด/ลิงก์ให้นักเรียน',
    /โค้ด|ลิงก์/.test((st.steps || [])[1] || ''), st.steps);
  ok('ขั้นที่ 3 = นักเรียนเล่นเกม', /เล่นเกม/.test((st.steps || [])[2] || ''), st.steps);
  ok('ขั้นที่ 4 = ดูผล/ประเมิน', /ดูผล|ประเมิน/.test((st.steps || [])[3] || ''), st.steps);
  ok('เห็นทั้ง 4 ขั้นในตาเดียว — ไม่บังคับกดสไลด์ทีละหน้า', !st.hasNext, st);
  ok('บอกด้วยว่าจะเริ่มยังไง (ปุ่มพาไปหน้าสร้างห้อง)',
    /teacher\.html#\/rooms/.test(st.cta || ''), st.cta);
  ok('เข้าถึงได้: role=dialog + aria-modal + มีหัวเรื่องผูกไว้',
    st.role === 'dialog' && st.modal === 'true' && st.labelled, st);
  ok('โฟกัสย้ายเข้ากล่อง — คนใช้คีย์บอร์ดไม่ต้องไล่หา', st.focusInBox, st);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 2) ปิดได้จริงทั้งสี่ทาง — กล่องที่ปิดยากคือกับดัก ═══');
for (const [label, act] of [
  ['กดกากบาท', async (p) => p.click('.gp-tour-x')],
  ['กดปุ่ม "ดูเองก่อน"', async (p) => p.click('.gp-tour-done')],
  ['กด Esc', async (p) => p.keyboard.press('Escape')],
  ['คลิกนอกกล่อง', async (p) => p.evaluate(() => {
    const back = document.querySelector('.gp-tour-back');
    back.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  })],
]) {
  const p = await b.newPage();
  await stub(p, { tour: true });
  await p.goto(BASE + '/index.html');
  await sleep(900);
  const before = await p.evaluate(() => !!document.querySelector('.gp-tour'));
  await act(p);
  await sleep(250);
  const after = await p.evaluate(() => !!document.querySelector('.gp-tour'));
  ok('ปิดได้ด้วยการ' + label, before && !after, { before, after });
  await p.close();
}

console.log('\n═══ 3) ขึ้นครั้งเดียวต่อเครื่อง แต่เรียกกลับมาดูได้เสมอ ═══');
{
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const calls = await stub(p, { tour: true });
  await p.goto(BASE + '/index.html');
  await sleep(900);
  const first = await p.evaluate(() => !!document.querySelector('.gp-tour'));
  await p.click('.gp-tour-x');
  await sleep(200);

  await p.goto(BASE + '/index.html');
  await sleep(900);
  const second = await p.evaluate(() => !!document.querySelector('.gp-tour'));
  ok('⭐ เข้าเว็บรอบสอง กล่องต้องไม่ขึ้นอีก (ขึ้นทุกครั้งคือสิ่งที่ทำให้คนเกลียดป๊อปอัป)',
    first && !second, { first, second });

  const link = await p.evaluate(() => {
    const b2 = document.getElementById('gp-tour-open');
    return b2 ? { text: b2.textContent.trim(), tag: b2.tagName } : null;
  });
  ok('⭐ ยังมีลิงก์ "วิธีใช้งาน" ให้เรียกกลับมาดู — ปิดแล้วหาไม่เจอคือแย่กว่าไม่มี',
    !!link && /วิธีใช้/.test(link.text), link);

  await p.click('#gp-tour-open');
  await sleep(300);
  const back = await p.evaluate(() => !!document.querySelector('.gp-tour'));
  ok('กดลิงก์แล้วกล่องกลับมาจริง', back, { back });

  /* เมนูหลัก 6 รายการเป็นชุดที่ครูเคาะ และเคยมีปัญหาความกว้างบนจอเล็ก — ห้ามแอบเพิ่ม */
  const nav = await p.evaluate(() =>
    [...document.querySelectorAll('.navlinks a')].map((a) => a.textContent.trim()));
  ok('ไม่ได้แอบเพิ่มรายการในเมนูหลัก', !nav.some((t) => /วิธีใช้/.test(t)), nav);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await ctx.close();
}

console.log('\n═══ 4) หน้าที่ไม่ควรมีกล่องนี้ ต้องไม่มี ═══');
for (const page of ['/admin.html', '/standards.html', '/support.html']) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await stub(p, { tour: true });
  await p.goto(BASE + page);
  await sleep(800);
  const has = await p.evaluate(() => !!document.querySelector('.gp-tour'));
  ok('ไม่ขึ้นกล่องแนะนำที่ ' + page + ' (กระบวนการ 4 ขั้นไม่ได้เริ่มที่หน้านี้)', !has, { has });
  await ctx.close();
}

console.log('\n═══ 5) หน้าครูก็ต้องได้กล่องนี้ — เป็นหน้าที่ทำ 4 ขั้นนั้นจริง ═══');
{
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await stub(p, { tour: true });
  await p.goto(BASE + '/teacher.html');
  await sleep(1200);
  const has = await p.evaluate(() => !!document.querySelector('.gp-tour'));
  ok('ครูที่เข้าหน้าห้องเรียนของฉันครั้งแรก ก็เห็นกล่องแนะนำ', has, { has });
  await ctx.close();
}

console.log('\n═══ 6) ธีมมืด — กล่องต้องมืดตาม ไม่ขาวโพลนกลางจอดำ ═══');
{
  const ctx = await b.newContext({ colorScheme: 'light' });
  await ctx.addInitScript(() => localStorage.setItem('gp_theme', JSON.stringify({ m: 'dark', s: 'playful' })));
  const p = await ctx.newPage();
  await stub(p, { tour: true });
  await p.goto(BASE + '/index.html');
  await sleep(1000);
  const st = await p.evaluate(() => {
    const el = document.querySelector('.gp-tour');
    if (!el) return null;
    const lum = (c) => { const m = c.match(/\d+/g); return m ? (+m[0] * 299 + +m[1] * 587 + +m[2] * 114) / 1000 : 255; };
    return { box: lum(getComputedStyle(el).backgroundColor), page: lum(getComputedStyle(document.body).backgroundColor) };
  });
  ok('ครูเลือกธีมมืด → กล่องแนะนำมืดตาม', !!st && st.box < 110 && st.page < 110, st);
  await ctx.close();
}

await b.close(); srv.close();
process.exit(ok.done());
