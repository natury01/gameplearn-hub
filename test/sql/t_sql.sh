#!/usr/bin/env bash
# ── สัญญา exit code ของชุดทดสอบในโฟลเดอร์นี้ [V.1.6.7] (STD-006 ข้อ 1) ──────────
#   0  = รันครบและผ่านทุกข้อ
#   1  = มีข้อตก หรือรันไม่สำเร็จ (แดง)
#   77 = ข้ามทั้งชุด ไม่ได้ตรวจอะไรเลย (ข้าม ≠ ผ่าน — ธรรมเนียม Automake/Meson)
#   ห้ามคืน "จำนวนข้อที่ตก" เป็น exit code: เกิน 255 จะวนกลับเป็น 0 และอาจชนรหัส 77
# รันไฟล์ SQL จริงบน Postgres 16 ที่จำลองสภาพ Supabase แล้วทดสอบพฤติกรรม
#   ทดสอบทั้งฝั่งที่ "ต้องทำได้" และฝั่งที่ "ต้องถูกปฏิเสธ" — อย่างหลังสำคัญกว่า
set -u
cd "$(dirname "$0")"
# ไฟล์ SQL ที่จะทดสอบอยู่ใน sql/ ของชุดเว็บ — ในซิปคือ ../../sql (test/sql → GAMEPLEARN_HUB/sql)
# ตั้ง SQLDIR เองได้ถ้าวางไว้ที่อื่น
if [ -z "${SQLDIR:-}" ]; then
  for d in ../../sql ../../hub/sql; do
    if [ -f "$d/59_ROOM_BROWSE.sql" ]; then SQLDIR="$d"; break; fi
  done
fi
if [ -z "${SQLDIR:-}" ] || [ ! -f "$SQLDIR/59_ROOM_BROWSE.sql" ]; then
  echo "❌ หาไฟล์ SQL ไม่เจอ — ตั้ง SQLDIR ให้ชี้ไปโฟลเดอร์ที่มี 59_ROOM_BROWSE.sql"
  exit 1
fi
# ── [V.1.6.17 · 23 ส.ค. 2569] บังคับ client encoding เป็น UTF8 ──
#   psql บน Windows ภาษาไทย เดา client encoding จาก code page ของระบบ = WIN874 (cp874)
#   ไฟล์ fixture และไฟล์ SQL ทุกไฟล์ในโครงการนี้เป็น UTF-8
#   ⇒ psql อ่านไบต์ไทยแล้วแปลผิด ล้มที่บรรทัดแรกที่มีสระ/วรรณยุกต์นอกช่วง cp874
#     ข้อความจริงที่เจอ: character with byte sequence 0x81 in encoding "WIN874" has no equivalent
#   ตั้งตรงนี้ให้ครบทุกทางเรียก จะได้ไม่ต้องจำเองทุกครั้ง (เครื่องลินุกซ์ตั้งแล้วก็ไม่เสียหาย)
export PGCLIENTENCODING="${PGCLIENTENCODING:-UTF8}"

# ── V.1.6.6: เลือกทางเชื่อม Postgres (มติครู 19 ส.ค. — "ติดตั้ง" บนเครื่องครู) ──
#   ทาง ก: มี GP_PGHOST → ต่อเซิร์ฟเวอร์ที่ติดตั้งไว้แล้ว (เครื่องครู · ดูวิธีในเอกสาร 80)
#   ทาง ข: ไม่ตั้ง → ตั้งเซิร์ฟเวอร์ชั่วคราวเองเหมือนเดิม (เครื่องแชต/คอนเทนเนอร์)
#   ทั้งสองทางใช้ฐานทดสอบชั่วคราวชื่อ gptest — ถูก drop/สร้างใหม่ทุกครั้งที่รัน
if [ -n "${GP_PGHOST:-}" ]; then
  case "$GP_PGHOST" in *supabase.co*|*supabase.in*)
    echo "❌ ห้ามชี้ชุดทดสอบไปที่ Supabase จริง — ฐานทดสอบต้องเป็นเครื่อง local เท่านั้น"
    echo "   (สคริปต์นี้ drop/สร้างฐาน gptest และสร้าง role ทดสอบ — ไม่ควรเกิดบนฐานที่มีข้อมูลนักเรียน)"
    exit 1;;
  esac
  H="$GP_PGHOST"; P="${GP_PGPORT:-5432}"; U="${GP_PGUSER:-postgres}"
  [ -n "${GP_PGPASSWORD:-}" ] && export PGPASSWORD="$GP_PGPASSWORD"
  if ! command -v psql >/dev/null 2>&1; then
    echo "❌ ตั้ง GP_PGHOST ไว้แต่หา psql ไม่เจอใน PATH"
    echo "   Windows: เพิ่ม C:\\Program Files\\PostgreSQL\\16\\bin เข้า PATH (ดูเอกสาร 80 ข้อ 3)"
    exit 1
  fi
  if ! psql -h "$H" -p "$P" -U "$U" -d postgres -c 'select 1' >/dev/null 2>&1; then
    echo "❌ ต่อ Postgres ที่ $H:$P (ผู้ใช้ $U) ไม่สำเร็จ — ตรวจว่าบริการรันอยู่และรหัสผ่านถูก (เอกสาร 80)"
    exit 1     # ตั้งใจต่อแล้วต่อไม่ได้ = แดง ไม่ใช่ข้ามเงียบ (STD-006)
  fi
  echo "▶ ใช้ Postgres ที่ติดตั้งไว้: $H:$P ผู้ใช้ $U (ฐานทดสอบชั่วคราว: gptest)"
else
  H=/tmp; P=5433; U=postgres
  PGBIN=/usr/lib/postgresql/16/bin
  # [V.1.6.7] เครื่องที่มี Postgres รันอยู่แล้วแต่ลืมตั้ง GP_PGHOST (เช่นรุ่นพกพาบน Windows)
  #   ไม่ควรถูกข้ามเงียบ ๆ — ลองต่อ 127.0.0.1 ก่อน (5432 มาตรฐาน · 5433 รุ่นพกพา)
  #   เดิมกิ่งนี้ผูกกับ /usr/lib/postgresql/16/bin ซึ่งไม่มีวันมีบน Windows ⇒ ลืม env = ข้ามทุกครั้ง
  if command -v psql >/dev/null 2>&1; then
    for _p in 5432 5433; do
      if psql -h 127.0.0.1 -p "$_p" -U postgres -d postgres -c 'select 1' >/dev/null 2>&1; then
        H=127.0.0.1; P="$_p"; U=postgres
        echo "▶ ไม่ได้ตั้ง GP_PGHOST แต่พบ Postgres ที่ 127.0.0.1:$_p — ใช้ตัวนี้ (ฐานทดสอบชั่วคราว: gptest)"
        break
      fi
    done
  fi
  if [ "$H" = /tmp ] && { ! command -v psql >/dev/null || [ ! -x "$PGBIN/pg_ctl" ]; }; then
    echo "⏭  ข้ามชุดทดสอบ SQL — เครื่องนี้ไม่มี PostgreSQL แบบที่ตั้งเองได้ และไม่ได้ตั้ง GP_PGHOST"
    echo "   ⚠️ ข้าม ≠ ผ่าน (STD-006) — ไฟล์ SQL ยังไม่ถูกตรวจบนเครื่องนี้"
    echo "   ทางแก้: ติดตั้ง PostgreSQL 16 แล้วรันด้วย GP_PGHOST=127.0.0.1 GP_PGPORT=<พอร์ต> (เอกสาร 80)"
    # [V.1.6.7] เดิม exit 0 → run-all.sh นับเป็น "ผ่าน" แล้วพิมพ์ "ผ่านครบทุกชุด" ซึ่งขัดกับ
    # ป้ายที่เพิ่งพิมพ์ไปเองสองบรรทัดบน — run-all.sh แยกนับเป็น skipped ตาม STD-006 ข้อ 1
    exit 77
  fi
  if ! psql -h /tmp -p 5433 -U postgres -c 'select 1' >/dev/null 2>&1; then
    export PGDATA=/tmp/pgdata_gp
    rm -rf $PGDATA; mkdir -p $PGDATA; chown -R postgres:postgres $PGDATA 2>/dev/null || true
    su postgres -c "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust -E UTF8 --locale=C" >/dev/null 2>&1
    su postgres -c "$PGBIN/pg_ctl -D $PGDATA -l /tmp/pg_gp.log -o '-p 5433 -k /tmp' start" >/dev/null 2>&1
    sleep 2
  fi
fi
# ── [V.1.6.7 · 19 ส.ค. 2569] ส่ง SQL ทาง stdin แทน -c ────────────────────────────
#  เหตุ: psql.exe บน Windows ที่ระบบไม่ใช่ UTF-8 codepage (เช่นไทย = 874/TIS-620)
#        แปลง argument ของ -c เป็น ANSI codepage แล้วส่งไบต์ WIN874 ออกไป
#        ทั้งที่ประกาศ client_encoding=UTF8 → ERROR invalid byte sequence
#        ทุกข้อที่มีข้อความไทย (ชื่อห้อง/ชื่อเกม/reason) แดงหมด — วัดจริงบนเครื่องครู 149 ข้อ
#        ตั้ง PGCLIENTENCODING ไม่ช่วย เพราะการแปลงเกิดก่อนหน้านั้น
#  พิสูจน์แยกสามทาง: -c พัง · stdin ผ่าน · -f ผ่าน  ⇒ ใช้ stdin (ท่าที่ไฟล์นี้ใช้อยู่แล้วบางจุด)
#  วิธี: ทำ gpq() ให้รับ -c เหมือน psql ทุกประการ แล้วป้อน SQL ทาง stdin แทน
#        → จุดเรียกทั้ง 185 แห่ง ($Q -c "…") ไม่ต้องแก้แม้แต่บรรทัดเดียว
#  บน Linux/mac พฤติกรรมเหมือนเดิมทุกประการ (stdin กับ -c ให้ผลเท่ากันในชุดนี้)
gpq() {
  local a=() sql="" got=0
  while [ $# -gt 0 ]; do
    case "$1" in
      -c) sql="$sql$2"$'
'; got=1; shift 2 ;;
      *)  a+=("$1"); shift ;;
    esac
  done
  if [ "$got" = 1 ]; then printf '%s' "$sql" | psql "${a[@]}"; else psql "${a[@]}"; fi
}
PSQL="psql -h $H -p $P -U $U -d gptest -v ON_ERROR_STOP=1 -q"
Q="gpq -h $H -p $P -U $U -d gptest -t -A -q"
# [V.1.6.7] เพิ่มตัวนับหัว n — STD-006 ข้อ 1 "นับหัวก่อนเชื่อผล"
#   เดิมชุดนี้พิมพ์แค่ "ผ่านครบทุกข้อ" ไม่มี X/Y ⇒ ถ้าหมวดใดหายไปทั้งหมวด (เช่น
#   ไฟล์ SQL ไฟล์หนึ่งหาย แล้วกิ่งนั้นไม่ได้รัน) จะไม่มีใครเห็น เพราะ "ไม่มีข้อตก" เหมือนกัน
bad=0; _nchk=0   # _nchk = ตัวนับหัว · ห้ามใช้ชื่อ n เพราะไฟล์นี้ใช้ n เก็บผลคิวรีอยู่แล้ว
ok() { _nchk=$((_nchk+1)); if [ "$2" = "$3" ]; then echo "  ✅ $1"; else echo "  ❌ $1"; echo "       ได้: [$2]  ควรได้: [$3]"; bad=$((bad+1)); fi; }
okc() { _nchk=$((_nchk+1)); if echo "$2" | grep -q "$3"; then echo "  ✅ $1"; else echo "  ❌ $1"; echo "       ได้: [$2]  ควรมีคำว่า: [$3]"; bad=$((bad+1)); fi; }

# ── [V.1.6.7] นกขมิ้นในเหมือง: ตรวจว่าท่อส่ง SQL รับภาษาไทยได้จริงก่อนเริ่มตรวจอะไร ──
#  ถ้า client encoding เพี้ยน (เช่น psql.exe บน Windows codepage 874) ทุกข้อที่มีข้อความไทย
#  จะแดงพร้อมกันเป็นร้อย ๆ ข้อ — ซึ่งอ่านแล้วเข้าใจผิดว่า "ฐาน/ไฟล์ SQL พัง"
#  ทั้งที่จริงคือเครื่องมือส่งตัวอักษรไม่ถึง ⇒ หยุดตรงนี้พร้อมบอกวิธีแก้ ดีกว่าปล่อยให้เข้าใจผิด
_canary=$(printf "%s" "select 'ทดสอบไทย';" | psql -h "$H" -p "$P" -U "$U" -d postgres -t -A -q 2>&1)
if [ "$_canary" != "ทดสอบไทย" ]; then
  echo "❌ ท่อส่ง SQL ส่งภาษาไทยไม่ถึงเซิร์ฟเวอร์ — หยุดก่อนตรวจ (ไม่งั้นจะแดงเป็นร้อยข้อโดยไม่ใช่ความผิดของ SQL)"
  echo "   ส่งไป: [ทดสอบไทย]   ได้กลับ: [$_canary]"
  echo "   สาเหตุที่พบบ่อย: psql.exe บน Windows ที่ระบบไม่ใช่ UTF-8 codepage แปลง argument ของ -c เป็น ANSI (874)"
  echo "   ทางแก้: ใช้ psql ที่ส่ง SQL ทาง stdin/-f (ชุดนี้ทำแล้วผ่าน gpq) หรือรันบนเชลล์ที่ codepage เป็น UTF-8"
  exit 1
fi
echo "  ✅ นกขมิ้น: ท่อส่ง SQL รับภาษาไทยได้ถูกต้อง"

psql -h "$H" -p "$P" -U "$U" -q -c "drop database if exists gptest" -c "create database gptest"

echo "═══ 0) ติดตั้งฐานจำลอง + รันไฟล์ SQL จริง ═══"
$PSQL -f 00_fixture.sql >/dev/null 2>/tmp/e0.txt   && echo "  ✅ ฐานจำลอง (pgcrypto อยู่ในสคีมา extensions เหมือนของจริง)" || { echo "  ❌ ฐานจำลองล้ม"; cat /tmp/e0.txt; exit 1; }
out=$($PSQL -f $SQLDIR/59_ROOM_BROWSE.sql 2>&1);  if [ $? -eq 0 ]; then echo "  ✅ 59_ROOM_BROWSE.sql รันผ่าน 0 error"; else echo "  ❌ 59 ล้ม"; echo "$out" | tail -5; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/60_ROOM_CLAIM.sql 2>&1);   if [ $? -eq 0 ]; then echo "  ✅ 60_ROOM_CLAIM.sql รันผ่าน 0 error"; else echo "  ❌ 60 ล้ม"; echo "$out" | tail -5; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/59_ROOM_BROWSE.sql -f $SQLDIR/60_ROOM_CLAIM.sql 2>&1); if [ $? -eq 0 ]; then echo "  ✅ รันซ้ำได้ (idempotent)"; else echo "  ❌ รันซ้ำแล้วล้ม"; echo "$out" | tail -5; bad=$((bad+1)); fi

echo ""
echo "═══ 1) ข้อมูลตั้งต้น ═══"
$PSQL -v ON_ERROR_STOP=1 >/dev/null 2>/tmp/seed.txt <<'SQL'
insert into teachers (id, email, display_name) values
  ('11111111-1111-4111-8111-111111111111','a@t.th','ครู ก'),
  ('22222222-2222-4222-8222-222222222222','b@t.th','ครู ข');
insert into schools (id, name) values
  ('33333333-3333-4333-8333-333333333331','โรงเรียนบ้านกาญจน์'),
  ('33333333-3333-4333-8333-333333333332','ผู้เล่นทั่วไป');
insert into games (id, code, name) values ('44444444-4444-4444-8444-444444444441','kan','กาญจนบุรี 2050');
insert into classrooms (id, teacher_id, school_id, name, grade, room_no, academic_year, join_key, listed, is_active) values
 ('55555555-5555-4555-8555-000000000001','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333331','ป.4/1','ป.4','1','2569','AAA111',true ,true),
 ('55555555-5555-4555-8555-000000000002','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333331','ป.5/1','ป.5','1','2569','BBB222',true ,true),
 ('55555555-5555-4555-8555-000000000003','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333331','ป.6/1','ป.6','1','2569','CCC333',false,true),
 ('55555555-5555-4555-8555-000000000004','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333331','ป.3/1','ป.3','1','2568','DDD444',true ,false),
 ('55555555-5555-4555-8555-0000000000ff',null,'33333333-3333-4333-8333-333333333332','ผู้เล่นทั่วไป',null,null,null,'ZZZ999',true,true);
