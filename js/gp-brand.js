/* เกมเพลิน — แบรนด์ ธีม และประกาศบนหัวเว็บ (อ่านจาก site_settings)
 * เวอร์ชัน 1.2 · 2026-08-10
 *
 * ทำ 7 อย่าง โดยไม่ต้องแก้โค้ดเว็บ:
 *   0ข. ปุ่ม #auth-btn สลับ "เข้าสู่ระบบครู" ↔ "ออกจากระบบ" ตามสถานะล็อกอิน
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

  /* ============ นับการเยี่ยมชม (52_VISIT_STATS.sql) ============
     เก็บเป็น "ตัวนับรายวัน" ล้วน ๆ — ไม่ส่ง IP ไม่ส่ง user agent ไม่ส่งรหัสประจำตัวใด ๆ
     ธง "เครื่องนี้เปิดเว็บครั้งแรกของวันนี้แล้ว" เก็บไว้ในเครื่องผู้ใช้เอง (คีย์ gp_seen)
     เซิร์ฟเวอร์ได้รับแค่ true/false ไม่มีทางรู้ว่าเป็นเครื่องไหน
     เหตุผล: ผู้ใช้ส่วนใหญ่เป็นเด็กประถม เก็บรอยเท้าดิจิทัลเกินจำเป็นไม่คุ้มกับตัวเลขบนหน้า Admin

     ยิงแบบ "ยิงแล้วลืม" — พังก็เงียบ ไม่มีทางทำให้หน้าเว็บใช้งานไม่ได้
     (ฐานที่ยังไม่ได้รัน 52 จะได้ 404 ซึ่งถูกกลืนไปเฉย ๆ) */
  function pageName() {
    var f = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!f || f === 'index.html' || f === 'index.htm') return 'home';
    return f.replace(/\.html?$/, '');
  }
  /* มือถือ/แท็บเล็ต หรือ คอมพิวเตอร์ — ดูจาก "ชนิดตัวชี้" ไม่ใช่ user agent
     UA ปลอมง่ายและเดาผิดบ่อย · โน้ตบุ๊กจอสัมผัสมีทั้ง coarse และ fine → นับเป็น pc ถูกแล้ว
     โทรศัพท์/แท็บเล็ตมีแต่ coarse → mobile · เบราว์เซอร์เก่าที่ไม่รู้จัก matchMedia ใช้ความกว้างจอแทน */
  function deviceKind() {
    try {
      if (window.matchMedia) {
        var coarse = window.matchMedia('(pointer: coarse)').matches;
        var fine   = window.matchMedia('(any-pointer: fine)').matches;
        if (coarse && !fine) return 'mobile';
        if (fine) return 'pc';
      }
      var w = Math.min(screen.width || 9999, screen.height || 9999);
      return w < 820 ? 'mobile' : 'pc';
    } catch (e) { return 'pc'; }
  }
  function track(page, gameCode, isNew) {
    try {
      if (!G || !G.rpc) return;
      var body = { p_page: page, p_new: !!isNew, p_device: deviceKind() };
      if (gameCode) body.p_game_code = String(gameCode);
      G.rpc('rpc_track_visit', body).catch(function () {});
    } catch (e) { /* เงียบเสมอ */ }
  }
  function trackVisit() {
    var isNew = false;
    try {
      var today = new Date().toISOString().slice(0, 10);
      isNew = localStorage.getItem('gp_seen') !== today;
      if (isNew) localStorage.setItem('gp_seen', today);
    } catch (e) { /* เบราว์เซอร์ปิด localStorage = นับเป็นผู้เยี่ยมชมซ้ำ ไม่ใช่เรื่องใหญ่ */ }
    track(pageName(), null, isNew);

    /* ปุ่มเล่นเกม — ดักที่ document ครั้งเดียว ใช้ได้กับการ์ดที่วาดทีหลังด้วย */
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest('[data-game-play]');
      if (!a) return;
      track('game', a.getAttribute('data-game-play'), false);
    });
  }

  /* ============ ป้ายรุ่นของเว็บกลางท้ายหน้า ============
     ใส่ให้เองทุกหน้า ไม่ต้องไล่แก้ HTML ทีละไฟล์ (และไม่มีวันลืมหน้าใดหน้าหนึ่ง)
     หน้าไหนมีท้ายเว็บอยู่แล้วก็ต่อท้าย · หน้าไหนไม่มี (หน้าครู/หน้าผู้ดูแล) สร้างแถบเล็ก ๆ ให้
     เหตุผลที่ต้องมี: เวลาครูแจ้งปัญหาจะได้บอกได้ทันทีว่าเปิดรุ่นไหนอยู่ */
  function stampVersion() {
    try {
      if (document.getElementById('gp-ver')) return;
      var v = C.HUB_VERSION; if (!v) return;
      var txt = v + (C.HUB_BUILD ? ' · build ' + C.HUB_BUILD : '');
      var d = document.createElement('div');
      d.id = 'gp-ver';
      d.className = 'gp-ver';
      d.textContent = txt;
      var foot = document.querySelector('.sitefoot, .foot');
      if (foot) { foot.parentNode.insertBefore(d, foot.nextSibling); return; }
      (document.querySelector('.wrap') || document.body).appendChild(d);
    } catch (e) { /* ป้ายรุ่นพังต้องไม่ทำให้หน้าเว็บพัง */ }
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
    /* วางไว้หน้าปุ่มบัญชีตัวแรกที่เจอ — แต่ละหน้ามีปุ่มไม่เหมือนกัน
       (หน้าแรกมี .btn-primary · หน้าครูมี #btn-logout · หน้า Admin มี #logout)
       ถ้าไม่เจอเลยแล้ว appendChild ต่อท้าย ปุ่มจะไปตกบรรทัดใหม่ตัวเดียวโดด ๆ */
    var anchor = bar.querySelector('.btn-primary, #auth-home, #auth-btn, #btn-logout, #logout');
    if (anchor) bar.insertBefore(b, anchor); else bar.appendChild(b);
  }

  /* ============ ปุ่มสลับโหมดผู้ดูแล / โหมดครู ============
     แสดงเฉพาะบัญชีที่เป็น admin เท่านั้น · ครูทั่วไปไม่เห็นและกดไม่ได้
     เรียกซ้ำได้ — หน้าที่เพิ่งล็อกอินเสร็จให้เรียก GP.refreshModeSwitch() */
  var modeChecked = false;
  async function renderModeSwitch(force) {
    if (modeChecked && !force) return;
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    try {
      if (!(await G.ensure())) return;
      var uid = G.session() && G.session().user_id;
      if (!uid) return;
      var rows = await G.get('/rest/v1/teachers?id=eq.' + uid + '&select=role');
      if (!rows || !rows[0] || rows[0].role !== 'admin') { modeChecked = true; return; }
    } catch (e) { return; }
    modeChecked = true;
    if (document.getElementById('gp-mode-switch')) return;

    var here = (location.pathname.split('/').pop() || '').toLowerCase();
    var onAdmin = here.indexOf('admin') === 0;
    var wrap = document.createElement('div');
    wrap.id = 'gp-mode-switch';
    wrap.className = 'modeswitch';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'สลับโหมดการใช้งาน');
    wrap.innerHTML =
      '<a href="admin.html"' + (onAdmin ? ' aria-current="page"' : '') + '>🛠 ผู้ดูแลระบบ</a>'
      + '<a href="teacher.html"' + (!onAdmin ? ' aria-current="page"' : '') + '>👩‍🏫 ครู</a>';
    /* วางไว้ติดกับแบรนด์ (ก่อน .sp) — เป็นตัวบอก "ตอนนี้อยู่โหมดไหน"
       ควรอยู่ต้นแถวคู่กับชื่อเว็บ ไม่ใช่ปะปนกับปุ่มบัญชีท้ายแถว */
    var sp = bar.querySelector('.sp');
    if (sp) bar.insertBefore(wrap, sp);
    else bar.appendChild(wrap);
    syncAuthHome();
  }

  /* ============ ปุ่มเข้าสู่ระบบ / ออกจากระบบ บนหัวเว็บ ============
     ปุ่มเดียวกัน เปลี่ยนหน้าที่ตามสถานะ:
       ยังไม่ล็อกอิน → "เข้าสู่ระบบครู" ลิงก์ไป teacher.html (เหมือนเดิม)
       ล็อกอินแล้ว   → "ออกจากระบบ" + ลิงก์ลัดเข้าห้องเรียนของครู

     ทำที่นี่ที่เดียวเพราะทุกหน้าโหลดไฟล์นี้ — ไม่ต้องไล่แก้ทีละหน้า
     หน้า teacher.html / admin.html มีปุ่มออกจากระบบของตัวเองอยู่แล้ว จึงข้าม */
  /* ซ่อน "ห้องเรียนของฉัน" เมื่อมีปุ่มสลับโหมดแล้ว (ทำหน้าที่เดียวกัน)
     เรียกได้ทั้งจาก renderAuthButton และ renderModeSwitch เพราะสองตัวนี้
     เสร็จไม่พร้อมกัน — ใครเสร็จทีหลังก็เรียกอีกที ผลลัพธ์เหมือนกัน */
  function syncAuthHome() {
    var home = document.getElementById('auth-home');
    if (!home) return;
    home.classList.toggle('hidden', !!document.getElementById('gp-mode-switch'));
  }

  async function renderAuthButton() {
    var btn = document.getElementById('auth-btn');
    if (!btn) return;
    var loggedIn = false;
    try { loggedIn = !!(await G.ensure()); } catch (e) { loggedIn = false; }
    if (!loggedIn) return;                       /* ยังไม่ล็อกอิน = ปล่อยตามเดิม */

    /* ลิงก์เข้าห้องเรียน แทรกไว้ก่อนปุ่มออกจากระบบ ไม่งั้นครูจะกลับเข้าหน้าครูไม่ได้
       ยกเว้นบัญชีผู้ดูแล — ปุ่มสลับโหมดมีปุ่ม "👩‍🏫 ครู" อยู่แล้ว ใส่ซ้ำจะเบียดหัวเว็บเปล่า ๆ */
    if (!document.getElementById('auth-home')) {
      var go = document.createElement('a');
      go.id = 'auth-home';
      go.className = 'btn btn-sm';
      go.href = 'teacher.html';
      go.textContent = '👩‍🏫 ห้องเรียนของฉัน';
      btn.parentNode.insertBefore(go, btn);
    }
    syncAuthHome();

    btn.textContent = 'ออกจากระบบ';
    btn.classList.remove('btn-primary');
    btn.removeAttribute('href');                 /* ไม่ใช่ลิงก์แล้ว */
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.style.cursor = 'pointer';

    function doLogout(ev) {
      if (ev) ev.preventDefault();
      G.logout();
      try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {}
      location.reload();
    }
    btn.addEventListener('click', doLogout);
    btn.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') doLogout(ev);
    });
  }

  /* ============ สโลแกนสลับวน ============
     อ่านรายการจาก site_settings.site_slogans (JSON) · ไม่มีก็ใช้ค่าใน config.js
     สลับทุก 7 วินาที ค่อย ๆ จางเข้าออก · มีสโลแกนเดียวก็ไม่ต้องสลับ

     ช่องที่รองรับ (หน้าไหนไม่มีก็ข้าม):
       #slogan-en · #slogan-th · #foot-slogan (เอา en — th มาต่อกัน) */
  var SLOG_MS = 7000;
  var slogTimer = null;

  function slogansFrom(s) {
    var list = null;
    if (s && s.site_slogans) {
      try {
        var p = JSON.parse(s.site_slogans);
        if (Array.isArray(p)) {
          list = p.filter(function (x) { return x && (x.en || x.th); })
                  .map(function (x) { return { en: String(x.en || ''), th: String(x.th || '') }; });
        }
      } catch (e) { /* JSON เสีย → ใช้ค่าใน config.js ต่อ ไม่ทำหน้าพัง */ }
    }
    if (!list || !list.length) list = (C.SLOGANS || []).slice();
    return list.length ? list : [{ en: C.BRAND_EN || '', th: '' }];
  }

  function paintSlogan(sl) {
    var en = (sl.en || '').trim(), th = (sl.th || '').trim();
    var el = document.getElementById('slogan-en'); if (el && en) el.textContent = en;
    el = document.getElementById('slogan-th');     if (el && th) el.textContent = th;
    /* ท้ายหน้า: อังกฤษบรรทัดหนึ่ง ไทยอีกบรรทัด — ต่อกันด้วย " — " แล้วคอลัมน์แคบ
       จะหักบรรทัดกลางประโยค อ่านแล้วเหมือนพิมพ์ตก (ครูทักมาจริง)
       ข้อความมาจากฐานข้อมูล จึงต้องผ่าน esc ก่อนเสมอ */
    el = document.getElementById('foot-slogan');
    if (el && (en || th)) {
      el.innerHTML = (en ? '<span class="fs-en">' + G.esc(en) + '</span>' : '')
                   + (th ? '<span class="fs-th">' + G.esc(th) + '</span>' : '');
    }
  }

  function startSlogans(s) {
    var list = slogansFrom(s);
    if (slogTimer) { clearInterval(slogTimer); slogTimer = null; }

    /* ผู้ใช้ตั้งค่าเครื่องว่าไม่อยากเห็นภาพเคลื่อนไหว → แสดงตัวแรกนิ่ง ๆ ไม่สลับ */
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    paintSlogan(list[0]);
    if (list.length < 2 || still) return;

    /* รอบ ข (WCAG 2.2.2): เนื้อหาเลื่อนเองต้องหยุดได้ —
       ชี้เมาส์/พาโฟกัสมาที่ข้อความ = หยุดชั่วคราวให้อ่านทัน
       และหมุนครบ 3 รอบแล้วหยุดถาวร ไม่ดึงสายตาคนอ่านช้าไปตลอด */
    var ids = ['slogan-en', 'slogan-th', 'foot-slogan'];
    var paused = false;
    function hold() { paused = true; }
    function release() { paused = false; }
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.add('slogan-fx');
      el.setAttribute('data-slogan-pause', '1');
      el.addEventListener('mouseenter', hold);
      el.addEventListener('mouseleave', release);
      el.addEventListener('focusin', hold);
      el.addEventListener('focusout', release);
    });

    var i = 0, swaps = 0;
    var maxSwaps = list.length * 3;   /* 3 รอบเต็ม */
    slogTimer = setInterval(function () {
      if (document.hidden || paused) return; /* แท็บถูกซ่อน/ผู้ใช้กำลังอ่าน ไม่สลับ */
      i = (i + 1) % list.length;
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('is-out');
      });
      setTimeout(function () {
        paintSlogan(list[i]);
        ids.forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.classList.remove('is-out');
        });
      }, 320);
      swaps++;
      if (swaps >= maxSwaps && slogTimer) { clearInterval(slogTimer); slogTimer = null; }
    }, window.__gpSloganMs || SLOG_MS);   /* __gpSloganMs = ช่องเร่งเวลาสำหรับชุดทดสอบเท่านั้น */
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
    renderAuthButton();    /* เข้าสู่ระบบ ↔ ออกจากระบบ */
    renderModeSwitch();    /* ขึ้นเฉพาะบัญชี admin */
    startSlogans(s);       /* สโลแกนสลับวน */
    apply(window.GP_SETTINGS);
    trackVisit();          /* นับการเยี่ยมชม — ยิงแล้วลืม พังก็ไม่กระทบหน้าเว็บ */
    stampVersion();        /* ป้ายรุ่นท้ายหน้า */
    ready(window.GP_SETTINGS);
  }

  function start() {
    var c = cached();
    if (c) { finish(c); return; }
    G.get('/rest/v1/site_settings?select=key,value'
        + '&key=in.(site_logo_url,site_logo_dark_url,site_favicon_url,site_announcement,'
        + 'hero_headline,featured_min_games,site_theme,site_skin,site_slogans)')
      .then(function (rows) {
        var s = {};
        (rows || []).forEach(function (r) { if (r.value) s[r.key] = r.value; });
        cache(s);
        finish(s);
      })
      .catch(function () { finish({}); /* ยังไม่ได้รัน 15_SITE_PAGES.sql — ใช้ของเดิมในหน้าเว็บ */ });
  }

  /* ให้หน้าที่เพิ่งล็อกอินเสร็จสั่งตรวจสิทธิ์ใหม่ได้ */
  G.refreshModeSwitch = function () { return renderModeSwitch(true); };
  G.refreshAuthButton = function () { return renderAuthButton(); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
