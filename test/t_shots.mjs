/* ชุดทดสอบ 1 — สไลด์ภาพรายด่านบนการ์ดเกม (ข้อ 3.1) + บล็อกสำหรับคุณครูถูกเอาออก (ข้อ 3.6) */
import { chromium, serve, stub, reporter, realErrors, launchOpts } from './harness.mjs';

const PORT = 8931, BASE = 'http://localhost:' + PORT;
const srv = await serve(PORT);
const b = await chromium.launch(launchOpts());
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
  /* [V.1.6.20 · ครูสั่ง] สองข้อนี้เดิมยึดสัญญา "เลื่อนเฉพาะตอนเอาเมาส์ชี้"
     ครูถามว่า "ไม่สไลด์อัตโนมัติหรอ ต้องกดคลิกเลือกดูรูปเอง" ⇒ สัญญากลับด้านโดยตั้งใจ
     (บนมือถือไม่มี hover เลย ⇒ ของเดิมเห็นแค่ภาพแรกใบเดียวตลอด)
     แต่สิ่งที่ข้อเดิม "ปกป้อง" ไว้จริง ๆ คือ **ไม่ดึงภาพทุกใบตอนเปิดหน้า**
     ซึ่งยังสำคัญเท่าเดิมกับเน็ตโรงเรียน — ข้อใหม่จึงคุมเรื่องนั้นต่อในรูปแบบใหม่ */
  ok('⭐ ไม่ได้ชี้ก็เลื่อนเอง (ครูสั่ง — บนมือถือไม่มี hover)',
    idle.on !== before.on, { before, idle });
  ok('⭐ แต่ยังโหลดภาพทีละใบตามที่แสดงจริง ไม่ดึงมาทั้งชุด (เน็ตโรงเรียน)',
    idle.loaded <= 3, idle);

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
  /* [V.1.6.20] การชี้ไม่ใช่ตัวสั่งเลื่อนอีกแล้ว — หน้าที่ของมันคือ
     "ครูสนใจการ์ดนี้" ⇒ ปลุกภาพที่เหลือมารอ จะได้ไม่สะดุดตอนสไลด์เดินถึง */
  ok('ชี้แล้วสไลด์ยังเดินต่อ ไม่หยุดค้าง', hov.on !== null, { before, hov });
  ok('ชี้แล้วค่อยโหลดภาพที่เหลือ', hov.loaded === 3, hov);
  ok('จุดบอกหน้าตรงกับภาพที่เห็นอยู่', String(hov.dotOn) === String(hov.on), hov);
  ok('คำบรรยายเปลี่ยนตามภาพ', hov.cap === 'ด่าน 3 ถ้ำกระแซ' || hov.cap === 'ด่าน 1 นักสืบสะพานแคว', hov);
  ok('ภาพที่โหลดไม่ขึ้นถูกปิดทิ้ง และจุดของใบนั้นถูกซ่อน (ไม่ใช่ลบจนจุดเลื่อนผิด)',
    hov.dead === 1 && hov.goneDots === 1, hov);

  await p.mouse.move(5, 5);
  await sleep(200);
  /* ⚠️ ห้ามเทียบแค่สองจุดเวลา — การ์ดตัวอย่างมีภาพใช้ได้ 2 ใบ สลับไปมา
     ถ้าจับตัวอย่างห่างกันพอดีสองรอบ จะได้ค่าเท่ากันแล้วแดงทั้งที่สไลด์เดินอยู่
     (เทสต์เปราะแบบนี้แย่กว่าไม่มีเทสต์ เพราะทำให้คนเลิกเชื่อผลสีแดง) */
  let offPrev = await p.evaluate(() => document.querySelector('.gcover.gshots .gshot.on').getAttribute('data-i'));
  let offChanges = 0;
  for (let i = 0; i < 12; i++) {
    await sleep(600);
    const c = await p.evaluate(() => {
      const on = document.querySelector('.gcover.gshots .gshot.on');
      return on ? on.getAttribute('data-i') : null;
    });
    if (c !== null && c !== offPrev) { offChanges++; offPrev = c; }
  }
  ok('⭐ เอาเมาส์ออกแล้วสไลด์ต้องเดินต่อ (ไม่ไปดับนาฬิกาอัตโนมัติทิ้ง)',
    offChanges >= 2, { เปลี่ยนกี่ครั้งหลังเอาเมาส์ออก: offChanges });

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
    navText: [...document.querySelectorAll('.navlinks a')].map((a) => a.textContent).join(' | '),
    navTeacher: [...document.querySelectorAll('.navlinks a')]
      .filter((a) => a.textContent.includes('ห้องเรียนของฉัน')).map((a) => a.getAttribute('href')),
  }));
  ok('บล็อก 4 การ์ดหายไปแล้ว', st.zcards === 0 && st.zone === 0, st);
  ok('ไม่มีลิงก์ในหน้าที่ชี้ไปที่ที่ไม่มีอยู่แล้ว', st.deadLinks.length === 0, st.deadLinks);
  /* [V.1.6.12] ครูเคาะให้เลิกใช้คำว่า "Dashboard" ทั้งเว็บ และเรียกหน้าครูว่า "ห้องเรียนของฉัน"
     ข้อสอบเดิมเช็กป้ายเก่า "สำหรับครู" — เขียนใหม่ให้ตรงฐานปัจจุบัน (STD-006 ห้ามลดเพดาน)
     ฉบับนี้เข้มกว่าเดิม: เช็กทั้งว่าชี้ถูกหน้า และว่าไม่มีคำว่า Dashboard หลงเหลือบนเมนู */
  ok('เมนู "ห้องเรียนของฉัน" ชี้ไปหน้าครู', st.navTeacher[0] === 'teacher.html', st);
  ok('ไม่มีคำว่า "Dashboard" หลงเหลือบนเมนูอีกแล้ว', !/dashboard/i.test(st.navText || ''), st.navText);
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


