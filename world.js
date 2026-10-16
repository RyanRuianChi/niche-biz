// Mr.RC walk-around: a Persona 5 Royal–style rainy evening street (three.js).
// Walk through Hong Kong Central, UPenn and CUHK. Character = assets/models/avatar.glb (rigged with
// Tripo from the character sheets, Mixamo mocap retargeted below), falling back to assets/me.vrm (VRoid).
// Look: low close chase camera, cel outlines, rain streaks + splashes, wet mirror-like ground,
// faceless silhouette crowds, dense street props, bloom + cool colour grade + vignette.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OutlineEffect } from "three/addons/effects/OutlineEffect.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { Pass } from "three/addons/postprocessing/Pass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const root = document.getElementById("world");
const params = new URLSearchParams(location.search);
const VRM_URL = params.get("vrm") || "assets/me.vrm";
const AVATAR_URL = params.get("avatar") || "assets/models/avatar.glb";
const DEBUG = params.has("debug");

// Only show once the real avatar exists (or when previewing with ?scene=preview).
const exists = (u) => fetch(u, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
const hasAvatar = await exists(AVATAR_URL);
const hasVRM = !hasAvatar && (await exists(VRM_URL));
const LIVE = false;   // flip once the user approves the 3D section
if ((!LIVE || (!hasAvatar && !hasVRM)) && params.get("scene") !== "preview") await new Promise(() => {});   // stay hidden until the avatar exists
root.hidden = false;

// ------------------------------------------------------------------ text (5 languages)
const TXT = {
  en: { hint: "WASD / arrows to walk · Shift to run · tap the ground to move", areas: ["Central · Hong Kong", "UPenn · Philadelphia", "CUHK · Hong Kong"], eve: "Evening",
    next: "To", tram: "Ding ding! The HK tram: the best HK$3.3 city tour.", ifc: "IFC. Where Hong Kong's big deals get done.", neon: "Central at night. Where I started cofounding crypto projects at 19.",
    love: "LOVE. The most photographed corner at Penn.", button: "The Split Button. Yes, it is a giant button.", hall: "Wharton exchange, 2025. Joined FranklinDAO, Penn's blockchain club.",
    gate: "Gate of Wisdom by Ju Ming.", station: "University Station. Every CUHK day starts here.", lib: "Global Business & Computer Science. Full scholarship, honors entry." },
  "zh-Hant": { hint: "WASD / 方向鍵 行走 · Shift 跑步 · 點擊地面移動", areas: ["中環 · 香港", "賓州大學 · 費城", "香港中文大學 · 香港"], eve: "傍晚",
    next: "前往", tram: "叮叮！香港電車：HK$3.3 的最佳城市導覽。", ifc: "國際金融中心。香港大交易的發生地。", neon: "夜晚的中環。我 19 歲開始聯合創辦加密項目的地方。",
    love: "LOVE 雕塑。賓大最多人拍照的角落。", button: "裂開的鈕扣。對，就是一顆巨大的鈕扣。", hall: "2025 年華頓交換。加入了賓大區塊鏈學會 FranklinDAO。",
    gate: "朱銘的「智慧之門」。", station: "大學站。每一天中大生活的起點。", lib: "環球商業及電腦科學。全額獎學金、榮譽入學。" },
  ja: { hint: "WASD / 矢印キーで歩く · Shift で走る · 地面をタップで移動", areas: ["中環 · 香港", "ペンシルベニア大学 · フィラデルフィア", "香港中文大学 · 香港"], eve: "夕方",
    next: "行き先", tram: "ディンディン！香港トラム：HK$3.3 の最高の街めぐり。", ifc: "IFC。香港の大型ディールが動く場所。", neon: "夜の中環。19歳でクリプト事業を共同創業し始めた場所。",
    love: "LOVE。ペンで一番写真を撮られる場所。", button: "割れたボタン。そう、巨大なボタンです。", hall: "2025年ウォートン交換留学。ペンのブロックチェーンクラブ FranklinDAO に参加。",
    gate: "朱銘の「智慧の門」。", station: "大学駅。中大の一日はここから始まる。", lib: "グローバルビジネス＆CS。全額奨学金・優等入学。" },
  ko: { hint: "WASD / 방향키로 걷기 · Shift 달리기 · 바닥을 탭해 이동", areas: ["센트럴 · 홍콩", "펜실베이니아대 · 필라델피아", "홍콩중문대 · 홍콩"], eve: "저녁",
    next: "이동", tram: "딩딩! 홍콩 트램: HK$3.3짜리 최고의 시티 투어.", ifc: "IFC. 홍콩의 큰 딜이 성사되는 곳.", neon: "밤의 센트럴. 19살에 크립토 프로젝트를 공동 창업하기 시작한 곳.",
    love: "LOVE. 펜에서 가장 많이 사진 찍히는 곳.", button: "갈라진 단추. 네, 거대한 단추예요.", hall: "2025년 와튼 교환학생. 펜 블록체인 클럽 FranklinDAO 가입.",
    gate: "주밍의 '지혜의 문'.", station: "대학역. 중문대의 하루는 여기서 시작된다.", lib: "글로벌 비즈니스 & 컴퓨터공학. 전액 장학금, 우등 입학." },
  fr: { hint: "ZQSD / flèches pour marcher · Maj pour courir · touche le sol pour te déplacer", areas: ["Central · Hong Kong", "UPenn · Philadelphie", "CUHK · Hong Kong"], eve: "Soir",
    next: "Vers", tram: "Ding ding ! Le tram de HK : la meilleure visite de la ville pour 3,3 HK$.", ifc: "IFC. Là où se signent les grosses affaires de Hong Kong.", neon: "Central la nuit. Là où j’ai commencé à cofonder des projets crypto à 19 ans.",
    love: "LOVE. Le coin le plus photographié de Penn.", button: "Le Split Button. Oui, c’est un bouton géant.", hall: "Échange à Wharton, 2025. Membre de FranklinDAO, le club blockchain de Penn.",
    gate: "La Porte de la Sagesse, de Ju Ming.", station: "Station University. Chaque journée à CUHK commence ici.", lib: "Global Business & informatique. Bourse complète, admission avec mention." },
};
const lang = () => (TXT[document.documentElement.lang] ? document.documentElement.lang : "en");
const t = (k) => TXT[lang()][k] ?? TXT.en[k];

// ------------------------------------------------------------------ renderer + post
const canvas = root.querySelector("canvas");
const stage = root.querySelector(".world__stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
const PR = Math.min(devicePixelRatio, 1.75);
renderer.setPixelRatio(PR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0026, defaultColor: [0.015, 0.015, 0.03] });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 420);
camera.layers.enable(1);   // layer 1 = small props the wet-ground reflection skips
const clock = new THREE.Clock();

// cel render (with outlines) -> bloom -> tone map -> P5R rain grade (cool, lifted teal shadows, vignette, grain)
class ToonPass extends Pass {
  constructor() { super(); this.needsSwap = false; }
  render(r, _w, read) { r.setRenderTarget(this.renderToScreen ? null : read); effect.render(scene, camera); }
}
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new ToonPass());
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.42, 0.95);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 0.8 + 0.35 * smoothstep(0.55, 0.95, l));    // muted mids, neon keeps its punch
      c *= vec3(0.9, 0.99, 1.1);                                       // overcast blue
      c += vec3(0.012, 0.03, 0.055) * (1.0 - l);                       // lifted teal shadows
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.22);                       // soft S-curve
      vec2 d = vUv - 0.5; d.x *= res.x / res.y;
      float v = smoothstep(1.05, 0.28, length(d));
      c = c * mix(0.38, 1.0, v) + vec3(0.0, 0.008, 0.025) * (1.0 - v);
      c += (hash(vUv * res + fract(time) * 91.0) - 0.5) * 0.03;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(grade);

// ------------------------------------------------------------------ helpers
const rng = (seed) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const pick = (R, a) => a[Math.floor(R() * a.length) % a.length];
const matCache = new Map();
const toon = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts }));
  return matCache.get(key);
};
const glowCache = new Map();
const glow = (color, k = 2.5) => {   // emissive (bloom picks up anything brighter than ~1)
  const key = color + k;
  if (!glowCache.has(key)) glowCache.set(key, noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) })));
  return glowCache.get(key);
};
const noLine = (m) => ((m.userData.outlineParameters = { visible: false }), m);
const thin = (m) => ((m.userData.outlineParameters = { thickness: 0.0012 }), m);
const noRefl = (m) => (m.layers.set(1), m);

