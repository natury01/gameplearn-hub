/* ชุดทดสอบ 11 — N10/ADR-010: ข้อความผิดพลาดดิบห้ามขึ้นจอ (V.1.6.26)

   กติกา (STD-001 + มติครู ADR-010): จอครู/เด็กเห็นได้เฉพาะ `reason` ภาษาไทย
   ของดิบ (RLS อังกฤษ · TypeError เน็ตหลุด · body จาก storage · 'HTTP n') ลง console/err.detail เท่านั้น

   ชุดนี้ล็อก **สองทิศ** (บทเรียนจาก t_err1 ของภาค 1):
   ทิศ 1: ของดิบห้ามถึงจอ — RLS/network/storage-body/HTTP ต้องกลายเป็นประโยคไทย
   ทิศ 2: ของถูกห้ามโดนกวาด — reason ไทยจากเซิร์ฟเวอร์ต้องผ่านถึงจอ "ทั้งประโยคไม่ถูกแก้"
          และตัวจำแนกสาเหตุ (PGRST202→แนะ SQL · 42501→ประโยคสิทธิ์) ต้องยังจำแนกได้
          แม้ e.message ถูกแปลไทยแล้ว (อ่านจาก e.code/e.detail) */
import { chromium, serve, stub, login, reporter, realErrors, launchOpts } from './harness.mjs';
import * as F from './fixtures.mjs';

const PORT = 8941, BASE = 'http://localhost:' + PORT;
const SB = 'https://janoonnhzpwjnxqjvswt.supabase.co';
const srv = await serve(PORT);
const b = await chromium.launch(launchOpts());
const ok = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ยิงจริงหนึ่งฉาก: เปิด teacher.html (ยังไม่ล็อกอิน) → เปิดฟอร์มสร้างห้อง → กดสร้าง
   โดยดัก rpc_create_room_open ให้ตอบตามที่ฉากต้องการ แล้วอ่านกล่อง #err */
async function roomErrScene(handler) {
  const p = await b.newPage();
  const calls = await stub(p, {});
  await p.route(SB + '/rest/v1/rpc/rpc_create_room_open**', handler);  /* ทับของ stub (ลงทะเบียนทีหลังชนะ) */
  await p.goto(BASE + '/teacher.html');
  await sleep(700);
  await p.click('#btn-open-room');
  await p.fill('#or-grade', 'ป.4');
  await p.click('#or-go');
  await sleep(900);
  const err = await p.evaluate(() => (document.getElementById('err') || {}).textContent || '');
  return { p, calls, err };
}
const json = (route, status, body) => route.fulfill({ status,
  contentType: 'application/json', body: JSON.stringify(body) });

console.log('═══ 1) RLS อังกฤษดิบ (42501) → จอได้ประโยคไทย + รหัสไว้แจ้งปัญหา ═══');
{
  const { p, err } = await roomErrScene((r) =>
    json(r, 403, { code: '42501', message: 'permission denied for table classrooms' }));
  ok('⭐ ไม่มีคำอังกฤษดิบของ RLS บนจอ', !/permission|denied|classrooms/i.test(err), err);
  ok('ขึ้นเป็นประโยคไทยของจุดนั้น (สร้างห้องไม่สำเร็จ…)', err.includes('สร้างห้องไม่สำเร็จ'), err);
  ok('มีรหัส 42501 ให้ครูใช้แจ้งปัญหา (รหัส ≠ ของดิบ)', err.includes('42501'), err);
  ok('มีอักษรไทยจริงในข้อความ', /[ก-๙]/.test(err), err);
  await p.close();
}

console.log('\n═══ 2) ทิศตรงข้าม — PGRST202 ต้องยังจำแนกได้ → คำแนะนำรัน SQL ไม่ใช่ประโยคกลาง ═══');
{
  const { p, err } = await roomErrScene((r) =>
    json(r, 404, { code: 'PGRST202',
      message: 'Could not find the function public.rpc_create_room_open(p_grade) in the schema cache' }));
  ok('⭐ สาขา missingRpc ยังทำงาน (แนะให้รัน 60_ROOM_CLAIM.sql)', err.includes('60_ROOM_CLAIM.sql'), err);
  ok('ข้อความอังกฤษของ PostgREST ไม่ถึงจอ', !/Could not find|schema cache/i.test(err), err);
  await p.close();
}

console.log('\n═══ 3) เน็ตหลุด — TypeError ดิบต้องกลายเป็นประโยคไทย ═══');
{
  const { p, err } = await roomErrScene((r) => r.abort('internetdisconnected'));
  ok('⭐ ขึ้น "เชื่อมต่อไม่สำเร็จ…" ภาษาไทย', err.includes('เชื่อมต่อไม่สำเร็จ'), err);
  ok('ไม่มี "Failed to fetch" บนจอ', !/failed to fetch|networkerror|typeerror/i.test(err), err);
  await p.close();
}

console.log('\n═══ 4) ทิศตรงข้าม — reason ไทยจากเซิร์ฟเวอร์ต้องผ่านถึงจอทั้งประโยค ไม่ถูกแก้ ═══');
{
  const REASON = 'ชื่อโรงเรียนยาวเกินไป — ย่อให้สั้นลงก่อน';
  const { p, err } = await roomErrScene((r) => json(r, 400, { code: 'P0001', message: REASON }));
  ok('⭐ reason ไทยผ่านถึงจอครบทั้งประโยค (ช่องทางสัญญา STD-001 ไม่ถูกกวาด)', err.includes(REASON), err);
  ok('ไม่ถูกแทนด้วยประโยคกลาง (ชั้นแปลต้องไม่แตะของไทย)', !err.includes('ทำรายการไม่สำเร็จ (รหัส'), err);
  await p.close();
}

