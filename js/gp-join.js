/* เกมเพลิน — ตัวรับโค้ดห้องเรียนจากเว็บกลาง (Platform Join Handoff)
 * เวอร์ชัน 1.0 · 2026-08-08
 *
 * ปัญหาที่แก้: นักเรียนใส่โค้ดห้องที่ gameplearn.com แล้วต้องใส่ซ้ำอีกรอบในเกม
 *
 * วิธีใช้ — ใส่บรรทัดเดียวเป็นสคริปต์ตัวแรกใน <head> ของทุกเกม:
 *     <script src="/js/gp-join.js"></script>
 *   (ไม่ใส่ defer เพื่อให้ window.GP_JOIN พร้อมใช้ตั้งแต่โค้ดเกมบรรทัดแรก
 *    ไฟล์เล็กมากและแคชไว้ ไม่กระทบเวลาโหลด)
 *
 * จากนั้นเลือกวิธีเชื่อม 1 ใน 2 แบบ:
 *
 *  แบบ A — ติดป้ายที่ช่องกรอกโค้ด (ไม่ต้องแตะโค้ด JS ของเกม)
 *     <input data-gp-join-input>          → กรอกให้ (นักเรียนกดปุ่มตรวจเอง)
 *     <input data-gp-join-input="auto">   → กรอกให้ + กดส่งให้เลย
 *     ระบุปุ่มที่จะกดแทนการจำลอง Enter ได้: data-gp-join-submit="#btn-join-submit"
 *     ติดได้หลายช่อง (เกมที่มีทางเข้าหลายทาง) — กรอกให้ทุกช่อง แต่กดส่งให้ครั้งเดียว
 *
 *  แบบ B — เรียกฟังก์ชันของเกมเอง (เหมาะกับเกมที่มีฟังก์ชันเข้าห้องอยู่แล้ว)
 *     if (window.GP_JOIN) เรียกฟังก์ชันเข้าห้องของเกมด้วยค่านี้ได้เลย
 *
 * เกมที่ไม่ทำอะไรเลยก็ยังใช้ได้ — ไฟล์นี้เป็นส่วนเสริมล้วน ๆ ไม่แตะการทำงานเดิม
 * ไม่โหลดไฟล์นี้ก็ยังใช้ได้ — เกมทำงานเหมือนเดิมทุกอย่าง
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

  /* กดส่งให้ครั้งเดียวต่อการโหลดหน้า 1 ครั้ง — เกมที่มีช่องกรอกหลายจุด
     จะได้ไม่ถูกสั่งค้นหาซ้อนกันหลายรอบ */
  var submitted = false;

  function fill(el) {
    if (!el || el.getAttribute('data-gp-join-done')) return;
    el.setAttribute('data-gp-join-done', '1');
    try { el.focus({ preventScroll: true }); } catch (e) {}
    el.value = code;
    /* ยิง event ให้เฟรมเวิร์ก/ตัวฟังของเกมรู้ว่าค่าเปลี่ยน (เหมือนคนพิมพ์เอง) */
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    /* กดส่งให้เฉพาะกรณีมาจากลิงก์โดยตรง และเกมขออนุญาตไว้ว่า "auto" */
    if (!trusted || submitted || el.getAttribute('data-gp-join-input') !== 'auto') return;
    submitted = true;
    setTimeout(function () {
      /* เกมระบุปุ่มไว้ → กดปุ่มนั้น (เชื่อถือได้กว่าการจำลอง Enter) */
      var sel = el.getAttribute('data-gp-join-submit');
      var btn = sel ? document.querySelector(sel) : null;
      if (btn) { btn.click(); return; }
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    }, 60);
  }

  /* กรอกให้ "ทุก" ช่องที่ติดป้าย — เกมอาจมีทางเข้าหลายทาง
     (เช่น แท็บบนหน้าล็อกอิน 1 ช่อง + กล่องป๊อปอัป อีก 1 ช่อง) */
  function scan() {
    var list = document.querySelectorAll('[data-gp-join-input]:not([data-gp-join-done])');
    for (var i = 0; i < list.length; i++) fill(list[i]);
    return list.length > 0;
  }

  function start() {
    scan();
    /* ช่องกรอกบางจุดถูกสร้างทีหลัง (ตอนกดปุ่ม "เข้าห้องเรียน")
       จึงต้องเฝ้าดู DOM ต่อ ไม่ใช่หาแค่ตอนโหลดหน้า */
    if (typeof MutationObserver !== 'function') return;
    var obs = new MutationObserver(scan);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    /* เลิกเฝ้าหลัง 3 นาที — ไม่ปล่อยให้ทำงานค้างตลอดเวลาที่เล่นเกม */
    setTimeout(function () { obs.disconnect(); }, 180000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
