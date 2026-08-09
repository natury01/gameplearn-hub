/* เกมเพลิน — แบรนด์ ธีม และประกาศบนหัวเว็บ (อ่านจาก site_settings)
 * เวอร์ชัน 1.1 · 2026-08-09
 *
 * ทำ 6 อย่าง โดยไม่ต้องแก้โค้ดเว็บ:
 *   0. ธีม สว่าง/มืด + สกินสี      ← site_settings.site_theme / site_skin
 *      + ปุ่มสลับบนหัวเว็บ (ผู้ใช้เลือกเองได้ ทับค่ากลาง)
 *   0ก. โลโก้สำหรับโหมดมืดแยกไฟล์  ← site_settings.site_logo_dark_url
 *   1. เปลี่ยนโลโก้บนหัวเว็บ  ← site_settings.site_logo_url
 *   2. เปลี่ยนไอคอนแท็บ       ← site_settings.site_favicon_url
 *   3. แสดงแถบประกาศบนสุด     ← site_settings.site_announcement
 *
 * ยังไม่ได้ตั้งค่า / ยังไม่ได้รัน 15_SITE_PAGES.sql → ใช้ของเดิมในหน้าเว็บ ไม่มีอะไรพัง
 * ต้องโหลดหลัง js/config.js และ js/gp-core.js
 */