const add = (parent, geo, mat, x = 0, y = 0, z = 0, ry = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
};
const box = (p, w, h, d, mat, x, y, z, ry) => add(p, new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
const cyl = (p, r, h, mat, x, y, z, seg = 12, r2 = r) => add(p, new THREE.CylinderGeometry(r2, r, h, seg), mat, x, y + h / 2, z);
const ball = (p, r, mat, x, y, z, s = [1, 1, 1]) => { const m = add(p, new THREE.SphereGeometry(r, 16, 10), mat, x, y, z); m.scale.set(...s); return m; };
const plane = (p, w, h, mat, x, y, z, ry = 0) => add(p, new THREE.PlaneGeometry(w, h), mat, x, y, z, ry);

const canvasTex = (w, h, draw, repeat) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
  return tex;
};
// night window grid: dark wall, some warm / cool lit windows, curtains, AC boxes
const windowsTex = (cols, rows, wall, seed, ratio = 0.45, ground = true) => canvasTex(cols * 24, rows * 32, (g, w, h) => {
  const R = rng(seed);
  g.fillStyle = wall; g.fillRect(0, 0, w, h);
  for (let y = 0; y < rows - (ground ? 1 : 0); y++) for (let x = 0; x < cols; x++) {
    const lit = R() < ratio;
    g.fillStyle = lit ? pick(R, ["#ffd79a", "#ffe6b8", "#cfe2ff", "#ffc477", "#fff3d6"]) : pick(R, ["#0d1018", "#151a24", "#1b2130"]);
    g.fillRect(x * 24 + 4, y * 32 + 6, 16, 20);
    if (lit && R() < 0.5) { g.fillStyle = "rgba(60,30,20,.45)"; g.fillRect(x * 24 + 4, y * 32 + 6, R() < 0.5 ? 7 : 16, 20); }
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x * 24 + 3, y * 32 + 26, 18, 2);
  }
});
const signTex = (text, { bg = "#0b0710", fg = "#ffe14d", w = 128, h = 512, vertical = true, border, size } = {}) => canvasTex(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); }
  const chars = vertical ? [...text] : [text];
  const fs = size || (vertical ? Math.min(w * 0.72, (h - 30) / chars.length * 0.86) : Math.min(h * 0.62, (w - 24) / text.length * 1.7));
  g.font = `900 ${fs}px "Noto Sans TC", "PingFang TC", "Hiragino Sans", "Microsoft JhengHei", "Arial Black", sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = fg; g.shadowColor = fg; g.shadowBlur = 10;
  if (vertical) chars.forEach((ch, i) => g.fillText(ch, w / 2, h / (chars.length + 1) * (i + 1)));
  else g.fillText(text, w / 2, h / 2 + 2);
});
const signMat = (text, opts, k = 1.8) => noLine(new THREE.MeshBasicMaterial({ map: signTex(text, opts), color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
const poolTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const blobTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(0,0,0,.65)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
// additive light pool on the wet ground under a light source
const poolCache = new Map();
const pool = (p, x, z, r, color, k = 0.4) => {
  const key = color + k;
  if (!poolCache.has(key)) poolCache.set(key, noLine(new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(color).multiplyScalar(k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  const m = plane(p, r * 2, r * 2, poolCache.get(key), x, 0.012, z);
  m.rotation.x = -Math.PI / 2;
  return m;
};
const blobMat = noLine(new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
const blob = (p, r) => { const m = plane(p, r * 2, r * 2, blobMat, 0, 0.015, 0); m.rotation.x = -Math.PI / 2; return m; };

// merge static meshes that share a material (keeps draw calls sane with outlines + reflection)
const bake = (g) => {
  g.updateMatrixWorld(true);
  const groups = new Map();
  for (const m of [...g.children]) {
    if (!m.isMesh || Array.isArray(m.material) || m.userData.dyn || !m.geometry.index) continue;
    const key = m.material.uuid + ":" + m.layers.mask;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const geo = mergeGeometries(list.map((m) => { const c = m.geometry.clone().applyMatrix4(m.matrix); for (const k of Object.keys(c.attributes)) if (!["position", "normal", "uv"].includes(k)) c.deleteAttribute(k); return c; }));
    if (!geo) continue;
    const merged = new THREE.Mesh(geo, list[0].material);
    merged.layers.mask = list[0].layers.mask;
    list.forEach((m) => g.remove(m));
    g.add(merged);
  }
};

let font = null;
const fontReady = new Promise((res) => new FontLoader().load("assets/vendor/addons/fonts/helvetiker_bold.typeface.json", (f) => { font = f; res(); }, undefined, () => res()));
const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

// ------------------------------------------------------------------ wet ground (planar reflection, smeared + rippled)
const GroundShader = {
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    map: { value: null }, wetMap: { value: null }, mapInfo: { value: new THREE.Vector3(8, -10, 20) },
    time: { value: 0 }, ambient: { value: new THREE.Color(0.32, 0.36, 0.46) },
  }]),
  vertexShader: `
    uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vW;
    #include <fog_pars_vertex>
    void main(){
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xz;
      vec4 mvPosition = viewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: `
    uniform vec3 color; uniform sampler2D tDiffuse; uniform sampler2D map; uniform sampler2D wetMap;
    uniform vec3 mapInfo; uniform float time; uniform vec3 ambient;
    varying vec4 vUv; varying vec2 vW;
    #include <fog_pars_fragment>
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.0), f.x), f.y); }
    void main(){
      vec2 muv = vec2(vW.x / mapInfo.x, (vW.y - mapInfo.y) / mapInfo.z);
      vec3 alb = texture2D(map, muv).rgb;
      float wet = texture2D(wetMap, muv).r;
      float n = vn(vW * 0.42) * 0.65 + vn(vW * 1.9 + 3.0) * 0.35;
      float puddle = smoothstep(0.5, 0.66, n) * wet;
      vec2 rip = vec2(vn(vW * 3.0 + time * 1.3), vn(vW * 3.0 - time * 1.5 + 7.0)) - 0.5;
      float smear = mix(0.02, 0.006, puddle);
      vec4 uv = vUv; uv.xy += rip * mix(0.008, 0.003, puddle) * uv.w;
      vec3 refl = vec3(0.0); float tot = 0.0;
      for (int i = -2; i <= 5; i++) { float k = 1.0 - abs(float(i)) / 6.0; vec4 u = uv; u.y += float(i) * smear * u.w; refl += texture2DProj(tDiffuse, u).rgb * k; tot += k; }
      refl /= tot;
      float spec = wet * mix(0.42, 0.95, puddle);
      vec3 c = alb * ambient * (1.0 - 0.55 * puddle) + refl * spec * color;
      gl_FragColor = vec4(c, 1.0);
      #include <fog_fragment>
    }`,
};
const reflectors = [];
// paint(gAlbedo, gWet, pxPerMeter) draws one U-metre long strip of the street cross-section z in [z0, z0+span]
const wetGround = (g, { U = 8, z0 = -12, span = 24, length = 160, paint }) => {
  const ppm = 32;
  const albedo = document.createElement("canvas"), wet = document.createElement("canvas");
  albedo.width = wet.width = U * ppm; albedo.height = wet.height = span * ppm;
  const ga = albedo.getContext("2d"), gw = wet.getContext("2d");
  gw.fillStyle = "#fff"; gw.fillRect(0, 0, wet.width, wet.height);
  const Z = (z) => (z - z0) * ppm;   // world z -> canvas y
  paint(ga, gw, ppm, Z, U);
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const s = Math.min(1024, Math.round(innerWidth * PR * 0.5));
  const mirror = new Reflector(new THREE.PlaneGeometry(length, span), { shader: GroundShader, textureWidth: s, textureHeight: Math.round(s * 0.56), color: 0xd8e2ff, multisample: 0 });
  mirror.material.fog = true;
  mirror.material.userData.outlineParameters = { visible: false };
  const u = mirror.material.uniforms;
  u.map.value = tex(albedo, true); u.wetMap.value = tex(wet, false); u.mapInfo.value.set(U, z0, span);
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(0, 0, z0 + span / 2);
  mirror.userData.dyn = true;
  g.add(mirror);
  reflectors.push(mirror);
  return mirror;
};
// painting helpers for the ground strip
const noiseFill = (g, x, y, w, h, base, R, amt = 18, n = 400) => {
  g.fillStyle = base; g.fillRect(x, y, w, h);
  for (let i = 0; i < n; i++) { const v = (R() - 0.5) * amt; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`; g.fillRect(x + R() * w, y + R() * h, 2 + R() * 6, 2 + R() * 6); }
};
const tileFill = (g, x, y, w, h, a, line, size) => {
  g.fillStyle = a; g.fillRect(x, y, w, h);
  g.strokeStyle = line; g.lineWidth = 2;
  for (let i = x; i <= x + w; i += size) { g.beginPath(); g.moveTo(i, y); g.lineTo(i, y + h); g.stroke(); }
  for (let j = y; j <= y + h; j += size) { g.beginPath(); g.moveTo(x, j); g.lineTo(x + w, j); g.stroke(); }
};

// ------------------------------------------------------------------ rain: GPU streaks around the camera + ground splashes
const rainUniforms = { time: { value: 0 }, center: { value: new THREE.Vector3() }, cam: { value: new THREE.Vector3() } };
const instanced = (count, attrs) => {
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute("position", base.getAttribute("position"));
  geo.setAttribute("uv", base.getAttribute("uv"));
  const R = rng(attrs);
  const off = new Float32Array(count * 4).map(() => R());
  geo.setAttribute("offset", new THREE.InstancedBufferAttribute(off, 4));
  geo.instanceCount = count;
  return geo;
};
const rain = new THREE.Mesh(instanced(7000, 11), noLine(new THREE.ShaderMaterial({
  uniforms: { ...rainUniforms, size: { value: new THREE.Vector3(34, 13, 34) } },
  transparent: true, depthWrite: false,
  vertexShader: `
    attribute vec4 offset; uniform float time; uniform vec3 center, size, cam; varying float vA; varying vec2 vUv;
    void main(){
      float speed = 12.0 + offset.w * 5.0;
      vec3 p;
      p.x = center.x + (fract(offset.x - center.x / size.x) - 0.5) * size.x;
      p.z = center.z + (fract(offset.z - center.z / size.z) - 0.5) * size.z;
      p.y = fract(offset.y - time * speed / size.y) * size.y - 0.4;
      float d = length(p - cam);
      float len = 0.35 + offset.w * 0.35, wid = max(0.008, d * 0.0016);
      vec3 toCam = normalize(vec3(cam.x - p.x, 0.0, cam.z - p.z)); vec3 right = vec3(toCam.z, 0.0, -toCam.x);
      vec3 wp = p + right * position.x * wid + normalize(vec3(0.07, 1.0, 0.03)) * (position.y + 0.5) * len;
      vA = smoothstep(0.5, 2.2, d) * smoothstep(size.x * 0.5, 5.0, d) * step(0.0, wp.y);
      vUv = uv;
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`,
  fragmentShader: `
    varying float vA; varying vec2 vUv;
    void main(){ gl_FragColor = vec4(vec3(0.78, 0.86, 1.0) * 1.3, vA * 0.32 * vUv.y * (1.0 - abs(vUv.x - 0.5) * 1.6)); }`,
})));
rain.frustumCulled = false;
rain.renderOrder = 5;
noRefl(rain);
const splash = new THREE.Mesh(instanced(1100, 23), noLine(new THREE.ShaderMaterial({
  uniforms: { ...rainUniforms, size: { value: 22 } },
  transparent: true, depthWrite: false,
  vertexShader: `
    attribute vec4 offset; uniform float time, size; uniform vec3 center; varying vec2 vUv; varying float vT;
    void main(){
      float tt = time * (1.4 + offset.w) + offset.w * 17.0; float cyc = floor(tt); vT = fract(tt);
      vec2 r = fract(offset.xy + vec2(0.6180339, 0.3819660) * cyc);
      vec2 pos = vec2(center.x + (fract(r.x - center.x / size) - 0.5) * size, center.z + (fract(r.y - center.z / size) - 0.5) * size);
      float s = 0.05 + vT * 0.2;
      vUv = uv;
      gl_Position = projectionMatrix * viewMatrix * vec4(pos.x + position.x * s, 0.02, pos.y + position.y * s, 1.0);
    }`,
  fragmentShader: `
    varying vec2 vUv; varying float vT;
    void main(){ float r = length(vUv - 0.5) * 2.0; float ring = smoothstep(0.7, 0.9, r) * smoothstep(1.0, 0.9, r);
      gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), ring * (1.0 - vT) * 0.55); }`,
})));
splash.frustumCulled = false;
noRefl(splash);
scene.add(rain, splash);

// ------------------------------------------------------------------ silhouette crowd (P5's faceless passers-by)
const NPC = (() => {
  const torso = new THREE.CapsuleGeometry(0.17, 0.48, 4, 10); torso.scale(1, 1, 0.68); torso.translate(0, 1.16, 0);
  const head = new THREE.SphereGeometry(0.115, 14, 10); head.scale(0.92, 1.08, 1); head.translate(0, 1.66, 0);
  const neck = new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8); neck.translate(0, 1.52, 0);
  const body = mergeGeometries([torso, head, neck].map((g) => { g.deleteAttribute("uv"); return g; }));
  const leg = new THREE.CapsuleGeometry(0.075, 0.74, 4, 8); leg.translate(0, -0.42, 0); leg.deleteAttribute("uv");
  const arm = new THREE.CapsuleGeometry(0.05, 0.56, 4, 8); arm.translate(0, -0.32, 0); arm.deleteAttribute("uv");
  const canopy = new THREE.ConeGeometry(0.56, 0.24, 10, 1, true); canopy.translate(0, 2.08, 0.08);
  const stick = new THREE.CylinderGeometry(0.008, 0.008, 0.9, 5); stick.translate(0, 1.66, 0.08);
  const tints = ["#10131c", "#151a26", "#1b2030", "#14151d", "#212736", "#181c28"].map((c) => noLine(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.92 })));
  const umbrellas = [
    noLine(new THREE.MeshStandardMaterial({ color: "#dfeaf5", transparent: true, opacity: 0.38, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false })),
    noLine(new THREE.MeshStandardMaterial({ color: "#0f1118", roughness: 0.35, side: THREE.DoubleSide })),
    noLine(new THREE.MeshStandardMaterial({ color: "#1d2a4a", roughness: 0.35, side: THREE.DoubleSide })),
    noLine(new THREE.MeshStandardMaterial({ color: "#5a1420", roughness: 0.35, side: THREE.DoubleSide })),
  ];
  return (p, R, { x, z, dir = 0, speed = 0, umbrella = R() < 0.6, scale = 0.92 + R() * 0.14, phone = false }) => {
    const mat = pick(R, tints);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    add(g, body, mat);
    const parts = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.09, 0.9, 0); g.add(hip); add(hip, leg, mat);
      const sh = new THREE.Group(); sh.position.set(s * 0.22, 1.42, 0); sh.rotation.z = s * 0.08; g.add(sh); add(sh, arm, mat);
      parts.push(hip, sh);
    }
    if (umbrella) {
      const u = pick(R, umbrellas);
      add(g, canopy, u); add(g, stick, toon("#222"));
      parts[3].rotation.set(-1.2, 0, 0.35);   // right hand up holding the umbrella
    }
    if (phone) { parts[1].rotation.x = -1.1; parts[3].rotation.x = -1.1; }
    g.rotation.y = dir > 0 ? Math.PI / 2 : dir < 0 ? -Math.PI / 2 : R() * Math.PI * 2;
    p.add(g);
    return { g, parts, dir, speed, umbrella, phone, phase: R() * 6, z0: z, push: 0 };
  };
})();
const tickCrowd = (crowd, dt, time, L) => {
  for (const n of crowd) {
    if (n.speed) {
      n.g.position.x += n.dir * n.speed * dt;
      if (n.g.position.x * n.dir > L + 12) n.g.position.x = -n.dir * (L + 12);
      n.phase += dt * n.speed * 4.4;
      const s = Math.sin(n.phase);
      n.parts[0].rotation.x = s * 0.42; n.parts[2].rotation.x = -s * 0.42;
      n.parts[1].rotation.x = -s * 0.32; if (!n.umbrella) n.parts[3].rotation.x = s * 0.32;
      n.g.position.y = Math.abs(Math.cos(n.phase)) * 0.03;
      // sidestep the player
      const dx = hero.position.x - n.g.position.x, dz = hero.position.z - n.g.position.z;
      const want = Math.abs(dx) < 1.6 && Math.abs(dz) < 0.9 ? -Math.sign(dz || 1) * (0.95 - Math.abs(dz)) : 0;
      n.push += (want - n.push) * Math.min(1, dt * 4);
      n.g.position.z = n.z0 + n.push;
    } else {
      n.g.rotation.z = Math.sin(time * 0.8 + n.phase) * 0.012;
    }
    n.g.visible = n.g.position.distanceToSquared(camera.position) > 2.6 * 2.6;   // never fill the lens
  }
};

// ------------------------------------------------------------------ street props
const emitters = [];   // per-area light sources the hero picks up as it walks past
const lampPost = (p, E, x, z, side, color = "#ffd9a0") => {
  const pole = toon("#2a2e38");
  cyl(p, 0.07, 5.4, pole, x, 0, z, 10, 0.05);
  const arm = box(p, 0.08, 0.08, 1.1, pole, x, 5.35, z - side * 0.5);
  arm.rotation.x = side * 0.15;
  box(p, 0.5, 0.12, 0.26, pole, x, 5.32, z - side * 1.05);
  box(p, 0.42, 0.04, 0.2, glow(color, 4), x, 5.28, z - side * 1.05);
  pool(p, x, z - side * 1.05, 3.2, color, 0.32);
  E.push({ p: new THREE.Vector3(x, 4.8, z - side * 1.05), c: color, k: 9 });
};
const globeLamp = (p, E, x, z, color = "#ffe9c4") => {
  const m = toon("#1d2028");
  cyl(p, 0.06, 3.4, m, x, 0, z, 10); cyl(p, 0.13, 0.32, m, x, 0, z, 10);
  ball(p, 0.2, glow(color, 2.2), x, 3.62, z);
  pool(p, x, z, 2.6, color, 0.3);
  E.push({ p: new THREE.Vector3(x, 3.6, z), c: color, k: 6 });
};
const vlampTex = (R) => canvasTex(128, 192, (g, w, h) => {
  g.fillStyle = "#0a0c12"; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    g.fillStyle = "#e8eef8"; g.fillRect(6 + c * 20, 10 + r * 34, 16, 26);
    g.fillStyle = pick(R, ["#e2342f", "#2f8de2", "#f2b632", "#3cc46b", "#ffffff", "#f07a2a", "#7a4ae2"]);
    g.fillRect(9 + c * 20, 12 + r * 34, 10, 20);
  }
  g.fillStyle = "#1c2230"; g.fillRect(6, 150, w - 12, 30);
});
const vending = (p, E, R, x, z, ry) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  const body = toon(pick(R, ["#e8e8ea", "#c8222e", "#1f4fa8", "#e8e8ea"]), { roughness: 0.35 });
  box(g, 1.0, 1.85, 0.75, body, 0, 0, 0);
  plane(g, 0.82, 1.15, noLine(new THREE.MeshBasicMaterial({ map: vlampTex(R), color: new THREE.Color(1.6, 1.6, 1.7) })), 0, 1.2, 0.38);
  box(g, 0.6, 0.18, 0.06, toon("#111"), 0, 0.25, 0.38);
  pool(p, x + Math.sin(ry) * 0.9, z + Math.cos(ry) * 0.9, 1.7, "#cfe4ff", 0.4);
  E.push({ p: new THREE.Vector3(x + Math.sin(ry) * 0.6, 1.3, z + Math.cos(ry) * 0.6), c: "#d8e8ff", k: 4 });
};
const bike = (p, x, z, ry) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  const m = thin(toon("#20242c")), wheel = new THREE.TorusGeometry(0.32, 0.025, 6, 20);
  add(g, wheel, m, -0.52, 0.34, 0); add(g, wheel, m, 0.52, 0.34, 0);
  const bar = (x1, y1, x2, y2) => { const b = add(g, new THREE.CylinderGeometry(0.018, 0.018, Math.hypot(x2 - x1, y2 - y1), 5), m, (x1 + x2) / 2, (y1 + y2) / 2, 0); b.rotation.z = Math.atan2(x1 - x2, y2 - y1); };
  bar(-0.52, 0.34, 0, 0.36); bar(0, 0.36, 0.42, 0.78); bar(-0.1, 0.8, 0.42, 0.78); bar(-0.52, 0.34, -0.1, 0.8); bar(0, 0.36, -0.1, 0.8); bar(0.52, 0.34, 0.42, 0.78);
  box(g, 0.24, 0.05, 0.1, toon("#111"), -0.12, 0.82, 0); box(g, 0.05, 0.05, 0.48, m, 0.42, 0.86, 0);
  box(g, 0.3, 0.18, 0.28, thin(toon("#3a3f4a")), 0.6, 0.72, 0);   // basket
  g.rotation.z = 0.05;
};
const cone = (p, x, z) => { cyl(p, 0.2, 0.05, toon("#d8401f"), x, 0, z, 4); add(p, new THREE.ConeGeometry(0.15, 0.6, 10), toon("#e8562a"), x, 0.35, z); cyl(p, 0.105, 0.1, toon("#f0f0f0"), x, 0.32, z, 10, 0.085); };
const bollard = (p, x, z, c = "#e8c22a") => { cyl(p, 0.08, 0.85, toon(c), x, 0, z, 8); cyl(p, 0.085, 0.1, toon("#15161b"), x, 0.6, z, 8); };
const guardrail = (p, x0, x1, z) => {
  const m = toon("#d8dde4", { roughness: 0.3, metalness: 0.3 });
  for (let x = x0; x <= x1; x += 2) cyl(p, 0.04, 0.85, m, x, 0, z, 6);
  box(p, x1 - x0, 0.08, 0.04, m, (x0 + x1) / 2, 0.72, z); box(p, x1 - x0, 0.05, 0.04, m, (x0 + x1) / 2, 0.42, z);
};
const trash = (p, x, z) => { cyl(p, 0.24, 0.85, toon("#2b5b45"), x, 0, z, 12); cyl(p, 0.27, 0.06, toon("#1a1d22"), x, 0.85, z, 12); };
const signPole = (p, x, z, ry, color = "#1f56b8") => {
  cyl(p, 0.035, 2.6, toon("#aab0b8"), x, 0, z, 6);
  const d = add(p, new THREE.CylinderGeometry(0.3, 0.3, 0.03, 18), toon(color), x, 2.5, z); d.rotation.x = Math.PI / 2; d.rotation.z = ry;
  const w = add(p, new THREE.CylinderGeometry(0.22, 0.22, 0.032, 18), toon("#f4f4f4"), x, 2.5, z); w.rotation.x = Math.PI / 2;
};
const plant = (p, x, z, s = 1) => { cyl(p, 0.22 * s, 0.45 * s, toon("#6b6460"), x, 0, z, 10, 0.27 * s); ball(p, 0.35 * s, toon("#1f3a2a"), x, 0.65 * s, z, [1, 1.2, 1]); };
const aBoard = (p, R, x, z, ry) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  const m = noLine(new THREE.MeshBasicMaterial({ map: signTex(pick(R, ["MENU", "OPEN", "SALE", "¥500", "LUNCH"]), { bg: "#1b1d1a", fg: "#f6efe0", w: 128, h: 160, vertical: false }), color: new THREE.Color(0.9, 0.9, 0.9) }));
  const a = plane(g, 0.5, 0.75, m, 0, 0.4, 0.12); a.rotation.x = -0.25;
  const b = plane(g, 0.5, 0.75, toon("#3a2a1a"), 0, 0.4, -0.12, Math.PI); b.rotation.x = 0.25;
};
// overhead wires between telephone poles (and across the street)
const wires = (p, poles, cross = []) => {
  const pts = [];
  const sag = (a, b, h, s) => { for (let i = 0; i < 14; i++) { const t0 = i / 14, t1 = (i + 1) / 14; for (const t of [t0, t1]) pts.push(a.x + (b.x - a.x) * t, h - s * 4 * t * (1 - t), a.z + (b.z - a.z) * t); } };
  for (let i = 0; i < poles.length - 1; i++) for (const [h, s] of [[7.6, 0.5], [7.2, 0.6], [6.7, 0.75], [6.2, 0.8]]) sag(poles[i], poles[i + 1], h, s);
  for (const [a, b, h] of cross) sag(a, b, h, 0.7);
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  p.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#07080c" })));
};
const telePole = (p, x, z) => {
  const m = toon("#5d5a55");
  cyl(p, 0.14, 8.4, m, x, 0, z, 10, 0.11);
  box(p, 1.3, 0.1, 0.1, toon("#3c3a37"), x, 7.5, z); box(p, 1.0, 0.1, 0.1, toon("#3c3a37"), x, 6.9, z);
  cyl(p, 0.22, 0.6, toon("#7a7f86"), x + 0.3, 5.6, z, 10);   // transformer
  box(p, 0.25, 1.2, 0.04, toon("#e9d24a"), x, 1.0, z + 0.15);   // yellow guard
  return new THREE.Vector3(x, 0, z);
};

// a row of night shop-houses facing the street: lit storefront, awning, fascia sign, projecting neon,
// AC units, rooftop clutter. side = +1 -> buildings on z > 0 facing -z; -1 -> z < 0 facing +z
const shopRow = (p, E, R, side, x0, x1, cfg) => {
  const ry = side > 0 ? Math.PI : 0, out = -side, fz = side * cfg.front;
  let x = x0;
  while (x < x1) {
    const w = cfg.wMin + R() * (cfg.wMax - cfg.wMin), h = cfg.hMin + R() * (cfg.hMax - cfg.hMin), cx = x + w / 2;
    const wall = pick(R, cfg.walls);
    const tex = windowsTex(Math.max(2, Math.round(w / 1.3)), Math.max(2, Math.round(h / 2.9)), wall, Math.round(R() * 1e5), cfg.lit ?? 0.45);
    const side_ = noLine(new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.85, 0.85, 0.9) }));
    box(p, w - 0.06, h, 10, [side_, side_, toon("#1b1e26"), toon("#1b1e26"), side_, side_], cx, 0, fz + side * 5);
    // ledge between floors
    box(p, w - 0.06, 0.14, 0.18, toon("#30343e"), cx, 3.3, fz + out * 0.09);
    if (cfg.shops !== false) {
      const shopC = pick(R, ["#fff1d6", "#eaf4ff", "#ffe2b8", "#f6fbff"]);
      const shop = noLine(new THREE.MeshBasicMaterial({ map: shopTex(R, shopC), color: new THREE.Color(0.78, 0.76, 0.74) }));
      plane(p, w - 0.8, 2.55, shop, cx, 1.32, fz + out * 0.03, ry);
      for (const s of [-1, 1]) box(p, 0.35, 3.2, 0.3, toon("#22252d"), cx + s * (w / 2 - 0.25), 0, fz + out * 0.12);
      box(p, w - 0.1, 0.55, 0.32, toon(pick(R, ["#2a2d36", "#3b2a26", "#26303a"])), cx, 2.65, fz + out * 0.14);
      if (R() < cfg.awning) {
        const aw = box(p, w - 0.5, 0.05, 1.6, awningMat(R), cx, 3.05, fz + out * 0.8);
        aw.rotation.x = -side * 0.32;
        box(p, w - 0.5, 0.3, 0.04, aw.material, cx, 2.62, fz + out * 1.57);
      }
      // fascia sign above the shop
      const txt = pick(R, cfg.words);
      const col = pick(R, cfg.neon);
      const lightbox = R() < 0.45;
      const sm = signMat(txt, lightbox ? { bg: col, fg: "#16121a", w: 512, h: 96, vertical: false } : { bg: "#0d0a12", fg: col, w: 512, h: 96, vertical: false, border: col }, lightbox ? 1.5 : 2.2);
      plane(p, Math.min(w - 0.8, 0.6 + txt.length * 0.75), 0.62, sm, cx, 3.75, fz + out * 0.08, ry);
      E.push({ p: new THREE.Vector3(cx, 2.0, fz + out * 1.4), c: shopC, k: 4 });
      pool(p, cx, fz + out * 1.7, Math.min(3.2, w * 0.45), shopC, 0.22);
    }
    // projecting vertical neon
    if (R() < cfg.vertical) {
      const sx = cx + (R() < 0.5 ? -1 : 1) * (w / 2 - 0.45);
      const word = pick(R, cfg.vwords), col = pick(R, cfg.neon), sh = 0.9 + word.length * 0.75;
      const sy = 4.5 + R() * Math.max(0.5, Math.min(h - sh - 5, 6));
      add(p, new THREE.BoxGeometry(0.12, sh, 1.0), toon("#14141a"), sx, sy + sh / 2, fz + out * 0.75);
      for (const s of [-1, 1]) plane(p, 0.86, sh - 0.12, signMat(word, { bg: "#0b0710", fg: col, border: col, w: 128, h: Math.round(128 * sh / 0.86) }, 2.4), sx + s * 0.065, sy + sh / 2, fz + out * 0.75, s * Math.PI / 2);
      box(p, 0.06, 0.06, 0.8, toon("#22252d"), sx, sy + sh - 0.1, fz + out * 0.3);
      E.push({ p: new THREE.Vector3(sx, sy + sh / 2, fz + out * 1.2), c: col, k: 5 });
    }
    // AC units / balconies on upper floors
    const floors = Math.floor((h - 3.4) / 2.9);
    for (let f = 0; f < floors; f++) {
      if (R() < 0.45) { const ax = cx + (R() - 0.5) * (w - 1.2); noRefl(box(p, 0.78, 0.55, 0.45, toon("#b9bcc2"), ax, 3.9 + f * 2.9, fz + out * 0.25)); }
      if (R() < 0.2) { box(p, Math.min(2.4, w - 1), 0.05, 0.7, toon("#3a3e48"), cx, 4.6 + f * 2.9, fz + out * 0.35); box(p, Math.min(2.4, w - 1), 0.7, 0.03, thin(toon("#4a4f5a")), cx, 4.62 + f * 2.9, fz + out * 0.68); }
    }
    // rooftop: water tank / billboard frame
    if (R() < 0.35) cyl(p, 0.8, 1.6, toon("#5b6068"), cx + (R() - 0.5) * (w - 2), h, fz + side * 4, 10);
    else if (R() < 0.25 && cfg.billboards) {
      const word = pick(R, cfg.words), col = pick(R, cfg.neon);
      plane(p, w * 0.9, 2.2, signMat(word, { bg: "#0a0a14", fg: col, border: col, w: 512, h: 128, vertical: false }, 2.6), cx, h + 1.6, fz + side * 1.0, ry);
    }
    x += w;
  }
};
const shopTex = (R, light) => canvasTex(256, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, light); gr.addColorStop(1, "#bfae93");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let s = 0; s < 4; s++) {   // shelves with goods
    g.fillStyle = "rgba(60,50,40,.55)"; g.fillRect(10, 18 + s * 26, w - 20, 3);
    for (let i = 0; i < 18; i++) { g.fillStyle = pick(R, ["#d9483b", "#3a7bd5", "#f0c13a", "#4caf50", "#ffffff", "#8e44ad", "#e67e22"]); g.globalAlpha = 0.55; g.fillRect(14 + i * 13, 6 + s * 26, 9, 12); }
    g.globalAlpha = 1;
  }
  // silhouettes of people inside + window mullions + door
  g.fillStyle = "rgba(25,28,40,.55)";
  for (let i = 0; i < 2; i++) { const px = 30 + R() * (w - 60); g.beginPath(); g.arc(px, 62, 9, 0, Math.PI * 2); g.fill(); g.fillRect(px - 13, 72, 26, 56); }
  g.fillStyle = "#1a1c22"; for (let i = 0; i <= 4; i++) g.fillRect(i * (w - 6) / 4, 0, 6, h);
  g.fillRect(0, 0, w, 6);
  g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.moveTo(40, 0); g.lineTo(90, 0); g.lineTo(30, h); g.lineTo(-20, h); g.fill();
});
const awningMat = (R) => {
  const [a, b] = pick(R, [["#a3232f", "#e8e2d6"], ["#1d5a3c", "#e8e2d6"], ["#24345e", "#d8dde8"], ["#7a1f1f", "#1a1a1a"], ["#c46a1d", "#f2e6cf"]]);
  return new THREE.MeshStandardMaterial({ map: canvasTex(64, 8, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 8, 0, 8, 8); } }, [4, 1]), roughness: 0.45 });
};

// ------------------------------------------------------------------ areas
// The street runs along x. Hero walks in [-L, L] (crossing an end loads the next area) and z in [zMin, zMax].
const L = 34;
const SKY = (top, mid, low) => canvasTex(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.62, mid); gr.addColorStop(1, low); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); });
const NEON = ["#ff3b5c", "#ffd23f", "#3bf0ff", "#ff6ad5", "#7dff8a", "#ffffff", "#ff8a3b"];

const backdrop = (g, url, width, bottom, z, tint = "#4a5470") => {
  const mat = noLine(new THREE.MeshBasicMaterial({ color: tint }));
  const mesh = plane(g, width, 1, mat, 0, 0, z);
  texLoader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    mat.map = tex; mat.needsUpdate = true;
    const h = width * tex.image.height / tex.image.width;
    mesh.scale.y = h; mesh.position.y = bottom + h / 2;
  });
  return mesh;
};
// place a Tripo landmark: scaled to height h, base at (x, z), turned by ry; night-dimmed with thin outlines
const landmark = (g, name, x, z, h, ry = 0, fallback) => {
  const holder = new THREE.Group(); holder.position.set(x, 0, z); holder.rotation.y = ry; g.add(holder);
  gltfLoader.load(`assets/models/hk/${name}.glb`, (gltf) => {
    const m = gltf.scene;
    const b = new THREE.Box3().setFromObject(m);
    const s = h / (b.max.y - b.min.y);
    m.scale.setScalar(s);
    const c = b.getCenter(new THREE.Vector3());
    m.position.set(-c.x * s, -b.min.y * s, -c.z * s);
    m.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((mt) => { mt.color?.multiplyScalar(0.55); mt.emissive?.set("#1a2438"); mt.emissiveMap = mt.map; mt.emissiveIntensity = 0.5; mt.userData.outlineParameters = { thickness: 0.001, color: [0.04, 0.05, 0.09] }; }); });
    holder.add(m);
  }, undefined, () => fallback && fallback(holder));
  return holder;
};
const tower = (g, x, z, w, h, d, wall = "#1c2232", seed = 1) => {
  const tex = windowsTex(Math.max(3, Math.round(w / 1.2)), Math.max(4, Math.round(h / 2.6)), wall, seed, 0.38, false);
  const side = noLine(new THREE.MeshBasicMaterial({ map: tex }));
  box(g, w, h, d, [side, side, toon("#141822"), toon("#141822"), side, side], x, 0, z);
  box(g, 0.3, 0.3, 0.3, glow("#ff2a2a", 4), x, h, z);   // aircraft warning light
};

function areaCentral() {
  const g = new THREE.Group(), E = [], R = rng(7), crowd = [];
  const CURB = 3.6, FRONT = 8.2;
  wetGround(g, {
    z0: -12, span: 24, length: 2 * L + 90, paint(ga, gw, ppm, Z, U) {
      const W = U * ppm;
      noiseFill(ga, 0, Z(-CURB), W, Z(CURB) - Z(-CURB), "#24262c", R, 22, 900);   // asphalt
      for (const s of [-1, 1]) {
        const a = Z(s > 0 ? CURB : -12), b = Z(s > 0 ? 12 : -CURB);
        tileFill(ga, 0, a, W, b - a, "#3f424a", "#2c2e35", ppm * 0.6);
        ga.fillStyle = "#6c6f78"; ga.fillRect(0, Z(s * CURB) - (s > 0 ? 0 : 7), W, 7);   // kerb
        ga.fillStyle = "#c9a22a"; ga.fillRect(0, Z(s * (CURB - 0.25)) - 3, W, 6);       // yellow no-stopping line
        ga.fillStyle = "#c9a22a"; ga.fillRect(0, Z(s * (CURB - 0.42)) - 3, W, 6);
        gw.fillStyle = "#c8c8c8"; gw.fillRect(0, a, W, b - a);
      }
      ga.fillStyle = "#8a8f99";   // tram rails
      for (const z of [-2.55, -1.1]) ga.fillRect(0, Z(z) - 2, W, 4);
      ga.fillStyle = "#d8d8d0"; for (let x = 0; x < W; x += ppm * 4) ga.fillRect(x, Z(0.2) - 3, ppm * 2, 6);   // lane dashes
      for (let x = 0; x < W; x += 2.3 * ppm) { ga.fillStyle = "rgba(0,0,0,.12)"; ga.fillRect(x, Z(-CURB), 3, Z(CURB) - Z(-CURB)); }
    },
  });
  // zebra crossings
  const zebra = toon("#d9d9d4", { roughness: 0.3 });
  for (const cx of [-14, 18]) for (let z = -CURB + 0.3; z < CURB; z += 0.9) { const s = plane(g, 3.2, 0.5, zebra, cx, 0.006, z); s.rotation.x = -Math.PI / 2; }
  // shop-houses both sides, Cantonese neon
  const words = ["茶餐廳", "找換店", "大藥房", "金行", "冰室", "酒家", "士多", "眼鏡", "地產", "時裝", "粥麵", "燒臘", "書局", "海味", "麻雀", "唱片"];
  const vwords = ["大押", "按揭", "酒樓", "夜總會", "茶記", "旅館", "電器", "鐘錶", "雲吞麵", "涼茶", "中環", "找換"];
  const cfg = { front: FRONT, wMin: 4.2, wMax: 7.5, hMin: 11, hMax: 24, walls: ["#2a2f3a", "#30303a", "#3a3430", "#283038", "#352f38"], words, vwords, neon: NEON, awning: 0.45, vertical: 0.75, billboards: true };
  shopRow(g, E, R, 1, -L - 26, L + 26, cfg);
  shopRow(g, E, R, -1, -L - 26, L + 26, { ...cfg, hMin: 9, hMax: 20 });
  // landmarks rising behind the far row (Tripo models of the reference sheet) + skyline
  landmark(g, "bank-of-china", -12, -64, 92, 0.25, (h) => tower(h, 0, 0, 10, 92, 10, "#1d2638", 3));
  landmark(g, "hsbc", 8, -40, 44, 0, (h) => tower(h, 0, 0, 16, 44, 12, "#262c38", 4));
  landmark(g, "jardine-house", 30, -52, 52, -0.2, (h) => tower(h, 0, 0, 10, 52, 10, "#2a2e36", 5));
  landmark(g, "ifc2", 52, -86, 120, 0, (h) => tower(h, 0, 0, 12, 120, 12, "#1d2840", 6));
  landmark(g, "court-of-final-appeal", -L - 26, -3, 13, Math.PI / 2, (h) => box(h, 14, 10, 8, toon("#8d8577"), 0, 0, 0));
  landmark(g, "central-pier", L + 30, 0, 10, -Math.PI / 2, (h) => box(h, 14, 6, 6, toon("#2f5f4a"), 0, 0, 0));
  [[-40, -60, 9, 58], [-30, -95, 9, 72], [-2, -100, 8, 62], [18, -110, 9, 80], [36, -120, 8, 66], [64, -100, 9, 60], [-55, -80, 8, 44], [70, -70, 8, 50], [-20, 60, 10, 50], [15, 70, 9, 64], [45, 60, 9, 48]]
    .forEach(([x, z, w, h], i) => tower(g, x, z, w, h, w, i % 2 ? "#1a2030" : "#202634", 20 + i));
  // street furniture on both pavements
  const poles = [];
  for (let x = -L - 20; x <= L + 20; x += 13) poles.push(telePole(g, x, -(CURB + 0.35)));
  wires(g, poles, [[new THREE.Vector3(-8, 0, -CURB - 0.35), new THREE.Vector3(-8, 0, FRONT), 7.0], [new THREE.Vector3(18, 0, -CURB - 0.35), new THREE.Vector3(18, 0, FRONT), 6.8]]);
  // tram overhead line
  const tw = []; for (let x = -L - 40; x <= L + 40; x += 6) tw.push(x, 6.1, -1.8, x + 6, 6.1, -1.8);
  const twg = new THREE.BufferGeometry(); twg.setAttribute("position", new THREE.Float32BufferAttribute(tw, 3)); g.add(new THREE.LineSegments(twg, new THREE.LineBasicMaterial({ color: "#0a0b10" })));
  for (let x = -L - 6; x <= L + 6; x += 12) lampPost(g, E, x, CURB + 0.3, 1);
  for (let x = -L; x <= L; x += 12) lampPost(g, E, x + 6, -CURB - 0.3, -1, "#cfe0ff");
  guardrail(g, -10, 4, CURB + 0.15); guardrail(g, 22, 30, CURB + 0.15); guardrail(g, -30, -18, -CURB - 0.15);
  for (let x = -L; x <= L; x += 5 + R() * 6) bollard(g, x, CURB + 0.25 + R() * 0.1);
  vending(g, E, R, -4.2, FRONT - 0.45, Math.PI); vending(g, E, R, -3.1, FRONT - 0.45, Math.PI);
  vending(g, E, R, 12.5, -FRONT + 0.45, 0); vending(g, E, R, 26, FRONT - 0.45, Math.PI);
  for (const x of [-22, -7.5, 9, 23]) bike(g, x, FRONT - 0.9, 0.05);
  for (const x of [-26, 3, 15]) bike(g, x, -FRONT + 0.9, Math.PI + 0.05);
  for (const x of [-17, 6, 30]) trash(g, x, CURB + 0.7);
  for (const x of [-12, 20]) cone(g, x, -CURB + 0.6), cone(g, x + 0.8, -CURB + 0.6);
  signPole(g, -15, CURB + 0.4, 0); signPole(g, 24, -CURB - 0.4, Math.PI, "#c8202a");
  for (const x of [-19, 1, 16]) aBoard(g, R, x, FRONT - 1.4, Math.PI + 0.3);
  for (const x of [-9, 11, 27]) plant(g, x, FRONT - 0.5);
  // green Ding Ding tram (double-decker) + red taxis with lights
  const tram = new THREE.Group(); tram.userData.dyn = true;
  const green = toon("#1f6b45", { roughness: 0.35 });
  box(tram, 9.6, 1.4, 2.4, green, 0, 0.35, 0);
  box(tram, 9.6, 0.25, 2.42, toon("#e8e1cf"), 0, 1.75, 0);
  box(tram, 9.6, 1.9, 2.4, green, 0, 2.0, 0);
  box(tram, 9.4, 0.2, 2.3, toon("#e8e1cf"), 0, 3.9, 0);
  const tw2 = noLine(new THREE.MeshBasicMaterial({ map: windowsTex(10, 1, "#1f6b45", 4, 1, false), color: new THREE.Color(1.5, 1.5, 1.4), side: THREE.DoubleSide }));
  for (const y of [1.25, 2.95]) for (const s of [-1, 1]) plane(tram, 9.0, 0.9, tw2, 0, y, s * 1.215);
  const ad = signMat("叮叮 DING DING", { bg: "#f0e6c8", fg: "#c8202a", w: 512, h: 64, vertical: false }, 1.1);
  for (const s of [-1, 1]) plane(tram, 7.5, 0.45, ad, 0, 2.2, s * 1.22);
  box(tram, 0.1, 0.4, 1.2, glow("#fff4d0", 4), 4.82, 0.8, 0); box(tram, 0.1, 0.4, 1.2, glow("#ff3030", 3), -4.82, 0.8, 0);
  for (const x of [-3.2, 3.2]) { const w = cyl(tram, 0.36, 0.24, toon("#111"), x, 0, 1.15, 12); w.rotation.x = Math.PI / 2; w.position.y = 0.36; }
  const pole = cyl(tram, 0.03, 2.2, toon("#222"), 0, 4.0, 0, 6); pole.rotation.z = 0.55;
  tram.position.set(-30, 0, -1.8); g.add(tram);
  const taxis = [];
  for (const [x, z, d] of [[10, 1.8, -1], [-20, 1.8, -1], [5, -2.0, 1]]) {
    const car = new THREE.Group(); car.userData.dyn = true;
    box(car, 4.2, 0.85, 1.8, toon("#c9232a", { roughness: 0.25, metalness: 0.2 }), 0, 0.32, 0);
    box(car, 2.4, 0.66, 1.68, toon("#e9e3d6", { roughness: 0.25 }), 0.2, 1.17, 0);
    box(car, 2.3, 0.5, 1.7, noLine(new THREE.MeshBasicMaterial({ color: "#2b3446" })), 0.2, 1.22, 0);
    box(car, 0.5, 0.18, 0.3, glow("#ffe9a0", 3), 0.2, 1.83, 0);   // roof sign
    for (const s of [-0.6, 0.6]) { box(car, 0.05, 0.16, 0.3, glow("#fff6dc", 6), 2.12, 0.6, s); box(car, 0.05, 0.14, 0.32, glow("#ff2020", 4), -2.12, 0.65, s); }
    for (const wx of [-1.4, 1.4]) for (const wz of [-0.9, 0.9]) { const w = cyl(car, 0.33, 0.22, toon("#0e0e0e"), wx, 0, wz, 12); w.rotation.x = Math.PI / 2; w.position.y = 0.33; }
    car.position.set(x, 0, z); car.rotation.y = d > 0 ? 0 : Math.PI; g.add(car);
    taxis.push({ car, d, v: 6 + R() * 3 });
  }
  // crowd: walkers on both pavements, a few standing at the shops / vending machines
  for (let i = 0; i < 22; i++) { const s = i % 2 ? 1 : -1, z = s * (CURB + 1.1 + R() * 3); crowd.push(NPC(g, R, { x: -L - 10 + R() * (2 * L + 20), z, dir: R() < 0.5 ? 1 : -1, speed: 1.0 + R() * 0.5 })); }
  for (const [x, z, r] of [[-3.6, FRONT - 1.2, 0], [12.5, -FRONT + 1.3, Math.PI], [7, FRONT - 1.0, 0.2], [-24, -FRONT + 1.1, Math.PI], [20, CURB + 0.9, -1.2]]) { const n = NPC(g, R, { x, z, phone: R() < 0.6, umbrella: R() < 0.5 }); n.g.rotation.y = r; crowd.push(n); }
  bake(g);
  return {
    group: g, E, crowd, bounds: { zMin: CURB + 0.35, zMax: FRONT - 0.7, camZ: [-FRONT + 0.6, FRONT - 0.4], lane: CURB + 1.6 },
    spots: [{ x: -14, z: 4.5, r: 3.2, key: "tram" }, { x: 8, z: 5, r: 3, key: "ifc" }, { x: -3.6, z: 6.6, r: 2.6, key: "neon" }],
    sky: SKY("#0a0f1a", "#1d2638", "#3a4458"), fog: ["#283245", 0.017], hemi: ["#7f93bd", "#1a1c22", 0.9],
    tick(dt, time) {
      tram.position.x = ((time * 4 + 40) % (2 * L + 60)) - L - 30;
      for (const tx of taxis) { tx.car.position.x += tx.d * tx.v * dt; if (tx.car.position.x * tx.d > L + 30) tx.car.position.x = -tx.d * (L + 30); }
    },
  };
}

function areaUPenn() {
  const g = new THREE.Group(), E = [], R = rng(31), crowd = [];
  const WALK = 4.4, FRONT = 13;
  backdrop(g, "assets/world/bg-upenn.jpg", 150, -1.5, -46);
  wetGround(g, {
    z0: -16, span: 32, length: 2 * L + 90, paint(ga, gw, ppm, Z, U) {
      const W = U * ppm;
      noiseFill(ga, 0, 0, W, Z(16), "#1d2a1d", R, 26, 1200);   // lawns
      gw.fillStyle = "#3a3a3a"; gw.fillRect(0, 0, W, Z(16));
      // Locust Walk red brick, herringbone-ish
      ga.fillStyle = "#4d2219"; ga.fillRect(0, Z(-WALK), W, Z(WALK) - Z(-WALK));
      for (let y = Z(-WALK); y < Z(WALK); y += 8) for (let x = ((y / 8) % 2) * 8; x < W; x += 16) { ga.fillStyle = pick(R, ["#7a3426", "#8a3d2c", "#6e2f23", "#93432f"]); ga.fillRect(x + 1, y + 1, 14, 6); }
      gw.fillStyle = "#ffffff"; gw.fillRect(0, Z(-WALK), W, Z(WALK) - Z(-WALK));
      for (const s of [-1, 1]) { ga.fillStyle = "#8f877a"; ga.fillRect(0, Z(s * WALK) - 6, W, 12); }
      // side paths to the buildings
      ga.fillStyle = "#6f675c"; ga.fillRect(W * 0.4, Z(-13), ppm * 2.2, Z(-WALK) - Z(-13)); gw.fillStyle = "#e0e0e0"; gw.fillRect(W * 0.4, Z(-13), ppm * 2.2, Z(-WALK) - Z(-13));
    },
  });
  // brick halls with tall lit windows on both sides
  const cfg = { front: FRONT, wMin: 9, wMax: 16, hMin: 10, hMax: 17, walls: ["#4a2a22", "#563026", "#3e2620"], lit: 0.55, shops: false, vertical: 0, words: [], vwords: [], neon: NEON };
  shopRow(g, E, R, -1, -L - 30, L + 30, cfg);
  shopRow(g, E, R, 1, -L - 30, L + 30, { ...cfg, front: FRONT + 2 });
  // College Hall–style gable + spire at the far end of the view
  box(g, 10, 16, 8, toon("#4f5a46"), 0, 0, -FRONT - 6); add(g, new THREE.ConeGeometry(1.1, 6, 4), toon("#3a4236"), 0, 19, -FRONT - 6, Math.PI / 4);
  // LOVE (Robert Indiana) on a black plinth under cherry trees
  box(g, 3, 0.7, 1.8, toon("#1a1a1e"), -11, 0, -6.5);
  const red = toon("#d4202c", { roughness: 0.3 }), blue = toon("#2d4fa3"), grn = toon("#1f6a3a");
  fontReady.then(() => {
    if (!font) return;
    const mk = (s, x, y, rz, m) => { const geo = new TextGeometry(s, { font, size: 1.0, depth: 0.4, curveSegments: 4 }); const o = add(g, geo, [red, m], x, y, -6.7); o.rotation.z = rz; return o; };
    mk("L", -12.3, 1.95, 0, blue); mk("O", -11.35, 2.15, 0.38, grn); mk("V", -12.3, 0.75, 0, grn); mk("E", -11.3, 0.75, 0, blue);
  });
  pool(g, -11, -5.5, 3, "#ffd9a0", 0.35);
  // Ben Franklin on a bench, the Split Button
  const bronze = toon("#3c3a34", { roughness: 0.35, metalness: 0.4 });
  box(g, 2.4, 1.0, 2.0, toon("#7d7a72"), 9, 0, -7);
  box(g, 1.2, 1.0, 1.0, bronze, 9, 1.0, -7.1); ball(g, 0.42, bronze, 9, 2.4, -7, [1, 1.25, 0.9]); ball(g, 0.24, bronze, 9, 3.2, -6.95);
  const btn = add(g, new THREE.CylinderGeometry(2.0, 2.0, 0.35, 32, 1, false, 0.1, Math.PI - 0.2), toon("#e8e6e0", { roughness: 0.3 }), 0, 0.18, 6.4); btn.rotation.x = Math.PI / 2 - 0.25; btn.rotation.z = 0.1;
  const btn2 = add(g, new THREE.CylinderGeometry(2.0, 2.0, 0.35, 32, 1, false, Math.PI + 0.1, Math.PI - 0.2), btn.material, 0.25, 0.18, 6.6); btn2.rotation.x = Math.PI / 2 - 0.35; btn2.rotation.z = -0.15;
  // Victorian lamps, benches, trees, bins
  for (let x = -L - 6; x <= L + 6; x += 9) { globeLamp(g, E, x, -WALK - 0.3); globeLamp(g, E, x + 4.5, WALK + 0.3); }
  const tree = (x, z, s) => { cyl(g, 0.2 * s, 3.4 * s, toon("#2a2019"), x, 0, z, 8, 0.14 * s); for (let i = 0; i < 4; i++) ball(g, (1.3 + R() * 0.6) * s, toon(pick(R, ["#1c3326", "#223b2b", "#1a2f22"])), x + (R() - 0.5) * 1.6 * s, (3.6 + R() * 1.3) * s, z + (R() - 0.5) * 1.2 * s); };
  for (let x = -L - 10; x <= L + 10; x += 7 + R() * 3) { tree(x, -WALK - 2.2 - R() * 1.5, 1 + R() * 0.3); tree(x + 3, WALK + 2.4 + R() * 1.5, 1 + R() * 0.3); }
  for (const [x, z] of [[-13.5, -8], [-8.5, -9]]) { cyl(g, 0.16, 2.6, toon("#2a2019"), x, 0, z, 8); for (let i = 0; i < 4; i++) ball(g, 1.2 + R() * 0.4, toon("#c97a98"), x + (R() - 0.5) * 1.4, 3 + R(), z + (R() - 0.5)); }
  const bench = (x, z, ry) => { const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b); box(b, 1.6, 0.08, 0.45, toon("#4a2e1d"), 0, 0.45, 0); box(b, 1.6, 0.4, 0.06, toon("#4a2e1d"), 0, 0.55, -0.22); for (const sx of [-0.7, 0.7]) box(b, 0.06, 0.45, 0.45, toon("#15161b"), sx, 0, 0); };
  for (const x of [-20, -2, 15, 27]) bench(x, -WALK - 0.9, 0);
  for (const x of [-25, 5, 21]) trash(g, x, WALK + 0.8);
  for (const x of [-16, 12]) bike(g, x, WALK + 1.2, 0.2);
  for (let i = 0; i < 18; i++) crowd.push(NPC(g, R, { x: -L - 10 + R() * (2 * L + 20), z: (R() - 0.5) * 2 * (WALK - 0.8), dir: R() < 0.5 ? 1 : -1, speed: 0.9 + R() * 0.6, umbrella: R() < 0.75 }));
  for (const [x, z] of [[-9, -2.8], [4, 3.2], [18, -3]]) crowd.push(NPC(g, R, { x, z, phone: true }));
  bake(g);
  return {
    group: g, E, crowd, bounds: { zMin: -WALK + 0.4, zMax: WALK - 0.4, camZ: [-FRONT + 1, FRONT + 1], lane: 1.2 },
    spots: [{ x: -11, z: -2.5, r: 3.2, key: "love" }, { x: 9, z: -2.8, r: 3, key: "hall" }, { x: 0, z: 3, r: 2.6, key: "button" }],
    sky: SKY("#0c1220", "#222c40", "#46506a"), fog: ["#2a3448", 0.02], hemi: ["#8798bf", "#1c1f1a", 0.95],
  };
}

function areaCUHK() {
  const g = new THREE.Group(), E = [], R = rng(57), crowd = [];
  backdrop(g, "assets/world/bg-cuhk.jpg", 170, -2, -48);
  wetGround(g, {
    z0: -26, span: 40, length: 2 * L + 90, paint(ga, gw, ppm, Z, U) {
      const W = U * ppm;
      tileFill(ga, 0, 0, W, Z(14), "#55555a", "#3c3c42", ppm * 1.0);   // plaza stone
      // meander (Greek key) borders from the University Mall
      for (const z of [-3.6, 5.2, -16]) {
        ga.fillStyle = "#2c2c32"; ga.fillRect(0, Z(z) - 10, W, 20);
        ga.strokeStyle = "#9a978f"; ga.lineWidth = 3; ga.beginPath();
        for (let x = 0; x < W; x += 32) { const y = Z(z); ga.moveTo(x, y + 7); ga.lineTo(x + 8, y + 7); ga.lineTo(x + 8, y - 6); ga.lineTo(x + 24, y - 6); ga.lineTo(x + 24, y + 3); ga.lineTo(x + 16, y + 3); ga.lineTo(x + 16, y - 1); }
        ga.stroke();
      }
      noiseFill(ga, 0, Z(7.5), W, Z(14) - Z(7.5), "#1c2a1e", R, 24, 500); gw.fillStyle = "#404040"; gw.fillRect(0, Z(7.5), W, Z(14) - Z(7.5));
    },
  });
  // Gate of Wisdom (Ju Ming) on a stepped stone platform
  for (let i = 0; i < 3; i++) box(g, 7 - i * 1.4, 0.25, 5 - i * 1.0, toon("#8c8578"), -6, i * 0.25, -11);
  const dark = toon("#1f1d1d", { roughness: 0.4 });
  const l = box(g, 1.3, 4.6, 1.8, dark, -7.6, 0.75, -11); l.rotation.z = 0.1;
  const r = box(g, 1.3, 4.6, 1.8, dark, -4.4, 0.75, -11); r.rotation.z = -0.1;
  box(g, 5.0, 1.3, 2.0, dark, -6, 5.0, -11);
  pool(g, -6, -9, 3.5, "#ffe2b0", 0.3);
  // pergola + reflecting pools (University Mall)
  const stone = toon("#9b968d");
  box(g, 7, 0.3, 0.3, stone, 10, 0, -12.6); box(g, 7, 0.3, 0.3, stone, 10, 0, -9.4);
  for (let x = 7; x <= 13; x += 1.5) { box(g, 0.35, 3, 0.35, stone, x, 0, -14); box(g, 0.35, 3, 0.35, stone, x, 0, -16); }
  for (let x = 7; x <= 13; x += 0.75) box(g, 0.2, 0.3, 2.4, stone, x, 3, -15);
  // Pavilion of Harmony (red pillars, green tiled roof)
  for (const dx of [-1.4, 1.4]) for (const dz of [-1.2, 1.2]) cyl(g, 0.14, 2.8, toon("#9e2a22"), 20 + dx, 0, -12 + dz, 10);
  add(g, new THREE.CylinderGeometry(0.15, 3.0, 1.5, 6), toon("#24604a"), 20, 3.5, -12);
  box(g, 4.2, 0.3, 3.4, toon("#7f786c"), 20, 0, -12);
  box(g, 0.3, 0.3, 0.3, glow("#ffcc80", 3), 20, 2.7, -12); E.push({ p: new THREE.Vector3(20, 2.5, -12), c: "#ffcc80", k: 4 });
  // campus buildings (library, science centre) with lit study windows; University Station sign
  const hall = (x, z, w, h, d, seed) => { const tex = windowsTex(Math.round(w / 1.1), Math.round(h / 2.4), "#3d3f44", seed, 0.6, false); const m = noLine(new THREE.MeshBasicMaterial({ map: tex })); box(g, w, h, d, [m, m, toon("#2a2c30"), toon("#2a2c30"), m, m], x, 0, z); };
  hall(-22, -24, 20, 13, 8, 3); hall(4, -26, 16, 18, 8, 4); hall(28, -23, 18, 11, 8, 5); hall(-48, -22, 16, 15, 8, 6); hall(52, -24, 18, 14, 8, 7);
  plane(g, 7, 1.0, signMat("大學站 UNIVERSITY", { bg: "#0b1a3a", fg: "#ffffff", w: 512, h: 72, vertical: false }, 1.6), 10, 4.2, -19.9);
  // globe lamps, planters, trees, hill-side wall on the near side
  for (let x = -L - 6; x <= L + 6; x += 10) { globeLamp(g, E, x, -4.6); globeLamp(g, E, x + 5, 6.2); }
  for (let x = -L - 10; x <= L + 10; x += 8) { box(g, 2.4, 0.5, 1.2, stone, x, 0, 7.2); box(g, 2.2, 0.35, 1.0, toon("#1f3524"), x, 0.5, 7.2); }
  const tree = (x, z, s) => { cyl(g, 0.2 * s, 3.6 * s, toon("#2a2019"), x, 0, z, 8, 0.14 * s); for (let i = 0; i < 4; i++) ball(g, (1.3 + R() * 0.6) * s, toon(pick(R, ["#1c3326", "#223b2b", "#1a2f22"])), x + (R() - 0.5) * 1.6 * s, (3.8 + R() * 1.3) * s, z + (R() - 0.5) * 1.2 * s); };
  for (let x = -L - 10; x <= L + 10; x += 9 + R() * 4) { tree(x, 9.5 + R() * 2, 1.1); if (Math.abs(x + 6) > 5 && Math.abs(x - 10) > 5) tree(x + 4, -18 - R() * 2, 1.2); }
  for (const x of [-15, 3, 26]) trash(g, x, -4.2);
  for (let i = 0; i < 16; i++) crowd.push(NPC(g, R, { x: -L - 10 + R() * (2 * L + 20), z: -6 + R() * 10, dir: R() < 0.5 ? 1 : -1, speed: 0.9 + R() * 0.6, umbrella: R() < 0.8 }));
  for (const [x, z] of [[-3, -7.5], [12, -6.5], [24, -7]]) crowd.push(NPC(g, R, { x, z, phone: true }));
  bake(g);
  return {
    group: g, E, crowd, bounds: { zMin: -8, zMax: 5.6, camZ: [-14, 8.4], lane: 1 },
    spots: [{ x: -6, z: -6, r: 3.4, key: "gate" }, { x: 10, z: -6, r: 3, key: "station" }, { x: 20, z: -6, r: 3, key: "lib" }],
    sky: SKY("#0d1322", "#26304a", "#4c5878"), fog: ["#2c3650", 0.016], hemi: ["#8a9cc4", "#1a1d22", 0.95],
  };
}

// ------------------------------------------------------------------ character
const hero = new THREE.Group();
scene.add(hero);
blob(hero, 0.55);
let vrm = null;
// cool rim light on the character (P5 cutscene look) — patched into the standard shader
const rimify = (m, color = "#a8c8ff", k = 0.6) => {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = { value: new THREE.Color(color).multiplyScalar(k) };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 rimColor;")
      .replace("#include <opaque_fragment>", "float rimF = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.5);\noutgoingLight += rimColor * rimF;\n#include <opaque_fragment>");
  };
  m.customProgramCacheKey = () => "rim";
  m.needsUpdate = true;
};
const placeholder = (() => {
  const g = new THREE.Group();
  const jacket = toon("#1d1d22"), skin = toon("#f3d2b8"), hair = toon("#3a2418"), pants = toon("#8e8c86");
  const parts = {};
  for (const [s, x] of [["L", 0.1], ["R", -0.1]]) {
    const hip = new THREE.Group(); hip.position.set(x, 0.92, 0); g.add(hip);
    add(hip, new THREE.CapsuleGeometry(0.075, 0.75, 4, 10), pants, 0, -0.45, 0);
    add(hip, new THREE.BoxGeometry(0.12, 0.09, 0.26), toon("#111"), 0, -0.88, 0.05);
    const sh = new THREE.Group(); sh.position.set(x * 2.2, 1.42, 0); g.add(sh);
    add(sh, new THREE.CapsuleGeometry(0.06, 0.5, 4, 10), jacket, 0, -0.32, 0);
    ball(sh, 0.05, skin, 0, -0.66, 0);
    parts["hip" + s] = hip; parts["sh" + s] = sh;
  }
  add(g, new THREE.CapsuleGeometry(0.2, 0.42, 4, 12), jacket, 0, 1.2, 0).scale.set(1, 1, 0.65);
  add(g, new THREE.BoxGeometry(0.08, 0.3, 0.02), toon("#f4f2ee"), 0, 1.28, 0.13);
  ball(g, 0.14, skin, 0, 1.66, 0, [0.9, 1.05, 0.95]);
  ball(g, 0.15, hair, 0, 1.73, -0.02, [0.98, 0.85, 0.98]);
  for (const sx of [-1, 1]) ball(g, 0.07, hair, sx * 0.1, 1.62, 0.04, [0.6, 1.4, 0.8]);
  g.userData.parts = parts;
  return g;
})();
hero.add(placeholder);

const loadVRM = () => new Promise((res) => {
  if (!hasVRM) return res(null);
  const loader = new GLTFLoader();
  loader.register((p) => new VRMLoaderPlugin(p));
  loader.load(VRM_URL, (gltf) => {
    const v = gltf.userData.vrm;
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons?.(gltf.scene);
    if (v.meta?.metaVersion === "0") VRMUtils.rotateVRM0(v);
    v.scene.traverse((o) => { o.frustumCulled = false; if (o.isMesh) [].concat(o.material).forEach((m) => (m.userData.outlineParameters = { thickness: 0.0025, color: [0.05, 0.03, 0.04] })); });
    res(v);
  }, undefined, () => res(null));
});

// ---- Tripo avatar (rigged GLB, faces +X in model space)
let rig = null;
const loadAvatar = () => new Promise((res) => {
  if (!hasAvatar) return res(null);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(AVATAR_URL, (gltf) => {
    const model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      [].concat(o.material).forEach((m) => { m.roughness = 0.7; m.metalness = 0; rimify(m); m.userData.outlineParameters = { thickness: 0.0032, color: [0.02, 0.02, 0.04] }; });
    });
    const bb = new THREE.Box3().setFromObject(model);
    const s = 1.78 / (bb.max.y - bb.min.y);
    const holder = new THREE.Group();
    model.scale.setScalar(s);
    model.position.y = -bb.min.y * s;
    const baseY = model.position.y;
    model.rotation.y = -Math.PI / 2;           // model +X (its forward) -> group +Z
    holder.add(model);
    holder.updateMatrixWorld(true);
    const bones = {};
    model.traverse((o) => { if (o.isBone) bones[o.name.replace(/^tripo:*/, "")] = o; });
    rig = { holder, model, baseY, bones, rest: new Map(Object.values(bones).map((o) => [o, o.quaternion.clone()])) };
    res(holder);
  }, undefined, (e) => { console.warn("avatar load failed", e); res(null); });
});
// ---- motion capture: Mixamo walk / idle / run clips (three.js Xbot) copied onto the Tripo rig by
// matching each limb's direction every frame, so it works whatever the bones' local axes are.
let motion = null;
const loadMotion = () => new Promise((res) => {
  gltfLoader.load("assets/models/motion.glb", (gltf) => {
    const src = gltf.scene;
    const mixer = new THREE.AnimationMixer(src);
    const clip = (n) => mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, n));
    const acts = { idle: clip("idle"), walk: clip("walk"), run: clip("run") };
    Object.values(acts).forEach((a) => { a.play(); a.setEffectiveWeight(0); });
    acts.idle.setEffectiveWeight(1);
    const S = {};
    src.traverse((o) => { if (o.isBone) S[o.name.replace(/^mixamorig:?/, "")] = o; });
    res({ src, mixer, acts, S });
  }, undefined, () => res(null));
});
// Tripo rig layout (from the GLB): each leg is hip -> knee -> ankle, and the knee has two foot
// children at the ankle: one runs to the toe, the other to the heel. The earlier map used the heel
// chain for one leg (its foot pointed backwards) and left the sibling bone behind on both legs.
const LEGS = [
  { hip: "bone_14", knee: "bone_15", ankle: "bone_16", toe: "bone_17", heel: "bone_18" },
  { hip: "1_Left_Limb_2", knee: "1_Left_Limb_3", ankle: "bone_23", toe: "bone_24", heel: "1_Left_Limb_4" },
];
const ARMS = [["0_Right_Limb_0", "0_Right_Limb_1", "0_Right_Limb_2"], ["0_Left_Limb_0", "0_Left_Limb_1", "0_Left_Limb_2"]];
function buildMap() {
  const B = rig.bones, S = motion.S;
  const wp = (o) => o.getWorldPosition(new THREE.Vector3());
  rig.holder.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(rig.holder.matrixWorld).invert();
  const sideOf = (o) => Math.sign(wp(o).applyMatrix4(inv).x);   // +X = character's left (faces +Z)
  const map = [
    [B.Spine_0, B.Spine_1, S.Spine, S.Spine2],
    [B.Spine_1, B.Head_0, S.Spine2, S.Neck],
    [B.Head_0, B.Head_1, S.Neck, S.HeadTop_End],
  ];
  const follow = [];
  for (const a of ARMS) {
    const [c, u, f] = a.map((n) => B[n]); if (!c || !u || !f) continue;
    const P = sideOf(u) > 0 ? "Left" : "Right";
    map.push([c, u, S[P + "Arm"], S[P + "ForeArm"]], [u, f, S[P + "ForeArm"], S[P + "Hand"]]);
  }
  for (const l of LEGS) {
    const [h, k, a, t, e] = [l.hip, l.knee, l.ankle, l.toe, l.heel].map((n) => B[n]); if (!h || !k || !a) continue;
    const P = sideOf(k) > 0 ? "Left" : "Right";
    map.push([h, k, S[P + "UpLeg"], S[P + "Leg"]], [k, a, S[P + "Leg"], S[P + "Foot"]]);
    if (t) map.push([a, t, S[P + "Foot"], S[P + "ToeBase"]]);
    if (e) follow.push([e, a]);   // heel bone copies the ankle bone's rotation
  }
  rig.map = map.filter((m) => m.length === 4 && m.every(Boolean));
  rig.follow = follow.map(([e, a]) => [e, a, rig.rest.get(a).clone().invert().multiply(rig.rest.get(e))]);
  rig.root = B.Root;
  rig.hipsRestY = S.Hips.getWorldPosition(new THREE.Vector3()).y;
  rig.hipsRestQ = S.Hips.getWorldQuaternion(new THREE.Quaternion()).invert();
  rig.rootRestW = B.Root.getWorldQuaternion(new THREE.Quaternion());
  rig.heroRestInv = hero.getWorldQuaternion(new THREE.Quaternion()).invert();
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _w = new THREE.Quaternion(), _h = new THREE.Quaternion(), _d = new THREE.Quaternion();
function retarget() {
  motion.src.updateMatrixWorld(true);
  rig.rest.forEach((q, o) => o.quaternion.copy(q));
  rig.holder.updateMatrixWorld(true);
  hero.getWorldQuaternion(_h);
  // pelvis: apply the source hips' rotation (twist / tilt / sway) to the whole rig root, in hero space
  if (rig.root) {
    _d.copy(motion.S.Hips.getWorldQuaternion(_q)).multiply(rig.hipsRestQ);              // source delta (world)
    _d.premultiply(_h).multiply(_p.copy(_h).invert());                                 // into hero space
    const curHero = _h.clone().multiply(rig.heroRestInv);
    _w.copy(curHero).multiply(rig.rootRestW);                                          // root world rest under current heading
    _w.premultiply(_d);
    rig.root.parent.getWorldQuaternion(_p).invert();
    rig.root.quaternion.copy(_p.multiply(_w));
    rig.root.updateMatrixWorld(true);
  }
  for (const [bone, child, sb, sc] of rig.map) {
    const want = sc.getWorldPosition(_a).sub(sb.getWorldPosition(_b)).normalize().applyQuaternion(_h);
    const have = child.getWorldPosition(_b).sub(bone.getWorldPosition(_c)).normalize();
    _q.setFromUnitVectors(have, want);
    bone.getWorldQuaternion(_w).premultiply(_q);
    bone.parent.getWorldQuaternion(_p).invert();
    bone.quaternion.copy(_p.multiply(_w));
    bone.updateMatrixWorld(true);
  }
  for (const [heel, ankle, off] of rig.follow) { heel.quaternion.copy(ankle.quaternion).multiply(off); heel.updateMatrixWorld(true); }
  const bob = motion.S.Hips.getWorldPosition(_a).y - rig.hipsRestY;
  rig.model.position.y = rig.baseY + bob * 0.85;
}

// procedural walk / idle fallbacks (VRM normalized bones, or the primitive placeholder)
const pose = (phase, amount, time) => {
  if (rig && motion && rig.map) {
    const { acts } = motion;
    runAmt += ((keys.run ? 1 : 0) - runAmt) * 0.1;
    acts.idle.setEffectiveWeight(1 - amount);
    acts.walk.setEffectiveWeight(amount * (1 - runAmt));
    acts.run.setEffectiveWeight(amount * runAmt);
    motion.mixer.update(clockDt);
    retarget();
  } else if (vrm) {
    const b = (n) => vrm.humanoid.getNormalizedBoneNode(n);
    const s = Math.sin(phase);
    const swing = 0.55 * amount;
    b("leftUpperLeg").rotation.x = -s * swing;
    b("rightUpperLeg").rotation.x = s * swing;
    b("leftLowerLeg").rotation.x = Math.max(0, s) * 0.9 * amount;
    b("rightLowerLeg").rotation.x = Math.max(0, -s) * 0.9 * amount;
    b("leftUpperArm").rotation.set(s * 0.45 * amount, 0, -1.2);
    b("rightUpperArm").rotation.set(-s * 0.45 * amount, 0, 1.2);
    b("leftLowerArm").rotation.set(0, -0.25, 0);
    b("rightLowerArm").rotation.set(0, 0.25, 0);
    b("spine").rotation.set(0.04 * amount, s * 0.08 * amount, 0);
    b("hips").position.y = Math.abs(Math.cos(phase)) * 0.025 * amount;
    b("chest") && (b("chest").rotation.x = Math.sin(time * 1.6) * 0.015 * (1 - amount));
    b("head").rotation.y = Math.sin(time * 0.5) * 0.12 * (1 - amount);
  } else {
    const p = placeholder.userData.parts, s = Math.sin(phase);
    p.hipL.rotation.x = s * 0.5 * amount; p.hipR.rotation.x = -s * 0.5 * amount;
    p.shL.rotation.x = -s * 0.4 * amount; p.shR.rotation.x = s * 0.4 * amount;
    placeholder.position.y = Math.abs(Math.cos(phase)) * 0.03 * amount;
  }
};

// ------------------------------------------------------------------ lighting
// dim overcast fill + a few point lights that follow the hero, each borrowing the colour of the
// nearest shop window / lamp / neon sign so the character is lit by the street as it walks
const hemi = new THREE.HemisphereLight("#ffffff", "#222222", 1);
const moon = new THREE.DirectionalLight("#a9bde0", 0.55);
moon.position.set(-10, 30, 12);
const heroLights = Array.from({ length: 4 }, () => { const l = new THREE.PointLight("#ffffff", 0, 11, 1.7); scene.add(l); return l; });
scene.add(hemi, moon);
const _col = new THREE.Color();
const updateLights = () => {
  const near = area.E.map((e) => ({ e, d: e.p.distanceToSquared(hero.position) })).sort((a, b) => a.d - b.d).slice(0, heroLights.length);
  heroLights.forEach((l, i) => {
    const n = near[i];
    if (!n) { l.intensity = 0; return; }
    l.position.lerp(n.e.p, 0.2);
    l.color.lerp(_col.set(n.e.c), 0.2);
    l.intensity += (n.e.k * 0.75 - l.intensity) * 0.2;
  });
};

// ------------------------------------------------------------------ area switching
let area = null, areaIndex = 0;
const builders = [areaCentral, areaUPenn, areaCUHK];
const built = [];
const titleCard = root.querySelector(".world__card");
const tabs = [...root.querySelectorAll("[data-area]")];
const timeEl = root.querySelector(".world__time");

function setArea(i, fromEdge = 0) {
  areaIndex = (i + 3) % 3;
  if (area) scene.remove(area.group);
  area = built[areaIndex] || (built[areaIndex] = builders[areaIndex]());
  scene.add(area.group);
  scene.background = area.sky;
  scene.fog = new THREE.FogExp2(...area.fog);
  hemi.color.set(area.hemi[0]); hemi.groundColor.set(area.hemi[1]); hemi.intensity = area.hemi[2];
  hero.position.set(fromEdge ? -fromEdge * (L - 1) : -6, 0, area.bounds.lane);
  hero.rotation.y = fromEdge < 0 ? -Math.PI / 2 : Math.PI / 2;
  camYaw = hero.rotation.y + (fromEdge < 0 ? -0.35 : 0.35);
  snapCam = true;
  target = null;
  tabs.forEach((b, k) => b.setAttribute("aria-pressed", String(k === areaIndex)));
  titleCard.textContent = t("areas")[areaIndex];
  root.classList.remove("is-wipe"); void root.offsetWidth; root.classList.add("is-wipe");
  updateEdges();
}
const edgeL = root.querySelector(".world__edge--l"), edgeR = root.querySelector(".world__edge--r");
const updateEdges = () => {
  edgeL.textContent = "◀ " + t("next") + " " + t("areas")[(areaIndex + 2) % 3].split(" · ")[0];
  edgeR.textContent = t("next") + " " + t("areas")[(areaIndex + 1) % 3].split(" · ")[0] + " ▶";
  root.querySelector(".world__hint").textContent = t("hint");
  // P5-style calendar badge: date, weekday, rain, time of day
  const d = new Date();
  const wd = new Intl.DateTimeFormat(lang(), { weekday: "short" }).format(d);
  timeEl.innerHTML = `<b>${d.getMonth() + 1}/${d.getDate()}</b><span>${wd}</span><i aria-hidden="true">☂</i><small>${t("eve")}</small>`;
};
tabs.forEach((b) => b.addEventListener("click", () => setArea(+b.dataset.area)));
new MutationObserver(() => { titleCard.textContent = t("areas")[areaIndex]; updateEdges(); lastSpot = null; }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

// ------------------------------------------------------------------ input (camera-relative)
const keys = {};
let target = null, active = false;
const KEYMAP = { ArrowLeft: "l", a: "l", q: "l", ArrowRight: "r", d: "r", ArrowUp: "u", w: "u", z: "u", ArrowDown: "dn", s: "dn" };
addEventListener("keydown", (e) => {
  if (!active) return;
  const k = KEYMAP[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (k) { keys[k] = true; e.preventDefault(); target = null; }
  if (e.key === "Shift") keys.run = true;
});
addEventListener("keyup", (e) => { const k = KEYMAP[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (k) keys[k] = false; if (e.key === "Shift") keys.run = false; });
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
canvas.addEventListener("pointerdown", (e) => {
  active = true; root.classList.add("is-active");
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(groundPlane, p)) { p.z = THREE.MathUtils.clamp(p.z, area.bounds.zMin, area.bounds.zMax); target = p; }
});
canvas.addEventListener("mouseenter", () => (active = true));
canvas.addEventListener("mouseleave", () => { active = false; Object.keys(keys).forEach((k) => (keys[k] = false)); });

// ------------------------------------------------------------------ dialog
const dialog = root.querySelector(".world__dialog");
let lastSpot = null;
const showSpot = (s) => {
  if (s === lastSpot) return;
  lastSpot = s;
  if (!s) { dialog.classList.remove("is-on"); return; }
  dialog.querySelector("p").textContent = t(s.key);
  dialog.classList.remove("is-on"); void dialog.offsetWidth; dialog.classList.add("is-on");
};

// ------------------------------------------------------------------ loop
let phase = 0, walkAmt = 0, visible = true, runAmt = 0, clockDt = 0, autoDir = 1, camYaw = Math.PI / 2, snapCam = true, lightT = 0;
const look = new THREE.Vector3();
const resize = () => {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(PR);
  composer.setSize(w, h);
  grade.uniforms.res.value.set(w, h);
  const s = Math.min(1024, Math.round(w * PR * 0.5));
  reflectors.forEach((m) => m.getRenderTarget().setSize(s, Math.round(s * h / w)));
  camera.aspect = w / h;
  camera.fov = w / h < 1.2 ? 64 : 50;
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(stage);
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(stage);

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), dir = new THREE.Vector3(), want = new THREE.Vector3();
function step(dt, time) {
  clockDt = dt;
  const b = area.bounds;
  // input relative to the camera: up = away from the camera
  fwd.set(Math.sin(camYaw), 0, Math.cos(camYaw));
  right.set(-Math.cos(camYaw), 0, Math.sin(camYaw));
  dir.set(0, 0, 0).addScaledVector(fwd, (keys.u ? 1 : 0) - (keys.dn ? 1 : 0)).addScaledVector(right, (keys.r ? 1 : 0) - (keys.l ? 1 : 0));
  if (target) {
    const d = target.clone().sub(hero.position); d.y = 0;
    if (d.length() < 0.15) target = null; else dir.copy(d);
  }
  // idle stroll along the pavement so the scene is alive before anyone interacts
  if (!active && !target && dir.lengthSq() === 0) {
    if (hero.position.x > 16) autoDir = -1; else if (hero.position.x < -16) autoDir = 1;
    dir.set(autoDir, 0, (b.lane - hero.position.z) * 0.4);
  }
  const moving = dir.lengthSq() > 0.0001;
  const speed = keys.run ? 4.4 : 1.45;
  if (moving) {
    dir.normalize();
    hero.position.addScaledVector(dir, speed * dt);
    let diff = Math.atan2(dir.x, dir.z) - hero.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    hero.rotation.y += diff * Math.min(1, dt * 9);
  }
  hero.position.z = THREE.MathUtils.clamp(hero.position.z, b.zMin, b.zMax);
  if (hero.position.x > L) setArea(areaIndex + 1, 1);
  else if (hero.position.x < -L) setArea(areaIndex - 1, -1);
  walkAmt += ((moving ? 1 : 0) - walkAmt) * Math.min(1, dt * 7);
  phase += dt * (keys.run ? 11 : 7.5) * (moving ? 1 : 0);
  pose(phase, walkAmt, time);
  if (vrm) vrm.update(dt);
  area.tick?.(dt, time);
  tickCrowd(area.crowd, dt, time, L);
  lightT += dt; if (lightT > 0.05) { lightT = 0; updateLights(); }
  showSpot(area.spots.find((s) => Math.hypot(hero.position.x - s.x, hero.position.z - s.z) < s.r) || null);
  // low, close chase camera over the right shoulder; swings round behind the hero as it turns
  if (moving) {
    let dy = hero.rotation.y - camYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    if (Math.abs(dy) < 2.3) camYaw += dy * Math.min(1, dt * 1.6);
  }
  fwd.set(Math.sin(camYaw), 0, Math.cos(camYaw));
  right.set(-Math.cos(camYaw), 0, Math.sin(camYaw));
  want.copy(hero.position).addScaledVector(fwd, -3.2).addScaledVector(right, 0.55);
  want.y = 1.42 + walkAmt * 0.04;
  want.z = THREE.MathUtils.clamp(want.z, b.camZ[0], b.camZ[1]);
  const k = snapCam ? 1 : Math.min(1, dt * 4);
  camera.position.lerp(want, k);
  look.lerp(_a.copy(hero.position).addScaledVector(fwd, 3.5).addScaledVector(right, 0.25).setY(1.3), snapCam ? 1 : Math.min(1, dt * 5));
  snapCam = false;
  camera.lookAt(look);
  rainUniforms.time.value = time;
  rainUniforms.center.value.copy(camera.position).addScaledVector(fwd, 8);
  rainUniforms.cam.value.copy(camera.position);
  reflectors.forEach((m) => (m.material.uniforms.time.value = time));
  grade.uniforms.time.value = time;
}
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  if (!visible) return;
  step(dt, time);
  composer.render(dt);
}

setArea(0);
resize();
frame();
const [avatar, mo] = await Promise.all([loadAvatar(), loadMotion()]);
if (avatar) { hero.remove(placeholder); hero.add(avatar); motion = mo; if (motion) buildMap(); }
else {
  vrm = await loadVRM();
  if (vrm) { hero.remove(placeholder); hero.add(vrm.scene); }
}
root.classList.add("is-ready");
if (DEBUG) window.__world = { hero, camera, scene, setArea, step, keys, get area() { return area; }, render: () => { composer.render(0.016); return canvas.toDataURL("image/jpeg", 0.85); }, set active(v) { active = v; } };
