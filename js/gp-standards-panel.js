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
  /* ---------- สไตล์ของแผง ----------
     ทุกสีเขียนเป็น var(--โทเคน, ค่าสำรอง) โดยตั้งใจ:
       · อยู่ในเว็บกลาง → รับโทเคนของธีม/สกินที่ครูเลือก แผงจึงกลืนไปกับหน้า ทั้งโหมดสว่างและมืด
       · อยู่ในเกมที่ไม่มีชุดโทเคน → ตกไปใช้ค่าสำรอง ยังเป็นไฟล์เดียวจบเหมือนเดิม

     ⚠️ โหมดมืดอัตโนมัติถูกจำกัดไว้เฉพาะ html ที่ **ไม่มี** data-theme
        เพราะเว็บกลางตั้ง data-theme เองเสมอ — ถ้าไม่จำกัด ครูที่ตั้งเครื่องเป็นโหมดมืด
        แต่เลือกธีมสว่างบนเว็บ จะเห็นแผงนี้ดำอยู่กล่องเดียวกลางหน้าขาว (เป็นมาแต่เดิม) */
  var CSS = [
    '.gpstd{font-family:system-ui,-apple-system,"Segoe UI","Sarabun","Noto Sans Thai",sans-serif;',
    'color:var(--ink,#0b0b0b);background:var(--surface,#fcfcfb);',
    'border:1px solid var(--border,rgba(11,11,11,.1));border-radius:var(--r-lg,14px);',
    'padding:18px 20px;line-height:1.55}',
    '.gpstd h3{margin:0 0 3px;font-size:16.5px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}',
    '.gpstd .gp-sub{color:var(--muted,#6d6b66);font-size:12.5px;margin-bottom:14px;',
    'padding-bottom:12px;border-bottom:1px solid var(--grid,#e1e0d9)}',
    '.gpstd .gp-grade{display:inline-block;font-size:12.5px;font-weight:600;white-space:nowrap;',
    'color:var(--accent-strong,#1c5cab);background:var(--tint-blue,#eaf2fd);',
    'border:1px solid var(--accent,#2a78d6);border-radius:999px;padding:1px 11px}',
    '.gpstd .gp-sec{margin-top:18px}',
    '.gpstd .gp-sec-head>div>div:first-child{font-size:14px;font-weight:700;color:var(--ink,#0b0b0b)}',
    /* หัวข้อหมวดมีแถบสีนำหน้า — กวาดตาหาหมวดที่ต้องการเจอก่อนอ่านรายการ */
    /* แต่ละตัวชี้วัดเป็นแถบมีเส้นซ้าย ไม่ใช่กล่องซ้อนกล่อง — อ่านเป็นรายการได้โดยไม่หนัก */
    '.gpstd .gp-item{padding:2px 0 2px 12px;margin-bottom:10px;',
    'border-left:2px solid var(--grid,#e1e0d9)}',
    '.gpstd .gp-name,.gpstd .gp-kid{display:flex;align-items:baseline;gap:7px}',
    '.gpstd .gp-name{font-size:14.5px;color:var(--ink,#0b0b0b)}',
    '.gpstd .gp-txt{flex:1;min-width:0}',
    /* รหัสตัวชี้วัดขึ้นก่อนชื่อ — ครูค้นด้วยรหัสก่อนเสมอเวลาเขียนแผนการสอน */
    '.gpstd .gp-code{display:inline-block;font-family:ui-monospace,Menlo,Consolas,monospace;',
    'font-size:11.5px;font-weight:600;color:var(--accent-strong,#1c5cab);',
    'background:var(--tint-blue,#eaf2fd);border-radius:5px;padding:1px 7px;flex:none;',
    'white-space:nowrap;vertical-align:1px}',
    /* สามบรรทัดกำกับ: วัดที่ไหน · หลักฐานคืออะไร · ตัดสินอย่างไร — จัดเป็นตารางป้าย/ค่า
       ป้ายอยู่คอลัมน์เดียวกันทุกบรรทัด ครูจึงกวาดตาลงมาหาเฉพาะ "แหล่งหลักฐาน" ได้ทันที */
    '.gpstd .gp-meta{display:grid;grid-template-columns:auto 1fr;gap:3px 9px;margin:6px 0 0}',
    '.gpstd .gp-meta dt{margin:0;font-size:12px;font-weight:600;white-space:nowrap;',
    'color:var(--muted,#6d6b66)}',
    '.gpstd .gp-meta dd{margin:0;font-size:12.5px;color:var(--ink-2,#52514e)}',
    '.gpstd .gp-kids{margin:8px 0 0;padding-left:14px;border-left:2px dotted var(--grid,#e1e0d9)}',
    '.gpstd .gp-kid{font-size:13.5px;color:var(--ink-2,#52514e);padding:3px 0}',
    /* [V.1.6.18] ป้ายที่มา — ใช้ตัวแปรธีมเดียวกับป้ายอื่นในแผงนี้ จึงไม่พังในธีมมืด */
    '.gpstd .gp-manual{display:inline-block;margin-left:7px;padding:1px 7px;border-radius:999px;',
    'font-size:10.5px;font-weight:600;white-space:nowrap;vertical-align:1px;',
    'color:var(--muted,#6d6b66);border:1px solid var(--line,#e5e3de)}',
    '.gpstd .gp-sec-src{font-weight:400;font-size:12px;color:var(--muted,#6d6b66);margin-top:2px}',
    '.gpstd .gp-sec-head{display:flex;align-items:flex-start;gap:8px;margin-bottom:10px}',
    '.gpstd .gp-sec-head::before{content:"";flex:none;width:4px;align-self:stretch;border-radius:2px;',
    'background:var(--accent,#2a78d6)}',
    '.gpstd .gp-sec.is-ach .gp-sec-head::before{background:var(--good,#0ca30c)}',
    '.gpstd .gp-sec.is-attr .gp-sec-head::before{background:var(--brand-orange,#eb6834)}',
    '.gpstd .gp-empty{color:var(--muted,#6d6b66);font-size:13.5px}',
    '.gpstd .gp-src{color:var(--muted,#6d6b66);font-size:11.5px;margin-top:16px;',
    'border-top:1px solid var(--grid,#e1e0d9);padding-top:10px}',
    '@media (max-width:420px){.gpstd{padding:14px 15px}',
    '.gpstd .gp-meta{grid-template-columns:1fr;gap:1px}}',
    '@media (prefers-color-scheme:dark){html:not([data-theme]) .gpstd{color:#fff;background:#1a1a19;',
    'border-color:rgba(255,255,255,.1)}',
    'html:not([data-theme]) .gpstd .gp-kid{color:#c3c2b7}',
    'html:not([data-theme]) .gpstd .gp-grade{color:#6da7ec;background:transparent}',
    'html:not([data-theme]) .gpstd .gp-code{color:#6da7ec;background:rgba(109,167,236,.14)}',
    'html:not([data-theme]) .gpstd .gp-item,html:not([data-theme]) .gpstd .gp-kids,',
    'html:not([data-theme]) .gpstd .gp-sub,html:not([data-theme]) .gpstd .gp-src{border-color:#2c2c2a}}',
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

  /* สามบรรทัดกำกับนี้ตอบคนละคำถามของครู จึงแยกเป็นป้าย/ค่า ไม่รวมเป็นก้อนเดียว
     และใช้ **ชื่อเต็ม** ของหัวข้อตามที่ครูสั่ง ("แหล่งหลักฐาน" ไม่ใช่ "หลักฐาน") */
  function extras(it) {
    var rows = '';
    if (it._note) rows += '<dt>📍 วัดที่</dt><dd>' + esc(it._note) + '</dd>';
    if (it._ev) rows += '<dt>🧾 แหล่งหลักฐาน</dt><dd>' + esc(it._ev) + '</dd>';
    if (it._cr) rows += '<dt>📏 เกณฑ์การวัด</dt><dd>' + esc(it._cr) + '</dd>';
    return rows ? '<dl class="gp-meta">' + rows + '</dl>' : '';
  }

  /* ชื่อรายการเสมอเป็นชื่อเต็มจากทะเบียน · รหัสขึ้นก่อนเป็นชิป (ครูค้นด้วยรหัสก่อน)
     รายการที่รหัสกับชื่อเป็นตัวเดียวกัน (เช่นสมรรถนะที่ยังไม่มีชื่อไทย) ไม่ต้องโชว์ซ้ำสองที่ */
  function nameLine(it, cls) {
    var code = it.code && it.code !== it.name_th
      ? '<span class="gp-code">' + esc(it.code) + '</span>' : '';
    /* [V.1.6.18 · ครูถามว่ากลุ่มสาระนี้มาจากไหน] บรรทัดที่เกมไม่ได้ประกาศเอง ต้องบอกให้รู้
       ไม่ใช่ข้อมูลผิด แต่เป็นของที่ "ผู้ดูแลกรอกไว้ และเกมลบเองไม่ได้"
       ถ้าไม่บอก ครูจะเห็นกลุ่มสาระโผล่มาโดยไม่มีคำอธิบาย แล้วไม่รู้จะไปแก้ที่ไหน */
    var flag = (it.__src && it.__src !== 'game-sync')
      ? '<span class="gp-manual" title="ผู้ดูแลกรอกไว้ในทะเบียนกลาง — ตัวเกมไม่ได้ประกาศว่าวัดข้อนี้ '
        + 'จึงลบออกเองไม่ได้ ต้องให้ผู้ดูแลลบที่หน้าผู้ดูแล">ผู้ดูแลกรอกไว้</span>' : '';
    return '<div class="' + cls + '">' + code
      + '<span class="gp-txt">' + esc(it.name_th || it.code) + '</span>' + flag + '</div>';
  }

  /* หัวข้อหมวด = ชื่อหมวดสั้นบรรทัดบน + ชื่อเต็มของกรอบหลักสูตรบรรทัดรอง
     เอาชื่อเต็มมาต่อท้ายบรรทัดเดียวกันแล้วหัวข้อยาวสองบรรทัดจนหาไม่เจอว่าหมวดไหนเริ่มตรงไหน
     แต่ตัดชื่อเต็มทิ้งก็ไม่ได้ ครูต้องใช้อ้างอิงในแผนการสอน — จึงแยกเป็นสองบรรทัด */
  function sectionHead(title, source) {
    return '<div class="gp-sec-head"><div><div>' + esc(title) + '</div>'
      + (source ? '<div class="gp-sec-src">' + esc(source) + '</div>' : '') + '</div></div>';
  }

  function renderSection(title, source, roots, compact, kind) {
    if (!roots.length) return '';
    var cls = 'gp-sec' + (kind ? ' is-' + kind : '');
    if (compact) {
      return '<div class="' + cls + '">' + sectionHead(title, source) + '<div class="gp-name">'
        + roots.map(function (n) { return esc(n.it.name_th); }).join(' · ') + '</div></div>';
    }
    return '<div class="' + cls + '">' + sectionHead(title, source)
      + roots.map(function (n) {
        return '<div class="gp-item">' + nameLine(n.it, 'gp-name')
          + extras(n.it)
          + (n.kids.length ? '<div class="gp-kids">' + n.kids.map(function (k) {
              return nameLine(k.it, 'gp-kid') + extras(k.it);
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
        if (!game) throw new Error('ไม่พบเกมรหัส ' + cfg.gameCode + ' ในทะเบียนกลาง');
        return get(cfg, '/rest/v1/game_framework_items?game_id=eq.' + game.id
          /* [V.1.6.18] ดึง source มาด้วย — ฐานมีคอลัมน์นี้อยู่แล้วตั้งแต่ไฟล์ 53
             'game-sync' = เกมประกาศเองว่าวัดตัวนี้ · 'manual' = ผู้ดูแลกรอกไว้
             ต้องแยกให้ครูเห็น เพราะแถว manual ที่เกมไม่ได้อ้าง ตัวเกมลบเองไม่ได้
             (rpc_publish_standards ลบเฉพาะ source='game-sync' — ไฟล์ 71 บรรทัด 356) */
          + '&select=note,weight,evidence,criteria,source,framework_items(id,code,name_th,depth,sort_order,parent_id,'
          + 'assessment_frameworks(code,kind,name_th,status))')
          .then(function (maps) { return { game: game, maps: maps || [] }; });
      })
      .then(function (data) {
        var comp = [], ach = [], attr = [], fwNames = {};
        data.maps.forEach(function (m) {
          var it = m.framework_items; if (!it) return;
          /* [V.1.6.18] ติดที่มาไปกับตัวชี้วัด — ใช้ตอนวาดป้าย "เกมไม่ได้อ้าง" */
          try { it.__src = m.source || ''; } catch (e) {}
          var f = it.assessment_frameworks || {};
          it._note = m.note || null;
          it._ev   = m.evidence || null;   /* แหล่งหลักฐาน (53 ฉบับแก้ 2) */
          it._cr   = m.criteria || null;   /* เกณฑ์การวัด  (53 ฉบับแก้ 2) */
          fwNames[f.kind] = f.name_th;
          if (f.kind === 'competency') comp.push(it);
          else if (f.kind === 'achievement') ach.push(it);
          else attr.push(it);
        });

        /* [V.1.6.18 · ครูสั่งข้อ 4] เดิมหัวเรื่องเขียนว่า "มาตรฐานการเรียนรู้ที่เกมนี้วัด"
           เหมือนกันทุกใบ ส่วนชื่อเกมอยู่บรรทัดรองสีจาง 12.5px
           พอหน้ามาตรฐานเรียงแผงของหลายเกมต่อกัน ครูดูไม่ออกว่ากรอบไหนของเกมไหน
           สลับให้ชื่อเกมเป็นหัวเรื่อง แล้วย้ายคำอธิบายกรอบไปบรรทัดรองแทน */
        var html = '<h3>' + esc(data.game.name)
          + '<span class="gp-grade">' + esc(gradeText(data.game)) + '</span></h3>'
          + '<div class="gp-sub">มาตรฐานการเรียนรู้ที่เกมนี้วัด · ข้อมูลจากทะเบียนกลางของเกมเพลิน</div>';

        /* หัวข้อหมวดใช้ชื่อเต็มของกรอบหลักสูตรจากฐานข้อมูล ไม่ตั้งชื่อย่อเอง */
        var sections =
          renderSection('ผลสัมฤทธิ์ตามหลักสูตร — ตัวชี้วัดที่เกมนี้วัด',
            fwNames.achievement, toTree(ach), cfg.compact, 'ach')
          + renderSection('สมรรถนะหลักที่เกมนี้วัด',
            fwNames.competency, toTree(comp), cfg.compact, 'comp')
          + renderSection('คุณลักษณะอันพึงประสงค์',
            fwNames.attribute, toTree(attr), cfg.compact, 'attr');

        html += sections || '<div class="gp-empty">เกมนี้ยังไม่ได้ลงทะเบียนมาตรฐานการเรียนรู้ '
          + '— เจ้าของเกมเป็นผู้ระบุว่าเกมวัดอะไร เมื่อลงทะเบียนแล้วรายการจะขึ้นที่นี่เอง</div>';

        if (!cfg.compact) {
          html += '<div class="gp-src">ข้อมูลทั้งหมดมาจาก<b>ทะเบียนกลางของเกมเพลิน</b> '
            + 'ชุดเดียวกับที่แสดงในหน้า Dashboard ของตัวเกม — '
            + 'เจ้าของเกมแก้ที่ทะเบียนแล้วทุกหน้าจออัปเดตพร้อมกัน</div>';
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
