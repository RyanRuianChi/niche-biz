#!/usr/bin/env bash
# Avatar v3 (higher fidelity), in stages so each result can be reviewed before spending more:
#   prep            -> AI-refined front view (face matched to the close-up in white-sheet-detail), 2 variants
#   build <front>   -> 3 multiview candidates (v3.1, detailed geometry, extreme texture); previews + task ids
#   rig <task_id>   -> rig the chosen candidate and publish assets/models/avatar-v3.glb
set -uo pipefail
MODE="${1:?mode}"; ARG="${2:-}"
LOG=tools/tripo/logs/avatar3; mkdir -p "$LOG" assets/models
export TRIPO_NO_UPDATE_CHECK=1 TRIPO_ANALYTICS_ENABLED=0
H=assets/ref/white-hq
tripo balance --json | tee "$LOG/balance-$MODE-before.json"
case "$MODE" in
prep)
  P="The image shows a full-body character turnaround view (left) and a close-up portrait of the same young man (right). Output ONLY the full-body character from the left: identical A-pose facing the camera, identical outfit (white leather biker jacket, white ribbed turtleneck, pleated charcoal trousers, grey and white sneakers, silver watch), identical colours, proportions and framing, plain light grey background. Redraw his face and hair in sharp high detail so they match the close-up portrait exactly: same eyes, eyebrows, nose, lips, jaw line and wavy dark brown hair with a centre part. Clean semi-realistic game-art style, even studio lighting, no text, square image."
  for i in 1 2; do
    tripo generate image-to-image "$H/front-face-ref.png" --model gemini-3-pro --prompt "$P" -p aspect_ratio=1:1 -o "$LOG/prep-$i" --yes --json > "$LOG/prep-$i.json" 2> "$LOG/prep-$i.err"
    echo "prep $i exit=$?"; cat "$LOG/prep-$i.json"; tail -5 "$LOG/prep-$i.err"
    f=$(find "$LOG/prep-$i" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" \) | head -1)
    [ -n "$f" ] && python3 -c "from PIL import Image; Image.open('$f').convert('RGB').save('$H/front-ai-$i.png')" && ls -la "$H/front-ai-$i.png"
  done ;;
build)
  FRONT="${ARG:-$H/front.png}"
  for s in 11 22 33; do
    tripo make "$FRONT" "$H/right.png" "$H/back.png" --model tripo-v3.1 --seed $s \
      -p texture_quality=extreme -p geometry_quality=detailed -p texture_alignment=original_image \
      --name "rc-v3-$s" -o "$LOG/cand-$s" --yes --json > "$LOG/cand-$s.json" 2> "$LOG/cand-$s.err"
    echo "cand $s exit=$?"; cat "$LOG/cand-$s.json"; tail -5 "$LOG/cand-$s.err"
    p=$(find "$LOG/cand-$s" -name "preview.png" | head -1); [ -n "$p" ] && cp "$p" "$LOG/cand-$s.png"
  done ;;
rig)
  tripo anim rig "$ARG" --rig-type biped --out-format glb --name rc-v3-rig -o "$LOG/rig" --yes --json > "$LOG/rig.json" 2> "$LOG/rig.err"
  echo "rig exit=$?"; cat "$LOG/rig.json"; tail -10 "$LOG/rig.err"
  glb=$(find "$LOG/rig" -name "*.glb" | head -1)
  if [ -n "$glb" ]; then
    npx -y @gltf-transform/cli@4.1.1 simplify "$glb" "$LOG/s.glb" --ratio 0.1 --error 0.002 && \
    npx -y @gltf-transform/cli@4.1.1 optimize "$LOG/s.glb" assets/models/avatar-v3.glb --compress meshopt --texture-compress webp --texture-size 2048 --simplify false
    ls -la assets/models/avatar-v3.glb
  fi ;;
esac
tripo balance --json | tee "$LOG/balance-$MODE-after.json"
find "$LOG" -name "*.glb" -delete; find "$LOG" -name "*.fbx" -delete
find "$LOG" -type f -printf "%p %s\n"
