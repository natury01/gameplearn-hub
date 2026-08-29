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

/* [V.1.6.31] ตัดคอมเมนต์ทิ้งก่อนอ่านโทเคน — ผู้ตรวจหักล้างชี้ว่าคอมเมนต์รูป "--ชื่อ: #hex"
   ที่อยู่ก่อน :root จะ shadow ค่าจริงทุกยามโดยไม่มีใครรู้ */
const css = readFileSync(join(pub, 'css', 'gp.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
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

// ── ข2. [V.1.6.31] ตระกูลสีแยกความหมาย + เส้นคั่นแท่ง ─────────────────────
// บทเรียน P-HUB-11: #b45309 เคยเป็นทั้ง --lv4-on และ ACH_BANDS 50–59 (+อีก 2 ความหมาย)
// บนหน้าครูหน้าเดียว — ยามนี้กันไม่ให้ตระกูล "ระดับ" กับ "ช่วงผลสัมฤทธิ์" มีค่าซ้ำกันอีก
console.log('═══ ข2) ตระกูลสีแยกความหมาย (P-HUB-11) + เส้นคั่นแท่ง (WCAG 1.4.11) ═══');
const ACH_KEYS = ['low', 'pass', 'ok', 'good', 'best'];
const achC = ACH_KEYS.map(k => tok(`--ach-${k}`));
ok('โทเคน --ach-* ครบ 5 ค่าใน :root', achC.every(Boolean), true);
ACH_KEYS.forEach((k, i) =>
  ok(`--ach-${k} ตัวอักษรขาว ≥4.5:1 (${ratio(achC[i], '#ffffff').toFixed(2)})`,
    ratio(achC[i], '#ffffff') >= 4.5, true));
const lvFam = ['3', '4', '5', '6'].flatMap(l => [tok(`--lv${l}`), tok(`--lv${l}-on`)]).filter(Boolean);
ok('ไม่มีค่า --ach-* ตัวใดซ้ำกับตระกูล --lv*/--lv*-on',
  achC.filter(c => lvFam.includes(c)).join(','), '');
ok('ค่าในตระกูล --ach-* ไม่ซ้ำกันเอง', new Set(achC).size, 5);
ok('ค่าในตระกูล --lv*-on ไม่ซ้ำ --ach-pass (#b45309 กลับมาไม่ได้อีก)',
  lvFam.includes(tok('--ach-pass')), false);
// เส้นคั่นแท่ง: คู่เข้ม-เข้มที่ขาวทับผ่านทั้งคู่ จะต่างกันเองไม่ถึง 3:1 โดยคณิตศาสตร์
// ⇒ 1.4.11 ปิดด้วยช่องว่างสีอ่อนคั่น — วัดเส้นคั่นกับ "ทุกสีแท่ง" ต้อง ≥3:1 จริง
const SEP = tok('--lvbar-sep');
ok('มีโทเคน --lvbar-sep ใน :root', Boolean(SEP), true);
ok('.lvbar มี gap: 2px คั่นแท่ง', /\.lvbar\s*\{[^}]*gap:\s*2px/s.test(css), true);
for (const c of [...new Set([...['3', '4', '5', '6'].map(l => tok(`--lv${l}-on`)), ...achC])].filter(Boolean))
  ok(`เส้นคั่น ↔ ${c} ≥3:1 (${ratio(SEP, c).toFixed(2)})`, ratio(SEP, c) >= 3, true);
// จุดใช้งานใน teacher.html ต้องถูกฝั่ง (ใบ HUB 26 ส.ค. — ตาราง A1 ฉบับแทนที่)
// [V.1.6.31] ตรวจว่า anchor มีอยู่จริงก่อน — indexOf = -1 จะทำ slice เป็นสตริงว่าง
// แล้วข้อที่คาด false เขียวกลวงทันที (fail-open · ผู้ตรวจหักล้างจับได้)
const th = readFileSync(join(pub, 'teacher.html'), 'utf8');
ok('เจอ anchor "function levelBar" ใน teacher.html', th.indexOf('function levelBar') >= 0, true);
ok('เจอ anchor "const ACH_BANDS" ใน teacher.html', th.indexOf('const ACH_BANDS') >= 0, true);
const lvbarFn = th.slice(th.indexOf('function levelBar'), th.indexOf('function levelBar') + 1600);
ok('levelBar (มีเลขขาวทับ) ใช้ LV_COLOR_ON ไม่ใช่ LV_COLOR', lvbarFn.includes('LV_COLOR_ON[lv]'), true);
const achDef = th.slice(th.indexOf('const ACH_BANDS'), th.indexOf('const ACH_BANDS') + 900);
ok('ACH_BANDS อ้างโทเคน var(--ach-*) ไม่ใช่ hex ดิบ', /#[0-9a-fA-F]{6}/.test(achDef), false);

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

// ── ง. ภาพใบเกียรติบัตรต้องตรงกับซิปเกมรุ่นล่าสุด (V.1.6.30 · ครูเคาะ "ทาง ก") ──────────
// ภาพซ้ำสองที่โดยจำเป็น (เกม+เว็บกลาง) — ยามนี้คือสัญญาว่ามันจะไม่เหลื่อมรุ่นเงียบ ๆ (P-HUB-08)
// เทียบ md5 ของ img/cert-* กับภาพที่แกะสดจากซิปเกมรุ่นล่าสุด ณ เวลารัน — ห้าม hardcode ค่า
console.log('═══ ง) ภาพใบเกียรติบัตร ตรงกับซิปเกมรุ่นล่าสุด (อ่านสด ไม่ hardcode) ═══');
{
  const { createHash } = await import('node:crypto');
  const md5 = (buf) => createHash('md5').update(buf).digest('hex');
  const hub = (f) => md5(readFileSync(join(pub, 'img', f)));
  // ภาค 1: bg+logo เป็น base64 ฝังใน index.html ของซิป — แกะผ่าน python3 (zip อ่านตรงจาก node ไม่มี lib)
  const k1zips = readdirSync(kan1dir).filter((f) => /^kanadventure-repo_v\d+\.zip$/.test(f))
    .sort((a, b) => parseInt(b.match(/v(\d+)/)[1]) - parseInt(a.match(/v(\d+)/)[1]));
  const pyk1 = `import zipfile,re,base64,hashlib
z=zipfile.ZipFile(r'${join(kan1dir, k1zips[0])}')
d=z.read([n for n in z.namelist() if n.endswith('index.html')][0]).decode('utf-8')
bg=base64.b64decode(re.search(r"CERT_BG_SRC\\s*=\\s*'data:image/jpeg;base64,([^']+)'",d).group(1))
lg=base64.b64decode(re.search(r"CERT_LOGO_SRC\\s*=\\s*'data:image/png;base64,([^']+)'",d).group(1))
print(hashlib.md5(bg).hexdigest(), hashlib.md5(lg).hexdigest())`;
  let o1 = spawnSync('python3', ['-c', pyk1], { encoding: 'utf8' });
  if (o1.status !== 0) o1 = spawnSync('python', ['-c', pyk1], { encoding: 'utf8' });
  const [bgMd5, lgMd5] = (o1.stdout || ' ').trim().split(/\s+/);
  ok(`พื้นใบภาค 1 ตรงซิป ${k1zips[0]}`, hub('cert-bg-kan1.jpg'), bgMd5);
  ok('โลโก้ใบภาค 1 ตรงซิป', hub('cert-logo-kan1.png'), lgMd5);
  // ภาค 2: ไฟล์ assets/cert_guardian_bg.webp ในซิป slim รุ่นล่าสุด
  const kan2dir = process.env.GP_KAN2_DIR || 'D:\\GameProject\\2 Kan-Adventure2';
  const k2zips = existsSync(kan2dir) ? readdirSync(kan2dir).filter((f) => /^Kan2_V\d+.*_slim\.zip$/.test(f))
    .sort((a, b) => parseInt(b.match(/V(\d+)/)[1]) - parseInt(a.match(/V(\d+)/)[1])) : [];
  if (k2zips.length) {
    const pyk2 = `import zipfile,hashlib
z=zipfile.ZipFile(r'${join(kan2dir, k2zips[0])}')
n=[x for x in z.namelist() if x.endswith('cert_guardian_bg.webp')][0]
print(hashlib.md5(z.read(n)).hexdigest())`;
    let o2 = spawnSync('python3', ['-c', pyk2], { encoding: 'utf8' });
    if (o2.status !== 0) o2 = spawnSync('python', ['-c', pyk2], { encoding: 'utf8' });
    ok(`พื้นใบภาค 2 ตรงซิป ${k2zips[0]}`, hub('cert-bg-kan2.webp'), (o2.stdout || '').trim());
  } else {
    console.log(`  ⏭ ข้าม — ไม่พบซิป Kan2_V*_slim ใน ${kan2dir} (ข้าม ≠ ผ่าน · STD-006)`);
    process.exitCode = 77;
  }
}

console.log('');
console.log(bad === 0 ? `สรุป t_lvguards: ผ่าน ${n}/${n} ข้อ` : `❌ ไม่ผ่าน ${bad} จาก ${n} ข้อ`);
process.exit(bad === 0 ? (process.exitCode || 0) : 1);
