/* เกมเพลิน (GamePlearn) — ค่ากลางของแพลตฟอร์ม (แก้ไฟล์นี้ไฟล์เดียวเมื่อย้ายโปรเจกต์/โดเมน)
 * กฎเหล็ก: anon key เท่านั้น (เปิดเผยได้ — สิทธิ์จริงคุมด้วย RLS/RPC ฝั่ง Supabase)
 * อ้างอิง: 00_PLATFORM_AGREEMENT.md v1.1 */
window.GP_CONFIG = {
  SB_URL: 'https://janoonnhzpwjnxqjvswt.supabase.co',
  SB_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphbm9vbm5oenB3am54cWp2c3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzUxODIsImV4cCI6MjEwMDgxMTE4Mn0.bimXWE_w_RRwOY9KbmLGqkpBlaI57WV34CXdLtbe4Vs',

  BRAND_TH: 'เกมเพลิน',
  BRAND_EN: 'GamePlearn',

  /* สโลแกน — ตัวแรกคือสโลแกนหลัก (ใช้เป็นค่าเริ่มต้นทุกที่)
     ตัวที่สองใช้สลับได้ตามบริบท เช่น หน้าโปรโมต/สื่อประชาสัมพันธ์ */
  SLOGANS: [
    { en: 'Game On. Learn Beyond.', th: 'เริ่มเกม แล้วก้าวไปไกลกว่าการเรียนรู้เดิม' },
    { en: 'Play. Learn. Level Up.', th: 'ทุกเกม คืออีกขั้นของการเรียนรู้' },
  ],
  /* index = สโลแกนที่จะแสดงบนหน้าเว็บ (0 หรือ 1) · ใส่ 'random' เพื่อสุ่มทุกครั้งที่โหลดหน้า */
  SLOGAN_MODE: 0,
};

/* ตัวช่วยเลือกสโลแกนที่จะแสดง — ใช้ร่วมกันทุกหน้า */
window.GP_SLOGAN = (function (c) {
  var i = c.SLOGAN_MODE === 'random' ? Math.floor(Math.random() * c.SLOGANS.length) : (c.SLOGAN_MODE || 0);
  return c.SLOGANS[i] || c.SLOGANS[0];
})(window.GP_CONFIG);
