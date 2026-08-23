/* เกมเพลิน (GamePlearn) — กล่องแนะนำการใช้งานฉบับสั้น
 * [V.1.6.18 · 23 ส.ค. 2569 · ครูสั่ง]
 *
 * ครูสั่ง: "ควรมีการแนะนำแบบคร่าว ๆ เป็นป๊อปอัปขึ้นก่อนเข้าเว็บไหม
 *          เช่น สร้างห้อง > ส่งลิงก์/code > นักเรียนเล่น > ดูคะแนน
 *          ฉบับสั้น ๆ เข้าใจ เพื่อให้ครูที่เข้ามาใช้งานระบบเข้าใจรูปแบบการใช้งาน
 *          โดยไม่ต้องอ่านเยอะ"
 *
 * การตัดสินใจเชิงออกแบบ และเหตุผล:
 *  1. **หน้าเดียวจบ ไม่ใช่สไลด์ 4 หน้า** — ครูขอ "ไม่ต้องอ่านเยอะ"
 *     สไลด์บังคับกด 4 ครั้งกว่าจะเห็นภาพรวม และคนส่วนใหญ่กดข้ามตั้งแต่หน้าแรก
 *     ⇒ ให้เห็นทั้งกระบวนการในตาเดียว แล้วปิดได้ทันที
 *  2. **ขึ้นครั้งเดียวต่อเครื่อง** — ขึ้นทุกครั้งคือสิ่งที่ทำให้คนเกลียดป๊อปอัป
 *  3. **เรียกกลับมาดูได้เสมอ** จากลิงก์ท้ายหน้า — ของที่ขึ้นครั้งเดียวแล้วหาไม่เจออีก
 *     แย่กว่าไม่มี เพราะครูที่ปิดทิ้งตอนแรกจะไม่มีทางกลับมาอ่าน
 *  4. **ไม่เพิ่มรายการในเมนูหลัก** — เมนู 6 รายการเป็นชุดที่ครูเคาะแล้ว
 *     และเคยมีปัญหาความกว้างบนจอเล็กมาแล้ว
 *  5. ปิดได้ 4 ทาง: ปุ่มเริ่มใช้งาน · กากบาท · Esc · คลิกนอกกล่อง
 *     กล่องที่ปิดยากคือกับดัก ไม่ใช่การแนะนำ
 *  6. เข้าถึงได้: role="dialog" + aria-modal + ขังโฟกัสไว้ในกล่อง + คืนโฟกัสตอนปิด
 *  7. สคริปต์นี้พังต้องไม่ทำให้หน้าเว็บพัง — ห่อ try ทุกทางเข้า
 *
 * คีย์ localStorage: gp_tour_seen (จดในทะเบียนที่หัว js/config.js แล้ว)
 * ไม่มีการยิงฐาน ไม่เก็บข้อมูลผู้ใช้ ไม่ส่งอะไรออกนอกเครื่อง
 */
