/* เกมเพลิน — ตัวรับโค้ดห้องเรียนจากเว็บกลาง (Platform Join Handoff)
 * เวอร์ชัน 1.0 · 2026-08-08
 *
 * ปัญหาที่แก้: นักเรียนใส่โค้ดห้องที่ gameplearn.com แล้วต้องใส่ซ้ำอีกรอบในเกม
 *
 * วิธีใช้ — ใส่บรรทัดเดียวใน <head> ของทุกเกม (ไม่ต้องแก้โค้ดเกม):
 *     <script src="/js/gp-join.js" defer></script>
 *
 * แล้วติดป้ายที่ช่องกรอกโค้ดของเกม 1 ที่:
 *     <input data-gp-join-input>          → กรอกให้ (นักเรียนกดตรวจเอง)
 *     <input data-gp-join-input="auto">   → กรอกให้ + กด Enter ให้เลย
 *
 * เกมที่ไม่ติดป้ายก็ยังใช้ได้ — อ่านค่าจาก window.GP_JOIN เอาไปใช้เองได้ทุกเมื่อ
 * ไม่โหลดไฟล์นี้ก็ยังใช้ได้ — เกมทำงานเหมือนเดิมทุกอย่าง (ไฟล์นี้เป็นส่วนเสริมล้วน ๆ)
 *
 * ⚠️ คีย์ localStorage 'gp_join_handoff' จองไว้ให้แพลตฟอร์ม — ห้ามเกมใดใช้ชื่อนี้
 */
(function () {
  'use strict';

  var LS_KEY = 'gp_join_handoff';
  var MAX_AGE = 10 * 60 * 1000;   /* 10 นาที — กันโค้ดห้องเก่าค้างบนเครื่องที่ใช้ร่วมกัน */

  function clean(v) {
    return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  /* หาโค้ดจาก 2 ทาง — URL เชื่อถือได้กว่า จึงมาก่อนเสมอ */
  var code = '', trusted = false;
  try {
    code = clean(new URLSearchParams(location.search).get('join'));
    trusted = !!code;    /* มาจากลิงก์ที่เพิ่งกด = ตั้งใจแน่นอน */
  } catch (e) {}

  if (!code) {
    try {
      var o = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (o && o.at && (Date.now() - o.at) < MAX_AGE) code = clean(o.code);
      /* trusted = false โดยตั้งใจ — ค่าจาก localStorage จะกรอกให้เฉย ๆ ไม่กดตรวจให้
         เผื่อเป็นโค้ดของคนก่อนหน้าบนคอมพิวเตอร์ส่วนกลางของโรงเรียน */
    } catch (e) {}
  }

  window.GP_JOIN = code || null;
  if (!code) return;

  /* ลบ ?join= ออกจาก URL — ไม่ให้โค้ดห้องติดไปด้วยเวลานักเรียนก๊อปลิงก์ส่งต่อ */
  if (trusted) {
    try {
      var u = new URL(location.href);
      u.searchParams.delete('join');
      history.replaceState(null, '', u.pathname + (u.search || '') + (u.hash || ''));
    } catch (e) {}
  }

  function fill(el) {
    if (!el || el.getAttribute('data-gp-join-done')) return;
    el.setAttribute('data-gp-join-done', '1');
    try { el.focus({ preventScroll: true }); } catch (e) {}
    el.value = code;
    /* ยิง event ให้เฟรมเวิร์ก/ตัวฟังของเกมรู้ว่าค่าเปลี่ยน (เหมือนคนพิมพ์เอง) */
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    /* กด Enter ให้เฉพาะกรณีมาจากลิงก์โดยตรง และเกมขออนุญาตไว้ว่า "auto" */
    if (trusted && el.getAttribute('data-gp-join-input') === 'auto') {
      setTimeout(function () {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      }, 60);
    }
  }

  function scan() {
    var el = document.querySelector('[data-gp-join-input]:not([data-gp-join-done])');
    if (el) { fill(el); return true; }
    return false;
  }

  function start() {
    if (scan()) return;
    /* ช่องกรอกของเกมส่วนใหญ่ถูกสร้างทีหลัง (ตอนกดปุ่ม "เข้าห้องเรียน")
       จึงต้องเฝ้าดู DOM แทนการหาแค่ตอนโหลดหน้า */
    if (typeof MutationObserver !== 'function') return;
    var obs = new MutationObserver(function () { if (scan()) obs.disconnect(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    /* เลิกเฝ้าหลัง 3 นาที — ไม่ปล่อยให้ทำงานค้างตลอดเวลาที่เล่นเกม */
    setTimeout(function () { obs.disconnect(); }, 180000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
