#!/usr/bin/env bash
# Crowd characters and street props for the walk-around (Persona 3 Reload look).
# Each line of RUN_ASSETS: kind|name|description   kind = char (rigged, A-pose) | prop (static, low poly)
# text -> reference image -> 3D model (-> rig) -> web-optimised assets/models/{npc,props}/<name>.glb
set -uo pipefail
LOG=tools/tripo/logs/assets; mkdir -p "$LOG" assets/models/npc assets/models/props assets/ref/gen
export TRIPO_NO_UPDATE_CHECK=1 TRIPO_ANALYTICS_ENABLED=0
tripo balance --json | tee "$LOG/balance-before.json"
STYLE="clean semi-realistic anime game-art style like Persona 3 Reload, plain white background, single subject, centred, whole body visible"
while IFS='|' read -r kind n what; do
  [ -z "$kind" ] && continue
  if [ "$kind" = char ]; then P="Full-body 3D game character concept, front view, standing in a relaxed A-pose with arms slightly away from the body, $what, $STYLE"
  else P="$what, a single isolated 3D game prop, three-quarter view, $STYLE"; fi
  tripo generate text-to-image "$P" --model banana_pro -o "$LOG/$n-img" --yes --json > "$LOG/$n-img.json" 2> "$LOG/$n-img.err" || \
    tripo generate text-to-image "$P" -o "$LOG/$n-img" --yes --json > "$LOG/$n-img.json" 2> "$LOG/$n-img.err"
  img=$(find "$LOG/$n-img" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.webp" \) | head -1)
  echo "$n img=$img"; [ -z "$img" ] && { tail -3 "$LOG/$n-img.err"; continue; }
  cp "$img" "assets/ref/gen/$n.png"
  if [ "$kind" = char ]; then
    tripo make "assets/ref/gen/$n.png" -p face_limit=16000 --then rig --name "npc-$n" -o "$LOG/$n" --yes --json > "$LOG/$n.json" 2> "$LOG/$n.err"
    OUT=assets/models/npc/$n.glb; SIMP=0.5; TEX=1024
  else
    tripo make "assets/ref/gen/$n.png" -p face_limit=6000 --name "prop-$n" -o "$LOG/$n" --yes --json > "$LOG/$n.json" 2> "$LOG/$n.err"
    OUT=assets/models/props/$n.glb; SIMP=0.6; TEX=512
  fi
  echo "$n model exit=$?"; tail -3 "$LOG/$n.err"
  glb=$(find "$LOG/$n" -path "*rig*" -name "*.glb" | head -1); [ -z "$glb" ] && glb=$(find "$LOG/$n" -name "*.glb" | head -1)
  if [ -n "$glb" ]; then
    npx -y @gltf-transform/cli@4.1.1 optimize "$glb" "$OUT" --compress meshopt --texture-compress webp --texture-size $TEX --simplify-ratio $SIMP >/dev/null 2>&1 || cp "$glb" "$OUT"
    ls -la "$OUT"
  fi
  p=$(find "$LOG/$n" -name "preview.png" | head -1); [ -n "$p" ] && cp "$p" "$LOG/$n-preview.png"
  find "$LOG" -name "*.glb" -delete; find "$LOG" -name "*.fbx" -delete
done < tools/tripo/RUN_ASSETS
tripo balance --json | tee "$LOG/balance-after.json"
