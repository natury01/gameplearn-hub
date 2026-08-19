/* ชุดทดสอบ 6 — หน้า Admin: ช่องแก้ "คำอธิบายที่ครูอ่าน" รายตัวชี้วัด (ไฟล์ 71)

   ทำไมชุดนี้ถึงสำคัญกว่าที่เห็น:
   กติกา "เกมเป็นเจ้าของ 'วัดอะไร' · ผู้ดูแลเป็นเจ้าของ 'คำที่ครูอ่าน'" ประกาศไว้ตั้งแต่ไฟล์ 66
   ฐานกันไม่ให้เกมทับข้อความได้แล้ว และทั้งสองภาคทำท่อ `kept_manual` รอไว้แล้ว
   **แต่ไม่มีใครได้ใช้เลย เพราะไม่มีที่ให้ผู้ดูแลแก้** — ชุดนี้คุมชิ้นส่วนที่ขาดไปนั้น */
import { chromium, serve, stub, login, reporter, realErrors, launchOpts, ROOT as HUBROOT } from './harness.mjs';
import * as F from './fixtures.mjs';
import fs from 'fs';

const PORT = 8936, BASE = 'http://localhost:' + PORT;
const srv = await serve(PORT);
const b = await chromium.launch(launchOpts());
const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* เปิดหน้า Admin → แท็บทะเบียนเกม → กดแก้ไขเกมแรก */
async function openEditor(opt) {
  const p = await b.newPage();
  const calls = await stub(p, Object.assign({ admin: true }, opt || {}));
  await login(p);
  await p.goto(BASE + '/admin.html');
  await sleep(1400);
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('.tab')].find((x) => x.getAttribute('data-tab') === 'games');
    if (t) t.click();
  });
  await sleep(1200);
  await p.evaluate((gid) => {
    const btn = document.querySelector('[data-edit="' + gid + '"]');
    if (btn) btn.click();
  }, F.G1);
  await sleep(500);
  return { p, calls };
}

