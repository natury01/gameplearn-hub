# เกมเพลิน (GamePlearn) Hub — คู่มือติดตั้งและ Deploy

เว็บไซต์กลางของแพลตฟอร์ม: แคตตาล็อกเกม (`index.html`) + Dashboard กลางสำหรับครู (`teacher.html`)
Static site ล้วน ไม่ต้อง build — deploy บน **Cloudflare Workers (static assets)**

> 📘 **ติดปัญหา build failed หรืออยากรู้ผัง path ของเกม → อ่าน `09_CLOUDFLARE_DEPLOY_GUIDE.md` ในชุดเอกสารกลาง (ละเอียดกว่าไฟล์นี้)**

**Game On. Learn Beyond.** — เริ่มเกม แล้วก้าวไปไกลกว่าการเรียนรู้เดิม
(สโลแกนสำรอง: **Play. Learn. Level Up.** — ทุกเกม คืออีกขั้นของการเรียนรู้ · สลับได้ที่ `js/config.js` → `SLOGAN_MODE`)


## ผังไฟล์ (ตั้งแต่ V.1.6.25)

```
gameplearn-hub/            ← รากรีโป · Cloudflare Root directory = /
├── wrangler.jsonc         ★ ต้องอัป — บอก Cloudflare ว่าอัปเฉพาะ public/
├── public/                ★ ★ **โฟลเดอร์เดียวที่ขึ้นเว็บ**
│   ├── index.html  teacher.html  admin.html  dashboard.html
│   ├── standards.html  support.html  contact.html  capacity.html
│   ├── js/   (6 ไฟล์)      css/gp.css
│   ├── favicon.svg        robots.txt
│   └── _headers           ★ ต้องอยู่ในนี้ Cloudflare จึงจะอ่าน (F11)
├── sql/                   ไฟล์ SQL ที่ครูรันบน Supabase — **ไม่ขึ้นเว็บ**
├── test/                  ชุดทดสอบ — **ไม่ขึ้นเว็บ**
└── README.md  README_DEPLOY.md   — **ไม่ขึ้นเว็บ**
```

**กฎเดียวที่ต้องจำ: อะไรที่คนนอกควรเห็น วางใน `public/` · อะไรที่ไม่ควรเห็น วางนอก `public/`**
ไม่มีบัญชีให้ลืมอัป ไม่มีไฟล์ซ่อนให้ตกหล่น
## ไฟล์ในโปรเจกต์

```text
gameplearn-hub/
├── wrangler.jsonc            ★ ไฟล์ตั้งค่า Cloudflare — ไม่มี = build fail
├── _headers                  CSP + header ความปลอดภัย (Cloudflare อ่านไฟล์นี้เองอัตโนมัติ — ต้องอัปโหลดด้วย)
│                             ⚠️ ถ้าย้ายโปรเจกต์ Supabase ต้องแก้ URL ใน connect-src ของไฟล์นี้ด้วย
│                             (คู่กับ SB_URL ใน js/config.js — เป็นข้อยกเว้นเดียวของกฎ "แก้ที่ config.js ที่เดียว")
├── index.html                แคตตาล็อกเกม + ปุ่ม "📋 มาตรฐานที่วัด" ต่อเกม
├── teacher.html              เข้าสู่ระบบครู + ห้องเรียน + มอบหมายเกม + Dashboard กลาง 2 มิติ
├── js/config.js              ค่ากลาง (Supabase + แบรนด์ + สโลแกน) — แก้ที่นี่ที่เดียว
├── js/gp-core.js             ตัวเชื่อม Supabase (REST/RPC + session)
├── js/gp-standards-panel.js  แผง "มาตรฐานการเรียนรู้ที่เกมนี้วัด" (คอมโพเนนต์กลาง ใช้ในเกมได้ด้วย)
└── css/gp.css                สไตล์กลาง (รองรับ Dark Mode อัตโนมัติ)
```

## SQL — ลำดับการรัน (ปรับล่าสุด V.1.3.0)

รันจากบนลงล่างบน Supabase → SQL Editor · ทุกไฟล์รันซ้ำได้ ไม่ลบของเดิม