(function () {
  'use strict';
  var C = window.GP_CONFIG, G = window.GP;
  if (!C || !G) return;

  var CACHE_KEY = 'gp_brand_cache';
  var TTL = 5 * 60 * 1000;   /* เก็บไว้ 5 นาที — สลับหน้าไปมาไม่ต้องยิงซ้ำทุกครั้ง */

  function cached() {
    try {
      var o = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (o && o.at && (Date.now() - o.at) < TTL) return o.v;
    } catch (e) {}
    return null;
  }
  function cache(v) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), v: v })); } catch (e) {}
  }

  /* ============ ธีม ============
     ลำดับความสำคัญ: ผู้ใช้เลือกเอง > ค่ากลางจากหน้า Admin > light + playful
     เก็บทั้งหมดในคีย์เดียว 'gp_theme' = {m,s = ผู้ใช้เลือก · dm,ds = ค่ากลาง} */
  var THEME_KEY = 'gp_theme';
  function themeState() {
    try { return JSON.parse(localStorage.getItem(THEME_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveTheme(t) {
    try { localStorage.setItem(THEME_KEY, JSON.stringify(t)); } catch (e) {}
  }
  function paintTheme() {
    var t = themeState(), d = document.documentElement;
    d.dataset.theme = t.m || t.dm || 'light';
    d.dataset.skin = t.s || t.ds || 'playful';
    var b = document.getElementById('gp-theme-btn');
    if (b) {
      var dark = d.dataset.theme === 'dark';
      b.textContent = dark ? '☀️' : '🌙';
      b.title = dark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด';
      b.setAttribute('aria-label', b.title);
    }
    logoForTheme();
  }

  /* ปุ่มสลับสว่าง/มืด — ใส่ให้เองทุกหน้าที่มีแถบหัวเว็บ ไม่ต้องแก้ HTML ทีละหน้า */
  function addThemeButton() {
    if (document.getElementById('gp-theme-btn')) return;
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    var b = document.createElement('button');
    b.id = 'gp-theme-btn';
    b.type = 'button';
    b.className = 'theme-btn';
    b.addEventListener('click', function () {
      var t = themeState();
      var now = document.documentElement.dataset.theme;
      t.m = (now === 'dark') ? 'light' : 'dark';   /* ผู้ใช้เลือกเอง = ทับค่ากลาง */
      saveTheme(t);
      paintTheme();
    });
    var last = bar.querySelector('.btn-primary');
    if (last) bar.insertBefore(b, last); else bar.appendChild(b);
  }

  /* โลโก้แยกตามโหมด — โลโก้สีเข้มมักจมหายบนพื้นมืด */
  var LOGOS = {};
  function logoForTheme() {
    var dark = document.documentElement.dataset.theme === 'dark';
    var url = (dark && LOGOS.dark) ? LOGOS.dark : LOGOS.light;
    if (!url) return;
    var imgs = document.querySelectorAll('.brand .logo img[data-gp-logo]');
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i].getAttribute('src') !== url) imgs[i].setAttribute('src', url);
    }
  }

  function apply(s) {
    if (!s) return;

    /* 0. ธีม — เก็บค่ากลางจาก Admin ไว้ใน localStorage ให้สคริปต์ใน <head> ใช้ได้ตั้งแต่รอบหน้า
       ไม่ทับค่าที่ผู้ใช้เลือกเอง (t.m / t.s) */
    var t = themeState();
    t.dm = s.site_theme || 'light';
    t.ds = s.site_skin || 'playful';
    saveTheme(t);
    LOGOS.light = s.site_logo_url || '';
    LOGOS.dark = s.site_logo_dark_url || '';
    paintTheme();

    /* 1. โลโก้บนหัวเว็บ — แทนตัวอักษร ก ด้วยรูปจริง */
    if (s.site_logo_url) {
      var slots = document.querySelectorAll('.brand .logo');
      for (var i = 0; i < slots.length; i++) {
        var el = slots[i];
        if (el.dataset.brandDone) continue;
        el.dataset.brandDone = '1';
        el.innerHTML = '';
        el.style.background = 'none';
        el.style.width = 'auto';
        el.style.borderRadius = '0';
        var img = document.createElement('img');
        img.setAttribute('data-gp-logo', '1');
        img.src = (document.documentElement.dataset.theme === 'dark' && s.site_logo_dark_url)
          ? s.site_logo_dark_url : s.site_logo_url;
        img.alt = C.BRAND_TH || 'เกมเพลิน';
        img.style.cssText = 'height:30px;width:auto;display:block';
        /* โหลดรูปไม่ได้ → คืนตัวอักษรเดิม ไม่ปล่อยหัวเว็บว่าง */
        img.onerror = (function (slot) {
          return function () {
            slot.textContent = 'ก';
            slot.style.background = '';
            slot.style.width = '';
            slot.style.borderRadius = '';
          };
        })(el);
        el.appendChild(img);
      }
    }

    /* 2. ไอคอนแท็บเบราว์เซอร์ */
    if (s.site_favicon_url) {
      var link = document.querySelector('link[rel="icon"]') || document.createElement('link');
      link.rel = 'icon';
      link.href = s.site_favicon_url;
      link.removeAttribute('type');
      if (!link.parentNode) document.head.appendChild(link);
    }

    /* 3. พาดหัวหน้าแรก (ถ้าหน้านี้มี) */
    if (s.hero_headline) {
      var h = document.getElementById('join-h');
      if (h) h.textContent = s.hero_headline;
    }

    /* 4. แถบประกาศบนสุด — ปิดแล้วจำไว้ ไม่กวนซ้ำในรอบเดียวกัน */
    var msg = (s.site_announcement || '').trim();
    if (msg && !document.getElementById('gp-announce')) {
      var dismissed = '';
      try { dismissed = sessionStorage.getItem('gp_announce_off') || ''; } catch (e) {}
      if (dismissed === msg) return;

      var bar = document.createElement('div');
      bar.id = 'gp-announce';
      bar.style.cssText = 'background:var(--brand-yellow,#eda100);color:#1a1a19;padding:9px 16px;'
        + 'font-size:14px;display:flex;align-items:center;gap:12px;justify-content:center;'
        + 'flex-wrap:wrap;line-height:1.5';
      bar.innerHTML = '<span>📢 ' + G.esc(msg) + '</span>';

      var x = document.createElement('button');
      x.type = 'button';
      x.textContent = '✕';
      x.setAttribute('aria-label', 'ปิดประกาศ');
      x.style.cssText = 'border:0;background:transparent;cursor:pointer;font-size:15px;'
        + 'color:inherit;padding:0 4px;line-height:1';
      x.addEventListener('click', function () {
        bar.remove();
        try { sessionStorage.setItem('gp_announce_off', msg); } catch (e) {}
      });
      bar.appendChild(x);
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }

  /* หน้าอื่นรอค่านี้ได้ก่อนวาดหน้าจอ — GP_SETTINGS_READY resolve เสมอ แม้โหลดไม่สำเร็จ */
  var ready;
  window.GP_SETTINGS = {};
  window.GP_SETTINGS_READY = new Promise(function (res) { ready = res; });

  function finish(s) {
    window.GP_SETTINGS = s || {};
    addThemeButton();      /* ต้องมีปุ่มเสมอ แม้โหลดค่ากลางไม่สำเร็จ */
    paintTheme();
    apply(window.GP_SETTINGS);
    ready(window.GP_SETTINGS);
  }

  function start() {
    var c = cached();
    if (c) { finish(c); return; }
    G.get('/rest/v1/site_settings?select=key,value'
        + '&key=in.(site_logo_url,site_logo_dark_url,site_favicon_url,site_announcement,'
        + 'hero_headline,featured_min_games,site_theme,site_skin)')
      .then(function (rows) {
        var s = {};
        (rows || []).forEach(function (r) { if (r.value) s[r.key] = r.value; });
        cache(s);
        finish(s);
      })
      .catch(function () { finish({}); /* ยังไม่ได้รัน 15_SITE_PAGES.sql — ใช้ของเดิมในหน้าเว็บ */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
