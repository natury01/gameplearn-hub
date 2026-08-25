#!/usr/bin/env bash
# ชุดทดสอบเว็บกลาง GamePlearn Hub — รันทุกชุดในคำสั่งเดียว
#   bash run-all.sh
#
# V.1.6.6 — พกพาได้แล้ว ไม่ผูก path เครื่องใด (บันทึก Code 19 ส.ค. ข้อ 2):
#   · โฟลเดอร์เว็บ: หาเองจากตำแหน่งชุดทดสอบ (test/ อยู่ใน GAMEPLEARN_HUB/) · ชี้เองได้ด้วย HUB_ROOT
#   · เบราว์เซอร์: ใช้ของ playwright — เครื่องใหม่ติดตั้งครั้งเดียว:
#         npm i playwright && npx playwright install chromium     (ในโฟลเดอร์ test/)
#     หรือชี้ chromium ที่มีอยู่แล้วด้วย GP_CHROMIUM=<path>
#   · ชุด SQL: ต่อ Postgres ที่ติดตั้งไว้ด้วย GP_PGHOST/GP_PGPORT/GP_PGUSER/GP_PGPASSWORD
#     (ดูเอกสาร 80 ในโฟลเดอร์โปรเจกต์) · ไม่ตั้ง = ลองตั้งเซิร์ฟเวอร์ชั่วคราวเอง (เครื่องแชต)
# ทุกชุดเสิร์ฟไฟล์จริงจากโฟลเดอร์เว็บ และดัก Supabase ด้วยข้อมูลจำลอง — ไม่แตะฐานจริง
set -u
cd "$(dirname "$0")"

# ยามตาม STD-006: ของที่ขาดต้องบอกดัง ๆ พร้อมวิธีติดตั้ง — ไม่ตายเงียบ
if ! command -v node >/dev/null 2>&1; then
  echo "❌ ไม่มี node บนเครื่องนี้ — ติดตั้ง Node.js ก่อน (nodejs.org) แล้วรันใหม่"; exit 1
fi
if ! node -e "require.resolve('playwright')" >/dev/null 2>&1; then
  echo "❌ ยังไม่ได้ติดตั้ง playwright ในโฟลเดอร์นี้ — รันสองคำสั่งนี้ใน test/ ก่อน:"
  echo "     npm i playwright"
  echo "     npx playwright install chromium"
  exit 1
fi
# [V.1.6.7] นับหัวก่อนเชื่อผล (STD-006 ข้อ 1): ชุดที่ "มีจริงในโฟลเดอร์" ต้องถูกเรียกครบ
# ไฟล์ที่ไม่ได้อยู่ในรายการ = หลุดจากการนับ ต้องร้อง ไม่ใช่เงียบ
SUITES="t_shots.mjs t_teacher.mjs t_round2.mjs t_names.mjs t_admin.mjs t_dash.mjs t_regress.mjs t_tour.mjs t_assets.mjs t_err.mjs t_lvguards.mjs"
for f in t_*.mjs; do
  case " $SUITES " in *" $f "*) ;; *)
    echo "⚠️  $f มีอยู่ในโฟลเดอร์แต่ไม่อยู่ในรายการที่รัน — เพิ่มเข้า SUITES หรือขึ้นทะเบียนเหตุผล (STD-006 ข้อ 1/5)";; esac
done
bad=0; total=0; skipped=0
for t in $SUITES; do
  echo ""
  echo "████ $t ████"
  total=$((total+1))
  node "$t"; rc=$?
  # [V.1.6.27] รหัส 77 = ข้าม (STD-006) ใช้กับชุด node ด้วย — t_lvguards ข้ามเมื่อหาซิปภาค 1 ไม่เจอ
  if [ "$rc" -eq 77 ]; then skipped=$((skipped+1)); elif [ "$rc" -ne 0 ]; then bad=$((bad+1)); fi
done
echo ""
echo "████ sql/t_sql.sh (ไฟล์ SQL 59/60 บน Postgres จริง) ████"
total=$((total+1))
bash sql/t_sql.sh; rc=$?
# [V.1.6.7] รหัส 77 = ข้าม (ไม่มี Postgres) — ต้องไม่ถูกนับเป็นผ่าน
if [ "$rc" -eq 77 ]; then skipped=$((skipped+1)); elif [ "$rc" -ne 0 ]; then bad=$((bad+1)); fi

echo ""
# [V.1.6.7] บรรทัดสรุปตาม STD-006 ข้อ 1 — "X/Y ชุดรันสำเร็จ" เป็นบรรทัดสุดท้ายเสมอ
# และห้ามขึ้นคำว่า "ผ่านครบ" ถ้ามีชุดที่ข้าม (ข้าม ≠ ผ่าน)
green=$((total-bad-skipped))
if [ "$bad" -gt 0 ]; then
  echo "❌ มี $bad ชุดที่ไม่ผ่าน"
elif [ "$skipped" -gt 0 ]; then
  echo "⚠️  ยังไม่ครบ — มี $skipped ชุดที่ถูกข้าม (ข้าม ≠ ผ่าน · STD-006)"
else
  echo "✅ ผ่านครบทุกชุด"
fi
echo "สรุปแบตเตอรี่: $green/$total ชุดรันสำเร็จ · ข้าม $skipped · แดง $bad"
# exit: แดงคืน 1 · ไม่มีแดงแต่มีข้าม คืน 77 (ไม่สมบูรณ์ — CI ต้องเห็น) · ครบคืน 0
if [ "$bad" -gt 0 ]; then exit 1; elif [ "$skipped" -gt 0 ]; then exit 77; else exit 0; fi
