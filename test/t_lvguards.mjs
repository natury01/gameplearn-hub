// t_lvguards.mjs — ยามสามตัวของมติครู 25 ส.ค. (สเปก HUB_TO_CODE_มติครูสามข้อ ข้อ ③)
//   ก. สีโทเคน --lv3..6 ใน gp.css ต้องตรง CLS_LV_CLR ที่ดึงจาก "ไฟล์เกมภาค 1 ตัวล่าสุด" สด ๆ
//      (ห้ามเขียนค่าสีเป้าหมายในเทสต์ — ไม่งั้นเทสต์กลายเป็นที่เขียนซ้ำอีกแห่ง = P-HUB-08 ในรูปเทสต์)
//   ข. ความคมชัดต้องไม่ตกเงียบ: แถบ/จุด ≥3:1 บนพื้นการ์ดทั้งสองธีม · ป้ายตัวอักษรขาว ≥4.5:1
//      (--lv4/--lv6 เฉียดเกณฑ์ 3.10/3.06 — ใครขยับ --surface สองตัวนี้จะตกก่อนเพื่อน)
//   ค. เมนูหลัก (a ที่ไม่มี class) ต้องชุดเดียวลำดับเดียวทุกหน้า — ยกเว้น capacity.html ที่ประกาศไว้:
//      เป็นหน้าเดี่ยวเข้าจากแถบผู้ดูแล จึงมี "⚙️ ผู้ดูแลระบบ" นำหน้าชุดมาตรฐาน (7 รายการ) — P-HUB-07
// ไม่ใช้เบราว์เซอร์ — อ่านไฟล์ตรง · ซิปภาค 1 อ่านผ่าน python3 zipfile (มี fallback tar)
// หา zip ไม่เจอ = exit 77 (ข้าม ≠ ผ่าน · STD-006) พร้อมบอกที่ที่ลองหา
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, '..', 'public');
let n = 0, bad = 0;
const ok = (name, got, want) => {
  n++;
  if (String(got) === String(want)) console.log(`  ✅ ${name}`);
  else { bad++; console.log(`  ❌ ${name}\n       ได้: ${got}  ควรได้: ${want}`); }
};

// ── ก. สีต้องตรงต้นแบบจริง ──────────────────────────────────────────────
const kan1dir = process.env.GP_KAN1_DIR || 'D:\\GameProject\\1 Kan-Adventure';
let zip = null;
if (existsSync(kan1dir)) {
  const zips = readdirSync(kan1dir).filter(f => /^kanadventure-repo_v\d+\.zip$/.test(f))
    .sort((a, b) => parseInt(b.match(/v(\d+)/)[1]) - parseInt(a.match(/v(\d+)/)[1]));
  if (zips.length) zip = join(kan1dir, zips[0]);
}
if (!zip) {
  console.log(`⏭  ข้ามยาม ก — ไม่พบ kanadventure-repo_v*.zip ใน ${kan1dir} (ตั้ง GP_KAN1_DIR ได้)`);
  console.log('   ⚠️ ข้าม ≠ ผ่าน (STD-006) — สีต้นแบบยังไม่ถูกตรวจบนเครื่องนี้');
  process.exit(77);
}
const py = `import zipfile,re,sys
z=zipfile.ZipFile(r'${zip}')
name=[x for x in z.namelist() if x.endswith('index.html')][0]
d=z.read(name).decode('utf-8','replace')
m=re.search(r"CLS_LV_CLR\\s*=\\s*(\\{[^}]*\\})",d)
print(m.group(1) if m else 'NOT_FOUND')`;
let out = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
if (out.status !== 0 || !out.stdout) out = spawnSync('python', ['-c', py], { encoding: 'utf8' });
const clsRaw = (out.stdout || '').trim();
if (!clsRaw || clsRaw === 'NOT_FOUND') {
  console.log(`  ❌ อ่าน CLS_LV_CLR จาก ${zip} ไม่ได้ (${clsRaw || out.stderr?.slice(0, 120)})`);
  process.exit(1);
}
const game = {};
for (const m of clsRaw.matchAll(/(\d)\s*:\s*'(#[0-9a-fA-F]{6})'/g)) game[m[1]] = m[2].toLowerCase();

