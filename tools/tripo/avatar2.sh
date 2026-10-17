#!/usr/bin/env bash
# Avatar v2: Tripo v3.1 multiview (detailed geometry + texture) from assets/ref/white/{front,right,back}.png,
# rigged with a Mixamo-spec biped skeleton so Mixamo clips map bone-for-bone, then web-optimised.
set -uo pipefail
MIN_BALANCE="${MIN_BALANCE:-120}"
LOG=tools/tripo/logs/avatar2; mkdir -p "$LOG" assets/models
export TRIPO_NO_UPDATE_CHECK=1 TRIPO_ANALYTICS_ENABLED=0
tripo balance --json | tee "$LOG/balance-before.json"
BAL=$(python3 -c "import json;d=json.load(open('$LOG/balance-before.json'));print(int(float(d.get('balance', d.get('available', d.get('data',{}).get('balance',0))))))" 2>/dev/null || echo 0)
echo "balance=$BAL"
if [ "$BAL" -lt "$MIN_BALANCE" ]; then echo "Balance $BAL < $MIN_BALANCE, not spending credits." | tee "$LOG/STOPPED.txt"; exit 0; fi
R=assets/ref/white
tripo make "$R/front.png" "$R/right.png" "$R/back.png" --model tripo-v3.1 \
  -p texture_quality=detailed -p geometry_quality=detailed --name rc-v2 -o "$LOG/model" --yes --json > "$LOG/make.json" 2> "$LOG/make.err"
echo "make exit=$?"; cat "$LOG/make.json"; tail -15 "$LOG/make.err"
tripo anim rig @last --rig-type biped --spec mixamo --out-format glb --name rc-v2-rig -o "$LOG/rig" --yes --json > "$LOG/rig.json" 2> "$LOG/rig.err"
echo "rig exit=$?"; cat "$LOG/rig.json"; tail -15 "$LOG/rig.err"
tripo balance --json | tee "$LOG/balance-after.json"
find "$LOG" -type f -printf "%p %s\n"
glb=$(find "$LOG/rig" -name "*.glb" | head -1); [ -z "$glb" ] && glb=$(find "$LOG/model" -name "*.glb" | head -1)
if [ -n "$glb" ]; then
  npx -y @gltf-transform/cli@4.1.1 optimize "$glb" assets/models/avatar-v2.glb --compress meshopt --texture-compress webp --texture-size 2048 --simplify-ratio 0.35 \
    || npx -y @gltf-transform/cli@4.1.1 optimize "$glb" assets/models/avatar-v2.glb --compress meshopt --texture-compress webp --texture-size 2048 --simplify false
  ls -la assets/models/avatar-v2.glb
fi
cp "$LOG"/model/*/*/preview.png "$LOG/preview-model.png" 2>/dev/null || true
find "$LOG" -name "*.glb" -delete; find "$LOG" -name "*.fbx" -delete
