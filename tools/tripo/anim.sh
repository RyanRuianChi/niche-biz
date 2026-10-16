#!/usr/bin/env bash
# Retry walk/idle animation for the rigged avatar. Each clip is a separate retarget task.
set -uo pipefail
RIG_TASK="${1:?rig task id}"
LOG=tools/tripo/logs/anim; mkdir -p "$LOG" assets/models/raw
export TRIPO_NO_UPDATE_CHECK=1 TRIPO_ANALYTICS_ENABLED=0
tripo task get cb277440-100f-4b41-a080-d61fdcaba931 --json > "$LOG/failed-task.json" 2>&1 || true
cat "$LOG/failed-task.json"
try() { # $1 input task, $2 preset, $3 tag
  tripo anim retarget "$1" --animation "preset:$2" --out-format glb -o "$LOG/$3" --yes --json > "$LOG/$3.json" 2> "$LOG/$3.err"
  local rc=$?; echo "retarget $3 exit=$rc"; cat "$LOG/$3.json"; tail -4 "$LOG/$3.err"; return $rc
}
if try "$RIG_TASK" walk walk; then try "$RIG_TASK" idle idle
else
  echo "== re-rig with mixamo spec =="
  tripo anim rig "$RIG_TASK" --rig-type biped --spec mixamo --out-format glb -o "$LOG/rig-mixamo" --name rc-mixamo --yes --json > "$LOG/rig-mixamo.json" 2> "$LOG/rig-mixamo.err"
  echo "rig exit=$?"; cat "$LOG/rig-mixamo.json"; tail -4 "$LOG/rig-mixamo.err"
  MX=$(python3 -c "import json;print(json.load(open('$LOG/rig-mixamo.json')).get('task_id',''))" 2>/dev/null)
  [ -n "$MX" ] && try "$MX" walk walk-mx && try "$MX" idle idle-mx
fi
tripo balance --json
for f in $(find "$LOG" -name "*.glb"); do cp "$f" "assets/models/raw/$(basename "$(dirname "$f")")-$(basename "$f")"; done
find "$LOG" -name "*.glb" -delete
ls -la assets/models/raw