const css = readFileSync(join(pub, 'css', 'gp.css'), 'utf8');
const tok = (name) => (css.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`)) || [])[1]?.toLowerCase();
console.log(`═══ ก) สีโทเคนต้องตรง CLS_LV_CLR จาก ${zip.split(/[\\/]/).pop()} (อ่านสด ไม่ hardcode) ═══`);
for (const lv of ['3', '4', '5', '6'])
  ok(`--lv${lv} ตรงเกมภาค 1 (${game[lv]})`, tok(`--lv${lv}`), game[lv]);

// ── ข. ความคมชัด ──────────────────────────────────────────────────────
const lum = (hex) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const surfLight = (css.match(/:root\s*\{[^}]*--surface:\s*(#[0-9a-fA-F]{6})/s) || [])[1];
const surfDark = (css.match(/data-theme="dark"[^{]*\{[^}]*--surface:\s*(#[0-9a-fA-F]{6})/s) || [])[1];
console.log(`═══ ข) ความคมชัด — พื้นการ์ดสว่าง ${surfLight} · มืด ${surfDark} ═══`);
ok('อ่านพื้นการ์ดได้ทั้งสองธีม', Boolean(surfLight && surfDark), true);
for (const lv of ['3', '4', '5', '6']) {
  const c = tok(`--lv${lv}`);
  ok(`--lv${lv} แถบ/จุด ≥3:1 ธีมสว่าง (${ratio(c, surfLight).toFixed(2)})`, ratio(c, surfLight) >= 3, true);
  ok(`--lv${lv} แถบ/จุด ≥3:1 ธีมมืด (${ratio(c, surfDark).toFixed(2)})`, ratio(c, surfDark) >= 3, true);
  const on = tok(`--lv${lv}-on`);
  ok(`--lv${lv}-on ตัวอักษรขาว ≥4.5:1 (${ratio(on, '#ffffff').toFixed(2)})`, ratio(on, '#ffffff') >= 4.5, true);
}

// ── ค. เมนูหลักเท่ากันทุกหน้า ─────────────────────────────────────────────
// ธรรมเนียมจริงของเว็บ (ยามตัวนี้เป็นคนเผยตอนรันครั้งแรก): ชุดมาตรฐานมี 6 รายการ
// แต่ละหน้าแสดง "6 − ลิงก์ถึงตัวเอง" · admin.html ไม่อยู่ในชุดจึงเห็นครบ 6 ·
// capacity.html = "⚙️ ผู้ดูแลระบบ" นำหน้า + ครบ 6 (ข้อยกเว้นที่ประกาศ — P-HUB-07)
console.log('═══ ค) เมนูหลัก (a ไม่มี class ใน .navlinks) ชุดมาตรฐานเดียว ลำดับเดียว ทุกหน้า ═══');
const menuOf = (file) => {
  const html = readFileSync(join(pub, file), 'utf8');
  const nav = (html.match(/<nav class="navlinks"[\s\S]*?<\/nav>/) || [''])[0];
  return [...nav.matchAll(/<a\s+href="([^"]+)">/g)].map(m => m[1]);
};
const pages = readdirSync(pub).filter(f => f.endsWith('.html'));
const withNav = pages.filter(f => readFileSync(join(pub, f), 'utf8').includes('class="navlinks"'));
const STD = menuOf('admin.html');                       // admin เห็นครบ = นิยามชุดมาตรฐาน
ok('ชุดมาตรฐาน (จาก admin.html) มี 6 รายการ', STD.length, 6);
const minusSelf = (f) => STD.filter(h => !h.startsWith(f)).join(' · ');
for (const f of withNav) {
  if (f === 'admin.html') continue;                     // ใช้เป็นนิยามข้างบนแล้ว
  if (f === 'capacity.html')
    ok('capacity.html = "⚙️ ผู้ดูแลระบบ" + ชุดมาตรฐานครบ 6 (7 รายการ — ข้อยกเว้นที่ประกาศ)',
      menuOf(f).join(' · '), ['admin.html', ...STD].join(' · '));
  else
    ok(`${f} = ชุดมาตรฐานลำดับเดิม − ลิงก์ถึงตัวเอง`, menuOf(f).join(' · '), minusSelf(f));
}

console.log('');
console.log(bad === 0 ? `สรุป t_lvguards: ผ่าน ${n}/${n} ข้อ` : `❌ ไม่ผ่าน ${bad} จาก ${n} ข้อ`);
process.exit(bad === 0 ? 0 : 1);
