# -*- coding: utf-8 -*-
"""ตรวจปลายทางหลังอัปเว็บ (P33 — สัญญาไว้ใน CODE_TO_AUDIT_2026-08-25_ตรวจซ้ำปลายทาง.md)

ทำไมต้องมีไฟล์นี้: ตัวตรวจมือเคยพลาดสองแบบ —
  (1) นับ 307/0 ว่า "ผ่าน" ทั้งที่ไม่ได้ตามลิงก์ไปดูปลายทางจริง
  (2) Cloudflare ตั้ง single-page-application ⇒ ทุกพาธตอบ 200 เสมอ 404 ไม่มีวันเกิด
      ⇒ วัดที่ "สถานะ" ไม่ได้ ต้องวัดที่ "เนื้อ" (คำเฉพาะของแต่ละหน้า)

วิธีใช้ (เครื่องไหนก็ได้ที่มี python3 — ไม่ต้องลงอะไรเพิ่ม):
    python3 test/verify_deployed.py                    # ตรวจ gameplearn.com
    python3 test/verify_deployed.py V.1.6.26           # + ยืนยันเลขรุ่นใน js/config.js ด้วย
ออก exit 0 = ผ่านครบ · exit 1 = มีข้อไม่ผ่าน (พิมพ์รายข้อ ✅/❌ ตาม STD-006)
"""
import sys
import urllib.request

# คอนโซล Windows ไทยเป็น cp874 — พิมพ์ ✅/❌ แล้วล้มทั้งสคริปต์ (เจอจริง 25 ส.ค. รอบแรกที่ใช้)
for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'):
        _s.reconfigure(encoding='utf-8', errors='replace')

BASE = 'https://gameplearn.com'

# (พาธ, คำที่ต้องเจอ "ในเนื้อหน้า") — คำเฉพาะของหน้านั้น ไม่ใช่ doctype ที่ทุกหน้ามี
# ใช้ <title> ของหน้านั้นเป็นตัวชี้เฉพาะ: ทุกหน้ามี title ไม่ซ้ำกัน และไม่มี title
# ของหน้าอื่นอยู่ใน index.html ⇒ ถ้าไฟล์หน้านั้นหายแล้ว SPA fallback เสิร์ฟ index
# มาแทน ข้อตรวจจะแดงทันที (ฉบับแรกใช้คำทั่วไปอย่าง 'ห้องเรียน'/'มาตรฐาน' ซึ่งอยู่
# ในเมนูของ index ด้วย = จับ fallback ไม่ได้ 5 จาก 9 หน้า — ผู้ตรวจหักล้างจับได้)
MUST_OPEN = [
    ('/',               '<title>เกมเพลิน (GamePlearn) — ศูนย์รวมเกมการเรียนรู้'),
    ('/teacher.html',   '<title>เกมเพลิน — Dashboard กลางสำหรับครู'),
    ('/dashboard.html', '<title>สรุปผลรวมทั้งระบบ'),
    ('/standards.html', '<title>มาตรฐาน ตัวชี้วัด'),
    ('/contact.html',   '<title>ติดต่อ / แจ้งปัญหา'),
    ('/support.html',   '<title>สนับสนุนเกมเพลิน'),
    ('/admin.html',     '<title>ผู้ดูแลระบบ'),
    ('/capacity.html',  '<title>ความจุฐานข้อมูล'),
    ('/robots.txt',     'User-agent'),
]
# พาธที่ต้อง "ไม่ใช่ของจริง" — SPA fallback จะตอบหน้า index แทน ⇒ ตรวจว่าเนื้อไม่ใช่ของไฟล์นั้น
MUST_HIDE = [
    ('/wrangler.jsonc',            '"directory"'),
    ('/README_DEPLOY.md',          'พิธีออกรุ่น'),
    ('/test/harness.mjs',          'playwright'),
    ('/sql/84_DB_CAPACITY.sql',    'rpc_db_capacity'),
    ('/test/verify_deployed.py',   'MUST_OPEN'),
]


def fetch(path):
    req = urllib.request.Request(BASE + path, headers={
        'User-Agent': 'gp-verify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=30) as r:   # ตามลิงก์ redirect ให้เอง (บทเรียน 307)
        return r.status, r.read().decode('utf-8', errors='replace')


def main():
    want_ver = sys.argv[1] if len(sys.argv) > 1 else None
    bad = 0

    def ok(label, cond, extra=''):
        nonlocal bad
        if not cond:
            bad += 1
        print(('  ✅ ' if cond else '  ❌ ') + label + ('' if cond else ' → ' + str(extra)[:160]))

    print('═══ เปิดได้ + เนื้อถูกหน้า ═══')
    for path, word in MUST_OPEN:
        try:
            st, body = fetch(path)
            ok('%s มีคำว่า "%s"' % (path, word), st == 200 and word in body,
               'status=%s len=%d' % (st, len(body)))
        except Exception as e:
            ok(path, False, e)

    print('═══ ของพัฒนาไม่หลุด (วัดที่เนื้อ ไม่ใช่สถานะ — SPA ตอบ 200 เสมอ) ═══')
    for path, word in MUST_HIDE:
        try:
            st, body = fetch(path)
            ok('%s ไม่ใช่ไฟล์จริง (ไม่มี "%s")' % (path, word), word not in body,
               'status=%s' % st)
        except Exception:
            ok('%s เข้าไม่ได้เลย (ก็ถือว่าปิด)' % path, True)

    if want_ver:
        print('═══ เลขรุ่นบนเว็บจริง ═══')
        try:
            st, body = fetch('/js/config.js')
            ok('config.js มี HUB_VERSION %s' % want_ver, ("'" + want_ver + "'") in body,
               [l for l in body.split('\n') if 'HUB_VERSION' in l][:1])
        except Exception as e:
            ok('/js/config.js', False, e)

    print(('\n✅ ผ่านครบ' if not bad else '\n❌ ไม่ผ่าน %d ข้อ' % bad))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
