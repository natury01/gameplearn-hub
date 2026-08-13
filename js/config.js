/* เกมเพลิน (GamePlearn) — ค่ากลางของแพลตฟอร์ม (แก้ไฟล์นี้ไฟล์เดียวเมื่อย้ายโปรเจกต์/โดเมน)
 * กฎเหล็ก: anon key เท่านั้น (เปิดเผยได้ — สิทธิ์จริงคุมด้วย RLS/RPC ฝั่ง Supabase)
 * อ้างอิง: 00_PLATFORM_AGREEMENT.md v1.1 */
window.GP_CONFIG = {
  SB_URL: 'https://janoonnhzpwjnxqjvswt.supabase.co',
  SB_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphbm9vbm5oenB3am54cWp2c3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzUxODIsImV4cCI6MjEwMDgxMTE4Mn0.bimXWE_w_RRwOY9KbmLGqkpBlaI57WV34CXdLtbe4Vs',

  BRAND_TH: 'เกมเพลิน',
  BRAND_EN: 'GamePlearn',

  /* รุ่นของ "เว็บกลาง" — ที่เดียวที่ต้องแก้เวลาออกรุ่นใหม่
     แสดงท้ายทุกหน้าโดยอัตโนมัติ (gp-brand.js) และใช้ตั้งชื่อไฟล์ zip ที่ส่งให้ครู
     ทำไมต้องมี: เวลาครูแจ้งปัญหา จะได้รู้ทันทีว่ากำลังเปิดรุ่นไหนอยู่
     ไม่ต้องเดาว่าอัปโหลดชุดใหม่แล้วหรือยัง — ปัญหาที่เสียเวลาไล่มาหลายรอบแล้ว
     เลข 2569.0811 = ปี พ.ศ. + วันที่ build (รูปแบบเดียวกับป้ายรุ่นของเกมทั้งสองภาค) */
  HUB_VERSION: 'V.1.4.4',
  HUB_BUILD: '2569.0812',

  /* อีเมลผู้ดูแล — ใช้เป็นช่องทางสำรองของหน้า contact.html
     (ตอนที่ยังไม่ได้รัน 15_SITE_PAGES.sql หรือระบบรับข้อความมีปัญหา) */
  ADMIN_EMAIL: 'arkhom.aintaphan@gmail.com',

  /* สโลแกน — ตัวแรกคือสโลแกนหลัก (ใช้เป็นค่าเริ่มต้นทุกที่)
     ตัวที่สองใช้สลับได้ตามบริบท เช่น หน้าโปรโมต/สื่อประชาสัมพันธ์ */
  SLOGANS: [
    { en: 'Game On. Learn Beyond.', th: 'เริ่มเกม แล้วก้าวไปไกลกว่าการเรียนรู้เดิม' },
    { en: 'Play. Learn. Level Up.', th: 'ทุกเกม คืออีกขั้นของการเรียนรู้' },
  ],
  /* index = สโลแกนที่จะแสดงบนหน้าเว็บ (0 หรือ 1) · ใส่ 'random' เพื่อสุ่มทุกครั้งที่โหลดหน้า */
  SLOGAN_MODE: 0,

  /* แถบ "เกมแนะนำ" บนหน้าแรกจะแสดงเมื่อมีเกมตั้งแต่กี่เกมขึ้นไป
     เหตุผล: ถ้ามีไม่กี่เกม แถวเกมแนะนำจะซ้ำกับ "เกมทั้งหมด" ที่อยู่ถัดลงไปทันที ดูเหมือนระบบผิดพลาด
     เกมที่ปักหมุดไว้จะยังขึ้นก่อนเพื่อนพร้อมป้าย ⭐ แนะนำ ในแคตตาล็อกอยู่ดี
     อยากให้แถบขึ้นเลยตั้งแต่ตอนนี้ → เปลี่ยนเป็น 1 */
  FEATURED_MIN_GAMES: 5,
};

/* ตัวช่วยเลือกสโลแกนที่จะแสดง — ใช้ร่วมกันทุกหน้า */
window.GP_SLOGAN = (function (c) {
  var i = c.SLOGAN_MODE === 'random' ? Math.floor(Math.random() * c.SLOGANS.length) : (c.SLOGAN_MODE || 0);
  return c.SLOGANS[i] || c.SLOGANS[0];
})(window.GP_CONFIG);
