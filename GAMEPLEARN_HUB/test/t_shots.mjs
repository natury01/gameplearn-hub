/* ชุดทดสอบ 1 — สไลด์ภาพรายด่านบนการ์ดเกม (ข้อ 3.1) + บล็อกสำหรับคุณครูถูกเอาออก (ข้อ 3.6) */
import { chromium, serve, stub, reporter, realErrors } from './harness.mjs';

const PORT = 8931, BASE = 'http://localhost:' + PORT;
const srv = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('═══ 1) หน้าแรก — สไลด์ภาพรายด่าน ═══');
{
  const p = await b.newPage();
  const calls = await stub(p);
  await p.goto(BASE + '/index.html');
  await p.waitForSelector('.gcard', { timeout: 15000 });
  await sleep(700);

  const st = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#cat .gcard')];
    const byName = {};
    cards.forEach((c) => { byName[c.querySelector('h3').textContent.trim()] = c; });
    const c1 = byName['กาญจนบุรี 2050'], c2 = byName['กาญจนบุรี 2050 ภาค 2'];
    const shots = (c) => [...c.querySelectorAll('.gshot')];
    return {
      names: Object.keys(byName),
      g1IsSlide: !!c1.querySelector('.gcover.gshots'),
      g1Shots: shots(c1).length,
      g1WithSrc: shots(c1).filter((i) => i.getAttribute('src')).length,
      g1Lazy: shots(c1).filter((i) => i.getAttribute('data-src')).length,
      g1Dots: c1.querySelectorAll('.gdots i').length,
      g1Cap: (c1.querySelector('.gcap') || {}).textContent,
      g1Ribbon: !!c1.querySelector('.ribbon'),
      g1Part: !!c1.querySelector('.partno'),
      g2IsSlide: !!c2.querySelector('.gcover.gshots'),
      g2Shots: shots(c2).length,
      g2Dots: c2.querySelectorAll('.gdots i').length,
    };
  });

  ok('การ์ดเกมที่มีภาพหลายใบกลายเป็นสไลด์', st.g1IsSlide, st);
  ok('รับเฉพาะ https — ใบ http ถูกคัดทิ้ง (ส่งมา 4 ใบ เหลือ 3)', st.g1Shots === 3, st);
  ok('lazy: มีแค่ใบแรกที่ใส่ src ตั้งแต่วาด ที่เหลือรออยู่ใน data-src',
    st.g1WithSrc === 1 && st.g1Lazy === 2, st);
  ok('จุดบอกหน้าเท่าจำนวนภาพ', st.g1Dots === 3, st);
  ok('คำบรรยายเริ่มที่ชื่อด่านใบแรก', st.g1Cap === 'ด่าน 1 นักสืบสะพานแคว', st);
  ok('ป้าย ⭐ แนะนำ และ ภาค N ยังติดอยู่บนปกที่เป็นสไลด์', st.g1Ribbon && st.g1Part, st);
  ok('ภาพเดียว = ไม่เป็นสไลด์ (ไม่มีคลาส gshots ไม่มีจุด)',
    !st.g2IsSlide && st.g2Shots === 1 && st.g2Dots === 0, st);

  /* ---- เลื่อนเฉพาะการ์ดที่ชี้ ---- */
  const before = await p.evaluate(() => {
    const c = [...document.querySelectorAll('#cat .gcard')]
      .find((x) => x.querySelector('h3').textContent.includes('ภาค 2') === false);
    return { on: c.querySelector('.gshot.on').getAttribute('data-i') };
  });
  await sleep(3000);
  const idle = await p.evaluate(() => {
    const c = [...document.querySelectorAll('#cat .gcard')]
      .find((x) => !x.querySelector('h3').textContent.includes('ภาค 2'));
    return { on: c.querySelector('.gshot.on').getAttribute('data-i'),
      loaded: [...c.querySelectorAll('.gshot')].filter((i) => i.getAttribute('src')).length };
  });
  ok('ไม่ได้ชี้ = ไม่เลื่อนเอง (การ์ดทั้งหน้าไม่กระพริบพร้อมกัน)', idle.on === before.on, { before, idle });
  ok('ไม่ได้ชี้ = ยังไม่โหลดภาพใบอื่น (ประหยัดเน็ตโรงเรียน)', idle.loaded === 1, idle);

  await p.hover('#cat .gcard .gcover.gshots');
  await sleep(3200);
  const hov = await p.evaluate(() => {
    const c = document.querySelector('#cat .gcard .gcover.gshots');
    const on = c.querySelector('.gshot.on');
    const dots = [...c.querySelectorAll('.gdots i')];
    return { on: on && on.getAttribute('data-i'), cap: c.querySelector('.gcap').textContent,
      dotOn: dots.findIndex((d) => d.classList.contains('on')),
      loaded: [...c.querySelectorAll('.gshot')].filter((i) => i.getAttribute('src')).length,
      dead: [...c.querySelectorAll('.gshot.dead')].length,
      goneDots: dots.filter((d) => d.classList.contains('gone')).length };
  });
  ok('ชี้แล้วเลื่อนไปใบถัดไป', hov.on !== before.on, { before, hov });
  ok('ชี้แล้วค่อยโหลดภาพที่เหลือ', hov.loaded === 3, hov);
  ok('จุดบอกหน้าตรงกับภาพที่เห็นอยู่', String(hov.dotOn) === String(hov.on), hov);
  ok('คำบรรยายเปลี่ยนตามภาพ', hov.cap === 'ด่าน 3 ถ้ำกระแซ' || hov.cap === 'ด่าน 1 นักสืบสะพานแคว', hov);
  ok('ภาพที่โหลดไม่ขึ้นถูกปิดทิ้ง และจุดของใบนั้นถูกซ่อน (ไม่ใช่ลบจนจุดเลื่อนผิด)',
    hov.dead === 1 && hov.goneDots === 1, hov);

  await p.mouse.move(5, 5);
  await sleep(200);
  const stopped = await p.evaluate(() => document.querySelector('.gcover.gshots .gshot.on').getAttribute('data-i'));
  await sleep(3000);
  const stillStopped = await p.evaluate(() => document.querySelector('.gcover.gshots .gshot.on').getAttribute('data-i'));
  ok('เอาเมาส์ออกแล้วหยุดเลื่อนทันที', stopped === stillStopped, { stopped, stillStopped });

  ok('สคริปต์ไม่พัง (ภาพเสีย 1 ใบไม่ทำให้หน้าล้ม)', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 2) ยังไม่ได้รัน 57 — ต้องทำงานเหมือนเดิมทุกประการ ═══');
{
  const p = await b.newPage();
  const calls = await stub(p, { noMedia: true });
  await p.goto(BASE + '/index.html');
  await p.waitForSelector('.gcard', { timeout: 15000 });
  await sleep(500);
  const st = await p.evaluate(() => ({
    cards: document.querySelectorAll('#cat .gcard').length,
    shots: document.querySelectorAll('.gshot').length,
    covers: document.querySelectorAll('.gcover').length,
    ribbon: document.querySelectorAll('.ribbon').length,
    text: document.getElementById('cat').textContent.slice(0, 60),
  }));
  ok('ยังวาดการ์ดครบ', st.cards === 2, st);
  ok('ไม่มีสไลด์ ไม่มีช่องว่าง — ใช้ปกเดิม', st.shots === 0 && st.covers === 2, st);
  ok('สคริปต์ไม่พังตอนไม่มีตาราง game_media', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 3) บล็อก "สำหรับคุณครู" 4 การ์ด ถูกเอาออกแล้ว ═══');
{
  const p = await b.newPage();
  await stub(p);
  await p.goto(BASE + '/index.html');
  await p.waitForSelector('.gcard', { timeout: 15000 });
  const st = await p.evaluate(() => ({
    zcards: document.querySelectorAll('.zcards').length,
    zone: document.querySelectorAll('.zone').length,
    anchor: document.querySelectorAll('#teacher-zone').length,
    deadLinks: [...document.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href'))
      .filter((h) => h !== '#' && h.length > 1 && !document.querySelector(h)),
    navTeacher: [...document.querySelectorAll('.navlinks a')]
      .filter((a) => a.textContent.includes('สำหรับครู')).map((a) => a.getAttribute('href')),
  }));
  ok('บล็อก 4 การ์ดหายไปแล้ว', st.zcards === 0 && st.zone === 0, st);
  ok('ไม่มีลิงก์ในหน้าที่ชี้ไปที่ที่ไม่มีอยู่แล้ว', st.deadLinks.length === 0, st.deadLinks);
  ok('เมนู "สำหรับครู" ชี้ไปหน้าครูแทน', st.navTeacher[0] === 'teacher.html', st);
  await p.close();
}

console.log('\n═══ 4) ชุดจริงจากภาค 1 — 14 ด่าน (คำตอบเอกสาร 58) ═══');
{
  const p = await b.newPage();
  const calls = await stub(p, { p1media: true });
  await p.goto(BASE + '/index.html');
  await p.waitForSelector('.gcard', { timeout: 15000 });
  await sleep(700);
  const st = await p.evaluate(() => {
    const c = [...document.querySelectorAll('#cat .gcard')]
      .find((x) => x.querySelector('h3').textContent.trim() === 'กาญจนบุรี 2050');
    const cover = c.querySelector('.gcover');
    const shots = [...c.querySelectorAll('.gshot')];
    const dots = c.querySelector('.gdots');
    const r = cover.getBoundingClientRect();
    const dr = dots.getBoundingClientRect();
    const cap = c.querySelector('.gcap');
    const cr = cap.getBoundingClientRect();
    return {
      n: shots.length,
      isSlide: cover.classList.contains('gshots'),
      dots: c.querySelectorAll('.gdots i').length,
      firstSrc: shots[0].getAttribute('src'),
      /* ใบที่มี src ต้องเป็นใบที่อยู่ตำแหน่งแรกของอาเรย์ ไม่ใช่ใบที่ชื่อไฟล์ดูเหมือนใบแรก */
      firstIsFirstSorted: shots[0].classList.contains('on')
        && shots.slice(1).every((i) => !i.getAttribute('src')),
      loaded: shots.filter((i) => i.getAttribute('src')).length,
      firstCap: cap.textContent,
      alts: shots.slice(0, 3).map((i) => i.getAttribute('alt')),
      coverW: Math.round(r.width), coverH: Math.round(r.height),
      ratio: +(r.width / r.height).toFixed(3),
      dotsFit: dr.width <= r.width - 12,
      capBandPct: +((cr.height / r.height) * 100).toFixed(1),
      /* อยู่เฉย ๆ ต้องไม่มีแถบทับภาพเลย — ภาพเป็นเนื้อหาของเจ้าของเกม ไม่ใช่พื้นที่ของเว็บกลาง */
      capHiddenAtRest: +getComputedStyle(cap).opacity === 0,
    };
  });
  ok('การ์ดภาค 1 เป็นสไลด์ครบ 14 ใบ', st.isSlide && st.n === 14, st);
  ok('จุดบอกหน้า 14 จุด และยังอยู่ในกรอบปก ไม่ล้น', st.dots === 14 && st.dotsFit, st);
  ok('ตอนเปิดหน้าโหลดภาพจริงใบเดียว', st.loaded === 1, st);
  /* ⚠️ ห้ามผูกกับชื่อไฟล์ — รหัสด่านของภาค 1 ไม่ใช่เลข 1-14 เรียงกัน (มี mg1 · hellfire · pilok ปนอยู่)
     ยึด "ใบแรกของอาเรย์ที่เรียงตาม sort" อย่างเดียว ซึ่งเป็นสัญญาที่ตกลงกันไว้จริง */
  ok('ใบที่โหลดคือใบแรกตามลำดับ sort (ด่านสะพานข้ามแม่น้ำแคว)',
    st.firstIsFirstSorted && st.firstCap.includes('สะพานข้ามแม่น้ำแคว'), st);
  ok('alt ที่ภาค 1 ส่งมาถูกใส่ให้โปรแกรมอ่านหน้าจอครบ',
    st.alts.every((a) => a && a.length > 5), st.alts);
  ok('กรอบปกเป็น 16:9 พอดี (ภาพ 1200×675 จึงไม่ถูกตัดขอบ)',
    Math.abs(st.ratio - 16 / 9) < 0.02, st);
  ok('อยู่เฉย ๆ ไม่มีแถบชื่อด่านทับภาพเลย (ภาค 1 พบว่าแผงเล่นของ 3 ด่านอยู่ริมล่างพอดี)',
    st.capHiddenAtRest, st);
  ok('แถบชื่อด่านตอนเอาเมาส์ชี้ ทับไม่เกิน 16% ของความสูง (เดิม 21%)',
    st.capBandPct <= 16, st.capBandPct);
  ok('สคริปต์ไม่พังกับชุด 14 ใบ', realErrors(calls).length === 0, realErrors(calls));
  console.log('     ℹ️  กรอบปกจริงบนจอนี้: ' + st.coverW + '×' + st.coverH + ' css px'
    + ' · แถบชื่อด่านคลุมส่วนล่างราว ' + st.capBandPct + '% ของภาพ');
  await p.close();
}

/* กรณีที่ภาค 1 กันไว้ชั้นที่ 6: ครูอัปโหลด index.html แล้วลืมโฟลเดอร์ img/
   เกมกันไม่ให้ส่งขึ้นมาตั้งแต่ต้น แต่ถ้าลิงก์เก่าค้างในฐานอยู่แล้ว (เช่นย้ายโดเมน)
   ฝั่งเว็บกลางต้องถอยกลับไปปกเดิมอย่างสะอาด ไม่ใช่โชว์ชื่อด่านค้างบนภาพที่ไม่ใช่ด่านนั้น */
{
  const p = await b.newPage();
  const calls = await stub(p, { p1media: true, brokenHost: true });
  await p.goto(BASE + '/index.html');
  await p.waitForSelector('.gcard', { timeout: 15000 });
  await sleep(600);
  await p.hover('#cat .gcard .gcover.gshots');
  await sleep(3000);
  const st = await p.evaluate(() => {
    const c = document.querySelector('#cat .gcover.gshots');
    const cap = c.querySelector('.gcap');
    return { dead: c.querySelectorAll('.gshot.dead').length,
      capText: cap.textContent, capHidden: cap.hidden,
      dotsShown: getComputedStyle(c.querySelector('.gdots')).display !== 'none',
      base: !!c.textContent.trim() || !!c.querySelector('.gbase') };
  });
  ok('ภาพทั้งชุดโหลดไม่ขึ้น → ถอยไปปกเดิม และเก็บชื่อด่านกับจุดบอกหน้าไปด้วย',
    st.capHidden && st.capText === '' && !st.dotsShown, st);
  ok('ไม่มีชื่อด่านค้างอยู่บนปกที่ไม่ใช่ด่านนั้น', st.capText === '', st);
  ok('สคริปต์ไม่พังแม้ภาพตายทั้ง 14 ใบ', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

await b.close(); srv.close();
process.exit(ok.done());