| ลำดับ | ไฟล์ | ทำอะไร |
|---|---|---|
| 1 | `01_DATABASE_CORE.sql` | ชั้นแพลตฟอร์ม: `classroom_games`, `student_game_progress`, catalog + RLS ของ `games` |
| 2 | `08_ASSESSMENT_CORE.sql` | ชั้นวัดผล 2 มิติ: กรอบหลักสูตร + `student_item_scores` + views |
| 3 | `supabase_patch_all_v7995.sql` | ชุดแก้ของเกมภาค 1 (ต้องเป็น v7995 — v7994 ยังไม่มีตัวกรอง `is_active`) |
| 4 | **`43_REPORT_CARDS.sql`** | **ใบรายงานผล 2 ใบ — ไม่รันไฟล์นี้ ผลสัมฤทธิ์จะว่างทั้งหน้า** |
| 5 | `46_CLASSROOM_MANAGE.sql` | ช่องโรงเรียน/ปีการศึกษา/วิธีเข้าห้อง + ปิดการใช้งานนักเรียน |
| 6 | `SQL_ภาค2_กระดานอันดับภาค2.sql` (ฉบับแก้ 2) | กระดานอันดับภาค 2 |
| 7 | `48_RPC_ACTIVE_CHECK.sql` | ตรวจกติกา `is_active` (อ่านอย่างเดียว ปลอดภัยกับฐานจริง) |
| 8 | `51_STD_KAN2.sql` | ผังมาตรฐานภาค 2 (ชุดกรอกมือ รอเกมส่งผ่าน RPC) |
| 9 | `52_VISIT_STATS.sql` (ฉบับแก้ 2) | ตัวนับการเยี่ยมชม (หน้า Admin → สถิติการใช้งาน) |
| 10 | `53_STANDARDS_SYNC.sql` (ฉบับแก้ 3) | ให้เกมส่งผังมาตรฐานของตัวเองขึ้นทะเบียน |
| 11 | `55_DELETE_ROOM_STUDENT.sql` | **ปุ่มลบห้อง/ลบนักเรียน** + `deletion_log` (ไม่รัน = กดปุ่มลบแล้วขึ้นข้อความบอกให้มารันไฟล์นี้) |
| 12 | `57_GAME_MEDIA.sql` | **คลังภาพรายด่าน** ทำปกการ์ดเกมเป็นสไลด์ (ไม่รัน = การ์ดใช้ปกเดิม ไม่พัง) |
| 13 | `59_ROOM_BROWSE.sql` | **ดูห้องสาธารณะของครูคนอื่น** บนหน้าครู (ไม่รัน = เมนูนั้นบอกให้มารันไฟล์นี้ ส่วนอื่นปกติ) |
| 14 | `60_ROOM_CLAIM.sql` | **สร้างห้องได้ก่อนล็อกอิน** แล้วผูกเข้าบัญชีทีหลัง (ไม่รัน = ปุ่มนั้นบอกให้มารันไฟล์นี้) |
| 15 | `61_STANDARDS_SKIPPED.sql` | ให้ `rpc_publish_standards` บอกเกมได้ว่า**รายการไหนตกและเพราะอะไร** (ภาค 1 ขอมา · ไม่รันก็ไม่พัง แค่เกมบอกครูได้แค่จำนวน) |
| 16 | `64_REPORT_SKIPPED.sql` | ให้ `rpc_submit_report` **เก็บได้เท่าไรเก็บ** แล้วบอกว่าอะไรตกเพราะอะไร (ต้องรัน `43_REPORT_CARDS.sql` มาก่อน · ไม่รันก็ไม่พัง แต่รายการเดียวผิดจะทำให้ใบของเด็กคนนั้นไม่ขึ้นเว็บกลางทั้งใบเหมือนเดิม) |
| 17 | `66_STANDARDS_OWNERSHIP.sql` | **คำอธิบายที่ผู้ดูแลแก้ไว้ เกมทับไม่ได้** (รวมของไฟล์ `61` ไว้ครบแล้ว รันทับได้เลย · ไม่รัน = เกมเขียนทับข้อความของผู้ดูแลทุกครั้งที่ส่งซ้ำ) |
| 18 | `71_STANDARDS_ADMIN_EDIT.sql` | **ผู้ดูแลแก้ "คำอธิบายที่ครูอ่าน" ได้จากหน้า Admin** (รวมของไฟล์ `61` + `66` ครบแล้ว รันแทนได้เลย · ไม่รัน = หน้า Admin ขึ้นคำเตือนและบันทึกไม่ได้ ส่วนอื่นปกติ) |
| 19 | `72_PUBLIC_DASHBOARD.sql` | **หน้าสรุปผลรวมที่ทุกคนเปิดดูได้โดยไม่ต้องล็อกอิน** (`dashboard.html`) · ต้องรัน `43_REPORT_CARDS.sql` มาก่อน · ไม่รัน = หน้านั้นขึ้นข้อความบอกให้มารันไฟล์นี้ ส่วนอื่นปกติ |
| 20 | `84_DB_CAPACITY.sql` | หน้าตรวจความจุฐานข้อมูล (`capacity.html`) — ไม่รันก็ใช้เว็บได้ตามปกติ แต่หน้านั้นจะบอกให้มารันไฟล์นี้ |
| ท้ายสุด | `56_STD_CLEANUP_MANUAL.sql` | ลบผังที่กรอกมือทิ้ง — **รันเมื่อยืนยันแล้วว่าเกมส่งผังครบ** เท่านั้น<br>⚠️ รันคำสั่ง "ดูก่อน" ท้ายไฟล์ `71` ก่อนเสมอ (แคบลงมากแล้วหลังไฟล์ 71 — มักว่างเปล่า = รันได้เลย) |

