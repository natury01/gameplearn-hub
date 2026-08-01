/**
 * GamePlearn — Standards Panel (แผง "มาตรฐานการเรียนรู้ที่เกมนี้วัด")
 * ============================================================================
 * มาตรฐานกลาง: **Dashboard ของทุกเกมต้องมีแผงนี้** เพื่อให้ครูเห็นทันทีว่า
 *   - เกมนี้ใช้กับ "ระดับชั้นใด"
 *   - เนื้อหาครอบคลุม "ตัวชี้วัด / กลุ่มสาระ" อะไรบ้าง (ผลสัมฤทธิ์)
 *   - วัด "สมรรถนะหลัก" ด้านใดบ้าง และมีด้านย่อยอะไร
 * ข้อมูลทั้งหมดอ่านจากฐานข้อมูลกลาง (games + game_framework_items + framework_items)
 * จึงไม่ต้อง hard-code และอัปเดตตามหลักสูตรได้เองเมื่อฐานข้อมูลเปลี่ยน
 *
 * วิธีใช้ในเกม (ไฟล์เดียว ไม่มี dependency):
 *   <div id="gp-standards"></div>
 *   <script src="js/gp-standards-panel.js"></script>
 *   <script>
 *     GPStandards.render('#gp-standards', {
 *       sbUrl: SB_URL, sbAnon: SB_ANON, gameCode: 'kanchanaburi2050'
 *     });
 *   </script>
 *
 * ตัวเลือกเสริม: { compact: true } = ย่อเหลือบรรทัดเดียวต่อหัวข้อ (สำหรับการ์ดในแคตตาล็อก)
 * อ้างอิง: 07_CONTENT_STANDARDS.md · 03_GAME_TEMPLATE_STANDARD.md
 */
