#!/usr/bin/env bash
# ชุดทดสอบเว็บกลาง GamePlearn Hub — รันทุกชุดในคำสั่งเดียว
#   bash run-all.sh
# ต้องมี playwright (เชื่อม node_modules ไว้แล้วในโฟลเดอร์นี้)
# ทุกชุดเสิร์ฟไฟล์จริงจาก /home/claude/hub และดัก Supabase ด้วยข้อมูลจำลอง — ไม่แตะฐานจริง
set -u
cd "$(dirname "$0")"
bad=0
for t in t_shots.mjs t_teacher.mjs t_round2.mjs t_regress.mjs; do
  echo ""
  echo "████ $t ████"
  node "$t" || bad=$((bad+1))
done
echo ""
echo "████ sql/t_sql.sh (ไฟล์ SQL 59/60 บน Postgres จริง) ████"
bash sql/t_sql.sh || bad=$((bad+1))

echo ""
if [ "$bad" -eq 0 ]; then echo "✅ ผ่านครบทุกชุด"; else echo "❌ มี $bad ชุดที่ไม่ผ่าน"; fi
exit "$bad"