> **เว็บออกแบบให้ไม่พังถ้ายังรันไม่ครบ** — ส่วนที่ยังไม่มีข้อมูลจะขึ้นกล่องบอกว่า
> "ยังไม่ได้รันไฟล์ไหน" หรือ "รันแล้วแต่รอเกมส่งข้อมูล" แทนที่จะขึ้น error หรือปล่อยว่างเฉย ๆ
>
> **อาการที่เจอบ่อย:** สมรรถนะขึ้นด้านเดียว · ผลสัมฤทธิ์ว่าง = **ยังไม่ได้รันข้อ 4 (`43`)**
> หรือรันแล้วแต่ยังไม่ได้เปิดหน้าครูของเกมให้เกมส่งข้อมูล — ไม่ใช่บั๊กของหน้าจอ
> หน้าครูจะบอกเองว่าเป็นกรณีไหน

## ⭐ พิธีออกรุ่น (ทำทุกครั้งที่อัปรุ่นใหม่ — ตาม STD-002 ข้อ 5 · เพิ่มจากบทเรียน Audit F11)

> **ทำไมต้องมี:** 18 ส.ค. 2569 อัปเกมรุ่นใหม่แล้ว 2 รอบ แต่เว็บยังส่งรุ่นเก่าให้ผู้ใช้
> เพราะ edge cache ของ Cloudflare ถือ HTML เก่าไว้ — ครูไล่หาสาเหตุอยู่นานมาก
> ใช้กับ**ทุกโปรเจกต์บนโดเมนนี้** (เว็บกลางและทั้งสองเกม)

1. อัปโหลดรุ่นใหม่ (ซิปชื่อมีเลขรุ่น ตาม STD-002/STD-005)
2. **Purge Cache** — Cloudflare dashboard → Caching → Purge Cache
   (เจาะเฉพาะ path ที่อัปได้ เช่น `gameplearn.com/kan-adventure/*` · ไม่แน่ใจให้ Purge Everything)
3. **เปิดหน้าจริงดูเลขรุ่นท้ายหน้า** ว่าตรงกับรุ่นที่เพิ่งอัป — ห้ามข้ามขั้นนี้
   (เว็บกลางตั้ง `Cache-Control: no-cache` ให้ตัวเองแล้วใน `_headers` ตั้งแต่ V.1.6.5
   แต่ขั้นตรวจยังต้องทำ เพราะเกมทั้งสองยังไม่มี header นี้จนกว่าจะรับเทมเพลตไป)
