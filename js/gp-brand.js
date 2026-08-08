/* เกมเพลิน — แบรนด์และประกาศบนหัวเว็บ (อ่านจาก site_settings)
 * เวอร์ชัน 1.0 · 2026-08-08
 *
 * ทำ 3 อย่าง โดยไม่ต้องแก้โค้ดเว็บเวลาเปลี่ยนโลโก้:
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

  function apply(s) {
    if (!s) return;

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
        img.src = s.site_logo_url;
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
    apply(window.GP_SETTINGS);
    ready(window.GP_SETTINGS);
  }

  function start() {
    var c = cached();
    if (c) { finish(c); return; }
    G.get('/rest/v1/site_settings?select=key,value'
        + '&key=in.(site_logo_url,site_favicon_url,site_announcement,hero_headline,featured_min_games)')
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
