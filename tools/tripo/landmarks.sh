#!/usr/bin/env bash
# Landmarks from the reference paintings: isolate the building (image-to-image), then image -> textured
# model, web-optimised to assets/models/lm/<name>.glb. Usage: landmarks.sh name=ref.jpg:"what to isolate" ...
set -uo pipefail
LOG=tools/tripo/logs/landmarks; mkdir -p "$LOG" assets/models/lm assets/ref/lm
export TRIPO_NO_UPDATE_CHECK=1 TRIPO_ANALYTICS_ENABLED=0
tripo balance --json | tee "$LOG/balance-before.json"
while IFS='|' read -r n ref what; do
  [ -z "$n" ] && continue
  P="Isolate $what from this painting as a single clean 3D-asset concept: the whole structure fully visible, three-quarter front view, centred, plain white background, no people, no trees in front, no ground clutter, same colours, materials and architectural details, clean semi-realistic game-art style."
  tripo generate image-to-image "$ref" --model banana_pro --prompt "$P" -o "$LOG/$n-img" --yes --json > "$LOG/$n-img.json" 2> "$LOG/$n-img.err"
  echo "$n img exit=$?"; tail -3 "$LOG/$n-img.err"
  img=$(find "$LOG/$n-img" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.webp" \) | head -1)
  [ -z "$img" ] && continue
  cp "$img" "assets/ref/lm/$n.png"
  tripo make "assets/ref/lm/$n.png" -p texture_quality=detailed --name "lm-$n" -o "$LOG/$n" --yes --json > "$LOG/$n.json" 2> "$LOG/$n.err"
  echo "$n model exit=$?"; cat "$LOG/$n.json"; tail -3 "$LOG/$n.err"
  glb=$(find "$LOG/$n" -name "*.glb" | head -1)
  if [ -n "$glb" ]; then
    npx -y @gltf-transform/cli@4.1.1 optimize "$glb" "assets/models/lm/$n.glb" --compress meshopt --texture-compress webp --texture-size 1024 --simplify-ratio 0.2 >/dev/null 2>&1 || cp "$glb" "assets/models/lm/$n.glb"
    ls -la "assets/models/lm/$n.glb"
  fi
  p=$(find "$LOG/$n" -name "preview.png" | head -1); [ -n "$p" ] && cp "$p" "$LOG/$n-preview.png"
  find "$LOG" -name "*.glb" -delete
done < tools/tripo/RUN_LANDMARKS
tripo balance --json | tee "$LOG/balance-after.json"
