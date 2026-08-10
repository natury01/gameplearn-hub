/* GamePlearn Hub — แกนกลางเชื่อม Supabase (fetch ตรง สไตล์เดียวกับเกมกาญจนบุรี)
 * มาตรฐาน: 00_PLATFORM_AGREEMENT.md v1.0 — anon key + RLS/RPC เท่านั้น */
(function () {
  const CFG = window.GP_CONFIG;
  const SKEY = 'gp_hub_sess';

  /* ---------- session ครู ---------- */
  let sess = null;
  function loadSess() { try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && s.refresh_token) sess = s; } catch (e) {} return sess; }
  function saveSess() { try { sess ? localStorage.setItem(SKEY, JSON.stringify(sess)) : localStorage.removeItem(SKEY); } catch (e) {} }
  function setFromAuth(j) {
    sess = { access_token: j.access_token, refresh_token: j.refresh_token,
      user_id: (j.user && j.user.id) || jwtPayload(j.access_token).sub || (sess && sess.user_id) || '',
      expires_at: Date.now() + (((j.expires_in || 3600) - 60) * 1000) };
    saveSess();
  }
  function jwtPayload(t) {
    try { return JSON.parse(atob(String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
    catch (e) { return {}; }
  }
  async function refresh() {
    if (!sess || !sess.refresh_token) return false;
    try {
      const r = await fetch(CFG.SB_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', headers: { apikey: CFG.SB_ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: sess.refresh_token }) });
      const j = await r.json().catch(() => null);
      if (j && j.access_token) { setFromAuth(j); return true; }
    } catch (e) {}
    sess = null; saveSess(); return false;
  }
  async function ensure() {
    if (!sess) loadSess();
    if (!sess) return false;
    if (Date.now() < (sess.expires_at || 0) - 30000) return true;
    return refresh();
  }

  /* ---------- ตัวเรียก REST/RPC ----------
     โทเคนของ Supabase มีอายุราว 1 ชั่วโมง ครูมักเปิดหน้า Admin ค้างไว้ทั้งวัน
     พอกดบันทึกทีหลังจะเจอ "JWT expired" ทั้งที่ยังล็อกอินอยู่แท้ ๆ

     กัน 2 ชั้น:
       1. ก่อนยิงทุกครั้ง เรียก ensure() — ต่ออายุให้ล่วงหน้าถ้าใกล้หมด
          (ไม่เปลืองเน็ต เพราะเช็กแค่เวลาหมดอายุ ยังไม่หมดก็ไม่ยิงอะไร)
       2. ถ้ายังโดน 401 อยู่ดี (เช่นเวลาเครื่องเพี้ยน) ต่ออายุแล้วลองใหม่ 1 ครั้ง
          ลองแค่ครั้งเดียวเสมอ กันวนไม่รู้จบตอนโทเคนใช้ไม่ได้จริง ๆ */
  function isAuthErr(status, j) {
    if (status !== 401) return false;
    const m = String((j && (j.message || j.msg || j.error_description)) || '');
    return /jwt|token|expired|invalid claim/i.test(m) || !m;
  }

  async function api(path, opt, _retried) {
    opt = opt || {};
    if (sess && !_retried) { try { await ensure(); } catch (e) {} }

    const h = Object.assign({
      apikey: CFG.SB_ANON, 'Content-Type': 'application/json',
      Authorization: 'Bearer ' + ((sess && sess.access_token) || CFG.SB_ANON),
    }, opt.headers || {});
    const r = await fetch(CFG.SB_URL + path, Object.assign({}, opt, { headers: h }));
    const t = await r.text();
    let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}

    if (!r.ok) {
      if (!_retried && sess && isAuthErr(r.status, j)) {
        if (await refresh()) return api(path, opt, true);
        const e2 = new Error('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่');
        e2.status = 401; e2.code = 'SESSION_EXPIRED'; throw e2;
      }
      const m = (j && (j.message || j.msg || j.error_description || j.hint)) || ('HTTP ' + r.status);
      const err = new Error(m); err.status = r.status; err.code = (j && j.code) || ''; throw err;
    }
    return { data: j, headers: r.headers };
  }
  const get  = (p) => api(p).then((r) => r.data || []);
  const rpc  = (name, payload) => api('/rest/v1/rpc/' + name, { method: 'POST', body: JSON.stringify(payload || {}) }).then((r) => r.data);
  async function countRows(path) {
    const r = await api(path + (path.includes('?') ? '&' : '?') + 'select=id&limit=1',
      { headers: { Prefer: 'count=exact' } });
    const cr = r.headers.get('content-range') || '';
    const n = parseInt(cr.split('/')[1], 10);
    return isNaN(n) ? null : n; // null = อ่านจำนวนไม่ได้ (แสดงเป็น – ไม่ใช่ 0)
  }

  /* ---------- เข้าสู่ระบบ ---------- */
  function loginGoogle(returnPath) {
    const back = location.origin + (returnPath || location.pathname);
    location.href = CFG.SB_URL + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(back);
  }
  function captureOAuthReturn() { // เรียกตอนโหลดหน้า — เก็บ token จาก #hash หลัง Google ส่งกลับ
    if (!location.hash || location.hash.indexOf('access_token=') < 0) return false;
    const q = new URLSearchParams(location.hash.slice(1));
    const at = q.get('access_token'), rt = q.get('refresh_token');
    if (!at) return false;
    setFromAuth({ access_token: at, refresh_token: rt, expires_in: parseInt(q.get('expires_in') || '3600', 10) });
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  }
  async function anonSignup() {
    const r = await fetch(CFG.SB_URL + '/auth/v1/signup', {
      method: 'POST', headers: { apikey: CFG.SB_ANON, 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.access_token) throw new Error((j && (j.msg || j.message)) || 'สร้างเซสชันไม่สำเร็จ');
    setFromAuth(j); return j;
  }
  async function recoverTeacher(code) { // ย้ายห้องทั้งหมดของโค้ดนี้มายังตัวตนปัจจุบัน
    if (!sess) await anonSignup();
    return rpc('rpc_recover_teacher', { p_code: code });
  }
  function logout() { sess = null; saveSess(); }

  /* ---------- แถวครู (teachers.id = auth uid) ---------- */
  async function ensureTeacherRow() {
    const uid = sess && sess.user_id; if (!uid) return null;
    const rows = await get('/rest/v1/teachers?id=eq.' + uid + '&select=*');
    if (rows.length) return rows[0];
    const email = jwtPayload(sess.access_token).email || null;
    const ins = await api('/rest/v1/teachers?on_conflict=id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([{ id: uid, email: email, display_name: 'ครู', is_anonymous: !email }]) });
    return (ins.data && ins.data[0]) || null;
  }

  /* ---------- utils ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('th-TH', { maximumFractionDigits: 1 });
  const fmtInt = (n) => (n == null || isNaN(n)) ? '–' : Math.round(Number(n)).toLocaleString('th-TH');
  function joinKeyGen() {
    const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = '';
    const buf = new Uint32Array(6); crypto.getRandomValues(buf);
    for (let i = 0; i < 6; i++) s += A[buf[i] % A.length];
    return s;
  }
  /* เรียงเลขที่นักเรียนแบบ "จำนวนนับ" ไม่ใช่แบบข้อความ
     student_number เก็บเป็น text (เพราะบางโรงเรียนใช้ 01, ก1, 4/12)
     ถ้าปล่อยให้ฐานข้อมูลเรียงจะได้ 1, 10, 11, … , 2, 20 ซึ่งครูอ่านไม่รู้เรื่อง
     กติกา: เป็นตัวเลขล้วนทั้งคู่ → เทียบค่าตัวเลข · นอกนั้นเทียบแบบไทย
             เลขมาก่อนข้อความเสมอ · ไม่มีเลขที่ไปอยู่ท้ายสุด */
  function cmpStudentNo(a, b) {
    const sa = (a == null ? '' : String(a)).trim();
    const sb = (b == null ? '' : String(b)).trim();
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    const na = /^\d+$/.test(sa) ? parseInt(sa, 10) : null;
    const nb = /^\d+$/.test(sb) ? parseInt(sb, 10) : null;
    if (na !== null && nb !== null) return na - nb;
    if (na !== null) return -1;
    if (nb !== null) return 1;
    /* ปนตัวเลขกับตัวอักษร เช่น "ก1" กับ "ก10" — ใช้ numeric ของ localeCompare */
    return sa.localeCompare(sb, 'th', { numeric: true, sensitivity: 'base' });
  }
  const byStudentNo = (a, b) => cmpStudentNo(a && a.student_number, b && b.student_number);

  const timeAgo = (iso) => {
    if (!iso) return '–';
    const d = (Date.now() - new Date(iso).getTime()) / 60000;
    if (d < 1) return 'เมื่อครู่'; if (d < 60) return Math.round(d) + ' นาทีที่แล้ว';
    if (d < 1440) return Math.round(d / 60) + ' ชม.ที่แล้ว';
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  window.GP = { loadSess, ensure, session: () => sess, api, get, rpc, countRows,
    loginGoogle, captureOAuthReturn, anonSignup, recoverTeacher, logout,
    ensureTeacherRow, jwtPayload, esc, fmt, fmtInt, joinKeyGen, timeAgo,
    cmpStudentNo, byStudentNo };
})();