(function (root) {
  'use strict';

  var CSS_ID = 'gp-standards-css';
  var CSS = [
    '.gpstd{font-family:system-ui,-apple-system,"Segoe UI","Sarabun","Noto Sans Thai",sans-serif;',
    'color:#0b0b0b;background:#fcfcfb;border:1px solid rgba(11,11,11,.1);border-radius:14px;padding:16px 18px;line-height:1.55}',
    '.gpstd h3{margin:0 0 2px;font-size:16.5px}',
    '.gpstd .gp-sub{color:#898781;font-size:12.5px;margin-bottom:12px}',
    '.gpstd .gp-grade{display:inline-block;font-size:12.5px;color:#1c5cab;border:1px solid currentColor;',
    'border-radius:999px;padding:2px 10px;margin-left:6px}',
    '.gpstd .gp-sec{margin-top:14px}',
    '.gpstd .gp-sec-t{font-size:13px;font-weight:600;color:#52514e;border-bottom:1px solid #e1e0d9;padding-bottom:5px;margin-bottom:8px}',
    '.gpstd .gp-item{padding:5px 0}',
    '.gpstd .gp-name{font-size:14.5px}',
    '.gpstd .gp-note{color:#898781;font-size:12.5px}',
    '.gpstd .gp-kids{margin:4px 0 0 14px;padding-left:12px;border-left:2px solid #e1e0d9}',
    '.gpstd .gp-kid{font-size:13.5px;color:#52514e;padding:2px 0}',
    '.gpstd .gp-code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#898781;margin-left:5px}',
    '.gpstd .gp-empty{color:#898781;font-size:13.5px}',
    '.gpstd .gp-src{color:#898781;font-size:11.5px;margin-top:12px;border-top:1px solid #e1e0d9;padding-top:8px}',
    '@media (prefers-color-scheme:dark){.gpstd{color:#fff;background:#1a1a19;border-color:rgba(255,255,255,.1)}',
    '.gpstd .gp-sec-t,.gpstd .gp-kid{color:#c3c2b7}.gpstd .gp-grade{color:#6da7ec}',
    '.gpstd .gp-sec-t,.gpstd .gp-kids,.gpstd .gp-src{border-color:#2c2c2a}}',
  ].join('');

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function gradeText(g) {
    if (!g || (g.minimum_grade == null && g.maximum_grade == null)) return 'ทุกระดับชั้น';
    if (g.minimum_grade === g.maximum_grade) return 'ชั้น ป.' + g.minimum_grade;
    return 'ชั้น ป.' + g.minimum_grade + '–' + (g.maximum_grade == null ? '' : g.maximum_grade);
  }

  function get(cfg, path) {
    return fetch(cfg.sbUrl + path, {
      headers: { apikey: cfg.sbAnon, Authorization: 'Bearer ' + cfg.sbAnon },
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /** จัดกลุ่มรายการเป็นต้นไม้ พ่อ → ลูก (ลูกที่พ่อไม่ได้ลงทะเบียนไว้ ถือเป็นรายการระดับบนเอง) */
  function toTree(items) {
    var byId = {}, roots = [];
    items.forEach(function (it) { byId[it.id] = { it: it, kids: [] }; });
    items.forEach(function (it) {
      var node = byId[it.id];
      if (it.parent_id && byId[it.parent_id]) byId[it.parent_id].kids.push(node);
      else roots.push(node);
    });
    var bySort = function (a, b) { return (a.it.sort_order || 0) - (b.it.sort_order || 0); };
    roots.sort(bySort); roots.forEach(function (r) { r.kids.sort(bySort); });
    return roots;
  }

  function renderSection(title, roots, compact) {
    if (!roots.length) return '';
    if (compact) {
      return '<div class="gp-sec"><div class="gp-sec-t">' + esc(title) + '</div><div class="gp-name">'
        + roots.map(function (n) { return esc(n.it.name_th); }).join(' · ') + '</div></div>';
    }
    return '<div class="gp-sec"><div class="gp-sec-t">' + esc(title) + '</div>'
      + roots.map(function (n) {
        return '<div class="gp-item"><div class="gp-name">' + esc(n.it.name_th)
          + '<span class="gp-code">' + esc(n.it.code) + '</span></div>'
          + (n.it._note ? '<div class="gp-note">' + esc(n.it._note) + '</div>' : '')
          + (n.kids.length ? '<div class="gp-kids">' + n.kids.map(function (k) {
              return '<div class="gp-kid">• ' + esc(k.it.name_th) + '<span class="gp-code">' + esc(k.it.code) + '</span>'
                + (k.it._note ? '<div class="gp-note">' + esc(k.it._note) + '</div>' : '') + '</div>';
            }).join('') + '</div>' : '')
          + '</div>';
      }).join('') + '</div>';
  }

  /**
   * render(target, cfg)
   *   cfg = { sbUrl, sbAnon, gameCode, compact?, title? }
   * คืน Promise ที่ resolve เป็นข้อมูลที่ใช้ render (เผื่อเกมอยากเอาไปใช้ต่อ)
   */
  function render(target, cfg) {
    injectCss();
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return Promise.reject(new Error('ไม่พบ element ปลายทาง'));
    el.className = 'gpstd';
    el.innerHTML = '<div class="gp-empty">กำลังโหลดมาตรฐานการเรียนรู้…</div>';

    return get(cfg, '/rest/v1/games?select=id,code,name,minimum_grade,maximum_grade&code=eq.'
      + encodeURIComponent(cfg.gameCode) + '&limit=1')
      .then(function (rows) {
        var game = rows && rows[0];
        if (!game) throw new Error('ไม่พบเกม ' + cfg.gameCode + ' ใน Game Registry');
        return get(cfg, '/rest/v1/game_framework_items?game_id=eq.' + game.id
          + '&select=note,weight,framework_items(id,code,name_th,depth,sort_order,parent_id,'
          + 'assessment_frameworks(code,kind,name_th,status))')
          .then(function (maps) { return { game: game, maps: maps || [] }; });
      })
      .then(function (data) {
        var comp = [], ach = [], attr = [], fwNames = {};
        data.maps.forEach(function (m) {
          var it = m.framework_items; if (!it) return;
          var f = it.assessment_frameworks || {};
          it._note = m.note || null;
          fwNames[f.kind] = f.name_th;
          if (f.kind === 'competency') comp.push(it);
          else if (f.kind === 'achievement') ach.push(it);
          else attr.push(it);
        });

        var html = '<h3>มาตรฐานการเรียนรู้ที่เกมนี้วัด'
          + '<span class="gp-grade">' + esc(gradeText(data.game)) + '</span></h3>'
          + '<div class="gp-sub">' + esc(data.game.name) + ' · ข้อมูลจาก Game Registry กลางของเกมเพลิน</div>';

        var sections =
          renderSection('ผลสัมฤทธิ์ — ' + (fwNames.achievement || 'กลุ่มสาระ/ตัวชี้วัด'), toTree(ach), cfg.compact)
          + renderSection('สมรรถนะหลัก — ' + (fwNames.competency || ''), toTree(comp), cfg.compact)
          + renderSection('คุณลักษณะ — ' + (fwNames.attribute || ''), toTree(attr), cfg.compact);

        html += sections || '<div class="gp-empty">เกมนี้ยังไม่ได้ลงทะเบียนมาตรฐานการเรียนรู้ — '
          + 'ดูวิธีลงทะเบียนใน 07_CONTENT_STANDARDS.md ข้อ 4</div>';

        if (!cfg.compact) {
          html += '<div class="gp-src">อ้างอิงหลักสูตรตาม 07_CONTENT_STANDARDS.md · '
            + 'รายการที่แสดงมาจากทะเบียน game_framework_items — แก้ที่ฐานข้อมูลกลางแล้วทุกหน้าจะอัปเดตพร้อมกัน</div>';
        }
        el.innerHTML = html;
        return data;
      })
      .catch(function (e) {
        el.innerHTML = '<div class="gp-empty">แสดงมาตรฐานการเรียนรู้ไม่ได้: ' + esc(e.message) + '</div>';
        throw e;
      });
  }

  root.GPStandards = { render: render };
})(typeof window !== 'undefined' ? window : this);