console.log('\n═══ 5) หน้าสรุปผลสาธารณะ (จอเด็ก/ผู้ปกครองเห็นได้) ═══');
{
  const p = await b.newPage();
  await stub(p, {});
  await p.route(SB + '/rest/v1/rpc/rpc_pub_summary**', (r) =>
    json(r, 500, { code: '42P01', message: 'relation "public.v_pub_x" does not exist' }));
  await p.goto(BASE + '/dashboard.html');
  await sleep(1500);
  const err = await p.evaluate(() => (document.getElementById('err') || {}).textContent || '');
  ok('⭐ ข้อความฐานข้อมูลอังกฤษไม่ถึงจอสาธารณะ', !/relation|does not exist/i.test(err), err);
  ok('ขึ้นประโยคไทยพร้อมรหัส', /[ก-๙]/.test(err) && err.includes('42P01'), err);
  await p.close();
}
{
  const p = await b.newPage();
  await stub(p, {});
  await p.route(SB + '/rest/v1/rpc/rpc_pub_summary**', (r) => r.abort('internetdisconnected'));
  await p.goto(BASE + '/dashboard.html');
  await sleep(1500);
  const err = await p.evaluate(() => (document.getElementById('err') || {}).textContent || '');
  ok('เน็ตหลุดบนหน้าสาธารณะ → ไทย ไม่ใช่ Failed to fetch', err.includes('เชื่อมต่อไม่สำเร็จ') && !/failed to fetch/i.test(err), err);
  await p.close();
}

console.log('\n═══ 6) หน้ามาตรฐานการเรียนรู้ — helper ที่เคยมีแต่ "HTTP n" ═══');
{
  const p = await b.newPage();
  await stub(p, {});
  await p.route(SB + '/rest/v1/games**', (r) => json(r, 500, { message: 'internal error' }));
  await p.route(SB + '/rest/v1/v_game_catalog**', (r) => json(r, 500, { message: 'internal error' }));
  await p.goto(BASE + '/standards.html');
  await sleep(1500);
  /* ⚠️ ต้องใช้ innerText ไม่ใช่ textContent — textContent รวมซอร์สของ inline <script>
     ซึ่งมี string literal 'โหลดข้อมูลไม่สำเร็จ' อยู่แล้ว = ข้อ positive เขียวหลอกตลอดกาล
     (ผู้ตรวจหักล้าง V.1.6.26 จับได้) · และยึดด้วยวลีเจาะจง '(รหัส 500' ว่า render จริง */
  const body = await p.evaluate(() => document.body.innerText || '');
  ok('⭐ ไม่มี "HTTP 500" หรือคำอังกฤษของ error บนจอ', !/HTTP\s*5\d\d|internal error/i.test(body), body.slice(0, 200));
  ok('render ประโยคไทย + รหัสจริงบนจอ (ไม่ใช่แค่มีในซอร์ส)', body.includes('(รหัส 500'), body.slice(0, 300));
  await p.close();
}

console.log('\n═══ 7) อัปโหลดรูปหน้า Admin — body ดิบจาก storage ห้ามถึงจอ (จุดผิดหนักสุดของเว็บกลาง) ═══');
{
  const p = await b.newPage();
  const calls = await stub(p, { admin: true });
  await login(p);
  await p.route(SB + '/storage/v1/object/brand/**', (r) => r.fulfill({ status: 400,
    contentType: 'application/json',
    body: '{"statusCode":"403","error":"InvalidRequest","message":"new row violates row-level security policy"}' }));
  await p.goto(BASE + '/admin.html');
  await sleep(1500);
  const hasInput = await p.evaluate(() => !!document.querySelector('input[data-upload]'));
  ok('หน้า Admin เปิดถึงช่องอัปโหลด (gate ผ่านด้วย role=admin)', hasInput, '');
  await p.setInputFiles('input[data-upload]', {
    name: 'x.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  await sleep(900);
  const err = await p.evaluate(() => (document.getElementById('err') || {}).textContent || '');
  ok('⭐ body ดิบจาก storage ไม่ถึงจอ', !/row violates|InvalidRequest|statusCode|row-level/i.test(err), err);
  ok('ขึ้นประโยคไทย "อัปโหลดไม่สำเร็จ (รหัส 400)" + คำแนะนำเดิมยังอยู่', err.includes('อัปโหลดไม่สำเร็จ (รหัส 400)') && err.includes('22_ADMIN_SETUP.sql'), err);
  const logged = calls.some((c) => c[0] === 'CONSOLE_ERROR' && /upload-brand/.test(c[1]));
  ok('ของดิบยังถูกเก็บลง console (กฎ 3 ชั้น — detail ไม่หาย แค่ไม่ขึ้นจอ)', logged,
    calls.filter((c) => c[0] === 'CONSOLE_ERROR').map((c) => c[1]).slice(0, 3));
  await p.close();
}

console.log('\n═══ 8) ของเดิมต้องไม่พัง — เปิดหน้าปกติ (ไม่มี error) แล้วทุกอย่างเงียบ ═══');
{
  const p = await b.newPage();
  const calls = await stub(p, {});
  await p.goto(BASE + '/dashboard.html');
  await sleep(1500);
  const err = await p.evaluate(() => (document.getElementById('err') || {}).textContent || '');
  ok('เส้นทางปกติไม่มีข้อความผิดพลาด (ชั้นแปลไม่รบกวนทางสำเร็จ)', !err, err);
  ok('สคริปต์ไม่พัง', realErrors(calls).length === 0, realErrors(calls));
  await p.close();
}

await b.close(); srv.close();
process.exit(ok.done());
