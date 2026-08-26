/* ชุดทดสอบ 5 — สองเรื่องที่ครูสั่งรอบนี้
   1) ปุ่ม "สร้างห้องเรียน" ต้องอยู่บนหัวเว็บทุกหน้าสาธารณะ และกดแล้วถึงฟอร์มในคลิกเดียว
   2) ตัวชี้วัด/มาตรฐาน/สมรรถนะ/แหล่งหลักฐาน ต้องใช้ชื่อเต็ม และวางให้อ่านง่าย */
import { chromium, serve, stub, login, reporter, realErrors, launchOpts } from './harness.mjs';

const PORT = 8935, BASE = 'http://localhost:' + PORT;
const srv = await serve(PORT);
const b = await chromium.launch(launchOpts());
const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PUBLIC = ['/index.html', '/standards.html', '/support.html', '/contact.html'];

console.log('═══ 1) ปุ่ม "สร้างห้องเรียน" บนหัวเว็บ ═══');
for (const page of PUBLIC) {
  const p = await b.newPage();
  await stub(p);
  await p.goto(BASE + page);
  await sleep(1200);
  const st = await p.evaluate(() => {
    const btn = document.getElementById('new-room-btn');
    if (!btn) return { has: false };
    const bar = document.querySelector('.topbar');
    const nav = document.querySelector('.navlinks');
    const r = btn.getBoundingClientRect(), br = bar.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    const items = [...nav.children].filter((x) => x.tagName === 'A');
    return { has: true, inTopbar: bar.contains(btn), href: btn.getAttribute('href'),
      text: btn.textContent.trim(), primary: btn.classList.contains('btn-primary'),
      /* [V.1.6.28] เมนูอยู่แถวสองตายตัวทุกหน้า (มติครู 25 ส.ค. — เมนูต้องไม่เด้งย้ายที่)
         ปุ่มจึงอยู่ "ในแถวเมนู" ไม่ใช่แถวบนสุดอีกแล้ว — คุมด้วยเพดานความสูงหัวเว็บแทน */
      onFirstRow: r.top - br.top < 110, visible: r.width > 0 && r.height > 0,
      /* V.1.4.3 — ต้องอยู่ "ในเมนู ตัวแรกสุด" ตรงตำแหน่งที่ "เกมทั้งหมด" เคยอยู่ */
      inNav: nav.contains(btn), first: items[0] === btn,
      allGames: [...document.querySelectorAll('.navlinks a')]
        .filter((a) => a.textContent.trim() === 'เกมทั้งหมด').length,
      /* กันเคสที่เคยพลาด: .navlinks a หนักกว่า .btn-primary → ตัวหนังสือกลายเป็นสีเทาบนพื้นเข้ม */
      ink: cs.color, bg: cs.backgroundColor, padL: cs.paddingLeft,
      /* ปุ่มสลับสว่าง/มืดต้องยังอยู่ และต้องเป็นลูกตรงของหัวเว็บ
         (ย้ายปุ่มเข้าเมนูรอบนี้ทำให้ addThemeButton หา anchor ผิดจนโยน NotFoundError มาแล้ว) */
      themeBtn: !!bar.querySelector(':scope > #gp-theme-btn') };
  });
  ok(page + ' — มีปุ่มสร้างห้องเรียนบนหัวเว็บ ในแถวเมนู (แถวสองตายตัว)',
    st.has && st.inTopbar && st.onFirstRow && st.visible, st);
  ok(page + ' — เป็นปุ่มหลัก (เด่นกว่าปุ่มอื่น) และชี้ไปหน้าสร้างห้อง',
    st.primary && st.href === 'teacher.html#/rooms' && st.text.includes('สร้างห้องเรียน'), st);
  ok(page + ' — อยู่ในเมนู ตัวแรกสุด แทนที่ "เกมทั้งหมด" (ไม่เหลือเมนูเดิมค้าง)',
    st.inNav && st.first && st.allGames === 0, st);
  ok(page + ' — สีปุ่มไม่ถูกกฎของเมนูทับ (ตัวขาวบนพื้นเน้น ไม่ใช่ตัวเทา) และไม่ถูกเฉือน padding',
    st.ink === 'rgb(255, 255, 255)' && /^rgb\(/.test(st.bg) && parseFloat(st.padL) >= 10, st);
  ok(page + ' — ปุ่มสลับสว่าง/มืดยังอยู่บนหัวเว็บ (ไม่ถูกปุ่มใหม่ทำหาย)', st.themeBtn, st);
  await p.close();
}

/* หัวเว็บต้องไม่แตกตอนล็อกอินแล้ว — สภาพที่หนักที่สุดของหัวเว็บ
   V.1.4.3: ปุ่ม "สร้างห้องเรียน" ย้ายเข้าไปในเมนู (ซึ่งยกลงแถวสองได้ทั้งก้อน)
   ฝั่งขวาจึงว่างพอให้ "ห้องเรียนของฉัน" กลับมาได้ → ล็อกอินแล้วมีปุ่ม 3 ใบบนหัวเว็บ
   สิ่งที่ต้องคุมจึงไม่ใช่ "จำนวนปุ่ม" แต่คือ "หัวเว็บยังเป็นแถวเดียว ไม่ล้น ไม่ตกทีละใบ" */
for (const [w, label] of [[1280, 'โน้ตบุ๊ก'], [1440, 'จอกว้าง'], [390, 'มือถือ']]) {
  const p = await b.newPage();
  await p.setViewportSize({ width: w, height: 900 });
  await stub(p); await login(p);
  await p.goto(BASE + '/index.html');
  await sleep(1600);
  const st = await p.evaluate(() => {
    const bar = document.querySelector('.topbar');
    const btns = [...bar.querySelectorAll('.btn')].filter((x) => x.offsetParent !== null);
    /* ปุ่มบัญชี = ลูกตรงของหัวเว็บเท่านั้น (ปุ่มในเมนูไม่นับ มันไปกับก้อนเมนู) */
    const side = [...bar.children].filter((x) => x.classList.contains('btn') && x.offsetParent !== null);
    /* วัดด้วย "จุดกึ่งกลางแนวตั้ง" ไม่ใช่ขอบบน — ปุ่ม btn-sm เตี้ยกว่าปุ่มปกติ
       อยู่แถวเดียวกันแท้ ๆ แต่ค่า top ต่างกัน 5px เพราะจัดกึ่งกลางแนวตั้ง */
    const mids = side.map((x) => { const r = x.getBoundingClientRect(); return r.top + r.height / 2; });
    const spread = mids.length ? Math.round(Math.max(...mids) - Math.min(...mids)) : 0;
    return { n: btns.length, side: side.length, rows: spread < 10 ? 1 : 2, spread,
      barH: Math.round(bar.getBoundingClientRect().height),
      loggedIn: !!document.getElementById('auth-home'),
      themeBtn: !!bar.querySelector(':scope > #gp-theme-btn'),
      over: document.documentElement.scrollWidth - window.innerWidth };
  });
  /* [V.1.6.28] เมนูลงแถวสองตายตัวทุกความกว้าง — หัวเว็บสองแถวโดยเจตนา ≈120px
     เพดาน 140px ยังจับของจริงตก: แถวที่สามเมื่อไรจะทะลุ · ปุ่มบัญชีต้องแถวเดียวกันเสมอ
     (ก่อนแก้ ปุ่มออกจากระบบเคยตกบรรทัดบน dashboard/index ตอนล็อกอิน — ครูเห็นจากจอจริง) */
  ok('หัวเว็บ @' + w + 'px (' + label + ') — ล็อกอินแล้วปุ่มบัญชี 2 ใบยังอยู่แถวเดียวกัน',
    st.loggedIn && st.side === 2 && st.rows === 1 && (w < 700 || st.barH < 140), st);
  ok('หัวเว็บ @' + w + 'px — ปุ่มสลับสว่าง/มืดยังอยู่ และหน้าไม่ล้นแนวนอน',
    st.themeBtn && st.over <= 1, st);
  await p.close();
}

/* กดปุ่มแล้วต้องถึงฟอร์มเลย ไม่ใช่ไปกดปุ่มชื่อเดียวกันซ้ำอีกที */
{
  const p = await b.newPage();
  await stub(p);
  await p.goto(BASE + '/index.html');
  await sleep(1000);
  await p.click('#new-room-btn');
  await sleep(1500);
  const st = await p.evaluate(() => ({
    url: location.pathname + location.hash,
    formOpen: !!document.getElementById('or-grade'),
  }));
  ok('ยังไม่ล็อกอิน: กดปุ่มบนหัวเว็บแล้วฟอร์มสร้างห้องกางให้เลย (คลิกเดียว)',
    st.url.includes('teacher.html#/rooms') && st.formOpen, st);
  await p.close();
}
{
  const p = await b.newPage();
  await stub(p); await login(p);
  await p.goto(BASE + '/index.html');
  await sleep(1200);
  await p.click('#new-room-btn');
  await sleep(1600);
  const st = await p.evaluate(() => ({ form: !!document.getElementById('rf-grade'),
    head: document.getElementById('content').textContent.includes('สร้างห้องเรียนใหม่') }));
  ok('ล็อกอินแล้ว: กดปุ่มเดียวกันไปหน้าสร้างห้องปกติ', st.form && st.head, st);
  await p.close();
}

console.log('\n═══ 2) ชื่อเต็ม — ไม่มีชื่อย่อหลงเหลือในหน้าที่ครูอ่าน ═══');
/* ชื่อย่อที่เคยใช้ ห้ามโผล่ในหน้าสาธารณะอีก (เช่น "สังคมศึกษาฯ" ที่ตัดด้วย ฯ) */
const BANNED = ['วิทยาศาสตร์ฯ', 'สังคมศึกษาฯ', 'สุขศึกษาฯ', 'ธรรมชาติฯ'];
{
  const p = await b.newPage();
  await stub(p);
  await p.goto(BASE + '/standards.html');
  await sleep(2000);
  const st = await p.evaluate(() => {
    const main = document.getElementById('content').textContent;
    const tags = [...document.querySelectorAll('#std-wrap .tag')].map((t) => t.textContent.trim());
    return { main, tags,
      head: [...document.querySelectorAll('#std-wrap th')].map((t) => t.textContent.trim()) };
  });
  ok('ตารางมาตรฐานใช้ชื่อกลุ่มสาระเต็ม',
    st.tags.includes('สังคมศึกษา ศาสนา และวัฒนธรรม')
    && st.tags.includes('วิทยาศาสตร์และเทคโนโลยี'), st.tags);
  ok('ตารางมาตรฐานใช้ชื่อสมรรถนะเต็มทุกด้าน',
    st.tags.includes('การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน')
    && st.tags.includes('การรวมพลังทำงานเป็นทีม'), st.tags);
  ok('เกมที่วัดครบ 6 ด้านมีป้ายสรุปให้เห็นก่อน', st.tags.some((t) => t.includes('ครบ 6 ด้าน')), st.tags);
  ok('หัวตารางเขียนเต็มว่า "กลุ่มสาระการเรียนรู้"',
    st.head.some((h) => h.includes('กลุ่มสาระการเรียนรู้')), st.head);
  ok('ไม่มีชื่อย่อแบบตัดด้วย ฯ หลงเหลือ',
    !BANNED.some((w) => st.main.includes(w)), BANNED.filter((w) => st.main.includes(w)));
  ok('ไม่มีศัพท์คนทำระบบ ("Game Registry") โผล่ให้ครูอ่าน',
    !st.main.includes('Game Registry'), '');
  const typo = await p.evaluate(() => document.body.textContent.includes('ลิ๊กชั้น'));
  ok('ไม่มีคำสะกดผิดในสโลแกนท้ายหน้า (เดิมเขียนว่า "ลิ๊กชั้น")', !typo, '');

  /* แผงรายเกม: ชื่อเต็ม + หัวข้อกำกับเต็ม + จัดวางอ่านง่าย */
  const panel = await p.evaluate(() => {
    const el = document.querySelector('.gpstd');
    const labels = [...el.querySelectorAll('.gp-meta dt')].map((d) => d.textContent.trim());
    const names = [...el.querySelectorAll('.gp-name .gp-txt')].map((d) => d.textContent.trim());
    const codes = [...el.querySelectorAll('.gp-name .gp-code')].map((d) => d.textContent.trim());
    const cs = getComputedStyle(el);
    const nameEl = el.querySelector('.gp-name');
    return { labels: [...new Set(labels)], names, codes,
      bg: cs.backgroundColor, color: cs.color,
      /* ชิปรหัสกับชื่อต้องอยู่คนละคอลัมน์ (flex) ชื่อยาวจะได้ตัดบรรทัดตรงกัน ไม่ไหลใต้ชิป */
      nameIsFlex: getComputedStyle(nameEl).display === 'flex',
      hasSectionSrc: !!el.querySelector('.gp-sec-src') };
  });
  ok('แผงรายเกมใช้หัวข้อกำกับเต็ม — "แหล่งหลักฐาน" และ "เกณฑ์การวัด"',
    panel.labels.some((l) => l.includes('แหล่งหลักฐาน'))
    && panel.labels.some((l) => l.includes('เกณฑ์การวัด')), panel.labels);
  ok('ชื่อตัวชี้วัดและสมรรถนะเป็นชื่อเต็มจากทะเบียน',
    panel.names.some((n) => n.includes('สืบค้นและอธิบายลักษณะทางกายภาพ'))
    && panel.names.includes('การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน'), panel.names);
  ok('รหัสตัวชี้วัดแสดงเป็นชิปแยกจากชื่อ (ครูค้นด้วยรหัสก่อน)',
    panel.codes.includes('ส 5.1 ป.4/1') && panel.nameIsFlex, panel);
  ok('หัวข้อหมวดมีชื่อเต็มของกรอบหลักสูตรเป็นบรรทัดรอง', panel.hasSectionSrc, panel);

  /* ── [V.1.6.18 · ครูสั่ง 2 ข้อ] ────────────────────────────────────────
     ข้อ 4: "ชื่อเกมไม่เด่น ทำให้ดูไม่ออกว่ากรอบนี้เป็นของเกมไหน"
       เดิมหัวเรื่องเขียนว่า "มาตรฐานการเรียนรู้ที่เกมนี้วัด" เหมือนกันทุกใบ
       ชื่อเกมอยู่บรรทัดรองสีจาง 12.5px — พอเรียงหลายเกมต่อกันก็แยกไม่ออก
     ข้อ 2: "อยู่ ๆ ก็แสดงกลุ่มสาระวิทยาศาสตร์และเทคโนโลยีมาด้วย"
       ต้นเหตุ: แถว source='manual' ที่ผู้ดูแลกรอกไว้ ซึ่งตัวเกมลบเองไม่ได้
       แก้ด้วยการบอกที่มาบนจอ ไม่ใช่แก้ฐาน — ครูจะได้รู้ว่าไปแก้ที่ไหน */
  const head = await p.evaluate(() => {
    const el = document.querySelector('.gpstd');
    const h3 = el.querySelector('h3');
    const flagged = [...el.querySelectorAll('.gp-manual')]
      .map((x) => (x.closest('.gp-name, .gp-kid') || {}).textContent || '');
    return {
      h3: (h3 ? h3.textContent : '').trim(),
      h3Size: h3 ? parseFloat(getComputedStyle(h3).fontSize) : 0,
      sub: (el.querySelector('.gp-sub') || {}).textContent || '',
      flagged,
      flagTitle: (el.querySelector('.gp-manual') || {}).getAttribute
        ? el.querySelector('.gp-manual').getAttribute('title') : '',
    };
  });
  ok('⭐ ชื่อเกมเป็นหัวเรื่องของแผง ไม่ใช่บรรทัดรองสีจาง',
    head.h3.includes('กาญจนบุรี 2050') && head.h3Size >= 15, head);
  ok('คำอธิบายกรอบย้ายไปบรรทัดรอง — ไม่ได้หายไป ครูยังอ่านรู้ว่าแผงนี้คืออะไร',
    /มาตรฐานการเรียนรู้ที่เกมนี้วัด/.test(head.sub), head.sub);
  ok('⭐ ตัวชี้วัดที่ผู้ดูแลกรอกไว้ (เกมไม่ได้ประกาศ) ต้องติดป้ายบอก',
    head.flagged.length === 1
    && head.flagged[0].includes('การอยู่ร่วมกับธรรมชาติ'), head.flagged);
  ok('ป้ายบอกด้วยว่าต้องไปแก้ที่ไหน ไม่ใช่ติดป้ายเฉย ๆ',
    /ผู้ดูแล/.test(head.flagTitle) && /ลบ/.test(head.flagTitle), head.flagTitle);
  ok('ตัวชี้วัดที่เกมประกาศเอง ต้องไม่ติดป้าย (ไม่ใช่ติดหมดทุกใบ)',
    !head.flagged.some((t) => t.includes('สืบค้นและอธิบายลักษณะทางกายภาพ')), head.flagged);
  await p.close();
}

/* แผงมาตรฐานต้องกลืนกับธีมของเว็บ ไม่ใช่ยึดสีตัวเองแล้วขาวอยู่กล่องเดียวกลางหน้าดำ */
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
  await ctx.addInitScript(() => localStorage.setItem('gp_theme', JSON.stringify({ m: 'dark', s: 'playful' })));
  const p = await ctx.newPage(); await stub(p);
  await p.goto(BASE + '/standards.html');
  await sleep(2000);
  const st = await p.evaluate(() => {
    const el = document.querySelector('.gpstd');
    const lum = (c) => { const m = c.match(/\d+/g); return m ? (+m[0] * 299 + +m[1] * 587 + +m[2] * 114) / 1000 : 255; };
    return { panel: lum(getComputedStyle(el).backgroundColor),
      page: lum(getComputedStyle(document.body).backgroundColor) };
  });
  ok('ครูเลือกธีมมืด → แผงมาตรฐานมืดตาม ไม่ขาวโพลนอยู่กล่องเดียว',
    st.panel < 100 && st.page < 100, st);
  await ctx.close();
}
{
  /* เครื่องตั้งโหมดมืด แต่ครูเลือกธีมสว่างบนเว็บ — แผงต้องสว่างตามที่ครูเลือก (บั๊กเดิม) */
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  await ctx.addInitScript(() => localStorage.setItem('gp_theme', JSON.stringify({ m: 'light', s: 'playful' })));
  const p = await ctx.newPage(); await stub(p);
  await p.goto(BASE + '/standards.html');
  await sleep(2000);
  const st = await p.evaluate(() => {
    const el = document.querySelector('.gpstd');
    const lum = (c) => { const m = c.match(/\d+/g); return m ? (+m[0] * 299 + +m[1] * 587 + +m[2] * 114) / 1000 : 255; };
    return { panel: lum(getComputedStyle(el).backgroundColor), page: lum(getComputedStyle(document.body).backgroundColor) };
  });
  ok('เครื่องมืดแต่ครูเลือกธีมสว่าง → แผงสว่างตามที่ครูเลือก (เดิมดำอยู่กล่องเดียว)',
    st.panel > 200 && st.page > 200, st);
  await ctx.close();
}

