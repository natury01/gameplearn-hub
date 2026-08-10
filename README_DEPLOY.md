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

## ก่อน deploy: รัน SQL ให้ครบ 2 ไฟล์

| ไฟล์ | ทำอะไร | สถานะ |
|---|---|---|
| `01_DATABASE_CORE.sql` | ชั้นแพลตฟอร์ม: `classroom_games`, `student_game_progress`, catalog + RLS ของ `games`, hook summary | ✅ รันแล้ว |
| `08_ASSESSMENT_CORE.sql` | ชั้นวัดผล 2 มิติ: กรอบหลักสูตร + `student_item_scores` + RPC + views | ⬜ **ต้องรันก่อน deploy** |

> เว็บออกแบบให้ **ไม่พังถ้ายังไม่รัน 08** — แท็บ "สมรรถนะหลัก" จะขึ้นข้อความบอกว่ายังไม่มีข้อมูล แทนที่จะ error
> แต่ควรรันก่อน deploy เพื่อให้ครูเห็นครบทั้ง 2 มิติตั้งแต่วันแรก

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