4. อัป **`games.current_version`** ในหน้า Admin → 🎮 ทะเบียนเกม ให้ตรงกับรุ่นที่เพิ่งขึ้นเว็บ
   (ช่องนี้เพิ่มใน V.1.6.5 — เดิมต้องแก้ด้วย SQL จึงไม่มีใครแก้ และค้างที่ "7.45" มานาน)
5. เก็บซิปรุ่นลงโฟลเดอร์โปรเจกต์ · คงรุ่นล่าสุด + ย้อนหลัง 1 รุ่นเสมอ (STD-005)

## ขั้นตอน Deploy (~15 นาที)

1. **สร้าง GitHub repo** ชื่อ `gameplearn-hub` → อัปโหลดไฟล์ทั้งโฟลเดอร์นี้ **คงโครงเดิมทุกอย่าง** (`public/` · `sql/` · `test/` · `wrangler.jsonc`)
   > ✅ **ตั้งแต่ V.1.6.25 ไม่ต้องกังวลเรื่องไฟล์ซ่อนอีกแล้ว**
   > ของเดิมใช้ `.assetsignore` (ขึ้นต้นด้วยจุด) ซึ่งเครื่องมืออัปข้ามไป **2 รุ่นติดกัน**
   > — V.1.6.23 ทำให้ซอร์ส SQL เปิดสาธารณะต่อ · V.1.6.24 ทำให้หน้า `capacity.html` ไม่ขึ้น
   > ตอนนี้ย้ายไปปิดที่โครงสร้างแทน: **`wrangler.jsonc` ชี้ `"directory": "./public"`**
   > ⇒ เฉพาะไฟล์ใน `public/` เท่านั้นที่ขึ้นเว็บ · `sql/` `test/` `README*` **เสิร์ฟไม่ได้โดยโครงสร้าง**
   > ⚠️ **เพิ่มหน้าเว็บใหม่ = วางใน `public/`** ไม่ใช่ที่รากรีโป (ชุด `t_assets` คุมอยู่ จะแดงถ้าวางผิด)
2. **Cloudflare** → Workers & Pages → Create → **Workers** → Import a repository → เลือก repo
   - Build command: **เว้นว่าง** (เว็บนี้ไม่มี build step และไม่มี `package.json`)
   - Deploy → ได้ URL ชั่วคราวของ Worker
3. **ผูกโดเมนจริง `gameplearn.com`**: Worker → Settings → Domains & Routes → Add → **Custom domain** → `gameplearn.com`
4. **เปิดปุ่ม Google ให้เว็บนี้** (สำคัญ — ไม่ตั้งค่านี้ปุ่ม Google จะเด้งกลับไปที่เกมแทน):
   Supabase → Authentication → **URL Configuration** → **Redirect URLs** → Add:
   ```text
   https://gameplearn.com/teacher.html
   ```
5. **ผังโดเมนของแพลตฟอร์ม** (เกมอยู่ใต้ path ไม่ใช่ subdomain — ทำให้ล็อกอินครั้งเดียวใช้ได้ทุกที่):

   | URL | ระบบ | วิธีผูก |
   |---|---|---|
   | `gameplearn.com` | เว็บกลาง (hub) | Custom Domain |
   | `gameplearn.com/kan-adventure/*` | เกมผจญภัยกาญจนบุรี | Route (ที่ Worker ของเกม) |
   | `gameplearn.com/typing-adventure/*` | เกมพิมพ์สัมผัส (อนาคต) | Route |
   | `www.gameplearn.com` | → redirect 301 ไปโดเมนหลัก | Redirect Rule |

   ขั้นตอนย้ายเกมมาที่ path และการตั้ง www redirect อยู่ใน `09_CLOUDFLARE_DEPLOY_GUIDE.md` ส่วนที่ 3 และ 4

