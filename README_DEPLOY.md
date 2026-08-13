# เกมเพลิน (GamePlearn) Hub — คู่มือติดตั้งและ Deploy

เว็บไซต์กลางของแพลตฟอร์ม: แคตตาล็อกเกม (`index.html`) + Dashboard กลางสำหรับครู (`teacher.html`)
Static site ล้วน ไม่ต้อง build — deploy บน **Cloudflare Workers (static assets)**

> 📘 **ติดปัญหา build failed หรืออยากรู้ผัง path ของเกม → อ่าน `09_CLOUDFLARE_DEPLOY_GUIDE.md` ในชุดเอกสารกลาง (ละเอียดกว่าไฟล์นี้)**

**Game On. Learn Beyond.** — เริ่มเกม แล้วก้าวไปไกลกว่าการเรียนรู้เดิม
(สโลแกนสำรอง: **Play. Learn. Level Up.** — ทุกเกม คืออีกขั้นของการเรียนรู้ · สลับได้ที่ `js/config.js` → `SLOGAN_MODE`)

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
| ท้ายสุด | `56_STD_CLEANUP_MANUAL.sql` | ลบผังที่กรอกมือทิ้ง — **รันเมื่อยืนยันแล้วว่าเกมส่งผังครบ** เท่านั้น |

> **เว็บออกแบบให้ไม่พังถ้ายังรันไม่ครบ** — ส่วนที่ยังไม่มีข้อมูลจะขึ้นกล่องบอกว่า
> "ยังไม่ได้รันไฟล์ไหน" หรือ "รันแล้วแต่รอเกมส่งข้อมูล" แทนที่จะขึ้น error หรือปล่อยว่างเฉย ๆ
>
> **อาการที่เจอบ่อย:** สมรรถนะขึ้นด้านเดียว · ผลสัมฤทธิ์ว่าง = **ยังไม่ได้รันข้อ 4 (`43`)**
> หรือรันแล้วแต่ยังไม่ได้เปิดหน้าครูของเกมให้เกมส่งข้อมูล — ไม่ใช่บั๊กของหน้าจอ
> หน้าครูจะบอกเองว่าเป็นกรณีไหน

## ขั้นตอน Deploy (~15 นาที)

1. **สร้าง GitHub repo** ชื่อ `gameplearn-hub` → อัปโหลดไฟล์ทั้งโฟลเดอร์นี้ **รวม `wrangler.jsonc` และ `_headers`** (คงโครง `js/` และ `css/`)
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
