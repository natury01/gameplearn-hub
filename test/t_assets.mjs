/* ══════════════════════════════════════════════════════════════════════════
   t_assets.mjs — "อะไรขึ้นเว็บได้บ้าง" ต้องคุมสองทิศ (V.1.6.25)

   ── เรื่องที่เกิดขึ้นจริง เรียงตามเวลา ───────────────────────────────────

   24 ส.ค. — `wrangler.jsonc` ตั้ง `"assets.directory": "./"` = **ยิงทั้ง repo ขึ้นเว็บ**
     curl ที่ gameplearn.com ได้ HTTP 200 จาก `/sql/60_ROOM_CLAIM.sql` ·
     `/test/sql/00_fixture.sql` · `/README_DEPLOY.md` · `/wrangler.jsonc`
     ⇒ ซอร์ส SQL ที่มีตรรกะ RLS/RPC ทั้งชุด เปิดให้คนนอกอ่านได้ (งาน N15)

   แก้รอบ 1 (V.1.6.23) — `.assetsignore` แบบบัญชีดำ
     ⇒ ตัวตรวจอิสระปลูกไฟล์ล่อ 22 ตัว **หลุดทั้ง 22** (`.env.local` · `db/59.sql` ·
       `js/config.js.bak` · `tests/` ที่มี s) เพราะบัญชีดำปิดได้เฉพาะชื่อที่คนเขียนนึกออก

   แก้รอบ 2 (V.1.6.23) — เปลี่ยนเป็นบัญชีขาว `/*` แล้วเปิดคืนเป็นราย ๆ
     ⇒ ได้ผลจริง **แต่ `.assetsignore` เป็นไฟล์ซ่อน (ขึ้นต้นด้วยจุด)**
       เครื่องมืออัปของครูข้ามมัน **สองรุ่นติดกัน**:
         V.1.6.23 ⇒ ซอร์ส SQL เปิดสาธารณะต่ออีกรอบโดยไม่มีใครรู้
         V.1.6.24 ⇒ หน้า `capacity.html` ไม่ขึ้นเว็บ

   แก้รอบ 3 (V.1.6.25 · ฉบับนี้) — **เลิกพึ่งไฟล์ซ่อน ย้ายไปปิดที่โครงสร้าง**
     ไฟล์เว็บทั้งหมดอยู่ใน `public/` และ `wrangler.jsonc` ชี้ `"directory": "./public"`
     ⇒ `sql/` `test/` `README*` `wrangler.jsonc` อยู่ **นอกโฟลเดอร์ที่ขึ้นเว็บ**
       **เสิร์ฟไม่ได้โดยโครงสร้าง ไม่ต้องมีใครจำ ไม่ต้องมีไฟล์ซ่อนคอยปิด**

   ── ชุดนี้คุมอะไร ───────────────────────────────────────────────────────
   ① `wrangler.jsonc` ต้องชี้ `./public` (ถ้าใครเปลี่ยนกลับเป็น "./" = เปิดทั้ง repo อีก)
   ② ของที่เว็บต้องใช้ ต้องอยู่ใน `public/` ครบ
   ③ ของที่ห้ามหลุด ต้องอยู่ **นอก** `public/`
   ④ ไล่ของจริงทุกไฟล์ — ห้ามมีนามสกุลเสี่ยงอยู่ใน `public/` แม้แต่ไฟล์เดียว
   ⑤ ห้ามมีไฟล์ใน `public/` ที่ไม่ได้ประกาศไว้ · และหน้า `.html` ทุกหน้าต้องถูกประกาศ
   ⑥ เทสต์ของเทสต์ — พิสูจน์ว่าชุดนี้แดงได้จริง

   ⚠️ ชุดนี้ไม่พึ่ง wrangler — เครื่องครู/โรงเรียนไม่ได้ติดตั้ง
   ══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');          // รากรีโป — ที่ wrangler.jsonc อยู่
const PUB = join(REPO, 'public');       // โฟลเดอร์เดียวที่ขึ้นเว็บ

let pass = 0, fail = 0;
const ok = (label, cond, extra) => {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + String(extra).slice(0, 300) : '')); }
};

function walk(dir, base = '') {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.wrangler') continue;
    const full = join(dir, n);
    const rel = base ? base + '/' + n : n;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

/* ── ① ค่าตั้งที่ตัดสินทุกอย่าง ──────────────────────────────────────── */
console.log('— ① wrangler.jsonc —');
const wrPath = join(REPO, 'wrangler.jsonc');
ok('มี wrangler.jsonc ที่รากรีโป', existsSync(wrPath));
const wr = existsSync(wrPath) ? readFileSync(wrPath, 'utf8') : '';
ok('⭐⭐ assets.directory ต้องเป็น "./public" — ไม่ใช่ "./"',
  /"directory"\s*:\s*"\.\/public"/.test(wr),
  (wr.match(/"directory"\s*:\s*"[^"]*"/) || ['(ไม่พบ)'])[0]);
ok('มีโฟลเดอร์ public/ อยู่จริง', existsSync(PUB));
/* ไม่ควรมี .assetsignore แล้ว — ถ้ามีแปลว่ามีคนกลับไปใช้วิธีเดิม */
ok('ไม่ต้องมี .assetsignore อีกแล้ว (ปิดที่โครงสร้างแทน)',
  !existsSync(join(REPO, '.assetsignore')) && !existsSync(join(PUB, '.assetsignore')));

/* ── ② ของที่เว็บต้องใช้ ต้องอยู่ใน public/ ครบ ─────────────────────── */
console.log('\n— ② ทิศ 1: ของที่เว็บต้องใช้ ห้ามหาย —');
const MUST_SERVE = [
  'index.html', 'teacher.html', 'admin.html', 'dashboard.html',
  'standards.html', 'support.html', 'contact.html', 'capacity.html',
  'js/config.js', 'js/gp-core.js', 'js/gp-brand.js', 'js/gp-catalog.js',
  'js/gp-standards-panel.js', 'js/gp-tour.js',
  'css/gp.css', 'favicon.svg', 'robots.txt', '_headers',
];
const inPub = walk(PUB);
for (const p of MUST_SERVE) ok(p, inPub.includes(p));
/* robots.txt สำคัญเป็นพิเศษ: not_found_handling = single-page-application
   ⇒ ถ้าหาย /robots.txt จะถูกตอบด้วย index.html แล้วไม่มีใครสังเกต (บทเรียน F11) */
ok('⭐ robots.txt ต้องอยู่ใน public/ เสมอ (ไม่งั้น SPA fallback กลืนไปเงียบ ๆ)',
  inPub.includes('robots.txt'));
ok('⭐ _headers ต้องอยู่ใน public/ — นอกโฟลเดอร์นี้ Cloudflare ไม่อ่าน (F11 ห้ามถอย)',
  inPub.includes('_headers'));

/* ── ③ ของที่ห้ามหลุด ต้องอยู่นอก public/ ───────────────────────────── */
console.log('\n— ③ ทิศ 2: ของที่ห้ามขึ้นเว็บ ต้องอยู่นอก public/ —');
const MUST_NOT_SERVE = [
  'sql', 'test', 'README.md', 'README_DEPLOY.md', 'wrangler.jsonc',
];
for (const p of MUST_NOT_SERVE) {
  ok(p + ' ต้องไม่อยู่ใน public/', !existsSync(join(PUB, p)));
  ok(p + ' ต้องยังอยู่ที่รากรีโป (ไม่ได้ถูกลบทิ้ง)', existsSync(join(REPO, p)));
}

/* ── ④ ไล่ของจริงทุกไฟล์ใน public/ ─────────────────────────────────── */
console.log('\n— ④ กวาดทุกไฟล์ใน public/ —');
const RISKY = /\.(sql|md|mjs|sh|py|bak|orig|zip|jsonc|toml|log|env)$|~$|^\.env|^\.dev\.vars|\.DS_Store$|Thumbs\.db$/i;
const risky = inPub.filter((p) => RISKY.test(p.split('/').pop()));
ok('⭐⭐ ไม่มีไฟล์นามสกุลเสี่ยงอยู่ใน public/ แม้แต่ไฟล์เดียว',
  risky.length === 0, risky.join(' · '));

/* ── ⑤ ของเกิน / หน้าใหม่ที่ลืมประกาศ ──────────────────────────────── */
console.log('\n— ⑤ ของเกินและหน้าที่ลืมประกาศ —');
const extra = inPub.filter((p) => !MUST_SERVE.includes(p));
ok('ไม่มีไฟล์ใน public/ ที่ไม่ได้ประกาศไว้', extra.length === 0, extra.join(' · '));
/* เพิ่มหน้าใหม่แล้วลืมมาต่อรายการ = แดงทันที (บทเรียน capacity.html · V.1.6.24) */
for (const p of inPub.filter((q) => !q.includes('/') && q.endsWith('.html'))) {
  ok('หน้า ' + p + ' ต้องถูกประกาศใน MUST_SERVE', MUST_SERVE.includes(p));
}

/* ── ⑥ เทสต์ของเทสต์ ───────────────────────────────────────────────── */
console.log('\n— ⑥ พิสูจน์ว่าชุดนี้แดงได้จริง —');
ok('⭐ ถ้า directory เป็น "./" ต้องจับได้ (ตัวจับทำงานจริง)',
  /"directory"\s*:\s*"\.\/public"/.test('{"directory": "./"}') === false);
ok('⭐ ถ้ามีไฟล์ .sql อยู่ใน public/ ต้องถูกนับว่าเสี่ยง',
  RISKY.test('84_DB_CAPACITY.sql') === true);
ok('⭐ ไฟล์ซ่อนอย่าง .env.local ก็ต้องถูกนับว่าเสี่ยง',
  RISKY.test('.env.local') === true);

console.log('\n' + (fail === 0
  ? `✅ ผ่าน ${pass}/${pass} ข้อ`
  : `❌ ผ่าน ${pass} · ตก ${fail}`));
process.exit(fail === 0 ? 0 : 1);