6. **อัปเดต URL ของเกมในฐานข้อมูล** — ทำหลังเกมใช้งานที่ path ใหม่ได้จริงแล้วเท่านั้น:
   ```sql
   update public.games
      set launch_url    = 'https://gameplearn.com/kan-adventure/',
          dashboard_url = 'https://gameplearn.com/kan-adventure/dashboard.html'
    where code = 'kanchanaburi2050';
   ```
   ระหว่างนี้ปล่อยเป็น `cai-kan.pages.dev` ได้ — แคตตาล็อกจะชี้ไปที่เดิมจนกว่าจะแก้แถวนี้

## ทดสอบหลัง Deploy

- [ ] หน้าแรกแสดงเกม "ผจญภัยกาญจนบุรี" จากตาราง games (ไม่ hard-code) + ป้ายสมรรถนะ/กลุ่มสาระที่เกมวัด
- [ ] กดปุ่ม "📋 มาตรฐานที่วัด" แล้วเห็นระดับชั้น + กลุ่มสาระ + สมรรถนะหลักและด้านย่อยครบ
- [ ] ครูกดเข้าสู่ระบบด้วย Google แล้วเห็นห้องเรียน 3 ห้องของตัวเอง (บัญชีเดียวกับที่ใช้ในเกม)
- [ ] แท็บ **ผลสัมฤทธิ์**: ตารางนักเรียน 50 คนพร้อมความคืบหน้าและคะแนน
- [ ] แท็บ **สมรรถนะหลัก**: แถบสมรรถนะ 6 ด้าน — การคิดขั้นสูงมีค่า ที่เหลือขึ้น "ยังไม่มีเกมวัด"
- [ ] แตะชื่อนักเรียน → เห็นทั้ง 2 มิติ + สมรรถนะย่อย 4 ด้าน + องค์ประกอบคะแนน A/B/C/D
- [ ] สวิตช์มอบหมายเกมต่อห้อง เปิด/ปิดแล้วบันทึกจริง
- [ ] เปิดเกมจากมือถือ/เครื่องอื่นยังเล่นได้ปกติ (regression)

## หมายเหตุระบบบัญชี

- ครูที่ login เกมด้วย **Google**: ใช้ปุ่ม Google บน hub ได้เลย เห็นห้องเดิมทันที (บัญชีเดียวกัน)
- ครูที่ใช้เกมแบบ **ไม่ต้องสมัคร (anonymous)**: แนะนำให้ผูกบัญชี Google จากในเกมก่อน แล้วใช้ Google บน hub
  — ปุ่ม "กู้คืนด้วยโค้ด KRU-…" มีไว้กรณีย้ายถาวรเท่านั้น เพราะการกู้คืน **ย้ายห้องทั้งหมด** มาที่การเข้าสู่ระบบใหม่

## ตัวเลือกเสริม (แนะนำ ทำเมื่อสะดวก)

**ปิดช่องโหว่ view เก่า** — `v_student_competency` สร้างไว้แบบไม่เคารพ RLS ทั้งเกมและ hub ไม่ได้ใช้ ปิดได้ด้วย SQL บรรทัดเดียว:
```sql
alter view public.v_student_competency set (security_invoker = on);
```

**สำรองข้อมูลแบบ Free Plan** (ไม่มี backup อัตโนมัติ) — ทำเดือนละครั้งหรือก่อนแก้ระบบใหญ่:
SQL Editor → รันทีละคำสั่ง → ปุ่ม Download ผลเป็น CSV เก็บไว้ในเครื่อง:
```sql
select * from students;      select * from classrooms;
select * from competency_results;   select * from student_item_scores;
select * from student_game_progress;
select * from events where created_at >= now() - interval '90 days';
```

## การแก้ไขในอนาคต

- **เพิ่มเกมใหม่**: ไม่ต้องแตะโค้ด hub เลย — เพิ่มแถวใน `games` (status=published) + ลงทะเบียน `game_framework_items`
- **เปลี่ยนหลักสูตร**: เพิ่มกรอบใหม่ใน `assessment_frameworks` + `framework_items` แล้วชี้เกมไปกรอบใหม่ — หน้าเว็บตามเอง
- **เปลี่ยนสโลแกน**: แก้ `SLOGAN_MODE` ใน `js/config.js` (0, 1 หรือ `'random'`)