console.log('═══ 1) ตารางแก้คำอธิบายขึ้นครบ และดึงข้อความเดิมมาให้ ═══');
{
  const { p, calls } = await openEditor();
  const st = await p.evaluate((gid) => {
    const box = document.getElementById('gfi-desc-' + gid);
    const inputs = [...document.querySelectorAll('[data-desc="' + gid + '"]')];
    return { has: !!box,
      rows: document.querySelectorAll('[data-desc="' + gid + '"][data-dfield="note"]').length,
      fields: [...new Set(inputs.map((x) => x.getAttribute('data-dfield')))].sort(),
      firstNote: (document.querySelector('[data-desc="' + gid + '"][data-item="i1"][data-dfield="note"]') || {}).value,
      firstCrit: (document.querySelector('[data-desc="' + gid + '"][data-item="i1"][data-dfield="criteria"]') || {}).value,
      head: (box || {}).textContent || '',
      saveBtn: !!document.querySelector('[data-savedesc="' + gid + '"]'),
      warn: !!document.querySelector('[data-need71]') };
  }, F.G1);
  ok('มีตารางแก้คำอธิบายในหน้าแก้ไขเกม', st.has && st.saveBtn, st);
  ok('มีแถวครบทุกตัวชี้วัด/สมรรถนะที่ผูกกับเกม (6 แถว)', st.rows === 6, st);
  ok('มีครบ 3 ช่อง: หมายเหตุ · แหล่งหลักฐาน · เกณฑ์การวัด',
    st.fields.join(',') === 'criteria,evidence,note', st.fields);
  ok('ดึงข้อความเดิมจากฐานมาใส่ให้ ไม่ใช่ช่องว่างเปล่า',
    (st.firstNote || '').includes('ด่าน 1') && (st.firstCrit || '').includes('ผ่าน'), st);
  ok('บอกกติกาเจ้าของข้อมูลไว้ตรงนั้น ไม่ต้องไปเปิดเอกสาร',
    st.head.includes('วัดที่') && st.head.includes('แหล่งหลักฐาน') && st.head.includes('เกณฑ์การวัด'), st.head.slice(0, 120));
  ok('ฐานรันไฟล์ 71 แล้ว = ไม่ขึ้นคำเตือนให้ไปรัน SQL', !st.warn, st);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 2) แก้แล้วบันทึก — ต้องปักธงว่าเป็นข้อความของผู้ดูแล ═══');
{
  const { p, calls } = await openEditor();
  await p.evaluate((gid) => {
    const el = document.querySelector('[data-desc="' + gid + '"][data-item="i1"][data-dfield="note"]');
    el.value = 'ผู้ดูแลแก้เอง — ด่าน 2 ตลาดน้ำ';
  }, F.G1);
  await p.click('[data-savedesc="' + F.G1 + '"]');
  await sleep(900);
  const patches = calls.filter((c) => c[0] === 'PATCH' && String(c[1]).includes('game_framework_items'));
  const body = patches.length ? JSON.parse(patches[0][2] || '{}') : {};
  ok('ยิงคำขอบันทึกเฉพาะแถวที่เปลี่ยนจริง (1 แถว ไม่ใช่ 6)', patches.length === 1, patches.map((x) => x[1]));
  ok('ยิงไปที่แถวที่ถูกต้อง (ระบุทั้งเกมและตัวชี้วัด)',
    String((patches[0] || [])[1]).includes('game_id=eq.') && String((patches[0] || [])[1]).includes('item_id=eq.i1'),
    (patches[0] || [])[1]);
  ok('ส่งข้อความใหม่ไปจริง', body.note === 'ผู้ดูแลแก้เอง — ด่าน 2 ตลาดน้ำ', body);
  ok('⭐ ปักธง admin_edited = true (ถ้าไม่ปัก เกมจะทับข้อความคืนในการส่งครั้งถัดไป)',
    body.admin_edited === true, body);
  const st = await p.evaluate((gid) => ({
    stat: (document.querySelector('[data-descstat="' + gid + '"]') || {}).textContent || '',
    tag: (document.getElementById('gfi-desc-' + gid) || {}).textContent || '' }), F.G1);
  ok('บอกผลให้ผู้ดูแลเห็นว่าบันทึกแล้วกี่รายการ', st.stat.includes('บันทึกแล้ว'), st.stat);
  ok('ติดป้าย "ข้อความของผู้ดูแล" ให้แถวนั้นทันที ไม่ต้องรีโหลด', st.tag.includes('ข้อความของผู้ดูแล'), st.tag.slice(0, 200));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 3) ลบข้อความออกจนว่าง = คืนช่องให้เกมเป็นคนบอก ═══');
{
  const { p, calls } = await openEditor();
  await p.evaluate((gid) => {
    ['note', 'evidence', 'criteria'].forEach((f) => {
      const el = document.querySelector('[data-desc="' + gid + '"][data-item="i1"][data-dfield="' + f + '"]');
      if (el) el.value = '';
    });
  }, F.G1);
  await p.click('[data-savedesc="' + F.G1 + '"]');
  await sleep(900);
  const patches = calls.filter((c) => c[0] === 'PATCH' && String(c[1]).includes('game_framework_items'));
  const body = patches.length ? JSON.parse(patches[0][2] || '{}') : {};
  ok('ยิงบันทึก 1 แถว', patches.length === 1, patches.length);
  ok('ส่งค่าว่างเป็น null ไม่ใช่สตริงว่าง (ฐานจะได้ถือว่า "ไม่มีข้อความ" จริง ๆ)',
    body.note === null && body.evidence === null && body.criteria === null, body);
  ok('⭐ ปลดธง admin_edited = false → การส่งครั้งถัดไปเกมเติมข้อความกลับมาได้',
    body.admin_edited === false, body);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 4) ไม่ได้แก้อะไร = ไม่ยิงคำขอเลย ═══');
{
  const { p, calls } = await openEditor();
  await p.click('[data-savedesc="' + F.G1 + '"]');
  await sleep(700);
  const patches = calls.filter((c) => c[0] === 'PATCH' && String(c[1]).includes('game_framework_items'));
  const stat = await p.evaluate((gid) =>
    (document.querySelector('[data-descstat="' + gid + '"]') || {}).textContent || '', F.G1);
  ok('กดบันทึกทั้งที่ไม่ได้แก้ = ไม่ยิงคำขอสักครั้ง', patches.length === 0, patches.length);
  ok('และบอกตรง ๆ ว่าไม่มีอะไรเปลี่ยน (ไม่ใช่เงียบจนคนสงสัยว่าพัง)',
    stat.includes('ไม่มีอะไรเปลี่ยน'), stat);
  await p.close();
}

