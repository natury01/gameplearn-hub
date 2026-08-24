/* ══════════════════════════════════════════════════════════════════════════
   t_assets.mjs — บัญชี "ของที่ขึ้นเว็บได้" ต้องคุมสองทิศ (งาน N15 · V.1.6.23)

   เรื่องที่เกิดขึ้นจริง 24 ส.ค. 2569 ICT:
     `wrangler.jsonc` ตั้ง `"assets.directory": "./"` = ยิงทั้ง repo ขึ้นเว็บ
     curl ที่ gameplearn.com ได้ HTTP 200 จาก /sql/60_ROOM_CLAIM.sql ·
     /test/sql/00_fixture.sql · /test/t_regress.mjs · /README_DEPLOY.md · /wrangler.jsonc
     ⇒ ซอร์ส SQL ที่มีตรรกะ RLS/RPC ทั้งชุด เปิดให้คนนอกอ่านได้

   ทำไมชุดนี้ต้องมี (บทเรียนที่แพงที่สุดของรอบนี้):
     ร่างแรกแก้ด้วย .assetsignore แบบ "บัญชีดำ" แล้วเขียนสคริปต์ตรวจไว้ในโฟลเดอร์ชั่วคราว
     ตัวตรวจอิสระชี้สองเรื่อง แล้วทั้งสองเรื่องเป็นจริง:
       ① ยามไม่ได้เดินทางไปกับของส่งมอบ ⇒ พรุ่งนี้ไม่มีอะไรร้องได้อีก
       ② ยามตรวจทิศเดียว (เช็คแต่ "ของดีต้องอยู่") ⇒ ลบกฎ `sql/` บรรทัดเดียว
          ยามยังเขียว ทั้งที่ SQL หลุดขึ้นเว็บครบ 10 ไฟล์
     ชุดนี้จึงคุม **สองทิศ** และอยู่ใน run-all.sh ให้รันทุกครั้ง

   ⚠️ ชุดนี้ไม่พึ่ง wrangler — โรงเรียน/เครื่องครูไม่ได้ติดตั้ง
      จึงอ่าน .assetsignore แล้วตัดสินเองด้วยตัวจับที่รองรับเฉพาะไวยากรณ์ที่เราใช้จริง
      และมี "เทสต์ของเทสต์" ท้ายไฟล์ พิสูจน์ว่าตัวจับนี้แดงได้จริงเมื่อกฎหาย
   ══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const IGNORE_FILE = join(ROOT, '.assetsignore');

let pass = 0, fail = 0;
const ok = (label, cond, extra) => {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + String(extra).slice(0, 300) : '')); }
};

/* ── ตัวจับกฎ — รองรับเฉพาะไวยากรณ์ที่ .assetsignore ของเราใช้ ──────────────
   /*        ปิดทุกอย่าง          · !/ชื่อ      เปิดคืนพาธบนสุด
   /js/**    ปิดทุกอย่างใต้ js/   · !/js/*.js  เปิดคืนเฉพาะชั้นเดียว
   กติกา gitignore: **กฎที่ตรงตัวหลังสุดชนะ** */
