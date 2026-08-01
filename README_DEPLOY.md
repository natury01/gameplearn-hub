# เกมเพลิน (GamePlearn) Hub — คู่มือติดตั้งและ Deploy

เว็บไซต์กลางของแพลตฟอร์ม: แคตตาล็อกเกม (`index.html`) + Dashboard กลางสำหรับครู (`teacher.html`)
Static site ล้วน ไม่ต้อง build — deploy บน Cloudflare Pages แบบเดียวกับเกมกาญจนบุรี

**Game On. Learn Beyond.** — เริ่มเกม แล้วก้าวไปไกลกว่าการเรียนรู้เดิม
(สโลแกนสำรอง: **Play. Learn. Level Up.** — ทุกเกม คืออีกขั้นของการเรียนรู้ · สลับได้ที่ `js/config.js` → `SLOGAN_MODE`)

## ไฟล์ในโปรเจกต์

```text
gameplearn-hub/
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

1. **สร้าง GitHub repo ใหม่** ชื่อ `gameplearn-hub` → อัปโหลดไฟล์ทั้งโฟลเดอร์นี้ (คงโครง `js/` และ `css/` ไว้)
2. **Cloudflare Pages** → Workers & Pages → Create → Pages → Connect to Git → เลือก repo
   - Framework preset: **None** · Build command: *(เว้นว่าง)* · Build output directory: `/`
   - Deploy → ได้ URL ชั่วคราว `https://<ชื่อโปรเจกต์>.pages.dev`
3. **ผูกโดเมนจริง `gameplearn.com`** (จดไว้แล้ว):
   - นำ nameserver ของโดเมนมาชี้ที่ Cloudflare (Cloudflare → Add a site → gameplearn.com → ทำตามขั้นตอน)
   - ที่ Pages project ของ hub → Custom domains → Set up a custom domain → ใส่ `gameplearn.com` และ `www.gameplearn.com`
   - ผังโดเมนของแพลตฟอร์ม:

     | โดเมน | ระบบ |
     |---|---|
     | `gameplearn.com` | เว็บกลาง (hub) |
     | `kan.gameplearn.com` | เกมผจญภัยกาญจนบุรี (ตั้ง custom domain ที่ Pages project ของเกม) |
     | `typing.gameplearn.com` | เกมพิมพ์สัมผัส (อนาคต) |

4. **เปิดปุ่ม Google ให้เว็บนี้** (สำคัญ — ไม่ตั้งค่านี้ปุ่ม Google จะเด้งกลับไปที่เกมแทน):
   Supabase → Authentication → **URL Configuration** → **Redirect URLs** → Add URL ทั้งสองบรรทัด:
   ```text
   https://gameplearn.com/teacher.html
   https://<ชื่อโปรเจกต์>.pages.dev/teacher.html
   ```
5. **อัปเดต URL ของเกมในฐานข้อมูล** เมื่อ subdomain ของเกมพร้อมใช้งาน (SQL Editor):
   ```sql
   update public.games
      set launch_url    = 'https://kan.gameplearn.com',
          dashboard_url = 'https://kan.gameplearn.com/dashboard.html'
    where code = 'kanchanaburi2050';
   ```
   ทำหลังจาก custom domain ของเกมใช้งานได้จริงแล้วเท่านั้น — ระหว่างนี้ปล่อยเป็น `cai-kan.pages.dev` ได้

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
