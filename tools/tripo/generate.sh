#!/usr/bin/env bash
# Builds the 3D avatar with Tripo from the reference views in assets/ref/<outfit>/,
# rigs it and adds walk + idle animations. Runs in GitHub Actions (needs TRIPO_API_KEY secret).
set -uo pipefail
OUTFIT="${1:-white}"
MIN_BALANCE="${MIN_BALANCE:-120}"
LOG=tools/tripo/logs/$OUTFIT
mkdir -p "$LOG" assets/models
export TRIPO_NO_UPDATE_CHECK=1 TRIPO_ANALYTICS_ENABLED=0

tripo whoami --json > "$LOG/whoami.json" 2>"$LOG/whoami.err" || true
tripo balance --json > "$LOG/balance-before.json" 2>&1 || true
cat "$LOG/balance-before.json"
BAL=$(python3 -c "import json,sys;d=json.load(open('$LOG/balance-before.json'));print(int(float(d.get('balance', d.get('available', d.get('data',{}).get('balance',0))))))" 2>/dev/null || echo 0)
echo "balance=$BAL"
if [ "$BAL" -lt "$MIN_BALANCE" ]; then echo "Balance $BAL < $MIN_BALANCE, not spending credits." | tee "$LOG/STOPPED.txt"; exit 0; fi

cd "assets/ref/$OUTFIT"
# 1) multiview -> textured PBR model -> auto rig (biped, Mixamo-compatible skeleton)
tripo make front.png right.png back.png --for anim --then "rig" -p texture_quality=detailed \
  --name "rc-$OUTFIT" -o "../../../$LOG/model" --yes --json > "../../../$LOG/make.json" 2> "../../../$LOG/make.err"
echo "make exit=$?"; cat "../../../$LOG/make.json"; tail -20 "../../../$LOG/make.err"
# 2) walk + idle clips on the rigged model
tripo anim retarget @last --animation preset:walk preset:idle --out-format glb \
  -o "../../../$LOG/anim" --yes --json > "../../../$LOG/anim.json" 2> "../../../$LOG/anim.err"
echo "retarget exit=$?"; cat "../../../$LOG/anim.json"; tail -20 "../../../$LOG/anim.err"
cd ../../..

tripo balance --json > "$LOG/balance-after.json" 2>&1 || true
find "$LOG" -type f \( -name "*.glb" -o -name "*.fbx" -o -name "*.png" -o -name "*.jpg" -o -name "*.webp" \) -printf "%p %s\n"
# publish GLBs for the site
i=0; for f in $(find "$LOG/anim" "$LOG/model" -name "*.glb" 2>/dev/null); do cp "$f" "assets/models/${OUTFIT}-$(basename "$f")"; i=$((i+1)); done
echo "copied $i glb(s)"