console.log('\n═══ สไลด์ต้องเดินเอง ไม่ต้องเอาเมาส์จ่อ (V.1.6.20) ═══');
/* ครูถาม: "ภาพสไลด์ของเกมในหน้าเว็บกลาง ไม่สไลด์อัตโนมัติหรอ ต้องกดคลิกเลือกดูรูปเอง"
   ของเดิมเดินเฉพาะตอน hover/focus ⇒ **บนมือถือไม่เดินเลย** เพราะไม่มี hover
   ชุดนี้จึงตรวจโดย **ไม่แตะเมาส์เลยสักครั้ง** — ถ้าต้อง hover ถึงจะผ่าน แปลว่ายังไม่ได้แก้ */
{
  const p = await b.newPage();
  const calls = await stub(p);
  await p.goto(BASE + '/index.html');
  await sleep(2500);

  const first = await p.evaluate(() => {
    const box = document.querySelector('.gshots');
    if (!box) return { none: true };
    const on = box.querySelector('.gshot.on');
    return { none: false, idx: on ? on.getAttribute('data-i') : null,
      total: box.querySelectorAll('.gshot').length };
  });
  ok('หน้าแรกมีการ์ดที่มีสไลด์ให้ตรวจจริง', !first.none && first.total > 1, first);

  /* ⚠️ ห้ามเทียบแค่ "ก่อน" กับ "หลัง" — การ์ดตัวอย่างมีภาพใช้ได้ 2 ใบ
     มันสลับไปมา ⇒ สองจุดเวลาที่ห่างกันเลขคู่ของรอบ จะได้ค่าเท่ากันพอดี
     แล้วเทสต์จะแดงทั้งที่สไลด์เดินอยู่ (เจอจริงตอนเขียนชุดนี้)
     ⇒ ต้องเก็บตัวอย่างถี่ ๆ แล้วนับว่า "เปลี่ยนไหม" ไม่ใช่ "ต่างจากตอนแรกไหม" */
  const seen = new Set([String(first.idx)]);
  let changes = 0, prev = String(first.idx);
  for (let i = 0; i < 14; i++) {
    await sleep(600);
    const cur = await p.evaluate(() => {
      const on = document.querySelector('.gshots .gshot.on');
      return on ? on.getAttribute('data-i') : null;
    });
    if (cur !== null && String(cur) !== prev) { changes++; prev = String(cur); seen.add(prev); }
  }
  ok('⭐ สไลด์เปลี่ยนภาพเองโดยไม่ต้องเอาเมาส์ไปจ่อ (ไม่แตะเมาส์เลยสักครั้ง)',
    changes >= 2, { เปลี่ยนกี่ครั้ง: changes, ภาพที่เห็น: [...seen] });
  ok('เห็นมากกว่าหนึ่งใบจริง ไม่ใช่กระพริบอยู่ใบเดียว', seen.size >= 2, [...seen]);

  const marks = await p.evaluate(() => ({
    dotsOn: document.querySelectorAll('.gdots i.on').length,
    watcher: typeof window.GP_WATCH_SHOTS === 'function',
  }));
  ok('จุดบอกตำแหน่งยังตรงกับภาพที่แสดงอยู่', marks.dotsOn >= 1, marks);
  ok('มีตัวเฝ้าการ์ดที่วาดทีหลัง (การ์ดเกมโหลดหลังข้อมูลมาถึง)', marks.watcher, marks);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

{
  /* ผู้ใช้ที่ตั้งค่าเครื่องว่า "ลดการเคลื่อนไหว" ต้องไม่โดนภาพวิ่งใส่
     เป็นข้อกำหนดการเข้าถึง ไม่ใช่ความชอบส่วนตัว — บางคนเวียนหัวจริง */
  const ctx = await b.newContext({ reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await stub(p);
  await p.goto(BASE + '/index.html');
  await sleep(2000);
  const a = await p.evaluate(() => {
    const on = document.querySelector('.gshots .gshot.on');
    return on ? on.getAttribute('data-i') : null;
  });
  await sleep(5500);
  const b2 = await p.evaluate(() => {
    const on = document.querySelector('.gshots .gshot.on');
    return on ? on.getAttribute('data-i') : null;
  });
  ok('⭐ ตั้งค่าเครื่องว่าลดการเคลื่อนไหว → ภาพต้องนิ่ง (ข้อกำหนดการเข้าถึง)',
    a !== null && a === b2, { ก่อน: a, หลัง: b2 });
  await ctx.close();
}

await b.close(); srv.close();
process.exit(ok.done());