(function () {
  'use strict';

  var KEY = 'gp_tour_seen';
  var VER = '1';                 /* ขยับเลขนี้เมื่อเนื้อหาเปลี่ยนจนควรให้ครูเห็นใหม่ */

  var STEPS = [
    { n: '1', icon: '🏫', t: 'สร้างห้องเรียน',
      d: 'ตั้งชื่อห้อง แล้วใส่รายชื่อนักเรียน · เลือกว่าห้องนี้ใช้เกมไหน' },
    { n: '2', icon: '🔑', t: 'ส่งโค้ดห้องให้นักเรียน',
      d: 'ระบบสร้างโค้ดและลิงก์ให้เอง · นักเรียนไม่ต้องสมัครบัญชี' },
    { n: '3', icon: '🎮', t: 'นักเรียนเล่นเกม',
      d: 'เล่นผ่านเบราว์เซอร์ ไม่ต้องติดตั้งอะไร · ผลบันทึกให้อัตโนมัติ' },
    { n: '4', icon: '📊', t: 'ดูผลและประเมิน',
      d: 'คะแนนรายคน รายห้อง และสมรรถนะหลัก 6 ด้าน พร้อมแหล่งที่มาของคะแนน' },
  ];

  function seen() {
    try { return localStorage.getItem(KEY) === VER; } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(KEY, VER); } catch (e) { /* โหมดส่วนตัว = ขึ้นอีกครั้งหน้า ไม่ใช่เรื่องใหญ่ */ }
  }

  function css() {
    if (document.getElementById('gp-tour-css')) return;
    var s = document.createElement('style');
    s.id = 'gp-tour-css';
    s.textContent = [
      '.gp-tour-back{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;',
      'justify-content:center;padding:16px;background:rgba(11,11,11,.45)}',
      '.gp-tour{background:var(--surface,#fff);color:var(--ink,#0b0b0b);border-radius:16px;',
      'max-width:560px;width:100%;max-height:calc(100vh - 32px);overflow:auto;',
      'box-shadow:0 12px 40px rgba(11,11,11,.28);border:1px solid var(--border,rgba(0,0,0,.1))}',
      '.gp-tour-hd{display:flex;align-items:flex-start;gap:10px;padding:18px 18px 6px}',
      '.gp-tour-hd h2{margin:0;font-size:19px;line-height:1.35;flex:1}',
      '.gp-tour-hd .sub{display:block;font-size:13px;font-weight:400;color:var(--muted,#6d6b66);margin-top:3px}',
      '.gp-tour-x{border:0;background:transparent;color:var(--muted,#6d6b66);font-size:22px;',
      'line-height:1;cursor:pointer;padding:2px 6px;border-radius:8px;min-width:34px;min-height:34px}',
      '.gp-tour-x:hover{background:var(--grid,#e1e0d9)}',
      '.gp-tour-body{padding:6px 18px 2px}',
      '.gp-tour-step{display:flex;gap:11px;align-items:flex-start;padding:9px 0;',
      'border-bottom:1px solid var(--grid,#e1e0d9)}',
      '.gp-tour-step:last-child{border-bottom:0}',
      '.gp-tour-num{flex:none;width:27px;height:27px;border-radius:50%;display:flex;',
      'align-items:center;justify-content:center;font-weight:700;font-size:13.5px;',
      'background:var(--accent,#2a78d6);color:var(--on-accent,#fff)}',
      '.gp-tour-tx{flex:1;min-width:0}',
      '.gp-tour-tx b{display:block;font-size:15px}',
      '.gp-tour-tx span{display:block;font-size:13.5px;color:var(--muted,#6d6b66);margin-top:1px;line-height:1.5}',
      '.gp-tour-ft{padding:12px 18px 18px;display:flex;gap:9px;align-items:center;flex-wrap:wrap}',
      '.gp-tour-ft .note{flex:1;min-width:170px;font-size:12.5px;color:var(--muted,#6d6b66)}',
      '.gp-tour-open{background:none;border:0;padding:0;font:inherit;font-size:12.5px;',
      'color:var(--muted,#6d6b66);text-decoration:underline;cursor:pointer}',
      '@media (max-width:520px){.gp-tour-hd h2{font-size:17px}.gp-tour-tx b{font-size:14.5px}}',
    ].join('');
    document.head.appendChild(s);
  }

  var lastFocus = null;

  function close(back) {
    try {
      back.remove();
      document.removeEventListener('keydown', back.__key, true);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    } catch (e) {}
  }

  function open() {
    try {
      css();
      if (document.querySelector('.gp-tour-back')) return;
      lastFocus = document.activeElement;

      var back = document.createElement('div');
      back.className = 'gp-tour-back';

      var box = document.createElement('div');
      box.className = 'gp-tour';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'gp-tour-h');

      var brand = 'เกมเพลิน';
      try { if (window.GP_CONFIG && GP_CONFIG.BRAND_TH) brand = GP_CONFIG.BRAND_TH; } catch (e) {}

      box.innerHTML =
        '<div class="gp-tour-hd">'
        +   '<h2 id="gp-tour-h">ใช้งาน' + brand + 'ยังไง'
        +     '<span class="sub">4 ขั้น ใช้เวลาอ่านไม่ถึงครึ่งนาที</span></h2>'
        +   '<button type="button" class="gp-tour-x" aria-label="ปิดกล่องแนะนำ">×</button>'
        + '</div>'
        + '<div class="gp-tour-body">'
        +   STEPS.map(function (s) {
              return '<div class="gp-tour-step">'
                + '<div class="gp-tour-num" aria-hidden="true">' + s.n + '</div>'
                + '<div class="gp-tour-tx"><b>' + s.icon + ' ' + s.t + '</b><span>' + s.d + '</span></div>'
                + '</div>';
            }).join('')
        + '</div>'
        + '<div class="gp-tour-ft">'
        +   '<div class="note">เปิดกล่องนี้อีกครั้งได้จากลิงก์ "วิธีใช้งาน" ท้ายหน้า</div>'
        +   '<a class="btn btn-primary" href="teacher.html#/rooms">🏫 เริ่มจากสร้างห้องเรียน</a>'
        +   '<button type="button" class="btn gp-tour-done">ดูเองก่อน</button>'
        + '</div>';

      back.appendChild(box);
      document.body.appendChild(back);
      markSeen();

      /* ปิดได้สี่ทาง — กล่องที่ปิดยากคือกับดัก ไม่ใช่การแนะนำ */
      back.addEventListener('click', function (ev) { if (ev.target === back) close(back); });
      box.querySelector('.gp-tour-x').addEventListener('click', function () { close(back); });
      box.querySelector('.gp-tour-done').addEventListener('click', function () { close(back); });

      /* Esc ปิด · Tab วนอยู่ในกล่อง (ไม่งั้นคนใช้คีย์บอร์ดหลุดไปหลังฉากแล้วหาทางกลับไม่เจอ) */
      back.__key = function (ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); close(back); return; }
        if (ev.key !== 'Tab') return;
        var f = box.querySelectorAll('button, [href]');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      };
      document.addEventListener('keydown', back.__key, true);

      var go = box.querySelector('.gp-tour-x');
      if (go && go.focus) go.focus();
    } catch (e) { /* กล่องแนะนำพังต้องไม่ทำให้หน้าเว็บพัง */ }
  }

  /* ลิงก์เรียกกลับมาดู — วางท้ายหน้า ไม่แตะเมนูหลัก 6 รายการที่ครูเคาะไว้ */
  function addReopen() {
    try {
      if (document.getElementById('gp-tour-open')) return;
      css();
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'gp-tour-open';
      b.className = 'gp-tour-open';
      b.textContent = 'วิธีใช้งาน';
      b.addEventListener('click', open);
      var ver = document.getElementById('gp-ver');
      if (ver) { ver.appendChild(document.createTextNode(' · ')); ver.appendChild(b); return; }
      var wrap = document.createElement('div');
      wrap.style.cssText = 'text-align:center;padding:10px 0';
      wrap.appendChild(b);
      (document.querySelector('.wrap') || document.body).appendChild(wrap);
    } catch (e) {}
  }

  function boot() {
    /* ป้ายรุ่นถูกใส่โดย gp-brand.js ซึ่งรออีเวนต์เดียวกัน — หน่วงหนึ่งจังหวะให้มันวางเสร็จก่อน
       จะได้เกาะท้ายป้ายรุ่นได้ แทนที่จะสร้างแถบใหม่ซ้อนอีกแถบ */
    setTimeout(function () {
      addReopen();
      if (!seen()) open();
    }, 60);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  try { window.GP_TOUR = { open: open, seen: seen, KEY: KEY, VER: VER }; } catch (e) {}
})();