---

## ✅ ตรวจหลังอัปทุกครั้ง — **วัดที่เนื้อ ไม่ใช่ที่สถานะ**

> ⚠️ **`curl -I` ดูรหัส 404 ใช้ไม่ได้กับเว็บนี้** — `wrangler.jsonc` ตั้ง
> `not_found_handling: "single-page-application"` ⇒ ไฟล์ที่หาไม่เจอจะถูกตอบด้วย
> `index.html` พร้อมสถานะ **200** เสมอ · พิสูจน์แล้วด้วยการยิงพาธมั่ว
> `gameplearn.com/zzz/nope.sql` → **HTTP 200 · 50,232 ไบต์ = index.html**
> ⇒ ถ้าดูแต่สถานะ จะแยก "ปิดสำเร็จ" กับ "ยังหลุด" ไม่ออกเลย เพราะเป็น 200 ทั้งคู่

**⚠️ Purge Cache ก่อนตรวจเสมอ** ไม่งั้นจะได้ของเก่าจาก edge แล้วสรุปผิด (บทเรียน F11)

**ทางลัด (V.1.6.26 · P33): สคริปต์เดียวจบ ตรวจครบทั้งเปิด/ปิด/เลขรุ่น — ตามลิงก์ redirect ให้เอง**

```bash
python3 test/verify_deployed.py V.1.6.26
```

หรือทำมือทีละข้อแบบเดิม:

```bash
# ① ของที่ต้องถูกปิด — ต้องได้ index.html กลับมา
for p in sql/60_ROOM_CLAIM.sql sql/83_VISIT_SOURCE.sql test/t_regress.mjs          test/sql/00_fixture.sql README_DEPLOY.md wrangler.jsonc ; do
  b=$(curl -s "https://gameplearn.com/$p")
  printf '%s' "$b" | head -1 | grep -qi '<!doctype html'     && echo "✅ $p ปิดแล้ว" || echo "❌ $p ยังหลุด ($(printf '%s' "$b" | wc -c) ไบต์)"
done

# ② ของที่ต้องยังเปิด — ห้ามได้ index.html
#    ⚠️ ห้ามตัดสินด้วย '<!doctype html>' — ทุกหน้า .html ก็ขึ้นต้นแบบนั้น
#       ฉบับแรก (24 ส.ค.) ใช้วิธีนั้น จะรายงานว่าทุกหน้าหายทั้งที่เสิร์ฟถูกต้อง
#       ต้องวัดด้วย "คำเฉพาะของหน้านั้น" แทน
while IFS='|' read -r p key ; do
  b=$(curl -s "https://gameplearn.com/$p")
  printf '%s' "$b" | grep -q "$key" \
    && echo "✅ $p ยังอยู่" || echo "❌ $p หายไปแล้ว! ($(printf '%s' "$b" | wc -c) ไบต์)"
done <<'PAGES'
teacher.html|ห้องเรียนของฉัน
admin.html|ผู้ดูแลระบบ
capacity.html|ความจุฐานข้อมูล
dashboard.html|ผลการเรียนรู้
standards.html|มาตรฐาน
js/config.js|HUB_VERSION
css/gp.css|--surface
robots.txt|User-agent
favicon.svg|<svg
PAGES

# ③ หัวความปลอดภัยจาก _headers ยังทำงาน (กัน F11 ถอย)
curl -sI https://gameplearn.com/ | grep -iE 'content-security-policy|cache-control'

# ④ เลขรุ่นบนเว็บตรงกับที่เพิ่งอัป
curl -s https://gameplearn.com/js/config.js | grep -i -m1 version
```

ก่อนอัปก็ตรวจได้จากเครื่องโดยไม่ต้องมี wrangler: `cd test && node t_assets.mjs`
(ชุดนี้อยู่ใน `run-all.sh` อยู่แล้ว รันทุกครั้งที่รันแบตเตอรี่)