console.log('\n═══ 5) ฐานที่ยังไม่ได้รันไฟล์ 71 — ต้องบอกให้รู้ ไม่ใช่พังทั้งหน้า ═══');
{
  const { p, calls } = await openEditor({ no71: true });
  const st = await p.evaluate((gid) => ({
    rows: document.querySelectorAll('[data-desc="' + gid + '"][data-dfield="note"]').length,
    warn: !!document.querySelector('[data-need71]'),
    firstNote: (document.querySelector('[data-desc="' + gid + '"][data-item="i1"][data-dfield="note"]') || {}).value,
    ticks: document.querySelectorAll('[data-fw="' + gid + '"]').length }), F.G1);
  ok('ยังดึงข้อความเดิมมาแสดงได้ (ถอยไปเลือกเฉพาะช่องที่มีจริง)',
    st.rows === 6 && (st.firstNote || '').includes('ด่าน 1'), st);
  ok('ขึ้นคำเตือนให้ไปรันไฟล์ 71 ก่อน', st.warn, st);
  ok('ส่วนติ๊กกลุ่มสาระ/สมรรถนะยังใช้ได้เหมือนเดิม (ไม่พังทั้งหน้า)', st.ticks > 0, st);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 6) ติ๊กเพิ่ม/ติ๊กออก แล้วตารางต้องตามทันที ═══');
{
  const { p, calls } = await openEditor();
  const before = await p.evaluate((gid) =>
    document.querySelectorAll('[data-desc="' + gid + '"][data-dfield="note"]').length, F.G1);
  await p.evaluate((gid) => {
    const cb = [...document.querySelectorAll('[data-fw="' + gid + '"]')].find((x) => !x.checked && !x.disabled);
    if (cb) cb.click();
  }, F.G1);
  await sleep(900);
  const after = await p.evaluate((gid) =>
    document.querySelectorAll('[data-desc="' + gid + '"][data-dfield="note"]').length, F.G1);
  ok('ติ๊กเพิ่มแล้วมีแถวให้กรอกข้อความทันที ไม่ต้องรีโหลดหน้า', after === before + 1, { before, after });
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 7) ⭐ "เกมจะได้ยินว่าอะไร" — ตรวจได้จากหน้านี้ ไม่ต้องรอเกมส่งผังกลับมา ═══');
/* ที่มา: ภาค 2 พิสูจน์ว่าเกมข้ามการส่งได้ถ้าผังของเกมไม่เปลี่ยน (เอกสารตอบ V.8.63 ข้อ 9)
   ⇒ ขั้นตอนตรวจรับที่พึ่ง "เปิดหน้าห้องเรียนแล้วต้องเห็นกล่อง" เงียบสนิทได้
   กล่องนี้ทำให้ผู้ดูแลเห็นผลของสิ่งที่เพิ่งบันทึกทันที โดยไม่ต้องพึ่งเกมเลย */
{
  const { p, calls } = await openEditor();
  const before = await p.evaluate((gid) =>
    (document.getElementById('gfi-desc-' + gid) || {}).textContent || '', F.G1);
  ok('ยังไม่มีใครแก้ = บอกตรง ๆ ว่าเกมเป็นคนกำหนดทุกช่อง (ไม่ใช่กล่องเปล่า)',
    before.includes('ยังไม่มีช่องไหนที่ผู้ดูแลเป็นเจ้าของ'), before.slice(-200));

  await p.evaluate((gid) => {
    const q = (f) => document.querySelector('[data-desc="' + gid + '"][data-item="i1"][data-dfield="' + f + '"]');
    q('note').value = 'ด่าน 2 ตลาดน้ำ';
    q('evidence').value = 'คำตอบข้อ 5';
    q('criteria').value = '';                       /* เว้นไว้ช่องหนึ่ง — ต้องไม่ถูกนับ */
  }, F.G1);
  await p.click('[data-savedesc="' + F.G1 + '"]');
  await sleep(900);
  const after = await p.evaluate((gid) =>
    (document.getElementById('gfi-desc-' + gid) || {}).textContent || '', F.G1);

  ok('⭐ ขึ้นประโยคที่เกมจะได้รับ ตรงกับที่ไฟล์ 71 สร้างจริง',
    after.includes('ช่อง หมายเหตุ · แหล่งหลักฐาน ใช้ข้อความของผู้ดูแลเว็บกลาง'), after.slice(-400));
  ok('ช่องที่เว้นว่างไว้ ไม่ถูกนับเข้าประโยค (ยังเป็นของเกม)',
    !after.includes('เกณฑ์การวัด ใช้ข้อความของผู้ดูแล'), after.slice(-400));
  ok('บอกรหัสตัวชี้วัดกำกับด้วย จะได้รู้ว่าประโยคนี้ของแถวไหน', after.includes('ส 5.1 ป.4/1'), after.slice(-400));
  ok('⭐⭐ เตือนไว้ว่าเกมอาจยังไม่ส่งผังมา — กันครูสรุปว่า "ของใหม่ไม่ทำงาน"',
    /เกมข้ามการส่งได้ถ้าผังของเกมเองไม่เปลี่ยน/.test(after)
    && /ไม่ได้แปลว่าตรงนี้ไม่ทำงาน/.test(after), after.slice(-500));
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

console.log('\n═══ 8) ประโยคใน admin.html ต้องตรงกับใน SQL ไฟล์ 71 ทุกตัวอักษร ═══');
/* ประโยคเดียวกันถูกเขียนไว้สองที่ (JS ใช้แสดงตัวอย่าง · SQL ใช้ส่งจริง)
   ปล่อยให้ดริฟต์กันเมื่อไร ผู้ดูแลจะเห็นตัวอย่างที่ไม่ตรงกับของจริง — แย่กว่าไม่มีตัวอย่าง */
{
  const ROOT = HUBROOT;
  const js  = fs.readFileSync(ROOT + '/admin.html', 'utf8');
  const sql = fs.readFileSync(ROOT + '/sql/71_STANDARDS_ADMIN_EDIT.sql', 'utf8');
  const jsHead  = /'ช่อง ' \+ labels\.join\(' · '\) \+ ' ใช้ข้อความของผู้ดูแลเว็บกลาง'/.test(js);
  const sqlHead = /'ช่อง ' \|\| array_to_string\(v_keep, ' · '\)\s*\|\| ' ใช้ข้อความของผู้ดูแลเว็บกลาง'/.test(sql);
  ok('admin.html สร้างประโยคด้วยถ้อยคำชุดนี้', jsHead, js.match(/'ช่อง '[^\n]*/g));
  ok('ไฟล์ 71 สร้างประโยคด้วยถ้อยคำชุดเดียวกัน', sqlHead, sql.match(/'ช่อง '[^\n]*/g));
  const labels = ['หมายเหตุ', 'แหล่งหลักฐาน', 'เกณฑ์การวัด'];
  ok('ชื่อช่องทั้งสามตรงกันทั้งสองไฟล์',
    labels.every((w) => js.includes("label: '" + w + "'") && sql.includes("array['" + w + "']")), labels);
}

await b.close(); srv.close();
process.exit(ok.done());
