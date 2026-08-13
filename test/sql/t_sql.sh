#!/usr/bin/env bash
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
PGBIN=/usr/lib/postgresql/16/bin
if ! command -v psql >/dev/null || [ ! -x "$PGBIN/pg_ctl" ]; then
  echo "⏭  ข้ามชุดทดสอบ SQL — เครื่องนี้ไม่มี PostgreSQL 16 ติดตั้งไว้"
  echo "   (ติดตั้งแล้วรันใหม่จะได้ตรวจไฟล์ 59/60/61 จริงก่อนส่งให้ครูรันบนฐานจริง)"
  exit 0
fi
if ! psql -h /tmp -p 5433 -U postgres -c 'select 1' >/dev/null 2>&1; then
  export PGDATA=/tmp/pgdata_gp
  rm -rf $PGDATA; mkdir -p $PGDATA; chown -R postgres:postgres $PGDATA 2>/dev/null || true
  su postgres -c "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust -E UTF8 --locale=C" >/dev/null 2>&1
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -l /tmp/pg_gp.log -o '-p 5433 -k /tmp' start" >/dev/null 2>&1
  sleep 2
fi
PSQL="psql -h /tmp -p 5433 -U postgres -d gptest -v ON_ERROR_STOP=1 -q"
Q="psql -h /tmp -p 5433 -U postgres -d gptest -t -A -q"
bad=0
ok() { if [ "$2" = "$3" ]; then echo "  ✅ $1"; else echo "  ❌ $1"; echo "       ได้: [$2]  ควรได้: [$3]"; bad=$((bad+1)); fi; }
okc() { if echo "$2" | grep -q "$3"; then echo "  ✅ $1"; else echo "  ❌ $1"; echo "       ได้: [$2]  ควรมีคำว่า: [$3]"; bad=$((bad+1)); fi; }

psql -h /tmp -p 5433 -U postgres -q -c "drop database if exists gptest" -c "create database gptest"

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

# ── ส่งชุดที่ถูกทุกอย่าง — ต้องไม่มีอะไรตก และค่าที่คืนต้องเหมือนของเดิมเป๊ะ ──
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S1',
  '{\"score\":78,\"max_score\":100,\"grade_label\":\"ดีมาก\"}'::jsonb,
  '[{\"code\":\"HT\",\"score\":72,\"level\":5},{\"code\":\"TW\",\"level\":4,\"evidence\":\"observed\"}]'::jsonb); commit;")
okc "ส่งชุดที่ถูกต้อง = รับครบ ไม่มีอะไรตก" "$res" '"skipped_total": 0'
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
$Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S1',
  '{\"score\":90,\"max_score\":100}'::jsonb, null); commit;" >/dev/null
n=$($Q -c "select count(*) from achievement_results where student_id='$S1';")
ok "ส่งซ้ำทับของเดิม ไม่เพิ่มแถว" "$n" "1"
n=$($Q -c "select score::int from achievement_results where student_id='$S1';")
ok "ส่งซ้ำแล้วค่าอัปเดตจริง" "$n" "90"

# ── ⭐ ข้อสำคัญที่สุด: รายการเดียวผิด ต้องไม่ลากใบที่เหลือตกไปด้วย ──
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
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
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":55}'::jsonb, '[{\"score\":10},{\"code\":\"  \"}]'::jsonb); rollback;")
okc "เหตุผล: ไม่มีรหัสด้านสมรรถนะ" "$res" "ไม่มีรหัสด้านสมรรถนะ"
okc "ไม่มีรหัส 2 รายการ นับครบทั้งสอง" "$res" '"skipped_total": 2'

res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  null, '[{\"code\":\"HT\",\"score\":70},{\"code\":\"HOT\",\"score\":10}]'::jsonb); rollback;")
okc "เหตุผล: รหัสซ้ำในคำขอเดียวกัน (หลังแปลง HT→HOT แล้วชนกัน)" "$res" "ซ้ำกับรายการก่อนหน้า"
okc "รหัสซ้ำ — เก็บของที่ส่งมาก่อน" "$res" '"competencies": 1'

res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb, '[{\"code\":\"TW\",\"level\":\"สูง\"}]'::jsonb); rollback;")
okc "เหตุผล: ระดับต้องเป็นจำนวนเต็ม (ของเดิมพังทั้งใบด้วย error อังกฤษ)" "$res" "ต้องเป็นจำนวนเต็ม"
okc "ระดับผิด — ใบผลสัมฤทธิ์ยังรอด" "$res" '"stored": 1'

