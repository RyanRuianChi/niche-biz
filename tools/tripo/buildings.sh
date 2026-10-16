#!/usr/bin/env bash
# Image -> textured 3D model for each Hong Kong landmark in assets/ref/hk/buildings, then web-optimise.
set -uo pipefail
LOG=tools/tripo/logs/buildings; mkdir -p "$LOG" assets/models/hk
export TRIPO_NO_UPDATE_CHECK=1 TRIPO_ANALYTICS_ENABLED=0
tripo balance --json | tee "$LOG/balance-before.json"
for img in assets/ref/hk/buildings/*.jpg; do
  n=$(basename "$img" .jpg)
  tripo make "$img" -p texture=true -p pbr=true --name "hk-$n" -o "$LOG/$n" --yes --json > "$LOG/$n.json" 2> "$LOG/$n.err"
  echo "$n exit=$?"; cat "$LOG/$n.json"; echo
  glb=$(find "$LOG/$n" -name "*.glb" | head -1)
  if [ -n "$glb" ]; then
    npx -y @gltf-transform/cli@4.1.1 optimize "$glb" "assets/models/hk/$n.glb" --compress meshopt --texture-compress webp --texture-size 1024 --simplify-ratio 0.15 >/dev/null 2>&1 \
      || cp "$glb" "assets/models/hk/$n.glb"
    ls -la "assets/models/hk/$n.glb"
    find "$LOG/$n" -name "*.glb" -delete
  fi
done
tripo balance --json | tee "$LOG/balance-after.json"