console.log('\n═══ 3) ตัวกรองและการ์ดเกมบนหน้าแรกก็ใช้ชื่อเต็ม ═══');
{
  const p = await b.newPage();
  const calls = await stub(p);
  await p.goto(BASE + '/index.html');
  await p.waitForSelector('.gcard', { timeout: 15000 });
  await sleep(600);
  const st = await p.evaluate(() => ({
    chips: [...document.querySelectorAll('.chip')].map((c) => c.textContent.trim()),
    cardTags: [...document.querySelectorAll('#cat .gcard .tag')].map((t) => t.textContent.trim()),
    body: document.getElementById('content').textContent,
  }));
  ok('ชิปตัวกรองกลุ่มสาระใช้ชื่อเต็ม',
    st.chips.some((c) => c.includes('สังคมศึกษา ศาสนา และวัฒนธรรม')), st.chips);
  ok('ชิปตัวกรองสมรรถนะใช้ชื่อเต็ม',
    st.chips.some((c) => c.includes('การจัดการตนเอง')), st.chips);
  ok('การ์ดเกมแสดงสมรรถนะเป็นป้ายชื่อเต็ม ไม่ใช่ข้อความต่อกันด้วยจุด',
    st.cardTags.includes('การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน'), st.cardTags);
  ok('ไม่มีชื่อย่อแบบตัดด้วย ฯ บนหน้าแรก',
    !BANNED.some((w) => st.body.includes(w)), BANNED.filter((w) => st.body.includes(w)));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}
{
  const p = await b.newPage();
  await stub(p); await login(p);
  await p.goto(BASE + '/teacher.html#/room/' + (await import('./fixtures.mjs')).R1);
  await sleep(1600);
  await p.click('[data-tab="comp"]');
  await sleep(600);
  const heads = await p.evaluate(() =>
    [...document.querySelectorAll('#content table th')].map((t) => t.textContent.trim()));
  ok('ตารางสมรรถนะรายคนในหน้าครูใช้ชื่อเต็มเป็นหัวคอลัมน์',
    heads.includes('การรวมพลังทำงานเป็นทีม') && heads.includes('การอยู่ร่วมกับธรรมชาติฯ') === false,
    heads);
  await p.close();
}

await b.close(); srv.close();
process.exit(ok.done());