function ruleToTest(raw) {
  const neg = raw.startsWith('!');
  let p = (neg ? raw.slice(1) : raw).trim();
  if (p.startsWith('/')) p = p.slice(1);
  const dirOnly = p.endsWith('/');
  if (dirOnly) p = p.slice(0, -1);
  let re;
  if (p === '*') re = /^[^/]+(\/.*)?$/;                       // /* = ทุกพาธ (ผ่านชั้นบนสุด)
  else if (p.endsWith('/**')) re = new RegExp('^' + esc(p.slice(0, -3)) + '/.+$');
  else if (p.includes('*')) re = new RegExp('^' + esc(p).replace(/\\\*/g, '[^/]*') + '$');
  else re = new RegExp('^' + esc(p) + (dirOnly ? '(/.*)?' : '(/.*)?') + '$');
  return { neg, re, raw };
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function servedBy(rules, path) {
  let ignored = false;
  for (const r of rules) if (r.re.test(path)) ignored = !r.neg;
  return !ignored;
}

function readRules() {
  return readFileSync(IGNORE_FILE, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map(ruleToTest);
}

function walk(dir, base = '') {
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

/* ── ① ไฟล์กฎต้องมีอยู่จริงและมีกฎจริง ─────────────────────────────────── */
console.log('— ① ตัวไฟล์ —');
ok('มี .assetsignore อยู่ที่ราก assets directory (ข้าง wrangler.jsonc)', existsSync(IGNORE_FILE));
const rules = existsSync(IGNORE_FILE) ? readRules() : [];
ok('มีกฎจริง (ไม่ใช่ไฟล์ว่างหรือมีแต่คอมเมนต์) อย่างน้อย 10 บรรทัด',
  rules.length >= 10, 'พบ ' + rules.length + ' กฎ');
ok('⭐ ต้องเป็นบัญชีขาว — ขึ้นต้นด้วย /* แล้วเปิดคืนเป็นราย ๆ',
  rules.length > 0 && rules[0].raw === '/*', rules[0] && rules[0].raw);

/* ── ② ทิศที่ 1: ของที่ต้องขึ้นเว็บ ต้องยังขึ้น ───────────────────────────── */
console.log('\n— ② ทิศ 1: ของที่เว็บต้องใช้ ห้ามหาย —');
const MUST_KEEP = [
  'index.html', 'teacher.html', 'admin.html', 'dashboard.html',
  'standards.html', 'support.html', 'contact.html',
  'js/config.js', 'js/gp-core.js', 'js/gp-brand.js', 'js/gp-catalog.js',
  'js/gp-standards-panel.js', 'js/gp-tour.js',
  'css/gp.css', 'favicon.svg', 'robots.txt',
];
for (const p of MUST_KEEP) ok(p, servedBy(rules, p));
/* robots.txt สำคัญเป็นพิเศษ: เว็บตั้ง not_found_handling = single-page-application
   ถ้าไฟล์นี้หาย /robots.txt จะถูกตอบด้วย index.html แล้วไม่มีใครสังเกต (บทเรียน F11) */
ok('⭐ robots.txt ต้องขึ้นเว็บเสมอ (ไม่งั้น SPA fallback จะกลืนไปเงียบ ๆ)',
  servedBy(rules, 'robots.txt'));

/* ── ③ ทิศที่ 2: ของที่ห้ามขึ้นเว็บ ต้องปิดจริง ──────────────────────────── */
console.log('\n— ③ ทิศ 2: ของที่ห้ามหลุด —');
const MUST_CLOSE = [
  'sql/60_ROOM_CLAIM.sql', 'sql/83_VISIT_SOURCE.sql', 'sql/82_REPORT_SENDER_PROOF.sql',
  'test/t_regress.mjs', 'test/harness.mjs', 'test/run-all.sh',
  'test/sql/00_fixture.sql', 'test/sql/t_sql.sh', 'test/TESTS_REGISTRY.md',
  'wrangler.jsonc', 'README.md', 'README_DEPLOY.md',
];
for (const p of MUST_CLOSE) ok(p, !servedBy(rules, p));

/* ของล่อ — ไฟล์ที่ยังไม่มีในโฟลเดอร์ แต่ถ้าใครเผลอสร้างขึ้นมาต้องไม่หลุด
   ทั้ง 22 ตัวนี้คือชุดที่ตัวตรวจอิสระใช้เจาะบัญชีดำสำเร็จ — เก็บไว้เป็นเกณฑ์ถาวร */
console.log('\n— ④ ของล่อ: ไฟล์ที่ยังไม่มี แต่ถ้าเกิดขึ้นต้องไม่หลุด —');
const DECOYS = [
  '.env', '.env.local', '.env.production', '.dev.vars', '.dev.vars.production',
  'sql_backup_60.sql', 'db/59.sql', 'sql2/52.sql',
  'js/vendor/notes.sql', 'css/old/dump.sql',
  'wrangler.jsonc.bak', 'js/config.js.bak', 'index.html.orig', 'teacher.html~',
  '.DS_Store', 'Thumbs.db', 'tests/harness.mjs',
  'CHANGELOG_HUB.md', 'DEPLOY_NOTES.md', 'AUDIT_TO_HUB_2026-08-24.md',
  '.git/config', 'package.json',
];
for (const p of DECOYS) ok(p, !servedBy(rules, p));

/* ── ⑤ กวาดของจริงในโฟลเดอร์ทั้งหมด — กันไฟล์ที่ยังไม่มีใครนึกถึง ─────────── */
console.log('\n— ⑤ กวาดทุกไฟล์ที่มีอยู่จริง —');
const RISKY = /\.(sql|md|mjs|sh|bak|orig|zip|jsonc|toml|log)$|~$|^\.env|^\.dev\.vars|\.DS_Store$|Thumbs\.db$/i;
const all = walk(ROOT);
const leaked = all.filter((p) => RISKY.test(p.split('/').pop()) && servedBy(rules, p));
ok('⭐⭐ ไม่มีไฟล์นามสกุลเสี่ยงหลุดขึ้นเว็บแม้แต่ไฟล์เดียว',
  leaked.length === 0, leaked.join(' · '));
const servedNow = all.filter((p) => servedBy(rules, p));
ok('จำนวนไฟล์ที่ขึ้นเว็บต้องเท่ากับรายการที่ประกาศไว้',
  servedNow.length === MUST_KEEP.length,
  'ขึ้นเว็บ ' + servedNow.length + ' · ประกาศไว้ ' + MUST_KEEP.length +
  ' · ส่วนต่าง: ' + servedNow.filter((p) => !MUST_KEEP.includes(p)).join(' · '));

/* ── ⑥ เทสต์ของเทสต์ — ถ้าไม่พิสูจน์ว่าแดงได้ ก็ยังไม่ใช่ยาม ───────────── */
console.log('\n— ⑥ พิสูจน์ว่าชุดนี้แดงได้จริง —');
const gutted = ['!/index.html', '!/js/'].map(ruleToTest);   // ไม่มี /* = ไม่ปิดอะไรเลย
ok('⭐ ถอดกฎ /* ออกแล้ว SQL ต้องหลุด (ตัวจับทำงานจริง ไม่ได้ผ่านเพราะบังเอิญ)',
  servedBy(gutted, 'sql/60_ROOM_CLAIM.sql') === true);
const blackOnly = ['test/', 'sql/'].map(ruleToTest);        // บัญชีดำแบบร่างแรก
ok('⭐ บัญชีดำร่างแรกต้องปล่อย .env.local หลุด (เหตุผลที่เปลี่ยนเป็นบัญชีขาว)',
  servedBy(blackOnly, '.env.local') === true);

console.log('\n' + (fail === 0
  ? `✅ ผ่าน ${pass}/${pass} ข้อ`
  : `❌ ผ่าน ${pass} · ตก ${fail}`));
process.exit(fail === 0 ? 0 : 1);