update classrooms set teacher_id='11111111-1111-4111-8111-111111111111' where name='ผู้เล่นทั่วไป';
insert into students (classroom_id, first_name, last_name, is_active) values
 ('55555555-5555-4555-8555-000000000002','เด็ก','หนึ่ง',true),
 ('55555555-5555-4555-8555-000000000002','เด็ก','สอง',true),
 ('55555555-5555-4555-8555-000000000002','เด็ก','สาม',false);
insert into classroom_games values ('55555555-5555-4555-8555-000000000002','44444444-4444-4444-8444-444444444441',true);
insert into student_game_progress (student_id, game_id, progress_percent)
  select s.id,'44444444-4444-4444-8444-444444444441', case when s.first_name='เด็ก' and s.last_name='หนึ่ง' then 80 when s.last_name='สอง' then 40 else 100 end
    from students s where s.classroom_id='55555555-5555-4555-8555-000000000002';
SQL
if [ $? -eq 0 ]; then echo "  ✅ ใส่ข้อมูลตั้งต้นแล้ว (ครู ก 1 ห้อง · ครู ข 3 ห้อง · ห้องผู้เล่นทั่วไป 1)";
else echo "  ❌ ใส่ข้อมูลตั้งต้นไม่สำเร็จ — ข้อถัดไปจะตกทั้งหมดโดยไม่ได้แปลว่าโค้ดผิด"; cat /tmp/seed.txt; exit 1; fi