res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":\"ดีมาก\"}'::jsonb, '[{\"code\":\"CM\",\"level\":4}]'::jsonb); rollback;")
okc "เหตุผล: คะแนนในใบผลสัมฤทธิ์ไม่ใช่ตัวเลข" "$res" "ต้องเป็นตัวเลข"
okc "คะแนนผิด — ใบสมรรถนะยังรอด" "$res" '"achievement": false'
okc "รายการที่ตกบอกว่าเป็นใบผลสัมฤทธิ์" "$res" '"part": "achievement"'

res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb, '[{\"code\":\"CZ\",\"level\":4,\"evidence\":\"ครูดูเอา\"}]'::jsonb); rollback;")
okc "เหตุผล: evidence ไม่ถูกต้อง — บอกเป็นไทย ไม่ใช่ check constraint อังกฤษ" "$res" "ไม่ถูกต้อง"
okc "evidence ผิด ไม่โผล่ข้อความดิบของ PostgreSQL ใส่ครู" "$res" "scored (คิดจากคะแนน)"

res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb, '\"ไม่ใช่อาเรย์\"'::jsonb); rollback;")
okc "รูปแบบใบสมรรถนะผิด — บอกเป็นไทย ไม่ทำให้ใบที่ 1 ตก" "$res" "ต้องเป็นอาเรย์"

# ── อาเรย์ที่ตกถูกตัดที่ 25 แต่ยอดรวมต้องตรง ──
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb,
  (select jsonb_agg(jsonb_build_object('code','ZZ'||g)) from generate_series(1,30) g)); rollback;")
okc "ตกเกิน 25 รายการ — ยอดรวมยังตรง" "$res" '"skipped_total": 30'
n=$($Q -c "begin; $AS_ANON select jsonb_array_length(rpc_submit_report('kanchanaburi2050','$GV','$S2',
  '{\"score\":10}'::jsonb,
  (select jsonb_agg(jsonb_build_object('code','ZZ'||g)) from generate_series(1,30) g))->'skipped'); rollback;")
ok "อาเรย์ที่ตกถูกตัดไว้ที่ 25 รายการ (กันคำตอบบวม)" "$n" "25"

# ── เก็บไม่ได้เลย = ต้องโยน error ไม่ใช่ตอบ 200 พร้อม ok:false ──
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  null, '[{\"code\":\"XX\"}]'::jsonb); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "เก็บไม่ได้เลย = โยน error (ห้ามตอบ ok:false — ภาค 2 ดักด้วย .catch อย่างเดียว)" "$res" "ERROR"
okc "ข้อความ error บอกเหตุผลแรกเป็นภาษาไทย" "$res" "ไม่รู้จักรหัสสมรรถนะ"
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S2',
  null, '[{\"code\":\"XX\"}]'::jsonb); rollback;" 2>&1)
okc "ยืนยันว่าไม่มีทางคืน ok:false" "$res" "ERROR"

# ── ด่านเดิมของไฟล์ 43 ต้องไม่หายไปสักข้อ ──
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV',null,'{\"score\":1}'::jsonb,null); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: ไม่ระบุนักเรียน" "$res" "ต้องระบุนักเรียน"
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S1','{\"score\":1}'::jsonb,null,'LEGACY-SHEETS'); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: run_id LEGACY-SHEETS สงวนไว้" "$res" "LEGACY-SHEETS"
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S1',null,'[]'::jsonb); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: ต้องส่งอย่างน้อยหนึ่งใบ" "$res" "อย่างน้อยหนึ่งใบ"
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('ไม่มีเกมนี้','$GV','$S1','{\"score\":1}'::jsonb,null); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: ไม่พบเกม" "$res" "ไม่พบเกม"
res=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','99999999-9999-4999-8999-999999999999','{\"score\":1}'::jsonb,null); rollback;" 2>&1 | grep -m1 -E 'ERROR|denied' || echo NO_ERROR)
okc "ด่านเดิม: ไม่พบนักเรียน" "$res" "ไม่พบนักเรียนรหัสนี้"

# ── ครูตัดสินระดับทับ ต้องยังทำงาน (กติกาเดิมของไฟล์ 43) ──
$Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$S3',null,
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
    r=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$sid',null,'[{\"code\":\"XX\"}]'::jsonb); commit;" 2>&1)
  else
    r=$($Q -c "begin; $AS_ANON select rpc_submit_report('kanchanaburi2050','$GV','$sid','{\"score\":$sc,\"max_score\":100}'::jsonb,null); commit;" 2>&1)
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
echo ""
if [ "$bad" -eq 0 ]; then echo "✅ ผ่านครบทุกข้อ"; else echo "❌ ไม่ผ่าน $bad ข้อ"; fi
exit "$bad"