echo ""
echo "═══ 2) RLS เดิมต้องไม่ถูกคลาย — ครูยังเห็นเฉพาะห้องตัวเอง ═══"
AS_A="set role authenticated; set local test.uid='11111111-1111-4111-8111-111111111111';"
AS_B="set role authenticated; set local test.uid='22222222-2222-4222-8222-222222222222';"
AS_ANON="set role anon; set local test.uid='';"
n=$($Q -c "begin; $AS_A select count(*) from classrooms; rollback;")
ok "ครู ก อ่านตาราง classrooms ตรง ๆ ได้แค่ห้องตัวเอง (2 ห้อง รวมห้องผู้เล่นทั่วไปที่ผูกไว้)" "$n" "2"
n=$($Q -c "begin; $AS_ANON select count(*) from classrooms; rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "คนที่ยังไม่ล็อกอินอ่านตาราง classrooms ตรง ๆ ไม่ได้เลย" "$n" "0\|denied"

echo ""
echo "═══ 3) 59 — ดูห้องสาธารณะของครูคนอื่น ═══"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms(); rollback;")
ok "ครู ก เห็นห้องสาธารณะ 2 ห้อง (ของตัวเอง 1 + ของครู ข 1)" "$n" "2"
n=$($Q -c "begin; $AS_A select string_agg(room_name,',' order by room_name) from rpc_browse_rooms(); rollback;")
ok "เห็นเฉพาะห้องที่ตั้งว่าค้นหาได้ และห้องที่เปิดอยู่" "$n" "ป.4/1,ป.5/1"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms() where room_name='ป.6/1'; rollback;")
ok "ห้องที่ตั้งเป็น \"โค้ดเท่านั้น\" ไม่โผล่" "$n" "0"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms() where room_name='ป.3/1'; rollback;")
ok "ห้องที่ปิดชั่วคราวไม่โผล่" "$n" "0"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms() where room_name='ผู้เล่นทั่วไป'; rollback;")
ok "ห้องผู้เล่นทั่วไปไม่โผล่ (PDPA เด็ก)" "$n" "0"
n=$($Q -c "begin; $AS_A select students_on::text||'|'||avg_progress::text from rpc_browse_rooms() where room_name='ป.5/1'; rollback;")
ok "นับเฉพาะนักเรียนที่ยังใช้งาน และเฉลี่ยไม่รวมคนที่ถูกปิด (2 คน · (80+40)/2=60)" "$n" "2|60.0"
n=$($Q -c "begin; $AS_A select is_mine::text from rpc_browse_rooms() where room_name='ป.4/1'; rollback;")
ok "ห้องของตัวเองติดธง is_mine" "$n" "true"
cols=$($Q -c "select string_agg(p.proargnames::text,'') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='rpc_browse_rooms';")
okc "ผลลัพธ์ไม่มีโค้ดเข้าห้องเลย" "$(echo "$cols" | grep -c join_key)" "0"
n=$($Q -c "begin; $AS_ANON select count(*) from rpc_browse_rooms(); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "คนที่ยังไม่ล็อกอินเรียก rpc_browse_rooms ไม่ได้" "$n" "denied"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms(p_grade=>'ป.5'); rollback;")
ok "กรองตามระดับชั้นได้" "$n" "1"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms(p_year=>'2569'); rollback;")
ok "กรองตามปีการศึกษาได้" "$n" "2"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms(p_school=>'33333333-3333-4333-8333-333333333331'); rollback;")
ok "กรองตามโรงเรียนได้" "$n" "2"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms(p_q=>'ป.5'); rollback;")
ok "ค้นด้วยคำได้" "$n" "1"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms(p_school=>'',p_grade=>'',p_year=>'',p_q=>''); rollback;")
ok "ส่งค่าว่างมา = ไม่กรอง (ฝั่งเว็บส่ง '' มาแน่ ๆ)" "$n" "2"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms(p_limit=>99999); rollback;")
ok "เพดานถูกบีบไม่ให้เกิน 500 แม้ขอมาเกิน" "$n" "2"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_room_filters() where kind='school'; rollback;")
ok "ตัวเลือกตัวกรองมีโรงเรียน 1 แห่ง (ไม่นับโรงเรียนผู้เล่นทั่วไป)" "$n" "1"
n=$($Q -c "begin; $AS_ANON select count(*) from v_public_rooms; rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "อ่าน view ตรง ๆ ไม่ได้ ต้องผ่าน RPC เท่านั้น" "$n" "denied"

echo ""
echo "═══ 4) 60 — สร้างห้องก่อนล็อกอิน แล้วผูกทีหลัง ═══"
res=$($Q -c "begin; $AS_ANON select rpc_create_room_open('ป.2','3','โรงเรียนใหม่ทดสอบ','2569',true); commit;")
okc "คนที่ยังไม่ล็อกอินสร้างห้องได้" "$res" '"ok": true'
TOKEN=$(echo "$res" | python3 -c "import sys,json;print(json.load(sys.stdin)['claim_token'])")
RID=$(echo "$res" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
KEY=$(echo "$res" | python3 -c "import sys,json;print(json.load(sys.stdin)['join_key'])")
ok "กุญแจรับห้องยาว 64 ตัว (เดาไม่ได้)" "${#TOKEN}" "64"
okc "โค้ดเข้าห้อง 6 ตัวจากชุดที่ตกลงกัน (ไม่มี 0 1 I L O)" "$KEY" "^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]\{6\}$"
n=$($Q -c "select name||'|'||coalesce(teacher_id::text,'ยังไม่มีเจ้าของ') from classrooms where id='$RID';")
ok "ห้องถูกสร้างแบบยังไม่มีเจ้าของ ชื่อเป็น ระดับชั้น/ห้องที่" "$n" "ป.2/3|ยังไม่มีเจ้าของ"
n=$($Q -c "begin; $AS_B select count(*) from classrooms where id='$RID'; rollback;")
ok "ครูคนอื่นมองไม่เห็นห้องที่ยังไม่มีเจ้าของ (RLS เดิมกันอยู่)" "$n" "0"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms() where id='$RID'; rollback;")
ok "ห้องที่ยังไม่มีเจ้าของไม่โผล่ในรายการห้องสาธารณะ" "$n" "0"
res=$($Q -c "begin; $AS_ANON select rpc_room_by_claim('$TOKEN'); rollback;")
okc "เอากุญแจมาแลกดูห้องได้ทั้งที่ยังไม่ล็อกอิน" "$res" '"ok": true'
res=$($Q -c "begin; $AS_ANON select rpc_room_by_claim('ไม่มีจริง'); rollback;")
okc "กุญแจผิด = ตอบ not_found เฉย ๆ ไม่บอกใบ้อะไร" "$res" "not_found"
res=$($Q -c "begin; $AS_ANON select rpc_claim_room('$TOKEN'); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ยังไม่ล็อกอิน ผูกห้องไม่ได้" "$res" "denied"
n=$($Q -c "select count(*) from schools where name='โรงเรียนใหม่ทดสอบ';")
ok "โรงเรียนใหม่ถูกสร้างให้ 1 แห่ง" "$n" "1"
$Q -c "begin; $AS_ANON select rpc_create_room_open('ป.2','4','  โรงเรียนใหม่ทดสอบ  ','2569',true); commit;" >/dev/null
n=$($Q -c "select count(*) from schools where lower(btrim(name))='โรงเรียนใหม่ทดสอบ';")
ok "ชื่อโรงเรียนซ้ำ (ต่างแค่ช่องว่าง) ไม่สร้างซ้ำ" "$n" "1"

res=$($Q -c "begin; $AS_B select rpc_claim_room('$TOKEN'); commit;")
okc "ล็อกอินแล้วผูกห้องเข้าบัญชีได้" "$res" '"ok": true'
n=$($Q -c "select coalesce(teacher_id::text,'-')||'|'||coalesce(claim_token,'ลบแล้ว') from classrooms where id='$RID';")
ok "ผูกแล้ว teacher_id เป็นของครู ข และกุญแจถูกลบทิ้ง" "$n" "22222222-2222-4222-8222-222222222222|ลบแล้ว"
n=$($Q -c "begin; $AS_B select count(*) from classrooms where id='$RID'; rollback;")
ok "ผูกแล้วห้องโผล่ในรายการห้องของครูคนนั้นทันที" "$n" "1"
res=$($Q -c "begin; $AS_A select rpc_claim_room('$TOKEN'); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "กุญแจเดิมใช้ผูกซ้ำไม่ได้อีก (ครูคนอื่นแย่งไม่ได้)" "$res" "ใช้ไม่ได้แล้ว"
n=$($Q -c "begin; $AS_A select count(*) from rpc_browse_rooms() where id='$RID'; rollback;")
ok "ผูกแล้วห้องเข้าไปอยู่ในรายการห้องสาธารณะตามปกติ" "$n" "1"

echo ""
echo "═══ 5) กุญแจหมดอายุ + เก็บกวาดห้องร้าง ═══"
res=$($Q -c "begin; $AS_ANON select rpc_create_room_open('ป.1',null,null,null,true); commit;")
T2=$(echo "$res" | python3 -c "import sys,json;print(json.load(sys.stdin)['claim_token'])")
R2=$(echo "$res" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
$Q -c "update classrooms set claim_expires_at = now() - interval '1 day' where id='$R2';" >/dev/null
res=$($Q -c "begin; $AS_ANON select rpc_room_by_claim('$T2'); rollback;")
okc "กุญแจหมดอายุ = บอกตรง ๆ ว่าหมดอายุ" "$res" "expired"
res=$($Q -c "begin; $AS_A select rpc_claim_room('$T2'); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "กุญแจหมดอายุแล้วผูกไม่ได้" "$res" "หมดอายุ"
n=$($Q -c "select gp_purge_unclaimed_rooms();")
ok "เก็บกวาดลบห้องร้างที่หมดอายุและไม่มีนักเรียน 1 ห้อง" "$n" "1"

res=$($Q -c "begin; $AS_ANON select rpc_create_room_open('ป.1',null,null,null,true); commit;")
R3=$(echo "$res" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
$Q -c "insert into students (classroom_id, first_name) values ('$R3','เด็กที่เข้ามาแล้ว');
       update classrooms set claim_expires_at = now() - interval '1 day' where id='$R3';" >/dev/null
n=$($Q -c "select gp_purge_unclaimed_rooms();")
ok "ห้องที่หมดอายุแต่ **มีนักเรียนแล้ว** ต้องไม่ถูกลบ (ข้อมูลเด็กห้ามหาย)" "$n" "0"
n=$($Q -c "select count(*) from classrooms where id='$R3';")
ok "ห้องนั้นยังอยู่ครบ" "$n" "1"

echo ""
echo "═══ 6) ค่าที่ใส่ไม่ถูกต้อง ═══"
res=$($Q -c "begin; $AS_ANON select rpc_create_room_open('   ',null,null,null,true); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ไม่ใส่ระดับชั้น = ปฏิเสธพร้อมบอกตัวอย่าง" "$res" "ระดับชั้น"
res=$($Q -c "begin; $AS_ANON select rpc_create_room_open(repeat('ก',50),null,null,null,true); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ค่ายาวเกินถูกปฏิเสธ ไม่ใช่ตัดเงียบ" "$res" "ยาวเกิน"
res=$($Q -c "begin; $AS_A select rpc_claim_room(''); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ผูกด้วยกุญแจว่างไม่ได้" "$res" "ไม่มีกุญแจ"

echo ""
echo "═══ 7) 61 — เติม skipped ให้ผังมาตรฐาน (ตามที่ภาค 1 ขอ) ═══"
out=$($PSQL -f $SQLDIR/61_STANDARDS_SKIPPED.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 61_STANDARDS_SKIPPED.sql รันผ่าน 0 error"; else echo "  ❌ 61 ล้ม"; echo "$out" | tail -5; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/61_STANDARDS_SKIPPED.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ รันซ้ำได้"; else echo "  ❌ รันซ้ำแล้วล้ม"; bad=$((bad+1)); fi

$Q -c "insert into games (id, code, name) values ('44444444-4444-4444-8444-44444444444a','kanchanaburi2050','กาญจนบุรี 2050 ภาค 1') on conflict do nothing;" >/dev/null

# ส่งผังชุดที่ "ถูกทุกอย่าง" — ต้องไม่มีอะไรตก
res=$($Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.7.99.28','[
  {\"code\":\"ส 5.1 ป.4/1\",\"name\":\"สืบค้นและอธิบาย\",\"subject\":\"SO\",\"sort\":511},
  {\"code\":\"HT\",\"framework\":\"cbe-core\"}]'::jsonb); commit;")
okc "ส่งผังที่ถูกต้อง = รับครบ ไม่มีอะไรตก" "$res" '"accepted": 2'
okc "ยังคืนช่องเดิมครบ (ของเกมรุ่นเก่าไม่กระทบ)" "$res" '"sent": 2'
okc "skipped ว่างเมื่อไม่มีอะไรตก" "$res" '"skipped": \[\]'
n=$($Q -c "select count(*) from framework_items fi join assessment_frameworks f on f.id=fi.framework_id where f.code='core-2551-rev2560' and fi.code='ส 5.1 ป.4/1';")
ok "ตัวชี้วัดใหม่ถูกสร้างและผูกใต้กลุ่มสาระจริง" "$n" "1"
n=$($Q -c "select count(*) from game_framework_items where source='game-sync';")
ok "ผูกเข้ากับเกมครบ 2 รายการ" "$n" "2"
okc "HT ถูกแปลงเป็น HOT ให้เอง (ไม่ตก)" "$res" '"accepted": 2'

# ส่งผังที่ "มีของเสีย" — ต้องบอกได้ว่าใบไหนตกเพราะอะไร
res=$($Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.7.99.28','[
  {\"code\":\"ส 5.1 ป.4/1\",\"name\":\"ของดี\"},
  {\"code\":\"\",\"name\":\"ไม่มีรหัส\"},
  {\"code\":\"ส 5.1 ป.4/1\",\"name\":\"ซ้ำ\"},
  {\"code\":\"ZZZ\",\"framework\":\"cbe-core\"}]'::jsonb); commit;")
okc "รับเฉพาะรายการที่ใช้ได้ (1 จาก 4)" "$res" '"accepted": 1'
okc "บอกจำนวนที่ตกทั้งหมด" "$res" '"skipped_total": 3'
okc "เหตุผล: ไม่มีรหัสตัวชี้วัด" "$res" "ไม่มีรหัสตัวชี้วัด"
okc "เหตุผล: รหัสซ้ำในชุดเดียวกัน" "$res" "รหัสซ้ำกับรายการก่อนหน้า"
okc "เหตุผล: ไม่รู้จักรหัสสมรรถนะ พร้อมบอกรหัสที่แปลงแล้ว" "$res" "ไม่รู้จักรหัสสมรรถนะ"
okc "รายการที่ตกมี code ติดมาด้วย ไม่ใช่แค่เหตุผลลอย ๆ" "$res" '"code": "ZZZ"'
n=$($Q -c "select count(*) from game_framework_items where source='game-sync';")
ok "ของที่เกมเลิกส่งถูกตัดออก เหลือเท่าที่ส่งรอบล่าสุด" "$n" "1"

# ของผู้ดูแลต้องไม่ถูกซิงก์ทับ (กติกาเดิมของไฟล์ 53 — ห้ามพังเพราะไฟล์นี้)
$Q -c "insert into framework_items (framework_id, code, depth, name_th)
       select id,'MANUAL-1',2,'ของผู้ดูแล' from assessment_frameworks where code='core-2551-rev2560'
       on conflict do nothing;
       insert into game_framework_items (game_id, item_id, source)
       select '44444444-4444-4444-8444-44444444444a', id, 'manual' from framework_items where code='MANUAL-1'
       on conflict do nothing;" >/dev/null
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.7.99.28','[{\"code\":\"ส 5.1 ป.4/1\"}]'::jsonb); commit;" >/dev/null
n=$($Q -c "select count(*) from game_framework_items where source='manual';")
ok "แถวที่ผู้ดูแลกรอกเองไม่ถูกลบทับ (กติกาเดิมยังอยู่)" "$n" "1"
n=$($Q -c "select count(*) from standards_publish_log;")
ok "บันทึกการส่งลง log ครบทุกครั้ง (3 ครั้ง)" "$n" "3"

echo ""
echo "═══ 8) 64 — ใบรายงานผลบอกได้ว่าตกอะไรไป เพราะอะไร ═══"
out=$($PSQL -f $SQLDIR/64_REPORT_SKIPPED.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 64_REPORT_SKIPPED.sql รันผ่าน 0 error"; else echo "  ❌ 64 ล้ม"; echo "$out" | tail -8; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/64_REPORT_SKIPPED.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ รันซ้ำได้"; else echo "  ❌ รันซ้ำแล้วล้ม"; bad=$((bad+1)); fi

# นักเรียนจริง 3 คนในห้อง ป.5/1 (ใช้จำลอง "ยิงทีละคน วนทั้งห้อง" แบบที่ภาค 1 ทำ)
S1=$($Q -c "select id from students where last_name='หนึ่ง' limit 1;")
S2=$($Q -c "select id from students where last_name='สอง'  limit 1;")
S3=$($Q -c "select id from students where last_name='สาม'  limit 1;")
GV="V.7.99.30-IX2050-2569.71"

# ── [F2 · 20 ส.ค. 2569] ยามพิสูจน์ผู้ส่งใบรายงานผล ──
out=$($PSQL -f $SQLDIR/82_REPORT_SENDER_PROOF.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 82_REPORT_SENDER_PROOF.sql รันผ่าน 0 error"; else echo "  ❌ 82 ล้ม"; echo "$out" | tail -5; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/82_REPORT_SENDER_PROOF.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 82 รันซ้ำได้ (idempotent)"; else echo "  ❌ 82 รันซ้ำแล้วล้ม"; echo "$out" | tail -5; bad=$((bad+1)); fi

# ── ส่งชุดที่ถูกทุกอย่าง — ต้องไม่มีอะไรตก และค่าที่คืนต้องเหมือนของเดิมเป๊ะ ──
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S1',
  '{\"score\":78,\"max_score\":100,\"grade_label\":\"ดีมาก\"}'::jsonb,
  '[{\"code\":\"HT\",\"score\":72,\"level\":5},{\"code\":\"TW\",\"level\":4,\"evidence\":\"observed\"}]'::jsonb); commit;")
okc "ส่งชุดที่ถูกต้อง = รับครบ ไม่มีอะไรตก" "$res" '"skipped_total": 0'

# ── [F2] ยามพิสูจน์ผู้ส่ง — ต้องกันได้จริง ไม่ใช่แค่มีโค้ดอยู่ ──
#  ก่อนปิด F2: ใครก็ตามที่ยิง RPC นี้ได้ เขียนใบรายงานผลให้เด็กคนไหนก็ได้ ขอแค่รู้ uuid
#  และเด็กมี uuid ของเพื่อนทั้งห้องอยู่ในเครื่องอยู่แล้วจากรายชื่อห้อง
f2res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S1',
  '{\"score\":99,\"max_score\":100}'::jsonb, null); commit;" 2>&1)
okc "⭐ anon (คนนอก/เด็ก) ส่งใบรายงานผลไม่ได้แล้ว" "$f2res" 'ต้องเป็นครูเจ้าของห้อง'
f2res=$($Q -c "begin; $AS_A select rpc_submit_report('kanchanaburi2050','$GV','$S1',
  '{\"score\":99,\"max_score\":100}'::jsonb, null); commit;" 2>&1)
okc "⭐ ครูคนอื่น (ไม่ใช่เจ้าของห้อง) ส่งไม่ได้" "$f2res" 'ต้องเป็นครูเจ้าของห้อง'
f2res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S1',
  '{\"score\":77,\"max_score\":100}'::jsonb, null); commit;" 2>&1)
okc "⭐ ครูเจ้าของห้องยังส่งได้ตามปกติ (ยามไม่ปิดทางที่ถูกต้อง)" "$f2res" '"ok": true'
n=$($Q -c "begin; $AS_B select (rpc_submit_report('kanchanaburi2050','$GV','$S1',
  '{\"score\":77,\"max_score\":100}'::jsonb, null)->>'ok'); rollback;")
ok "ยามไม่ทำให้ผลลัพธ์เดิมเพี้ยน" "$n" "true"
n=$($Q -c "select (pg_get_functiondef(oid) like '%ต้องเป็นครูเจ้าของห้อง%')::text
             from pg_proc where proname='rpc_submit_report' limit 1;")
ok "ยามฝังอยู่ในตัวฟังก์ชันจริง (ไม่ใช่แค่ในไฟล์)" "$n" "true"
okc "ช่องเดิม ok ยังอยู่" "$res" '"ok": true'
okc "ช่องเดิม achievement ยังอยู่" "$res" '"achievement": true'
okc "ช่องเดิม competencies ยังอยู่และนับถูก" "$res" '"competencies": 2'
okc "ช่องใหม่ stored นับใบที่ 1 รวมด้วย" "$res" '"stored": 3'
okc "ช่องใหม่ partial = false เมื่อไม่มีอะไรตก" "$res" '"partial": false'
n=$($Q -c "select count(*) from achievement_results where student_id='$S1';")
ok "ใบผลสัมฤทธิ์ถูกเขียนจริง" "$n" "1"
n=$($Q -c "select count(*) from competency_dim_results where student_id='$S1';")
ok "ใบสมรรถนะถูกเขียนจริง 2 ด้าน" "$n" "2"
n=$($Q -c "select count(*) from competency_dim_results where student_id='$S1' and comp_code='HOT';")
ok "แปลง HT เป็น HOT ให้เหมือนเดิม" "$n" "1"
n=$($Q -c "select level_label from competency_dim_results where student_id='$S1' and comp_code='HOT';")
ok "ป้ายระดับเป็นคำยังเติมให้เอง" "$n" "สามารถ"

# ส่งซ้ำต้องทับของเดิม ไม่ใช่เพิ่มแถวใหม่
$Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S1',
  '{\"score\":90,\"max_score\":100}'::jsonb, null); commit;" >/dev/null
n=$($Q -c "select count(*) from achievement_results where student_id='$S1';")
ok "ส่งซ้ำทับของเดิม ไม่เพิ่มแถว" "$n" "1"
n=$($Q -c "select score::int from achievement_results where student_id='$S1';")
ok "ส่งซ้ำแล้วค่าอัปเดตจริง" "$n" "90"

# ── ⭐ ข้อสำคัญที่สุด: รายการเดียวผิด ต้องไม่ลากใบที่เหลือตกไปด้วย ──
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":55,\"max_score\":100}'::jsonb,
  '[{\"code\":\"HOT\",\"score\":60},{\"code\":\"XX\",\"score\":50}]'::jsonb); commit;")
okc "รหัสผิดหนึ่งด้าน — ใบผลสัมฤทธิ์ยังถูกเก็บ (ของเดิมย้อนกลับทั้งใบ)" "$res" '"achievement": true'
okc "ด้านที่ถูกต้องยังถูกเก็บ" "$res" '"competencies": 1'
okc "บอกว่ามีของตก" "$res" '"partial": true'
okc "นับจำนวนที่ตกได้" "$res" '"skipped_total": 1'
okc "เหตุผล: ไม่รู้จักรหัสสมรรถนะ (ภาษาไทย)" "$res" "ไม่รู้จักรหัสสมรรถนะ"
okc "รายการที่ตกบอกรหัสด้วย" "$res" '"code": "XX"'
okc "รายการที่ตกบอกด้วยว่าเป็นใบไหน" "$res" '"part": "competency"'
n=$($Q -c "select count(*) from achievement_results where student_id='$S2';")
ok "ยืนยันจากตารางจริง: ใบผลสัมฤทธิ์ของเด็กคนนี้อยู่ในฐาน" "$n" "1"

# ── เหตุผลแต่ละแบบ ──
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":55}'::jsonb, '[{\"score\":10},{\"code\":\"  \"}]'::jsonb); rollback;")
okc "เหตุผล: ไม่มีรหัสด้านสมรรถนะ" "$res" "ไม่มีรหัสด้านสมรรถนะ"
okc "ไม่มีรหัส 2 รายการ นับครบทั้งสอง" "$res" '"skipped_total": 2'

res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  null, '[{\"code\":\"HT\",\"score\":70},{\"code\":\"HOT\",\"score\":10}]'::jsonb); rollback;")
okc "เหตุผล: รหัสซ้ำในคำขอเดียวกัน (หลังแปลง HT→HOT แล้วชนกัน)" "$res" "ซ้ำกับรายการก่อนหน้า"
okc "รหัสซ้ำ — เก็บของที่ส่งมาก่อน" "$res" '"competencies": 1'

res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb, '[{\"code\":\"TW\",\"level\":\"สูง\"}]'::jsonb); rollback;")
okc "เหตุผล: ระดับต้องเป็นจำนวนเต็ม (ของเดิมพังทั้งใบด้วย error อังกฤษ)" "$res" "ต้องเป็นจำนวนเต็ม"
okc "ระดับผิด — ใบผลสัมฤทธิ์ยังรอด" "$res" '"stored": 1'

res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":\"ดีมาก\"}'::jsonb, '[{\"code\":\"CM\",\"level\":4}]'::jsonb); rollback;")
okc "เหตุผล: คะแนนในใบผลสัมฤทธิ์ไม่ใช่ตัวเลข" "$res" "ต้องเป็นตัวเลข"
okc "คะแนนผิด — ใบสมรรถนะยังรอด" "$res" '"achievement": false'
okc "รายการที่ตกบอกว่าเป็นใบผลสัมฤทธิ์" "$res" '"part": "achievement"'

res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb, '[{\"code\":\"CZ\",\"level\":4,\"evidence\":\"ครูดูเอา\"}]'::jsonb); rollback;")
okc "เหตุผล: evidence ไม่ถูกต้อง — บอกเป็นไทย ไม่ใช่ check constraint อังกฤษ" "$res" "ไม่ถูกต้อง"
okc "evidence ผิด ไม่โผล่ข้อความดิบของ PostgreSQL ใส่ครู" "$res" "scored (คิดจากคะแนน)"

res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb, '\"ไม่ใช่อาเรย์\"'::jsonb); rollback;")
okc "รูปแบบใบสมรรถนะผิด — บอกเป็นไทย ไม่ทำให้ใบที่ 1 ตก" "$res" "ต้องเป็นอาเรย์"

# ── อาเรย์ที่ตกถูกตัดที่ 25 แต่ยอดรวมต้องตรง ──
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb,
  (select jsonb_agg(jsonb_build_object('code','ZZ'||g)) from generate_series(1,30) g)); rollback;")
okc "ตกเกิน 25 รายการ — ยอดรวมยังตรง" "$res" '"skipped_total": 30'
n=$($Q -c "begin; $AS_B select jsonb_array_length(rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb,
  (select jsonb_agg(jsonb_build_object('code','ZZ'||g)) from generate_series(1,30) g))->'skipped'); rollback;")
ok "อาเรย์ที่ตกถูกตัดไว้ที่ 25 รายการ (กันคำตอบบวม)" "$n" "25"

# ── เก็บไม่ได้เลย = ต้องโยน error ไม่ใช่ตอบ 200 พร้อม ok:false ──
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  null, '[{\"code\":\"XX\"}]'::jsonb); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "เก็บไม่ได้เลย = โยน error (ห้ามตอบ ok:false — ภาค 2 ดักด้วย .catch อย่างเดียว)" "$res" "ERROR"
okc "ข้อความ error บอกเหตุผลแรกเป็นภาษาไทย" "$res" "ไม่รู้จักรหัสสมรรถนะ"
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  null, '[{\"code\":\"XX\"}]'::jsonb); rollback;" 2>&1)
okc "ยืนยันว่าไม่มีทางคืน ok:false" "$res" "ERROR"

# ── ด่านเดิมของไฟล์ 43 ต้องไม่หายไปสักข้อ ──
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV',null,'{\"score\":1}'::jsonb,null); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: ไม่ระบุนักเรียน" "$res" "ต้องระบุนักเรียน"
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S1','{\"score\":1}'::jsonb,null,'LEGACY-SHEETS'); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: run_id LEGACY-SHEETS สงวนไว้" "$res" "LEGACY-SHEETS"
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S1',null,'[]'::jsonb); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: ต้องส่งอย่างน้อยหนึ่งใบ" "$res" "อย่างน้อยหนึ่งใบ"
res=$($Q -c "begin; $AS_B select rpc_submit_report('ไม่มีเกมนี้','$GV','$S1','{\"score\":1}'::jsonb,null); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: ไม่พบเกม" "$res" "ไม่พบเกม"
res=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','99999999-9999-4999-8999-999999999999','{\"score\":1}'::jsonb,null); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: ไม่พบนักเรียน" "$res" "ไม่พบนักเรียนรหัสนี้"

# ── ครูตัดสินระดับทับ ต้องยังทำงาน (กติกาเดิมของไฟล์ 43) ──
$Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$S3',null,
  '[{\"code\":\"SM\",\"level\":6,\"decided_by\":\"teacher\",\"system_level\":4,\"system_score\":55}]'::jsonb); commit;" >/dev/null
n=$($Q -c "select decided_by from competency_dim_results where student_id='$S3' and comp_code='SM';")
ok "ครูตัดสินระดับทับยังบันทึกได้ (decided_by)" "$n" "teacher"
n=$($Q -c "select system_level from competency_dim_results where student_id='$S3' and comp_code='SM';")
ok "ค่าที่ระบบคิดไว้เดิมยังถูกเก็บคู่กัน" "$n" "4"

# ── ⭐ เคสที่ภาค 1 ขอ: ยิงทีละคนจนครบห้อง ใบกลางล้ม ──
$Q -c "delete from achievement_results; delete from competency_dim_results;" >/dev/null
fail=0; okn=0
for st in "$S1|78" "$S2|BAD" "$S3|91"; do
  sid=${st%%|*}; sc=${st##*|}
  if [ "$sc" = "BAD" ]; then
    r=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$sid',null,'[{\"code\":\"XX\"}]'::jsonb); commit;" 2>&1)
  else
    r=$($Q -c "begin; $AS_B select rpc_submit_report('kanchanaburi2050','$GV','$sid','{\"score\":$sc,\"max_score\":100}'::jsonb,null); commit;" 2>&1)
  fi
  if echo "$r" | grep -q ERROR; then fail=$((fail+1)); else okn=$((okn+1)); fi
done
ok "ยิงทีละคนทั้งห้อง 3 ใบ — สำเร็จ 2 ใบ" "$okn" "2"
ok "ยิงทีละคนทั้งห้อง 3 ใบ — ไม่สำเร็จ 1 ใบ (เกมสรุปเองได้)" "$fail" "1"
n=$($Q -c "select count(*) from achievement_results;")
ok "ใบที่ล้มไม่ลากใบของคนอื่นตกไปด้วย (ในฐานมี 2 ใบจริง)" "$n" "2"

# ── สิทธิ์ ──
n=$($Q -c "select has_function_privilege('anon','public.rpc_submit_report(text,text,uuid,jsonb,jsonb,text)','execute')::text;")
ok "anon เรียกได้ (เกมยิงโดยไม่ล็อกอิน)" "$n" "true"
n=$($Q -c "select has_function_privilege('authenticated','public.rpc_submit_report(text,text,uuid,jsonb,jsonb,text)','execute')::text;")
ok "authenticated เรียกได้" "$n" "true"

# ── ตัวช่วยตัวเลข ──
n=$($Q -c "select gp_num_bad('12.5')::text || gp_num_bad('')::text || gp_num_bad(null)::text || gp_num_bad('ดีมาก')::text;")
ok "gp_num_bad: ตัวเลขผ่าน · ว่าง/ไม่ส่งไม่นับผิด · ข้อความจับได้" "$n" "falsefalsefalsetrue"
n=$($Q -c "select gp_int_bad('5')::text || gp_int_bad('5.5')::text || gp_int_bad('สูง')::text;")
ok "gp_int_bad: จำนวนเต็มผ่าน · ทศนิยม/ข้อความจับได้" "$n" "falsetruetrue"

# ── ⭐⭐ V.1.6.5 (Audit F4) — คีย์ upsert ไม่แยกภาคด้วยตัวเอง: พิสูจน์ว่าการแยกด้วย
#    gp_resolve_game เพียงพอจริง สำหรับกรณี "เด็กคนเดียว ส่งจากสองภาค run เดียวกัน"
#    คีย์คือ (student_id, game_id, run_id) — ภาคถูกแยกเพราะ resolver คืน game_id คนละตัว
#    ตามป้าย -p2- ใน game_version · ทั้งบล็อกห่อ begin…rollback ไม่ทิ้งแถวให้เทสต์ถัดไป
#    (โดยเฉพาะหมวด 12 ที่นับค่าเฉลี่ยหน้าสาธารณะ — แถว p2 หลุดไปจะทำตัวเลขเพี้ยนเงียบ ๆ)
out=$($Q -c "begin;
  -- [V.1.6.27] แถวภาค 2 ต้องตั้ง score_code+season_tag เหมือนฐานจริง — resolver ใน fixture
  -- เป็นฉบับจริงแล้ว (เดิม mock จับ code||'-p2' เลยไม่ต้องตั้ง = เขียวหลอก)
  insert into games (id, code, name, score_code, season_tag) values
    ('44444444-4444-4444-8444-44444444444b','kanchanaburi2050-p2','กาญจนบุรี 2050 ภาค 2',
     'kanchanaburi2050','-p2-')
    on conflict do nothing;
  $AS_B   -- [F2] ต้องส่งในฐานะครูเจ้าของห้อง — anon ส่งไม่ได้แล้ว
  select rpc_submit_report('kanchanaburi2050','V.8.63-p2-2569.127','$S1',
    '{\"score\":42,\"max_score\":160}'::jsonb, '[]'::jsonb);
  reset role;   -- อ่านตารางตรง ๆ ต้องถอดหมวก anon ก่อน (RLS ปัด anon ถูกต้องแล้ว — เทสต์หมวด 12 คุมอยู่)
  select 'ROWS=' || count(*) from achievement_results where student_id='$S1' and run_id='live';
  select 'GAMES=' || count(distinct game_id) from achievement_results where student_id='$S1' and run_id='live';
  select 'P2SCORE=' || score from achievement_results a join games g on g.id=a.game_id
    where a.student_id='$S1' and g.code='kanchanaburi2050-p2';
  select 'P1UNTOUCHED=' || (score is distinct from 42) from achievement_results a join games g on g.id=a.game_id
    where a.student_id='$S1' and g.code='kanchanaburi2050';
  $AS_B
  select rpc_submit_report('kanchanaburi2050','V.7.99.37-IX2050-2569.71','$S1',
    '{\"score\":99,\"max_score\":160}'::jsonb, '[]'::jsonb);
  reset role;
  select 'P1AFTER=' || score from achievement_results a join games g on g.id=a.game_id
    where a.student_id='$S1' and g.code='kanchanaburi2050';
  select 'P2AFTER=' || score from achievement_results a join games g on g.id=a.game_id
    where a.student_id='$S1' and g.code='kanchanaburi2050-p2';
  rollback;")
okc "⭐⭐ F4: เด็กคนเดียว สองภาค run เดียวกัน = สองแถว ไม่ทับกัน" "$out" "ROWS=2"
okc "และเป็นคนละ game_id จริง (resolver แยกภาคจากป้าย -p2-)" "$out" "GAMES=2"
okc "ใบของภาค 2 ลงแถวภาค 2 (score 42)" "$out" "P2SCORE=42"
okc "ใบของภาค 1 ที่มีอยู่เดิมไม่ถูกภาค 2 ทับ" "$out" "P1UNTOUCHED=true"
okc "ส่งภาค 1 ตามหลัง = อัปเดตเฉพาะแถวภาค 1" "$out" "P1AFTER=99"
okc "แถวภาค 2 ยังเป็นค่าเดิม ไม่ถูกภาค 1 ทับกลับ" "$out" "P2AFTER=42"
# ⚠️ จุดบอดที่พิสูจน์ไม่ได้ด้วยเทสต์ (จดตาม 77_FIELD_CONTRACT): ภาค 2 ที่ "ลืมป้าย -p2-"
#    แยกไม่ออกจากทราฟฟิกภาค 1 โดยนิยาม — ด่านกันอยู่ฝั่งเกม (ยาม build ของภาค 2 บังคับป้าย)
#    ฐานทำได้แค่ปฏิเสธรุ่นว่าง ซึ่งทำอยู่แล้ว · ห้ามแก้ schema เพื่อเรื่องนี้ก่อนมี Impact Analysis

echo ""
echo "═══ 8b) 85 — F4 บนท่อจริง: ทุกท่อแยกภาค + สองท่อต้องตกลงกัน (มติครู 25 ส.ค. ทาง ก) ═══"
# บทเรียนที่หมวดนี้เกิดมาเพื่อกัน: F4 เดิมพิสูจน์ rpc_submit_report (ท่อที่ถูก) แล้วสรุปแทน
# rpc_submit_events (ท่อที่เกมใช้จริง ซึ่งไม่แยกภาค) — เขียว 7 วันขณะของจริงพัง
# ⇒ หมวดนี้ยิง "ทั้งสองท่อ" ในเคสเดียวกัน แล้วยืนยันว่าชี้ game_id เดียวกัน (ข้อ C ของสเปก HUB)
# ก่อนรัน 85: ตั้งแถวเกมสองภาคให้เหมือนฐานจริง — 85 มียามข้อมูล (pre-flight) ที่ต้องเห็น
# แถวภาค 2 ที่ resolve ได้จริง ไม่งั้นปฏิเสธการติดตั้งทันที (ผู้ตรวจหักล้าง 25 ส.ค.)
$Q -c "insert into games (id, code, name, score_code, season_tag) values
  ('44444444-4444-4444-8444-44444444444b','kanchanaburi2050-p2','กาญจนบุรี 2050 ภาค 2',
   'kanchanaburi2050','-p2-')
  on conflict (id) do update set score_code=excluded.score_code, season_tag=excluded.season_tag;" >/dev/null
out=$($PSQL -f $SQLDIR/85_RESOLVE_GAME_ALL_PIPES.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 85_RESOLVE_GAME_ALL_PIPES.sql รันผ่าน 0 error"; else echo "  ❌ 85 ล้ม"; echo "$out" | tail -8; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/85_RESOLVE_GAME_ALL_PIPES.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ รันซ้ำได้ (idempotent)"; else echo "  ❌ รันซ้ำแล้วล้ม"; echo "$out" | tail -8; bad=$((bad+1)); fi

out=$($Q -c "begin;
  insert into games (id, code, name) values
    ('44444444-4444-4444-8444-44444444444b','kanchanaburi2050-p2','กาญจนบุรี 2050 ภาค 2')
    on conflict do nothing;
  -- ── ท่อ A: rpc_submit_report (ครูเจ้าของห้องส่ง — ยาม F2) · รุ่นภาค 2 ──
  $AS_B
  select rpc_submit_report('kanchanaburi2050','V.8.82-p2-2569.146','$S1',
    '{\"score\":10,\"max_score\":160}'::jsonb, '[]'::jsonb);
  reset role;
  -- ── ท่อ B: rpc_submit_events (เด็กส่งจากในเกม — ท่อที่เดิมไม่แยกภาค) · รุ่นภาค 2 ──
  $AS_ANON
  select rpc_submit_events('BBB222','$S1','', 'kanchanaburi2050',
    '{\"session_id\":\"t85\",\"game_version\":\"V.8.82-p2-2569.146\",\"score\":\"5\"}'::jsonb,
    '[{\"stage_id\":\"1\",\"kind\":\"progress\",\"score\":\"5\"}]'::jsonb);
  reset role;
  select 'B_GAME=' || g.code from attempts a join games g on g.id=a.game_id
    where a.student_id='$S1' and a.session_id='t85';
  select 'EV_GAME=' || g.code from events e join games g on g.id=e.game_id
    join attempts a on a.id=e.attempt_id where a.session_id='t85';
  select 'AGREE=' || (
    (select ar.game_id from achievement_results ar where ar.student_id='$S1' and ar.run_id='live'
       and ar.game_version like '%-p2-%' limit 1)
    = (select a.game_id from attempts a where a.student_id='$S1' and a.session_id='t85'));
  -- ── ทางเข้าเก่า (ไม่มีป้าย -p2-) ต้องยังลงภาค 1 เหมือนเดิม ──
  $AS_ANON
  select rpc_submit_events('BBB222','$S1','', 'kanchanaburi2050',
    '{\"session_id\":\"t85p1\",\"game_version\":\"V.7.99.57-IX2050-2569.89\"}'::jsonb, '[]'::jsonb);
  reset role;
  select 'P1_GAME=' || g.code from attempts a join games g on g.id=a.game_id
    where a.student_id='$S1' and a.session_id='t85p1';
  rollback;")
okc "⭐⭐ ท่อจริง (submit_events) แยกภาคแล้ว — attempts ลงแถวภาค 2" "$out" "B_GAME=kanchanaburi2050-p2"
okc "events ก็ลงภาค 2 (ตารางข้อมูลวิจัยหลัก)" "$out" "EV_GAME=kanchanaburi2050-p2"
okc "⭐⭐⭐ ข้อ C ของสเปก: สองท่อชี้ game_id เดียวกัน (ตกลงกันแล้ว — ไม่ใช่แค่ต่างคนต่างทำงาน)" "$out" "AGREE=true"
okc "ทางเข้าเก่า (รุ่นภาค 1) ยังลงภาค 1 เหมือนเดิม — ของที่ใช้อยู่ไม่พัง" "$out" "P1_GAME=kanchanaburi2050$"

# ── ลายเซ็นเก่าต้องยังเรียกได้ (ผู้เรียกเดิมไม่ส่งพารามิเตอร์รุ่น) — พิสูจน์หลัง drop+สร้างใหม่ ──
out=$($Q -c "begin;
  $AS_ANON
  select 'SURVEY_OK=' || (rpc_submit_survey('BBB222','$S1','', 'kanchanaburi2050','satisfaction',
    '{\"q1\":5}'::jsonb, null, 4.5, 'ดีมาก') is not null);
  reset role;
  select 'SURVEY_GAME=' || coalesce(g.code,'(null)') from surveys s left join games g on g.id=s.game_id
    where s.student_id='$S1' and s.kind='satisfaction';
  rollback;")
okc "ลายเซ็นเดิมของ rpc_submit_survey (9 อาร์กิวเมนต์ ไม่มีรุ่น) ยังเรียกได้" "$out" "SURVEY_OK=true"
okc "และพฤติกรรมเดิมคงอยู่ — ไม่มีรุ่น = ลงภาค 1 ตาม code" "$out" "SURVEY_GAME=kanchanaburi2050$"

# ── set_save: ส่งรุ่นภาค 2 → ชั้นสรุป (student_game_progress) ต้องลงแถวภาค 2 ──
out=$($Q -c "begin;
  insert into games (id, code, name) values
    ('44444444-4444-4444-8444-44444444444b','kanchanaburi2050-p2','กาญจนบุรี 2050 ภาค 2')
    on conflict do nothing;
  $AS_ANON
  select rpc_set_save('BBB222','$S1','', '{\"stages\":{\"1\":{}}}'::jsonb, 12, 0,
                      'kanchanaburi2050', 'V.8.82-p2-2569.146');
  reset role;
  select 'SAVE_GAME=' || g.code from student_game_progress p join games g on g.id=p.game_id
    where p.student_id='$S1' and g.code like '%-p2';
  rollback;")
okc "rpc_set_save ส่งรุ่นภาค 2 → แถวสรุปลงภาค 2 (ไม่ปนกับภาค 1 อีก)" "$out" "SAVE_GAME=kanchanaburi2050-p2"

# ── ครอบท่อที่เหลือให้ครบ 9 ตัว (ผู้ตรวจหักล้าง 25 ส.ค.: เดิมพิสูจน์ทางเข้าเก่าแค่ survey) ──
out=$($Q -c "begin;
  -- competency (in-place): รุ่นภาค 2 → ตารางสมรรถนะลงภาค 2
  select rpc_submit_competency('kanchanaburi2050','V.8.82-p2-2569.146','$S1',
    '{\"a\":1,\"b\":1,\"c\":1,\"d\":1,\"total\":4}'::jsonb, 't85run') is not null;
  select 'COMP_GAME=' || g.code from competency_results c join games g on g.id=c.game_id
    where c.student_id='$S1' and c.run_id='t85run';
  -- peer (in-place): raw.gameVersion ภาค 2 → attempts ของผู้ถูกประเมินลงภาค 2
  $AS_ANON
  select rpc_submit_peer('BBB222','$S1','', '$S2','kanchanaburi2050',
    '{\"gameVersion\":\"V.8.82-p2-2569.146\",\"scores\":{}}'::jsonb) is not null;
  reset role;
  select 'PEER_GAME=' || g.code from attempts a join games g on g.id=a.game_id
    where a.student_id='$S2' and g.code like '%-p2';
  -- submit_events แบบไม่มีคีย์รุ่นเลย (กิ่ง fallback ของ gp_game_for) → ภาค 1 เหมือนเดิม
  $AS_ANON
  select rpc_submit_events('BBB222','$S1','', 'kanchanaburi2050',
    '{\"session_id\":\"t85nov\"}'::jsonb, '[]'::jsonb);
  reset role;
  select 'NOV_GAME=' || g.code from attempts a join games g on g.id=a.game_id
    where a.student_id='$S1' and a.session_id='t85nov';
  -- item_scores ลายเซ็นเดิม 5 อาร์กิวเมนต์ (หลัง drop+สร้างใหม่)
  $AS_ANON
  select 'ITEMS_OK=' || (rpc_submit_item_scores('BBB222','$S1','', 'kanchanaburi2050',
    '[]'::jsonb) is not null);
  reset role;
  -- set_save ลายเซ็นเดิม 7 อาร์กิวเมนต์ → ยังลงภาค 1
  $AS_ANON
  select rpc_set_save('BBB222','$S1','', '{\"stages\":{}}'::jsonb, 1, 0, 'kanchanaburi2050');
  reset role;
  select 'SAVE7=' || (count(*)) from student_game_progress p join games g on g.id=p.game_id
    where p.student_id='$S1' and g.code='kanchanaburi2050';
  -- kru_* ลายเซ็นเดิม: จับเฉพาะ undefined_function (ลายเซ็น/ default พัง) — error เนื้อหาไม่นับ
  do \$x\$ begin perform rpc_kru_assess('$S1'::uuid, '{}'::jsonb);
    exception when undefined_function then raise; when others then null; end \$x\$;
  select 'KRU_ASSESS_LEGACY=ok';
  do \$x\$ begin perform rpc_kru_save('$S1'::uuid, 'note', '{}'::jsonb);
    exception when undefined_function then raise; when others then null; end \$x\$;
  select 'KRU_SAVE_LEGACY=ok';
  -- feedback: ลายเซ็นเดิม 2 อาร์กิวเมนต์ + แบบส่งรุ่นภาค 2 → game_id ลงภาค 2
  select 'FB_OK=' || (rpc_submit_feedback('idea','ขอบคุณครับ ระบบใช้งานดีมากเลยครับ') is not null);
  select rpc_submit_feedback('bug','ทดสอบยามแยกภาคของท่อฟีดแบ็ก','kanchanaburi2050',
    null, null, '{}'::jsonb, 'V.8.82-p2-2569.146') is not null;
  select 'FB_GAME=' || g.code from feedback f join games g on g.id=f.game_id
    where f.game_id is not null;
  -- resolver จริงต้องปฏิเสธรุ่นว่างเมื่อรหัสใช้ร่วมสองภาค (กันใครถอดกิ่งกันใน gp_game_for)
  do \$x\$ begin perform public.gp_resolve_game('kanchanaburi2050',''); raise exception 'NO_RAISE';
    exception when others then if sqlerrm = 'NO_RAISE' then raise; end if; end \$x\$;
  select 'RESOLVE_EMPTY_RAISES=ok';
  rollback;")
okc "competency (in-place) รุ่นภาค 2 → ลงภาค 2" "$out" "COMP_GAME=kanchanaburi2050-p2"
okc "peer (in-place) raw.gameVersion ภาค 2 → ลงภาค 2" "$out" "PEER_GAME=kanchanaburi2050-p2"
okc "ไม่มีคีย์รุ่นเลย = กิ่ง fallback → ภาค 1 เหมือนเดิม" "$out" "NOV_GAME=kanchanaburi2050$"
okc "item_scores ลายเซ็นเดิม 5 อาร์กิวเมนต์ยังเรียกได้" "$out" "ITEMS_OK=true"
okc "set_save ลายเซ็นเดิม 7 อาร์กิวเมนต์ → แถวสรุปยังลงภาค 1" "$out" "SAVE7=1"
okc "kru_assess ลายเซ็นเดิมยังเรียกได้ (default รุ่นทำงาน)" "$out" "KRU_ASSESS_LEGACY=ok"
okc "kru_save ลายเซ็นเดิมยังเรียกได้" "$out" "KRU_SAVE_LEGACY=ok"
okc "feedback ลายเซ็นเดิม 2 อาร์กิวเมนต์ยังเรียกได้" "$out" "FB_OK=true"
okc "feedback ส่งรุ่นภาค 2 → game_id ลงภาค 2 (ท่อที่ 9 ที่เคยหลุดยาม)" "$out" "FB_GAME=kanchanaburi2050-p2"
okc "resolver จริงปฏิเสธรุ่นว่างเมื่อรหัสใช้ร่วมกัน (fixture ใช้ตัวจริง ไม่ใช่ mock แล้ว)" "$out" "RESOLVE_EMPTY_RAISES=ok"

# ── สิทธิ์เรียกครบทุกลายเซ็นใหม่ (จับทั้ง grant หายและ signature พิมพ์ผิด — ลายเซ็นไม่มีจริง = error) ──
n=$($Q -c "select bool_and(has_function_privilege('anon', f, 'execute'))::text from unnest(array[
  'public.gp_game_for(text,text)',
  'public.rpc_submit_survey(text,uuid,text,text,text,jsonb,jsonb,numeric,text,text)',
  'public.rpc_submit_item_scores(text,uuid,text,text,jsonb,text,text)',
  'public.rpc_kru_assess(uuid,jsonb,text,text)',
  'public.rpc_kru_save(uuid,text,jsonb,text,text)',
  'public.rpc_set_save(text,uuid,text,jsonb,numeric,numeric,text,text)',
  'public.rpc_submit_feedback(text,text,text,text,text,jsonb,text)']) f;")
ok "สิทธิ์ anon ครบทั้ง 7 ลายเซ็นใหม่ (ยาม grant ที่ฐานจำลองเดิมมองไม่เห็น)" "$n" "true"

# ── ยามทะเบียน (สเปกข้อ 2): ฟังก์ชันเขียนตารางผูก game_id ต้องแยกภาค — ห้ามมี ❌ เหลือ ──
# [V.1.6.33 · P-KAN1-08 ตามใบ HUB 29 ส.ค.] รายชื่อตารางเลิกพิมพ์มือ — ถามสคีมาเอง
# (รายชื่อพิมพ์มือเดิมตามหลังสคีมาแล้วจริง 1 ตาราง: ครอบ 12 จาก 13)
# ทะเบียนยกเว้น — เหตุผลต้องอยู่ในไฟล์นี้ ไม่ใช่ในกระดาน (ใบ HUB ข้อ ③):
#   rpc_split_group / rpc_split_named — เครื่องมือครูแยกบัญชีกลุ่มนอกวงจรเล่น:
#     คัดลอก game_id จากแถวที่มีอยู่แล้ว ไม่ได้หาเกมจากรหัส จึงไม่มีอะไรให้ resolve
#   classroom_games — ทะเบียน "ห้องเปิดเกมอะไร": game_id มาจากตัวเลือกในหน้าจอ
#     (id ตรงจากทะเบียน games) ไม่ได้แปลงจากรหัสข้อความ ⇒ ไม่มีความเสี่ยงแบบ F4
#     [ตัดสิน 30 ส.ค. โดย Code ตามที่ HUB ขอให้ตัดสินพร้อมเหตุผล]
n=$($Q -c "select count(*) from pg_attribute a
  join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and a.attname='game_id'
    and a.attnum>0 and not a.attisdropped;")
if [ "$n" -ge 5 ]; then pass_note="(พบ $n ตาราง)"; echo "  ✅ ⭐ ยามคู่: ตัวดึงรายชื่อตารางจากสคีมายังทำงาน $pass_note"; else
  echo "  ❌ ⭐ ยามคู่: ตัวดึงรายชื่อคืน $n ตาราง (<5) — สิทธิ์อ่าน catalog หาย? ยามหลักจะเขียวหลอก"; bad=$((bad+1)); fi
n=$($Q -c "with gid_tables as (
    select c.relname from pg_attribute a
      join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' and a.attname='game_id'
       and a.attnum>0 and not a.attisdropped
       and c.relname <> 'classroom_games'),
  pat as (select 'insert\\s+into\\s+(public\\.)?(' || string_agg(relname,'|') || ')\\M' as re from gid_tables),
  exempt(fn) as (values ('rpc_split_group'),('rpc_split_named')),
  writers as (select p.proname, prosrc from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
    where ns.nspname='public' and p.prokind in ('f','p')
      and prosrc ~* (select re from pat))
  select count(*) from writers w left join exempt e on e.fn=w.proname
   where e.fn is null and w.prosrc !~* 'gp_resolve_game|gp_game_for';")
ok "⭐ ยามทะเบียน: ไม่มีฟังก์ชันเขียนตารางเกมที่ยังไม่แยกภาค (รายชื่อจากสคีมาสด)" "$n" "0"

echo ""
echo "═══ 9) 66 — ใครเป็นเจ้าของผังตัวชี้วัด (คำถามของภาค 2) ═══"
out=$($PSQL -f $SQLDIR/66_STANDARDS_OWNERSHIP.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 66_STANDARDS_OWNERSHIP.sql รันผ่าน 0 error"; else echo "  ❌ 66 ล้ม"; echo "$out" | tail -8; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/66_STANDARDS_OWNERSHIP.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ รันซ้ำได้"; else echo "  ❌ รันซ้ำแล้วล้ม"; bad=$((bad+1)); fi

# ล้างผังของเกมนี้ให้เริ่มใหม่สะอาด ๆ
$Q -c "delete from game_framework_items where game_id='44444444-4444-4444-8444-44444444444a';" >/dev/null
P1='[{"code":"ส 5.1 ป.4/1","name":"ของเกม","subject":"SO","note":"หมายเหตุจากเกม","evidence":"หลักฐานจากเกม","criteria":"เกณฑ์จากเกม"}]'

# 1) เกมส่งครั้งแรก — ยังไม่มีใครแตะ ต้องเป็นของเกมล้วน
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P1'::jsonb); commit;" >/dev/null
n=$($Q -c "select g.source||'|'||g.note from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 5.1 ป.4/1';")
ok "เกมส่งครั้งแรก — แถวเป็นของเกม (game-sync)" "$n" "game-sync|หมายเหตุจากเกม"

# 2) ผู้ดูแลแก้ข้อความบนหน้า Admin (เว้น criteria ว่างไว้ตั้งใจ)
$Q -c "update game_framework_items set note='ผู้ดูแลแก้เอง', evidence='ผู้ดูแลแก้เอง', criteria=null, source='manual'
        where item_id=(select id from framework_items where code='ส 5.1 ป.4/1');" >/dev/null

# 3) ⭐ เกมส่งชุดเดิมมาอีกครั้ง — จุดชี้ขาด
res=$($Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P1'::jsonb); commit;")
n=$($Q -c "select note from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 5.1 ป.4/1';")
ok "⭐ หมายเหตุที่ผู้ดูแลแก้ไว้ ไม่ถูกเกมทับ" "$n" "ผู้ดูแลแก้เอง"
n=$($Q -c "select evidence from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 5.1 ป.4/1';")
ok "แหล่งหลักฐานที่ผู้ดูแลแก้ไว้ ไม่ถูกเกมทับ" "$n" "ผู้ดูแลแก้เอง"
n=$($Q -c "select criteria from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 5.1 ป.4/1';")
ok "ช่องที่ผู้ดูแลเว้นว่างไว้ เติมด้วยของเกมตามเดิม (ว่างไว้ไม่มีประโยชน์กับใคร)" "$n" "เกณฑ์จากเกม"
n=$($Q -c "select source from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 5.1 ป.4/1';")
ok "ธงเจ้าของยังเป็น manual (ไม่ถูกลดชั้นกลับเป็นของเกม)" "$n" "manual"
okc "บอกเกมว่ารับไว้แล้วแต่ใช้คำของผู้ดูแล" "$res" '"kept_manual_total": 1'
okc "บอกด้วยว่ากันช่องไหนไว้" "$res" "หมายเหตุ · แหล่งหลักฐาน"
okc "บอกด้วยว่าเป็นข้อความของใคร" "$res" "ผู้ดูแลเว็บกลาง"
# ⚠️ ห้ามบอกครูให้ไปทำสิ่งที่ยังทำไม่ได้ — หน้า Admin ยังไม่มีช่องแก้คำอธิบาย (ภาค 1 ทักในเอกสาร 67)
if echo "$res" | grep -q "หน้า Admin"; then
  echo "  ❌ reason ยังชี้ให้ครูไปหาช่องบนหน้า Admin ที่ยังไม่มี"; bad=$((bad+1))
else
  echo "  ✅ reason ไม่ชี้ให้ครูไปหาช่องบนหน้า Admin ที่ยังไม่มี"
fi
# ⭐ V.1.6.1 — ยามความยาว (ภาค 1 วัดจากจอจริง: ของเดิม 152 ตัวอักษร กินพื้นที่ 88% ของจอครู)
#    reason ขึ้นจอครูตรง ๆ ทุกแถว ครูมี 20 ตัวชี้วัดก็เห็น 20 บรรทัด — ยาวเกินคือกำแพงข้อความ
#    วัดเป็น "ตัวอักษร" (char_length) ไม่ใช่ไบต์ เพราะภาษาไทยตัวละ 3 ไบต์
#
#    📏 ที่มาของเลข 90 (V.1.6.3 — เดิมเป็นตัวเลขเผื่อ ๆ ไม่มีที่มา)
#    ภาค 1 วัดบนจอ 896×319 (แนวนอนเตี้ย = เคสหนักสุด) ที่ 7 รายการขึ้นไป:
#        42 ตัวอักษร → 45%  ·  71 → 45%  ·  152 → 63%   (42 กับ 71 ตัดบรรทัดเท่ากัน)
#    ⇒ 90 ตัวอักษร ≈ 45–50% ของจอ · ต่ำกว่าเส้นแดง 88% ที่ภาค 1 เคยเจอ
#    ⚠️ เลขนี้เป็นตัวแทนของ "ความสูงบนจอเกม" ซึ่งอยู่คนละฝั่ง — ถ้าเกมเปลี่ยนหน้าตากล่อง
#       เพดานนี้เก่าทันที · ข้อตกลง: ภาค 1 วัดใหม่แล้วบอกมา ฝั่งฐานห้ามขยับเองโดยไม่มีตัวเลขรองรับ
#    🚫 ห้ามพึ่งให้เกมตัดข้อความให้ — ทั้งสองภาคยืนยันว่าไม่ตัด `reason` โดยตั้งใจ
#       (ตัดกลางประโยค = ครูอ่านได้ครึ่งเดียวโดยที่ฐานไม่รู้) ⇒ ความสั้นเป็นหน้าที่ของฐานฝ่ายเดียว
#    วัดจากเคสหนักสุด (กันไว้ครบทั้ง 3 ช่อง) ไม่ใช่เคสที่เพิ่งรัน แล้ว rollback ทิ้ง ไม่แตะสถานะเทสต์ถัดไป
P3='[{"code":"ส 5.1 ป.4/1","name":"ของเกม","subject":"SO","note":"ก","evidence":"ข","criteria":"ค"}]'
n=$($Q -c "begin;
  update game_framework_items set note='ยาว', evidence='ยาว', criteria='ยาว', source='manual'
   where item_id=(select id from framework_items where code='ส 5.1 ป.4/1');
  select max(char_length(x->>'reason')) from jsonb_array_elements(
    (select rpc_publish_standards('kanchanaburi2050','V.1','$P3'::jsonb)->'kept_manual')) x;
  rollback;" | tr -d '[:space:]')
if echo "$n" | grep -qE '^[0-9]+$' && [ "$n" -le 90 ]; then
  echo "  ✅ ⭐ reason กันครบ 3 ช่องแล้วยังยาวไม่เกิน 90 ตัวอักษร (วัดได้ $n) — กันข้อความบวมกลับมาอีก"
else
  echo "  ❌ ⭐ reason ยาว [$n] ตัวอักษร เกินเพดาน 90 — ตัดท่อนที่ซ้ำกับที่เกมพิมพ์อยู่แล้วออก"; bad=$((bad+1))
fi
# ท่อนที่ตัดทิ้งต้องไม่กลับมา — เกมพิมพ์ประโยคนี้ท้ายก้อนให้อยู่แล้วครั้งเดียว ซ้ำทุกแถวคือของเกิน
if echo "$res" | grep -q "ถ้าต้องการเปลี่ยนให้แจ้ง"; then
  echo "  ❌ ท่อน \"ถ้าต้องการเปลี่ยนให้แจ้ง…\" กลับมาซ้ำทุกแถวอีกแล้ว"; bad=$((bad+1))
else
  echo "  ✅ ไม่มีท่อนที่เกมพิมพ์ซ้ำอยู่แล้วปนมาในทุกแถว"
fi
okc "⭐ ของที่ใช้คำผู้ดูแล **ไม่ใช่ของตก** — ยังนับใน accepted" "$res" '"accepted": 1'
okc "และต้องไม่ไปโผล่ในอาเรย์ของตก (เกมจะรายงานครูผิด)" "$res" '"skipped_total": 0'

# 4) ส่งข้อความเดิมซ้ำ (ไม่ได้ต่างกัน) ต้องไม่ขึ้น kept_manual รบกวนเปล่า ๆ
$Q -c "update game_framework_items set note='หมายเหตุจากเกม', evidence='หลักฐานจากเกม'
        where item_id=(select id from framework_items where code='ส 5.1 ป.4/1');" >/dev/null
res=$($Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P1'::jsonb); commit;")
okc "ข้อความตรงกันอยู่แล้ว — ไม่ต้องขึ้นข้อความกวนครู" "$res" '"kept_manual_total": 0'

# 5) แถว game-sync ล้วน เกมยังทับได้เต็มที่เหมือนเดิม (กติกาเดิมห้ามเปลี่ยน)
$Q -c "update game_framework_items set source='game-sync', note='ของเก่า'
        where item_id=(select id from framework_items where code='ส 5.1 ป.4/1');" >/dev/null
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P1'::jsonb); commit;" >/dev/null
n=$($Q -c "select note from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 5.1 ป.4/1';")
ok "แถวของเกม — เกมยังทับได้เต็มที่ (เกมเป็นเจ้าของ \"วัดอะไร\" เหมือนเดิม)" "$n" "หมายเหตุจากเกม"

# 6) แถวที่ผู้ดูแลเพิ่มเองล้วน ต้องไม่ถูกลบทิ้งตอนเกมส่งชุดที่ไม่มีรหัสนั้น (กติกาเดิม)
$Q -c "insert into framework_items (framework_id, code, depth, name_th)
       select id,'MANUAL-2',2,'ของผู้ดูแลล้วน' from assessment_frameworks where code='core-2551-rev2560'
       on conflict do nothing;
       insert into game_framework_items (game_id,item_id,source,note)
       select '44444444-4444-4444-8444-44444444444a', id,'manual','ของผู้ดูแลล้วน'
       from framework_items where code='MANUAL-2' on conflict do nothing;" >/dev/null
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P1'::jsonb); commit;" >/dev/null
n=$($Q -c "select count(*)::text||'|'||coalesce(max(g.note),'-') from game_framework_items g join framework_items i on i.id=g.item_id where i.code='MANUAL-2';")
ok "แถวที่ผู้ดูแลเพิ่มเองล้วน ไม่ถูกลบและไม่ถูกแตะ" "$n" "1|ของผู้ดูแลล้วน"

# 7) ของเดิมจากไฟล์ 61 ต้องยังทำงานครบ
res=$($Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','[
  {\"code\":\"ส 5.1 ป.4/1\",\"subject\":\"SO\"},
  {\"code\":\"\"},
  {\"code\":\"ส 5.1 ป.4/1\",\"subject\":\"SO\"},
  {\"code\":\"ZZZ\",\"framework\":\"cbe-core\"}]'::jsonb); rollback;")
okc "ไฟล์ 61 ยังทำงาน: รับเฉพาะรายการที่ใช้ได้" "$res" '"accepted": 1'
okc "ไฟล์ 61 ยังทำงาน: นับของตกครบ" "$res" '"skipped_total": 3'
okc "ไฟล์ 61 ยังทำงาน: เหตุผลไม่มีรหัส" "$res" "ไม่มีรหัสตัวชี้วัด"
okc "ไฟล์ 61 ยังทำงาน: เหตุผลรหัสซ้ำ" "$res" "รหัสซ้ำกับรายการก่อนหน้า"
okc "ไฟล์ 61 ยังทำงาน: เหตุผลไม่รู้จักรหัสสมรรถนะ" "$res" "ไม่รู้จักรหัสสมรรถนะ"
res=$($Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1',
  (select jsonb_agg(jsonb_build_object('code','X'||g,'subject','SO')) from generate_series(1,201) g)); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ไฟล์ 61 ยังทำงาน: เพดาน 200 รายการ" "$res" "ไม่เกิน 200"
n=$($Q -c "select has_function_privilege('anon','public.rpc_publish_standards(text,text,jsonb)','execute')::text;")
ok "สิทธิ์ anon ยังอยู่หลังแทนที่ฟังก์ชัน" "$n" "true"

echo ""
echo "═══ 10) ยามกันถอยไฟล์ 66 โดยไม่รู้ตัว (ภาค 1 ทักในเอกสาร 67) ═══"
# ถึงตรงนี้ฐานรันไฟล์ 66 ไปแล้ว — รันไฟล์ 61 ทับต้องถูกหยุด ไม่ใช่ถอยเงียบ ๆ
out=$($PSQL -f $SQLDIR/61_STANDARDS_SKIPPED.sql 2>&1)
if [ $? -ne 0 ]; then echo "  ✅ รันไฟล์ 61 ทับหลังรัน 66 = ถูกหยุด ไม่ถอยเงียบ ๆ"; else echo "  ❌ รันไฟล์ 61 ทับผ่านไปเฉย ๆ (ถอยไฟล์ 66 ทิ้งโดยไม่มีอะไรฟ้อง)"; bad=$((bad+1)); fi
okc "ข้อความบอกว่าฐานนี้รันไฟล์ 66 ไปแล้ว" "$out" "รันไฟล์ 66_STANDARDS_OWNERSHIP.sql ไปแล้ว"
okc "ข้อความบอกว่าไม่ต้องรัน 61 อีก เพราะ 66 มีของ 61 ครบ" "$out" "ไฟล์ 66 มีของไฟล์ 61 ครบอยู่แล้ว"
okc "ข้อความบอกวิธีถอยจริง ๆ ถ้าตั้งใจ (ห้ามปิดทางถอย)" "$out" "ให้ลบเฉพาะ"
okc "และบอกให้คงยามอีกสองตัวไว้ ไม่ใช่ลบทั้งบล็อก (ภาค 1 ทักในเอกสาร 71)" "$out" "ยามอีกสองตัวในบล็อกเดียวกันให้คงไว้"
# และของไฟล์ 66 ต้องยังอยู่ครบ ไม่ถูกแตะเลยแม้แต่นิดเดียว
n=$($Q -c "select case when pg_get_functiondef(p.oid) like '%kept_manual_total%' then 'ยังเป็น 66' else 'ถูกถอยแล้ว' end
           from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
           where ns.nspname='public' and p.proname='rpc_publish_standards';")
ok "ฟังก์ชันยังเป็นฉบับของไฟล์ 66 (ยามหยุดก่อนแตะอะไร)" "$n" "ยังเป็น 66"

# ฐานที่ยังไม่เคยรัน 66 ต้องรันไฟล์ 61 ได้ตามปกติ — ยามต้องไม่ขวางคนที่ทำถูกลำดับ
psql -h "$H" -p "$P" -U "$U" -q -c "drop database if exists gporder" -c "create database gporder" >/dev/null 2>&1
PSQL2="psql -h $H -p $P -U $U -d gporder -v ON_ERROR_STOP=1 -q"
$PSQL2 -f 00_fixture.sql >/dev/null 2>&1
out=$($PSQL2 -f $SQLDIR/61_STANDARDS_SKIPPED.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ ฐานที่ยังไม่รัน 66 — รันไฟล์ 61 ได้ตามปกติ (ยามไม่ขวางคนทำถูกลำดับ)"; else echo "  ❌ ยามขวางฐานที่ยังไม่เคยรัน 66"; echo "$out" | tail -3; bad=$((bad+1)); fi
out=$($PSQL2 -f $SQLDIR/61_STANDARDS_SKIPPED.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ ไฟล์ 61 ยังรันซ้ำตัวเองได้ (ยามไม่จับตัวเอง)"; else echo "  ❌ ไฟล์ 61 รันซ้ำตัวเองไม่ได้แล้ว"; bad=$((bad+1)); fi
out=$($PSQL2 -f $SQLDIR/66_STANDARDS_OWNERSHIP.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ ลำดับที่ถูก (61 → 66) ยังทำได้ตามปกติ"; else echo "  ❌ ลำดับ 61 → 66 พัง"; echo "$out" | tail -3; bad=$((bad+1)); fi
psql -h "$H" -p "$P" -U "$U" -q -c "drop database if exists gporder" >/dev/null 2>&1

echo ""
echo "═══ 11) 71 — แยก admin_edited ออกจาก source + หน้า Admin แก้ข้อความได้ ═══"
# ก่อนรัน 71: ทำสภาพแบบไฟล์ 66 ไว้ก่อน (ผู้ดูแลแก้ข้อความบนแถวที่ source='manual')
$Q -c "delete from game_framework_items where game_id='44444444-4444-4444-8444-44444444444a';" >/dev/null
P1='[{"code":"ส 5.1 ป.4/1","name":"ของเกม","subject":"SO","note":"หมายเหตุจากเกม","evidence":"หลักฐานจากเกม","criteria":"เกณฑ์จากเกม"}]'
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P1'::jsonb); commit;" >/dev/null
$Q -c "update game_framework_items set note='ผู้ดูแลแก้เอง', source='manual'
        where item_id=(select id from framework_items where code='ส 5.1 ป.4/1');" >/dev/null

out=$($PSQL -f $SQLDIR/71_STANDARDS_ADMIN_EDIT.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 71_STANDARDS_ADMIN_EDIT.sql รันผ่าน 0 error"; else echo "  ❌ 71 ล้ม"; echo "$out" | tail -8; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/71_STANDARDS_ADMIN_EDIT.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ รันซ้ำได้"; else echo "  ❌ รันซ้ำแล้วล้ม"; bad=$((bad+1)); fi

# ⭐ ย้ายข้อมูล: ของที่ไฟล์ 66 กันไว้อยู่แล้ว ต้องถูกกันต่อ ไม่ใช่หลุดกลับไปให้เกมทับ
n=$($Q -c "select admin_edited::text from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 5.1 ป.4/1';")
ok "⭐ ย้ายของที่ไฟล์ 66 กันไว้มาเป็น admin_edited = true ให้เอง" "$n" "true"
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P1'::jsonb); commit;" >/dev/null
n=$($Q -c "select note from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 5.1 ป.4/1';")
ok "ข้อความที่เคยถูกกันไว้ ยังไม่ถูกเกมทับหลังย้ายมาใช้ช่องใหม่" "$n" "ผู้ดูแลแก้เอง"

# ⭐ ของใหม่: แถวของเกมล้วน ๆ (source='game-sync') ที่ผู้ดูแลแก้ข้อความ — ไฟล์ 66 กันไม่ได้ ไฟล์ 71 กันได้
P2='[{"code":"ส 4.2 ป.4/2","name":"ของเกมสอง","subject":"SO","note":"หมายเหตุจากเกม","evidence":"หลักฐานจากเกม"}]'
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P1,$P2'::jsonb); commit;" >/dev/null 2>&1
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','[{\"code\":\"ส 4.2 ป.4/2\",\"subject\":\"SO\",\"note\":\"หมายเหตุจากเกม\"}]'::jsonb); commit;" >/dev/null
$Q -c "update game_framework_items set note='ผู้ดูแลเขียนทับ', admin_edited=true
        where item_id=(select id from framework_items where code='ส 4.2 ป.4/2');" >/dev/null
n=$($Q -c "select source from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 4.2 ป.4/2';")
ok "⭐ ผู้ดูแลแก้ข้อความแล้ว แต่ธงเจ้าของแถวยังเป็นของเกม (source ไม่ถูกยึด)" "$n" "game-sync"
res=$($Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','[{\"code\":\"ส 4.2 ป.4/2\",\"subject\":\"SO\",\"note\":\"หมายเหตุจากเกม\"}]'::jsonb); commit;")
n=$($Q -c "select note from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 4.2 ป.4/2';")
ok "⭐ ข้อความบนแถวของเกมก็กันได้แล้ว (ไฟล์ 66 ทำไม่ได้)" "$n" "ผู้ดูแลเขียนทับ"
okc "และบอกเกมด้วยว่าใช้คำของผู้ดูแล" "$res" '"kept_manual_total": 1'
okc "ยังนับเป็นรับไว้แล้ว ไม่ใช่ของตก" "$res" '"accepted": 1'
# ⭐ V.1.6.1 — ยามความยาวของไฟล์ 71 ด้วย (ไฟล์นี้คือตัวที่ใช้จริง ยามในหมวด 9 คุมแค่ไฟล์ 66)
#    สองไฟล์ต้องพูดเหมือนกัน ถ้าวันหนึ่งมีคนแก้ที่เดียว ยามคู่นี้จะจับได้
n=$($Q -c "begin;
  update game_framework_items set note='ยาว', evidence='ยาว', criteria='ยาว', admin_edited=true
   where item_id=(select id from framework_items where code='ส 4.2 ป.4/2');
  select max(char_length(x->>'reason')) from jsonb_array_elements(
    (select rpc_publish_standards('kanchanaburi2050','V.1',
      '[{\"code\":\"ส 4.2 ป.4/2\",\"subject\":\"SO\",\"note\":\"ก\",\"evidence\":\"ข\",\"criteria\":\"ค\"}]'::jsonb
     )->'kept_manual')) x;
  rollback;" | tr -d '[:space:]')
if echo "$n" | grep -qE '^[0-9]+$' && [ "$n" -le 90 ]; then
  echo "  ✅ ⭐ reason ของไฟล์ 71 กันครบ 3 ช่องแล้วยังยาวไม่เกิน 90 ตัวอักษร (วัดได้ $n)"
else
  echo "  ❌ ⭐ reason ของไฟล์ 71 ยาว [$n] ตัวอักษร เกินเพดาน 90"; bad=$((bad+1))
fi

# ⭐⭐ V.1.6.2 — สัญญา "เหตุเดียวกัน = ข้อความเดียวกันเป๊ะทุกไบต์"
#    ภาค 2 เจอบั๊กว่าเกมพิมพ์ประโยคเดิมซ้ำ 3 รอบ แล้วแก้ด้วยการ "ตัด reason ที่ซ้ำกันออก"
#    การตัดซ้ำจะทำงานได้ก็ต่อเมื่อฐาน**รับประกัน**ว่าเหตุเดียวกันคืนข้อความเท่ากันทุกไบต์
#    ถ้าวันหนึ่งมีคนเติมรหัสตัวชี้วัดลงใน reason (ดูมีเหตุผลดี) ตัวตัดซ้ำของภาค 2 จะเงียบ ๆ เลิกทำงาน
#    และไม่มีใครรู้จนกว่าครูจะเจอกำแพงข้อความอีกรอบ ⇒ ผูกสัญญานี้ไว้เป็นเทสต์
P4='[{"code":"ส 5.1 ป.4/9","subject":"SO","note":"ก","evidence":"ข","criteria":"ค"},
     {"code":"ส 5.1 ป.4/8","subject":"SO","note":"ก","evidence":"ข","criteria":"ค"},
     {"code":"ส 5.1 ป.4/7","subject":"SO","note":"ก","evidence":"ข","criteria":"ค"}]'
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P4'::jsonb); commit;" >/dev/null
# ผู้ดูแลแก้ทั้งสามรายการ "ด้วยเหตุผลเดียวกัน" — สภาพที่ภาค 2 บอกว่าเจอบ่อยที่สุดในโลกจริง
$Q -c "update game_framework_items set note='ของผู้ดูแล', evidence='ของผู้ดูแล', criteria='ของผู้ดูแล',
        admin_edited=true where item_id in (select id from framework_items
        where code in ('ส 5.1 ป.4/9','ส 5.1 ป.4/8','ส 5.1 ป.4/7'));" >/dev/null
res=$($Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P4'::jsonb); commit;")
n=$($Q -c "begin; $AS_ANON select count(distinct x->>'reason')||'/'||count(*) from jsonb_array_elements(
      (select rpc_publish_standards('kanchanaburi2050','V.1','$P4'::jsonb)->'kept_manual')) x; rollback;" | tr -d '[:space:]')
ok "⭐⭐ เหตุเดียวกัน 3 รายการ = ข้อความเดียวกันเป๊ะ (ตัวตัดซ้ำของภาค 2 จึงทำงานได้)" "$n" "1/3"
okc "แต่ยังคืนครบทุกรหัส เกมจึงยังรู้ว่าเป็นตัวชี้วัดตัวไหนบ้าง" "$res" '"kept_manual_total": 3'
# ด้านกลับ: เหตุต่างกันต้องได้ข้อความต่างกัน ไม่งั้นตัวตัดซ้ำจะกลืนข้อมูลที่ครูต้องรู้ทิ้ง
$Q -c "update game_framework_items set evidence=null, criteria=null
        where item_id=(select id from framework_items where code='ส 5.1 ป.4/7');" >/dev/null
n=$($Q -c "begin; $AS_ANON select count(distinct x->>'reason')||'/'||count(*) from jsonb_array_elements(
      (select rpc_publish_standards('kanchanaburi2050','V.1','$P4'::jsonb)->'kept_manual')) x; rollback;" | tr -d '[:space:]')
ok "⭐⭐ เหตุต่างกัน = ข้อความต่างกัน (ตัดซ้ำแล้วไม่กลืนของที่ครูต้องรู้ทิ้ง)" "$n" "2/3"

# เกมเลิกวัดตัวชี้วัดนั้น → แถวหายไปพร้อมหมายเหตุ (หมายเหตุพูดถึงตัวชี้วัดตัวนั้น)
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','[{\"code\":\"ส 5.1 ป.4/1\",\"subject\":\"SO\"}]'::jsonb); commit;" >/dev/null
n=$($Q -c "select count(*) from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 4.2 ป.4/2';")
ok "เกมเลิกวัดแล้ว แถวของเกมหายไปตามเดิม (ผู้ดูแลเติมหมายเหตุ ไม่ได้แปลว่าเกมยังวัดอยู่)" "$n" "0"

# ช่องว่างหมด = คืนให้เกม
$Q -c "update game_framework_items set note=null, evidence=null, criteria=null, admin_edited=false
        where item_id=(select id from framework_items where code='ส 5.1 ป.4/1');" >/dev/null
$Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','$P1'::jsonb); commit;" >/dev/null
n=$($Q -c "select note from game_framework_items g join framework_items i on i.id=g.item_id where i.code='ส 5.1 ป.4/1';")
ok "ผู้ดูแลลบข้อความจนว่าง = เกมเติมกลับมาได้ในการส่งครั้งถัดไป" "$n" "หมายเหตุจากเกม"

# สิทธิ์ให้หน้า Admin แก้ได้จริง
n=$($Q -c "select count(*) from pg_policies where schemaname='public' and tablename='game_framework_items' and policyname like 'gfi_admin_%';")
ok "มี policy ให้ผู้ดูแลเขียนครบ 3 ตัว" "$n" "3"
n=$($Q -c "select has_table_privilege('authenticated','public.game_framework_items','update')::text;")
ok "มี table grant ด้วย (policy อย่างเดียวได้ 403)" "$n" "true"

# ของไฟล์ 61/66 ต้องยังอยู่ครบ
res=$($Q -c "begin; $AS_ANON select rpc_publish_standards('kanchanaburi2050','V.1','[
  {\"code\":\"ส 5.1 ป.4/1\",\"subject\":\"SO\"},{\"code\":\"\"},{\"code\":\"ZZZ\",\"framework\":\"cbe-core\"}]'::jsonb); rollback;")
okc "ของไฟล์ 61 ยังอยู่: นับของตก" "$res" '"skipped_total": 2'
okc "ของไฟล์ 61 ยังอยู่: เหตุผลไม่มีรหัส" "$res" "ไม่มีรหัสตัวชี้วัด"
okc "ของไฟล์ 66 ยังอยู่: ช่อง kept_manual" "$res" '"kept_manual_total"'
n=$($Q -c "select has_function_privilege('anon','public.rpc_publish_standards(text,text,jsonb)','execute')::text;")
ok "สิทธิ์ anon ยังอยู่" "$n" "true"

# ยามกันถอย: รันไฟล์ 66 ทับหลังรัน 71 ต้องถูกหยุด
out=$($PSQL -f $SQLDIR/66_STANDARDS_OWNERSHIP.sql 2>&1)
if [ $? -ne 0 ]; then echo "  ✅ รันไฟล์ 66 ทับหลังรัน 71 = ถูกหยุด ไม่ถอยเงียบ ๆ"; else echo "  ❌ รันไฟล์ 66 ทับผ่านไปเฉย ๆ"; bad=$((bad+1)); fi
okc "ข้อความบอกว่าฐานนี้รันไฟล์ 71 ไปแล้ว" "$out" "รันไฟล์ 71_STANDARDS_ADMIN_EDIT.sql ไปแล้ว"
okc "และบอกวิธีถอยจริงแบบเจาะจง ไม่ใช่ให้ลบทั้งบล็อก" "$out" "ยามอีกสองตัวในบล็อกเดียวกันให้คงไว้"
n=$($Q -c "select case when pg_get_functiondef(p.oid) like '%admin_edited%' then 'ยังเป็น 71' else 'ถูกถอยแล้ว' end
           from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
           where ns.nspname='public' and p.proname='rpc_publish_standards';")
ok "ฟังก์ชันยังเป็นฉบับของไฟล์ 71 (ยามหยุดก่อนแตะอะไร)" "$n" "ยังเป็น 71"

echo ""
echo "═══ 12) 72 — หน้าสรุปผลสาธารณะ (ไม่ต้องล็อกอิน) ═══"
out=$($PSQL -f $SQLDIR/72_PUBLIC_DASHBOARD.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 72_PUBLIC_DASHBOARD.sql รันผ่าน 0 error"; else echo "  ❌ 72 ล้ม"; echo "$out" | tail -8; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/72_PUBLIC_DASHBOARD.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ รันซ้ำได้"; else echo "  ❌ รันซ้ำแล้วล้ม"; bad=$((bad+1)); fi

# ข้อมูลผลจริง: เด็ก 3 คนในห้อง ป.5/1 (ครู ข) + 1 คนในห้องผู้เล่นทั่วไป
SA=$($Q -c "select id from students where last_name='หนึ่ง' limit 1;")
SB=$($Q -c "select id from students where last_name='สอง'  limit 1;")
SC=$($Q -c "select id from students where last_name='สาม'  limit 1;")
GID='44444444-4444-4444-8444-444444444441'
$Q -c "delete from achievement_results; delete from competency_dim_results;
  insert into achievement_results (student_id, game_id, run_id, score, max_score, percent, unit_scores) values
   ('$SA','$GID','live',88,100,88,'{\"คะแนนเก็บ\":80,\"คะแนนสอบ\":25}'::jsonb),
   ('$SB','$GID','live',64,100,64,'{\"คะแนนเก็บ\":60,\"คะแนนสอบ\":18}'::jsonb),
   ('$SC','$GID','live',41,100,41,'{\"คะแนนเก็บ\":40,\"คะแนนสอบ\":9}'::jsonb);
  insert into competency_dim_results (student_id, game_id, run_id, comp_code, score, level, evidence) values
   ('$SA','$GID','live','HOT',82,6,'scored'),
   ('$SB','$GID','live','HOT',60,4,'scored'),
   ('$SC','$GID','live','HOT',44,3,'scored'),
   ('$SA','$GID','live','SN',70,5,'scored'),
   ('$SA','$GID','live','TW',95,6,'self_report');" >/dev/null

# ── สิทธิ์: anon เรียก RPC ได้ แต่แตะตารางจริงไม่ได้ ──
n=$($Q -c "begin; $AS_ANON select (rpc_pub_summary()->'ach'->>'n'); rollback;")
ok "⭐ anon เรียก rpc_pub_summary ได้ (ไม่ต้องล็อกอิน)" "$n" "3"
res=$($Q -c "begin; $AS_ANON select count(*) from v_student_achievement; rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "⭐ แต่ anon อ่าน view รายคนตรง ๆ ไม่ได้ (RLS ไม่ถูกคลาย)" "$res" "ERROR"
res=$($Q -c "begin; $AS_ANON select count(*) from v_pub_rooms; rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "⭐ view ภายในของไฟล์นี้ anon ก็อ่านตรง ๆ ไม่ได้" "$res" "ERROR"

# ── ห้ามมีอะไรที่ระบุตัวคนหลุดออกมา ──
res=$($Q -c "begin; $AS_ANON select rpc_pub_summary()::text || rpc_pub_breakdown('classroom')::text || rpc_pub_filters()::text; rollback;")
if echo "$res" | grep -qE "หนึ่ง|สอง|สาม|เด็ก|AAA111|BBB222|CCC333|ZZZ999|student_id"; then
  echo "  ❌ มีชื่อนักเรียน/โค้ดห้อง/รหัสนักเรียน หลุดออกมาในคำตอบสาธารณะ"; bad=$((bad+1))
else
  echo "  ✅ ⭐ ไม่มีชื่อนักเรียน · โค้ดห้อง · รหัสนักเรียน หลุดออกมาเลย"
fi
if echo "$res" | grep -q "ผู้เล่นทั่วไป"; then
  echo "  ❌ ห้องผู้เล่นทั่วไปโผล่ในหน้าสาธารณะ"; bad=$((bad+1))
else
  echo "  ✅ ห้องผู้เล่นทั่วไปไม่ถูกนับเข้าหน้าสาธารณะ (กติกา PDPA เด็ก)"
fi

# ── ตัวเลขต้องถูก ──
n=$($Q -c "begin; $AS_ANON select (rpc_pub_summary()->'ach'->>'avg_percent'); rollback;")
ok "ค่าเฉลี่ยผลสัมฤทธิ์คำนวณถูก ((88+64+41)/3 = 64.3)" "$n" "64.3"
n=$($Q -c "begin; $AS_ANON select jsonb_array_length(rpc_pub_summary()->'ach'->'dist'); rollback;")
ok "การกระจายผลสัมฤทธิ์แบ่งครบ 5 ช่วง" "$n" "5"
n=$($Q -c "begin; $AS_ANON select (rpc_pub_summary()->'ach'->'dist'->0->>'n'); rollback;")
ok "ช่วงดีเยี่ยม (80-100) นับได้ 1 คน" "$n" "1"
n=$($Q -c "begin; $AS_ANON select jsonb_array_length(rpc_pub_summary()->'comps'); rollback;")
ok "⭐ คืนสมรรถนะครบ 6 ด้านเสมอ ไม่ใช่เฉพาะด้านที่มีข้อมูล" "$n" "6"
n=$($Q -c "begin; $AS_ANON select (select c->>'avg_score' from jsonb_array_elements(rpc_pub_summary()->'comps') c where c->>'code'='HOT'); rollback;")
ok "ค่าเฉลี่ยด้านการคิดขั้นสูงถูก ((82+60+44)/3 = 62.0)" "$n" "62.0"
n=$($Q -c "begin; $AS_ANON select coalesce((select c->>'avg_score' from jsonb_array_elements(rpc_pub_summary()->'comps') c where c->>'code'='CM'),'ว่าง'); rollback;")
ok "ด้านที่ยังไม่มีเกมวัด คืนค่าว่าง ไม่ใช่ 0 (0 แปลว่าเด็กทำไม่ได้ ซึ่งไม่จริง)" "$n" "ว่าง"
n=$($Q -c "begin; $AS_ANON select (select c->>'n_students' from jsonb_array_elements(rpc_pub_summary()->'comps') c where c->>'code'='TW'); rollback;")
ok "⭐ แบบประเมินตนเองไม่ถูกนับรวมเป็นคะแนน (กติกาภาค 2)" "$n" "0"

# ── คะแนนเก็บ/สอบ อ่านจาก unit_scores ที่เกมส่งมา ──
n=$($Q -c "begin; $AS_ANON select jsonb_array_length(rpc_pub_summary()->'units'); rollback;")
ok "แยกคะแนนเก็บ/คะแนนสอบให้ตามที่เกมส่งมา (2 ช่อง)" "$n" "2"
n=$($Q -c "begin; $AS_ANON select (select u->>'avg' from jsonb_array_elements(rpc_pub_summary()->'units') u where u->>'name'='คะแนนเก็บ'); rollback;")
ok "ค่าเฉลี่ยคะแนนเก็บถูก ((80+60+40)/3 = 60.0)" "$n" "60.0"

# ── ตารางย่อย 4 แบบ ──
for g in school grade classroom game; do
  n=$($Q -c "begin; $AS_ANON select jsonb_array_length(rpc_pub_breakdown('$g')); rollback;")
  ok "แยกตาม $g ได้ (คืนอย่างน้อย 1 แถว)" "$n" "1"
done
n=$($Q -c "begin; $AS_ANON select (rpc_pub_breakdown('classroom')->0->>'label'); rollback;")
ok "แถวรายห้องบอกชื่อห้อง" "$n" "ป.5/1"
n=$($Q -c "begin; $AS_ANON select (rpc_pub_breakdown('classroom')->0->>'n_students'); rollback;")
ok "นับจำนวนนักเรียนในห้องถูก" "$n" "3"
# ── เพดานนักเรียนขั้นต่ำ 5 คน (ครูเคาะ 19 ส.ค. 2569) ──
#  ห้อง ป.5/1 ในฟิกซ์เจอร์มีเด็ก 3 คน = ต่ำกว่าเกณฑ์ ⇒ ต้องถูกปิดค่าเฉลี่ย
#  แต่ต้อง "คงแถวไว้" ไม่ใช่ซ่อนทั้งแถว — ไม่งั้นผลลัพธ์กลายเป็นอาเรย์ว่าง
#  แล้วข้อสอบความเป็นส่วนตัวที่ตรวจด้วยการ grep หาชื่อเด็ก จะผ่านแบบว่างเปล่า
n=$($Q -c "begin; $AS_ANON select (rpc_pub_breakdown('classroom')->0->>'suppressed'); rollback;")
ok "ห้อง 3 คน (ต่ำกว่าเกณฑ์ 5) → ติดธงปิดค่าเฉลี่ย" "$n" "true"
n=$($Q -c "begin; $AS_ANON select coalesce((rpc_pub_breakdown('classroom')->0->>'comp_avg'),'NULL'); rollback;")
ok "ห้องต่ำกว่าเกณฑ์ → ค่าเฉลี่ยสมรรถนะเป็น null (ไม่ใช่ 0 — 0 แปลว่าวัดแล้วได้ศูนย์)" "$n" "NULL"
n=$($Q -c "begin; $AS_ANON select coalesce((rpc_pub_breakdown('classroom')->0->>'avg_percent'),'NULL'); rollback;")
ok "ห้องต่ำกว่าเกณฑ์ → ค่าเฉลี่ยผลสัมฤทธิ์เป็น null ด้วย" "$n" "NULL"
n=$($Q -c "begin; $AS_ANON select (rpc_pub_breakdown('classroom')->0->>'comp_by_dim'); rollback;")
ok "ห้องต่ำกว่าเกณฑ์ → ไม่หลุดค่าเฉลี่ยรายด้านออกมาทางประตูหลัง" "$n" "{}"
n=$($Q -c "begin; $AS_ANON select (rpc_pub_breakdown('classroom')->0->>'label'); rollback;")
ok "⭐ แต่แถวยังอยู่ ครูยังเห็นว่าห้องนี้มีตัวตน (ไม่หายเงียบ ๆ)" "$n" "ป.5/1"
n=$($Q -c "begin; $AS_ANON select (rpc_pub_breakdown('classroom')->0->>'n_students'); rollback;")
ok "และยังบอกจำนวนคนได้ (จำนวนคนไม่ใช่คะแนน จึงไม่ชี้ตัวใคร)" "$n" "3"
n=$($Q -c "begin; $AS_ANON select (rpc_pub_breakdown('classroom')->0->>'min_students'); rollback;")
ok "บอกเกณฑ์ที่ใช้มาด้วย เพื่อให้หน้าเว็บอธิบายครูได้ถูก" "$n" "5"

#  ⭐ อีกทางหนึ่ง: ห้องที่คนถึงเกณฑ์ **ต้องคำนวณค่าเฉลี่ยได้ถูกต้องเหมือนเดิม**
#  ถ้าไม่มีข้อนี้ เพดานจะกลายเป็น "ปิดทุกอย่างทิ้ง" แล้วยังเขียวอยู่ดี (ข้อสอบไม่มีเขี้ยว)
#  สร้างห้อง 5 คนในธุรกรรมแล้ว rollback — ยอดรวมของฟิกซ์เจอร์เดิมไม่ขยับสักข้อ
_BIG="begin;
 insert into classrooms (id, teacher_id, school_id, name, grade, room_no, academic_year, join_key, listed, is_active)
   values ('55555555-5555-4555-8555-00000000000a','22222222-2222-4222-8222-222222222222',
           '33333333-3333-4333-8333-333333333331','ป.5/9','ป.5','9','2569','BIG555',true,true);
 insert into students (classroom_id, first_name, last_name, is_active)
   select '55555555-5555-4555-8555-00000000000a','เด็กใหญ่', n::text, true from generate_series(1,5) n;
 insert into achievement_results (student_id, game_id, run_id, score, max_score, percent, unit_scores)
   select s.id,'$GID','live', v.p, 100, v.p, '{}'::jsonb
     from (select id, row_number() over (order by last_name) rn from students
            where classroom_id='55555555-5555-4555-8555-00000000000a') s
     join (values (1,50),(2,60),(3,70),(4,80),(5,90)) v(rn,p) on v.rn = s.rn;
 insert into competency_dim_results (student_id, game_id, run_id, comp_code, score, level, evidence)
   select s.id,'$GID','live','HOT', v.p, 4, 'scored'
     from (select id, row_number() over (order by last_name) rn from students
            where classroom_id='55555555-5555-4555-8555-00000000000a') s
     join (values (1,60),(2,62),(3,64),(4,66),(5,68)) v(rn,p) on v.rn = s.rn;
 $AS_ANON"
n=$($Q -c "$_BIG select (x->>'suppressed') from jsonb_array_elements(rpc_pub_breakdown('classroom')) x where x->>'label'='ป.5/9'; rollback;")
ok "⭐ ห้อง 5 คน (ถึงเกณฑ์พอดี) → ไม่ถูกปิด" "$n" "false"
n=$($Q -c "$_BIG select (x->>'avg_percent') from jsonb_array_elements(rpc_pub_breakdown('classroom')) x where x->>'label'='ป.5/9'; rollback;")
ok "⭐ และค่าเฉลี่ยผลสัมฤทธิ์ยังคำนวณถูก ((50+60+70+80+90)/5 = 70.0)" "$n" "70.0"
n=$($Q -c "$_BIG select (x->>'comp_avg') from jsonb_array_elements(rpc_pub_breakdown('classroom')) x where x->>'label'='ป.5/9'; rollback;")
ok "⭐ ค่าเฉลี่ยสมรรถนะก็ยังคำนวณถูก ((60+62+64+66+68)/5 = 64.0)" "$n" "64.0"

#  กับดักที่ต้องกันไว้: ถ้าไปนับหัวจาก "ใบผลสัมฤทธิ์" อย่างเดียว ห้องที่มีแต่ใบสมรรถนะ
#  จะได้ 0 แล้วถูกปิดทิ้งทั้งที่อาจมีเด็กทั้งห้อง (กับดักเดียวกับที่ V.1.6.8 เพิ่งแก้ด้วย allkeys)
_COMPONLY="begin;
 insert into classrooms (id, teacher_id, school_id, name, grade, room_no, academic_year, join_key, listed, is_active)
   values ('55555555-5555-4555-8555-00000000000b','22222222-2222-4222-8222-222222222222',
           '33333333-3333-4333-8333-333333333331','ป.5/8','ป.5','8','2569','CMP555',true,true);
 insert into students (classroom_id, first_name, last_name, is_active)
   select '55555555-5555-4555-8555-00000000000b','เด็กสมรรถนะ', n::text, true from generate_series(1,6) n;
 insert into competency_dim_results (student_id, game_id, run_id, comp_code, score, level, evidence)
   select s.id,'$GID','live','HOT', 70, 5, 'scored' from students s
    where s.classroom_id='55555555-5555-4555-8555-00000000000b';
 $AS_ANON"
n=$($Q -c "$_COMPONLY select (x->>'suppressed') from jsonb_array_elements(rpc_pub_breakdown('classroom')) x where x->>'label'='ป.5/8'; rollback;")
ok "⭐ ห้องที่มีแต่ใบสมรรถนะ 6 คน → ต้องไม่ถูกปิด (นับหัวจากสองแหล่ง ไม่ใช่แหล่งเดียว)" "$n" "false"
n=$($Q -c "$_COMPONLY select (x->>'comp_avg') from jsonb_array_elements(rpc_pub_breakdown('classroom')) x where x->>'label'='ป.5/8'; rollback;")
ok "⭐ และยังคืนค่าเฉลี่ยสมรรถนะของห้องนั้นได้" "$n" "70.0"

# ── ตัวกรองต้องคืนเฉพาะตัวเลือกที่มีผลจริง ──
n=$($Q -c "begin; $AS_ANON select jsonb_array_length(rpc_pub_filters()->'schools'); rollback;")
ok "ตัวกรองคืนเฉพาะโรงเรียนที่มีผลจริง (1 แห่ง ไม่ใช่ 2)" "$n" "1"
n=$($Q -c "begin; $AS_ANON select (rpc_pub_filters()->'games'->0->>'name'); rollback;")
ok "ตัวกรองเกมคืนชื่อเกม" "$n" "กาญจนบุรี 2050"

# ── กรองแล้วต้องกรองจริง ──
n=$($Q -c "begin; $AS_ANON select (rpc_pub_summary(null,'ป.4')->'ach'->>'n'); rollback;")
ok "กรองชั้นที่ไม่มีผล = ได้ 0 ไม่ใช่ทั้งหมด" "$n" "0"
n=$($Q -c "begin; $AS_ANON select (rpc_pub_summary(null,'ป.5')->'ach'->>'n'); rollback;")
ok "กรองชั้นที่มีผล = ได้ครบ" "$n" "3"
n=$($Q -c "begin; $AS_ANON select (rpc_pub_summary(null,'ป.5')->'ach'->>'avg_all'); rollback;")
ok "⭐ ค่าเฉลี่ยรวมทุกโรงเรียนยังคืนมาเป็นเส้นเทียบ แม้กรองอยู่" "$n" "64.3"

# ── [V.1.6.31 · ข้อ C — ใบ HUB 25/26 ส.ค.] คีย์ชื่อซ้ำสองเกมห้ามยุบเฉลี่ยข้ามเกม ──
#  โรคจริงบน production: `_boss` ภาค 1 (19.1) กับภาค 2 (13) ถูกยุบเป็นแท่งเดียว
#  ตอนตัวกรองเป็น "ทุกเกม" ซึ่งเป็นค่าเริ่มต้นของหน้า — เลขผิดที่ดูเหมือนถูก
#  จำลองในธุรกรรมแล้ว rollback: เพิ่มเกมที่สอง + คีย์ชนกัน แล้วดูว่า units แยก 2 แถวจริง
#  _CLASH_DATA = ก้อนข้อมูลจำลอง (สิทธิ์เจ้าของฐาน) · ปิดท้ายด้วย $AS_ANON เฉพาะข้อที่ยิง RPC
#  — negative control ต้องอ่านตารางตรง จึงห้ามสลับเป็น anon (RLS ปิดตารางกับ anon โดยถูกต้อง)
_CLASH_DATA="begin;
 insert into games (id, code, name) values
   ('44444444-4444-4444-8444-44444444444c','kan-p2-test','เกมภาคสองจำลอง');
 insert into achievement_results (student_id, game_id, run_id, score, max_score, percent, unit_scores) values
   ('$SA','44444444-4444-4444-8444-44444444444c','live',65,100,65,'{\"_boss\":13}'::jsonb);
 update achievement_results set unit_scores = unit_scores || '{\"_boss\":19.1}'::jsonb
  where game_id='$GID' and student_id='$SA';"
#  เทสต์ของเทสต์ (negative control ตามข้อกำชับ HUB "เทสต์ต้องแดงได้"): ข้อมูลชุดนี้ต้อง "ชนจริง"
#  — จัดกลุ่มท่าเก่า (group by key เฉย ๆ) _boss ต้องยุบเหลือแถวเดียว
#  ถ้าข้อนี้ไม่ออก 1 แปลว่าข้อมูลจำลองไม่ชน = ข้อถัดไปจะเขียวหลอกทันที
n=$($Q -c "$_CLASH_DATA select count(*) from (
   select u.key from achievement_results ar
   cross join lateral jsonb_each_text(case when jsonb_typeof(ar.unit_scores)='object'
        then ar.unit_scores else '{}'::jsonb end) u
   where u.key='_boss' group by u.key) q; rollback;")
ok "⭐ negative control: จัดกลุ่มท่าเก่า _boss ยุบเหลือแถวเดียว (ข้อมูลจำลองชนจริง)" "$n" "1"
n=$($Q -c "$_CLASH_DATA $AS_ANON select count(*) from jsonb_array_elements(rpc_pub_summary()->'units') u
   where u->>'name'='_boss'; rollback;")
ok "⭐⭐ ข้อ C: _boss ของสองเกมแยกเป็น 2 แถว (คนละเกม) ไม่ยุบเฉลี่ยข้ามเกม" "$n" "2"
n=$($Q -c "$_CLASH_DATA $AS_ANON select (select u->>'avg' from jsonb_array_elements(rpc_pub_summary()->'units') u
   where u->>'name'='_boss' and u->>'game_code'='kan-p2-test'); rollback;")
ok "⭐ และค่าเฉลี่ยของแต่ละเกมเป็นของเกมนั้นเอง (เกมจำลอง = 13.0)" "$n" "13.0"
#  หน้าเว็บพึ่งคีย์ 'game' (ชื่อเกม) วาดป้าย — ถ้าใครทำหลุด หน้าเว็บ fallback เงียบ ไม่มีใครเห็น
#  (ผู้ตรวจหักล้างจับได้ว่าสามข้อบนตรวจแค่ game_code/avg — คีย์ 'game' ไม่มีใครล็อก)
n=$($Q -c "begin; $AS_ANON select bool_and(u ?& array['game','game_code','name','n','avg'])
   from jsonb_array_elements(rpc_pub_summary()->'units') u; rollback;")
ok "⭐ ทุกแถว units มีคีย์ครบ {game, game_code, name, n, avg}" "$n" "t"

echo ""
echo "═══ 13) 52+83 — สถิติการเข้าถึงเกม + ป้ายแหล่งที่มา ═══"

out=$($PSQL -f $SQLDIR/52_VISIT_STATS.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 52_VISIT_STATS.sql รันผ่าน"; else echo "  ❌ 52 ล้ม"; echo "$out" | tail -3; bad=$((bad+1)); fi
out=$($PSQL -f $SQLDIR/83_VISIT_SOURCE.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ 83_VISIT_SOURCE.sql รันผ่าน"; else echo "  ❌ 83 ล้ม"; echo "$out" | tail -3; bad=$((bad+1)); fi

# ── รันซ้ำได้จริง ──
# ⭐ ท่อนย้ายโครงสร้างตรวจ "กุญแจหลักมี source แล้วหรือยัง" ไม่ใช่ "คอลัมน์มีแล้วหรือยัง"
#    ถ้าตรวจด้วยคอลัมน์ รอบสองจะข้ามทั้งบล็อก ⇒ กุญแจหลักไม่ถูกขยาย
#    แล้ว on conflict จะพังตอนมีคนเข้าเว็บจริง ไม่ใช่ตอนรันไฟล์ — หาสาเหตุยากที่สุด
out=$($PSQL -f $SQLDIR/83_VISIT_SOURCE.sql 2>&1)
if [ $? -eq 0 ]; then echo "  ✅ ⭐ รัน 83 ซ้ำได้ ไม่พัง (ท่อนย้ายโครงสร้างข้ามเองรอบสอง)"; else echo "  ❌ รันซ้ำแล้วพัง"; echo "$out" | tail -3; bad=$((bad+1)); fi

n=$($Q -c "select count(*) from information_schema.columns where table_schema='public' and table_name='visit_daily' and column_name='source';")
ok "visit_daily มีคอลัมน์ source" "$n" "1"
n=$($Q -c "select count(*) from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey) where i.indrelid='public.visit_daily'::regclass and i.indisprimary and a.attname='source';")
ok "⭐ source อยู่ในกุญแจหลักจริง (ไม่งั้น on conflict พังตอนใช้งาน)" "$n" "1"

n=$($Q -c "select count(*) from pg_proc where proname='rpc_track_visit';")
ok "⭐ เหลือ rpc_track_visit ตัวเดียว (ชื่อซ้ำ = PostgREST เลือกไม่ถูก)" "$n" "1"
n=$($Q -c "select count(*) from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where p.proname='rpc_track_visit' and pronargdefaults>=5;")
ok "⭐ พารามิเตอร์ใหม่มีค่าตั้งต้นครบ (เว็บรุ่นเก่าที่ยังไม่อัปต้องยิงติดอยู่)" "$n" "1"

# ── พฤติกรรมจริง ──
$Q -c "delete from public.visit_daily;" >/dev/null 2>&1
$Q -c "select public.rpc_track_visit('dashboard', null, true, 'pc');" >/dev/null 2>&1
n=$($Q -c "select count(*) from public.visit_daily where page='dashboard';")
ok "⭐ หน้า 'ผลการเรียนรู้' ถูกนับแล้ว (บั๊กเดิม: ไม่อยู่ใน whitelist จึงถูกทิ้งเงียบมาตลอด)" "$n" "1"

$Q -c "select public.rpc_track_visit('gameopen','kanchanaburi2050',true,'mobile','qr');" >/dev/null 2>&1
$Q -c "select public.rpc_track_visit('gameopen','kanchanaburi2050',false,'mobile','qr');" >/dev/null 2>&1
n=$($Q -c "select views::text || '/' || visitors::text from public.visit_daily where page='gameopen' and source='qr';")
ok "เข้าจาก QR สองครั้ง = 2 ครั้ง / 1 เครื่อง" "$n" "2/1"

$Q -c "select public.rpc_track_visit('gameopen','kanchanaburi2050',true,'pc','ค่ามั่วที่ไม่ได้อนุญาต');" >/dev/null 2>&1
n=$($Q -c "select count(*) from public.visit_daily where source='unknown' and page='gameopen';")
ok "แหล่งที่มาที่ไม่ได้อนุญาต ถูกบังคับเป็น unknown ไม่ใช่เก็บตามที่ส่งมา" "$n" "1"

$Q -c "select public.rpc_track_visit('หน้าที่ไม่มีจริง', null, true, 'pc', 'hub');" >/dev/null 2>&1
n=$($Q -c "select count(*) from public.visit_daily where page='หน้าที่ไม่มีจริง';")
ok "หน้าที่ไม่อยู่ในรายการ ไม่ถูกบันทึก (กันคนยิงสร้างแถวมั่ว)" "$n" "0"

# ── แยกภาค: สองภาคใช้รหัสส่งคะแนนเดียวกันเป๊ะ ──
# ⭐ ถ้าไม่แยก ตัวเลขของสองภาคจะกองรวมกัน แล้วแยกกลับไม่ได้อีกเลยเพราะข้อมูลปนไปแล้ว
$Q -c "alter table public.games add column if not exists score_code text;" >/dev/null 2>&1
$Q -c "insert into public.games (id, code, name, status) values ('dddddddd-0000-4000-8000-000000000002','kanchanaburi2050-p2','ภาค 2','active') on conflict (id) do nothing;" >/dev/null 2>&1
$Q -c "update public.games set score_code='kanchanaburi2050' where code='kanchanaburi2050-p2';" >/dev/null 2>&1
$Q -c "delete from public.visit_daily;" >/dev/null 2>&1
$Q -c "select public.rpc_track_visit('gameopen','kanchanaburi2050',true,'pc','hub','V.8.68-p2-2569.140');" >/dev/null 2>&1
$Q -c "select public.rpc_track_visit('gameopen','kanchanaburi2050',true,'pc','hub','V.7.99.45-IX2050-2569.79');" >/dev/null 2>&1
n=$($Q -c "select count(distinct game_code) from public.visit_daily where page='gameopen';")
ok "⭐ สองภาคที่ส่งรหัสเดียวกัน ถูกแยกเป็นสองรหัสด้วย gp_resolve_game" "$n" "2"
n=$($Q -c "select count(*) from public.visit_daily where page='gameopen' and game_code='kanchanaburi2050-p2';")
ok "ภาค 2 เข้าถูกช่องของตัวเอง" "$n" "1"

# ── ไม่ทับความหมายเดิมของ page='game' ──
$Q -c "select public.rpc_track_visit('game','kanchanaburi2050',true,'pc');" >/dev/null 2>&1
n=$($Q -c "select (click_all::text || '/' || open_all::text) from public.v_game_activity where game_code='kanchanaburi2050';")
ok "⭐ 'กดจากเว็บกลาง' กับ 'เกมเปิดจริง' แยกช่องกัน ไม่นับซ้ำเป็นสองเท่า" "$n" "1/1"
n=$($Q -c "select (open_hub::text) from public.v_game_activity where game_code='kanchanaburi2050-p2';")
ok "วิวแยกยอดตามแหล่งที่มาได้จริง" "$n" "1"
n=$($Q -c "select count(*) from information_schema.columns where table_schema='public' and table_name='v_visit_daily' and column_name='source';")
ok "วิวรายวันเปิดช่อง source ให้หน้าผู้ดูแลใช้" "$n" "1"

echo ""
# [V.1.6.7] บรรทัดสุดท้ายต้องเป็น X/Y เสมอ (STD-006 ข้อ 1)
# ยามพื้น: ถ้าจำนวนข้อลดฮวบ แปลว่ามีหมวดหนึ่ง "ไม่ได้รัน" (เช่นไฟล์ SQL หาย แล้วกิ่งนั้นถูกข้าม)
# ซึ่งจะไม่มีข้อตกให้เห็นเลย — เป็นรูปแบบ "ตายเงียบ" ที่ STD-006 ข้อ 1 ตั้งมาเพื่อกัน
# ฐาน ณ V.1.6.7 = 184 ข้อ (ผ่าน ok/okc) · อีกราว 26 ข้อเป็น echo ตรงในหมวด 0 ไม่ถูกนับ
FLOOR=235   # [V.1.6.31] +4 ข้อยามข้อ C (คีย์ชนข้ามเกม + negative control + คีย์ครบ) · ของจริง 236 เผื่อ 1 แบบเดิม
            # [V.1.6.27] +19 ข้อจากหมวด 8b (F4 ท่อจริง 9 ตัว + ยาม + สิทธิ์)
            # (ผู้ตรวจหักล้าง 25 ส.ค. จับได้ว่าค้าง 212 ทั้งที่ของจริง 221 — หมวดหายทั้งหมวดยามไม่ฟ้อง)
if [ "$_nchk" -lt "$FLOOR" ]; then
  echo "❌ นับหัวได้แค่ $_nchk ข้อ (ฐานที่ควรได้ ≥ $FLOOR) — สงสัยมีหมวดที่ไม่ได้รัน"
  echo "   อ่านผลข้างบนว่าหมวดไหนหายไป · ถ้าตั้งใจตัดข้อออกจริง ให้ลด FLOOR พร้อมบันทึกเหตุผล"
  bad=$((bad+1))
fi
if [ "$bad" -eq 0 ]; then echo "✅ ผ่านครบ $_nchk ข้อ"; else echo "❌ ไม่ผ่าน $bad ข้อ (จาก $_nchk)"; fi
echo "สรุปชุด SQL: ผ่าน $((_nchk-bad))/$_nchk ข้อ (นับข้อที่ผ่าน ok/okc · หมวด 0 อีกราว 26 ข้อรายงานแยกด้านบน)"
# exit code ห้ามเป็นตัวนับดิบ (เกิน 255 วนกลับเป็น 0 · และชนรหัส 77 ที่แปลว่า "ข้าม")
if [ "$bad" -gt 0 ]; then exit 1; else exit 0; fi
