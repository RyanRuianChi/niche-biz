// Mr.RC walk-around: a Persona-style cel-shaded 3D diorama (three.js).
// Walk through Hong Kong Central, UPenn and CUHK. Character = assets/models/avatar.json (rigged GLB
// generated with Tripo from the character sheets), falling back to assets/me.vrm (VRoid).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OutlineEffect } from "three/addons/effects/OutlineEffect.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const root = document.getElementById("world");
const params = new URLSearchParams(location.search);
const VRM_URL = params.get("vrm") || "assets/me.vrm";
const AVATAR_URL = params.get("avatar") || "assets/models/avatar.glb";

// Only show once the real avatar exists (or when previewing with ?scene=preview).
const exists = (u) => fetch(u, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
const hasAvatar = await exists(AVATAR_URL);
const hasVRM = !hasAvatar && (await exists(VRM_URL));
const LIVE = false;   // flip once the reference-based scenes are in
if ((!LIVE || (!hasAvatar && !hasVRM)) && params.get("scene") !== "preview") await new Promise(() => {});   // stay hidden until the avatar exists
root.hidden = false;

// ------------------------------------------------------------------ text (5 languages)
const TXT = {
  en: { hint: "WASD / arrows to walk · Shift to run · tap the ground to move", areas: ["Central · Hong Kong", "UPenn · Philadelphia", "CUHK · Hong Kong"],
    next: "To", tram: "Ding ding! The HK tram: the best HK$3.3 city tour.", ifc: "IFC. Where Hong Kong's big deals get done.", neon: "Central at night. Where I started cofounding crypto projects at 19.",
    love: "LOVE. The most photographed corner at Penn.", button: "The Split Button. Yes, it is a giant button.", hall: "Wharton exchange, 2025. Joined FranklinDAO, Penn's blockchain club.",
    gate: "Gate of Wisdom by Ju Ming.", station: "University Station. Every CUHK day starts here.", lib: "Global Business & Computer Science. Full scholarship, honors entry." },
  "zh-Hant": { hint: "WASD / 方向鍵 行走 · Shift 跑步 · 點擊地面移動", areas: ["中環 · 香港", "賓州大學 · 費城", "香港中文大學 · 香港"],
    next: "前往", tram: "叮叮！香港電車：HK$3.3 的最佳城市導覽。", ifc: "國際金融中心。香港大交易的發生地。", neon: "夜晚的中環。我 19 歲開始聯合創辦加密項目的地方。",
    love: "LOVE 雕塑。賓大最多人拍照的角落。", button: "裂開的鈕扣。對，就是一顆巨大的鈕扣。", hall: "2025 年華頓交換。加入了賓大區塊鏈學會 FranklinDAO。",
    gate: "朱銘的「智慧之門」。", station: "大學站。每一天中大生活的起點。", lib: "環球商業及電腦科學。全額獎學金、榮譽入學。" },
  ja: { hint: "WASD / 矢印キーで歩く · Shift で走る · 地面をタップで移動", areas: ["中環 · 香港", "ペンシルベニア大学 · フィラデルフィア", "香港中文大学 · 香港"],
    next: "行き先", tram: "ディンディン！香港トラム：HK$3.3 の最高の街めぐり。", ifc: "IFC。香港の大型ディールが動く場所。", neon: "夜の中環。19歳でクリプト事業を共同創業し始めた場所。",
    love: "LOVE。ペンで一番写真を撮られる場所。", button: "割れたボタン。そう、巨大なボタンです。", hall: "2025年ウォートン交換留学。ペンのブロックチェーンクラブ FranklinDAO に参加。",
    gate: "朱銘の「智慧の門」。", station: "大学駅。中大の一日はここから始まる。", lib: "グローバルビジネス＆CS。全額奨学金・優等入学。" },
  ko: { hint: "WASD / 방향키로 걷기 · Shift 달리기 · 바닥을 탭해 이동", areas: ["센트럴 · 홍콩", "펜실베이니아대 · 필라델피아", "홍콩중문대 · 홍콩"],
    next: "이동", tram: "딩딩! 홍콩 트램: HK$3.3짜리 최고의 시티 투어.", ifc: "IFC. 홍콩의 큰 딜이 성사되는 곳.", neon: "밤의 센트럴. 19살에 크립토 프로젝트를 공동 창업하기 시작한 곳.",
    love: "LOVE. 펜에서 가장 많이 사진 찍히는 곳.", button: "갈라진 단추. 네, 거대한 단추예요.", hall: "2025년 와튼 교환학생. 펜 블록체인 클럽 FranklinDAO 가입.",
    gate: "주밍의 '지혜의 문'.", station: "대학역. 중문대의 하루는 여기서 시작된다.", lib: "글로벌 비즈니스 & 컴퓨터공학. 전액 장학금, 우등 입학." },
  fr: { hint: "ZQSD / flèches pour marcher · Maj pour courir · touche le sol pour te déplacer", areas: ["Central · Hong Kong", "UPenn · Philadelphie", "CUHK · Hong Kong"],
    next: "Vers", tram: "Ding ding ! Le tram de HK : la meilleure visite de la ville pour 3,3 HK$.", ifc: "IFC. Là où se signent les grosses affaires de Hong Kong.", neon: "Central la nuit. Là où j’ai commencé à cofonder des projets crypto à 19 ans.",
    love: "LOVE. Le coin le plus photographié de Penn.", button: "Le Split Button. Oui, c’est un bouton géant.", hall: "Échange à Wharton, 2025. Membre de FranklinDAO, le club blockchain de Penn.",
    gate: "La Porte de la Sagesse, de Ju Ming.", station: "Station University. Chaque journée à CUHK commence ici.", lib: "Global Business & informatique. Bourse complète, admission avec mention." },
};
const lang = () => (TXT[document.documentElement.lang] ? document.documentElement.lang : "en");
const t = (k) => TXT[lang()][k] ?? TXT.en[k];

// ------------------------------------------------------------------ renderer
const canvas = root.querySelector("canvas");
const stage = root.querySelector(".world__stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0022, defaultColor: [0.04, 0.02, 0.05] });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 600);
const clock = new THREE.Clock();

// 3-band toon ramp (Persona-style hard shading)
const ramp = (() => {
  const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();
const matCache = new Map();
const toon = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02, ...opts }));
  return matCache.get(key);
};
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const noLine = (m) => ((m.userData.outlineParameters = { visible: false }), m);

const add = (parent, geo, mat, x = 0, y = 0, z = 0, ry = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
};
const box = (p, w, h, d, mat, x, y, z, ry) => add(p, new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
const cyl = (p, r, h, mat, x, y, z, seg = 16, r2 = r) => add(p, new THREE.CylinderGeometry(r2, r, h, seg), mat, x, y + h / 2, z);
const ball = (p, r, mat, x, y, z, s = [1, 1, 1]) => { const m = add(p, new THREE.SphereGeometry(r, 18, 12), mat, x, y, z); m.scale.set(...s); return m; };

// canvas textures: lit window grids, signs
const windowsTex = (cols, rows, wall, lit, dark, ratio = 0.5, seed = 1) => {
  const c = document.createElement("canvas");
  c.width = cols * 16; c.height = rows * 24;
  const g = c.getContext("2d");
  g.fillStyle = wall; g.fillRect(0, 0, c.width, c.height);
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    g.fillStyle = rnd() < ratio ? lit : dark;
    g.fillRect(x * 16 + 3, y * 24 + 4, 10, 15);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return tex;
};
const facade = (w, h, d, wall, lit, dark, ratio, seed, night = true) => {
  const tex = windowsTex(Math.max(2, Math.round(w * 1.2)), Math.max(2, Math.round(h / 1.6)), wall, lit, dark, ratio, seed);
  const side = night ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const top = toon(wall);
  return [side, side, top, top, side, side];
};
const signTex = (lines, { bg = "#140812", fg = "#ffe14d", w = 256, h = 512, font = "900 120px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif", vertical = true, border } = {}) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16); }
  g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = fg; g.shadowBlur = 18;
  if (vertical) [...lines].forEach((ch, i, a) => g.fillText(ch, w / 2, h / (a.length + 1) * (i + 1)));
  else lines.split("\n").forEach((ln, i, a) => g.fillText(ln, w / 2, h / (a.length + 1) * (i + 1)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};
const sign = (p, lines, x, y, z, w, h, opts, ry = 0) => {
  const m = noLine(new THREE.MeshBasicMaterial({ map: signTex(lines, opts) }));
  const mesh = add(p, new THREE.PlaneGeometry(w, h), m, x, y, z, ry);
  return mesh;
};
const tree = (p, x, z, h, crown, leaf, trunk = "#4a3020", seed = 1) => {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  cyl(p, 0.14, h, toon(trunk), x, 0, z, 8, 0.09);
  for (let i = 0; i < 4; i++) ball(p, crown * (0.55 + rnd() * 0.3), toon(leaf), x + (rnd() - 0.5) * crown, h + (rnd() - 0.2) * crown * 0.6, z + (rnd() - 0.5) * crown * 0.6);
};
const lamp = (p, x, z, light = "#ffd27a", pole = "#26262c") => {
  cyl(p, 0.07, 4.2, toon(pole), x, 0, z, 10);
  box(p, 0.8, 0.08, 0.08, toon(pole), x + 0.35, 4.15, z);
  const b = box(p, 0.36, 0.08, 0.24, noLine(glow(light)), x + 0.7, 3.98, z);
  const pl = new THREE.PointLight(light, 6, 9, 1.6);
  pl.position.set(x + 0.7, 3.7, z);
  p.add(pl);
  return b;
};
const skyTex = (stops) => {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([p, col]) => gr.addColorStop(p, col));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

let font = null;
const fontReady = new Promise((res) => new FontLoader().load("assets/vendor/addons/fonts/helvetiker_bold.typeface.json", (f) => { font = f; res(); }, undefined, () => res()));

// ------------------------------------------------------------------ areas
// Daytime anime look from the reference paintings in assets/ref/*. The walk line is z in [-1.8, 2.4];
// UPenn and CUHK sit in front of stitched paintings; Central uses Tripo models of its six landmarks.
const BOUNDS = { x: 19, zMin: -1.8, zMax: 2.4 };
const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

const backdrop = (g, url, width, bottom = -1, z = -44) => {
  const mat = noLine(new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false }));
  const mesh = add(g, new THREE.PlaneGeometry(width, 1), mat, 0, 0, z);
  texLoader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    mat.map = tex; mat.needsUpdate = true;
    const h = width * tex.image.height / tex.image.width;
    mesh.scale.y = h; mesh.position.y = bottom + h / 2;
  });
  return mesh;
};
// place a Tripo landmark: scaled to height h, base at (x, z), turned by ry
const landmark = (g, name, x, z, h, ry = 0, fallback) => {
  const holder = new THREE.Group(); holder.position.set(x, 0, z); holder.rotation.y = ry; g.add(holder);
  gltfLoader.load(`assets/models/hk/${name}.glb`, (gltf) => {
    const m = gltf.scene;
    const b = new THREE.Box3().setFromObject(m);
    const s = h / (b.max.y - b.min.y);
    m.scale.setScalar(s);
    const c = b.getCenter(new THREE.Vector3());
    m.position.set(-c.x * s, -b.min.y * s, -c.z * s);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; [].concat(o.material).forEach((mt) => (mt.userData.outlineParameters = { thickness: 0.0012, color: [0.08, 0.1, 0.16] })); } });
    holder.add(m);
  }, undefined, () => fallback && fallback(holder));
  return holder;
};
const glassTower = (g, x, z, w, h, d, tint = "#6f93c9") => {
  const tex = windowsTex(Math.max(3, Math.round(w)), Math.max(4, Math.round(h / 1.4)), tint, "#cfe3ff", "#4d6c9c", 0.35, Math.round(x * 7 + z));
  const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.35 });
  const top = toon("#8aa2c8");
  const m = box(g, w, h, d, [side, side, top, top, side, side], x, 0, z);
  m.castShadow = true;
  return m;
};
const lampDay = (p, x, z, globe = false) => {
  const m = toon("#1d2028");
  cyl(p, 0.06, 3.4, m, x, 0, z, 10);
  cyl(p, 0.12, 0.3, m, x, 0, z, 10);
  if (globe) ball(p, 0.2, noLine(glow("#fdf6e3")), x, 3.55, z);
  else { box(p, 0.3, 0.42, 0.3, toon("#1d2028"), x, 3.35, z); box(p, 0.22, 0.3, 0.22, noLine(glow("#fff1c8")), x, 3.4, z); }
};
const bench = (p, x, z, ry = 0) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  const wood = toon("#6b4128"), iron = toon("#1d2028");
  box(g, 1.6, 0.08, 0.45, wood, 0, 0.45, 0); box(g, 1.6, 0.4, 0.06, wood, 0, 0.55, -0.22);
  for (const sx of [-0.7, 0.7]) box(g, 0.06, 0.45, 0.45, iron, sx, 0, 0);
};
const shade = (g, x, z, r) => {   // soft dappled tree shadow on the ground (the references are full of these)
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const ctx = c.getContext("2d"); const gr = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  gr.addColorStop(0, "rgba(20,30,60,.35)"); gr.addColorStop(1, "rgba(20,30,60,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
  const m = noLine(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  const p = add(g, new THREE.PlaneGeometry(r * 2, r * 2), m, x, 0.02, z); p.rotation.x = -Math.PI / 2;
};
const leafy = (g, x, z, h, crown, color = "#4f9a3f", seed = 1) => { tree(g, x, z, h, crown, color, "#5a3b22", seed); shade(g, x, z + 0.5, crown * 1.4); };
const tiles = (a, b, size = 64, repeat = [20, 6]) => {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"); g.fillStyle = b; g.fillRect(0, 0, size, size); g.fillStyle = a; g.fillRect(1, 1, size - 2, size - 2);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
};
const ground = (g, mat, w, d, x, z) => { const m = box(g, w, 0.1, d, mat, x, -0.1, z); m.receiveShadow = true; return m; };
const DAY = { sky: [[0, "#2f6fd6"], [0.55, "#6fa9ec"], [1, "#d9ecff"]], hemi: ["#cfe6ff", "#6f7d55", 1.5], sun: ["#fff0d8", 2.8, [-14, 22, 14]] };

function areaCentral() {
  const g = new THREE.Group();
  const spots = [];
  // Victoria Peak hills behind the skyline
  [[-80, 60, 34], [-25, 46, 46], [25, 60, 40], [85, 55, 30]].forEach(([x, s, h]) => ball(g, 1, toon("#3f7a45"), x, -6, -150, [s, h, 20]));
  // landmarks (Tripo models from the reference sheet), arranged like the waterfront panorama
  landmark(g, "bank-of-china", -16, -70, 92, 0.25, (h) => glassTower(h, 0, 0, 10, 92, 10, "#4d7cc4"));
  landmark(g, "hsbc", 2, -46, 42, 0, (h) => glassTower(h, 0, 0, 16, 42, 12, "#9fb0c4"));
  landmark(g, "jardine-house", 22, -60, 52, -0.2, (h) => glassTower(h, 0, 0, 10, 52, 10, "#d8dbe0"));
  landmark(g, "ifc2", 40, -90, 120, 0, (h) => glassTower(h, 0, 0, 12, 120, 12, "#5f86c4"));
  landmark(g, "court-of-final-appeal", -15, -22, 11, 0.15, (h) => box(h, 14, 9, 8, toon("#e8dcc4"), 0, 0, 0));
  landmark(g, "central-pier", 18, -24, 9, -0.1, (h) => box(h, 14, 6, 6, toon("#4f8f6c"), 0, 0, 0));
  // filler towers between landmarks
  [[-38, -80, 8, 55], [-30, -100, 9, 70], [-6, -95, 8, 60], [12, -100, 9, 75], [30, -110, 8, 65], [55, -95, 9, 58], [-50, -70, 8, 40], [62, -75, 8, 48]]
    .forEach(([x, z, w, h], i) => glassTower(g, x, z, w, h, w, i % 2 ? "#7d9bcc" : "#a7b4c6"));
  // street: pavement (walk line), kerb, road with tram tracks, far pavement
  ground(g, tiles("#c9c6c0", "#a9a6a0", 64, [40, 4]), 80, 7, 0, 0.6);
  box(g, 80, 0.14, 0.3, toon("#dedad2"), 0, -0.1, -2.8);
  ground(g, toon("#55565c"), 80, 12, 0, -9);
  for (const z of [-6.2, -7.6, -10.4, -11.8]) box(g, 80, 0.02, 0.08, noLine(toon("#b8b8c0")), 0, 0, z);
  for (let x = -38; x < 40; x += 2.4) box(g, 1.2, 0.02, 0.5, noLine(toon("#f2c94c")), x, 0, -3.6);   // yellow crossing
  ground(g, tiles("#bdbab4", "#a3a09a", 64, [40, 8]), 80, 16, 0, -23);
  // green Ding Ding tram running along the tracks
  const tram = new THREE.Group();
  const green = toon("#1f6b45");
  box(tram, 9.4, 3.7, 2.4, green, 0, 0.35, 0);
  box(tram, 9.2, 0.25, 2.3, toon("#e9e4d6"), 0, 4.05, 0);
  const winM = noLine(new THREE.MeshBasicMaterial({ map: windowsTex(10, 2, "#1f6b45", "#fff2c4", "#fff2c4", 1, 4) }));
  add(tram, new THREE.PlaneGeometry(8.6, 2.5), winM, 0, 2.35, 1.22);
  for (const x of [-3.3, 3.3]) { const w = cyl(tram, 0.36, 0.2, toon("#111"), x, 0, 1.2, 12); w.rotation.x = Math.PI / 2; w.position.y = 0.36; }
  const pole = cyl(tram, 0.03, 1.9, toon("#222"), 0, 4.2, 0, 6); pole.rotation.z = 0.55;
  tram.position.set(-30, 0, -7); g.add(tram);
  // red taxi
  const taxi = new THREE.Group();
  box(taxi, 4.2, 0.9, 1.8, toon("#cf2a2a"), 0, 0.32, 0); box(taxi, 2.4, 0.7, 1.7, toon("#e8e3d6"), 0.2, 1.2, 0);
  for (const x of [-1.4, 1.4]) for (const z of [-0.9, 0.9]) { const w = cyl(taxi, 0.34, 0.24, toon("#0e0e0e"), x, 0, z, 12); w.rotation.x = Math.PI / 2; w.position.y = 0.34; }
  taxi.position.set(10, 0, -11); g.add(taxi);
  // railings, street lamps, planters with trees (tram streetscape reference)
  for (let x = -20; x <= 20; x += 1.6) cyl(g, 0.05, 1.0, toon("#1d2028"), x, 0, -2.6, 8);
  box(g, 40, 0.06, 0.06, toon("#1d2028"), 0, 0.92, -2.6);
  for (const x of [-15, -3, 9, 21]) lampDay(g, x, -2.4);
  for (const x of [-26, -12, 4, 20]) { box(g, 2.2, 0.6, 1.4, toon("#b5b2ac"), x, 0, -17); leafy(g, x, -17, 3.4, 1.8, "#3f8a3a", 30 + x); }
  // Statue Square cenotaph-like monument and bronze lions in front of HSBC
  box(g, 1.4, 4.5, 1.4, toon("#d9d4c8"), -4, 0, -19);
  for (const x of [-1.2, 5.2]) { box(g, 1.2, 0.8, 1.6, toon("#8f8a80"), x, 0, -16); ball(g, 0.5, toon("#5b4a35"), x, 1.2, -16, [0.9, 1, 1.3]); }
  spots.push({ x: 6, z: -1, r: 3.2, key: "tram" }, { x: 14, z: -1, r: 3, key: "ifc" }, { x: -6, z: -1.2, r: 3, key: "neon" });
  return {
    group: g, spots, ...DAY, fog: ["#cfe4fb", 70, 260],
    tick(dt, time) { tram.position.x = ((time * 3.2) % 90) - 45; taxi.position.x = 30 - ((time * 6) % 70); },
  };
}

function areaUPenn() {
  const g = new THREE.Group();
  const spots = [];
  backdrop(g, "assets/world/bg-upenn.jpg", 124, -1.5, -40);
  ground(g, toon("#6aa84f"), 140, 40, 0, -20);
  // Locust Walk red brick
  const bc = document.createElement("canvas"); bc.width = 64; bc.height = 32;
  const bg = bc.getContext("2d"); bg.fillStyle = "#7c3a2a"; bg.fillRect(0, 0, 64, 32);
  bg.fillStyle = "#b25a43"; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) bg.fillRect(x * 16 + (y % 2) * 8 + 1, y * 8 + 1, 14, 6);
  const btex = new THREE.CanvasTexture(bc); btex.wrapS = btex.wrapT = THREE.RepeatWrapping; btex.repeat.set(40, 3); btex.colorSpace = THREE.SRGBColorSpace;
  ground(g, new THREE.MeshStandardMaterial({ map: btex, roughness: 0.9 }), 80, 5.6, 0, 0.3);
  box(g, 80, 0.12, 0.25, toon("#cfc6b6"), 0, -0.1, -2.6); box(g, 80, 0.12, 0.25, toon("#cfc6b6"), 0, -0.1, 3.2);
  // LOVE (Robert Indiana) on a black plinth under a pink cherry tree
  box(g, 3, 0.7, 1.8, toon("#2a2a2e"), -11, 0, -6);
  const red = toon("#d4202c"), blue = toon("#2d4fa3"), grn = toon("#1f6a3a");
  fontReady.then(() => {
    if (!font) return;
    const mk = (s, x, y, rz, m) => { const geo = new TextGeometry(s, { font, size: 1.0, depth: 0.4, curveSegments: 4 }); const o = add(g, geo, [red, m], x, y, -6.2); o.rotation.z = rz; o.castShadow = true; return o; };
    mk("L", -12.3, 1.95, 0, blue); mk("O", -11.35, 2.15, 0.38, grn); mk("V", -12.3, 0.75, 0, grn); mk("E", -11.3, 0.75, 0, blue);
  });
  leafy(g, -14, -8, 3.6, 2.4, "#f2a7c3", 7); leafy(g, -9, -9.5, 3.4, 2.2, "#f4b6cd", 8);
  // Ben Franklin seated on a stone plinth
  const bronze = toon("#4c4a44");
  box(g, 2.4, 1.0, 2.0, toon("#b9b6ae"), 9, 0, -7);
  box(g, 1.2, 1.0, 1.0, bronze, 9, 1.0, -7.1); ball(g, 0.42, bronze, 9, 2.4, -7, [1, 1.25, 0.9]); ball(g, 0.24, bronze, 9, 3.2, -6.95);
  // black Victorian lamps, benches, green trees (summer, like the references)
  for (const x of [-17, -6, 5, 16]) lampDay(g, x, -3.1);
  bench(g, -2, -3.6); bench(g, 12, -3.6);
  for (const [x, z] of [[-20, -7], [-4, -10], [2, -8], [15, -9], [20, -6]]) leafy(g, x, z, 4 + (x % 3), 2.4, "#4f9a3f", 50 + x);
  spots.push({ x: -11, z: -2, r: 3.2, key: "love" }, { x: 9, z: -2.4, r: 3, key: "hall" }, { x: 0, z: -1.5, r: 2.4, key: "button" });
  return { group: g, spots, ...DAY, fog: ["#dbeafc", 60, 220] };
}

function areaCUHK() {
  const g = new THREE.Group();
  const spots = [];
  backdrop(g, "assets/world/bg-cuhk.jpg", 150, -2, -42);
  // plaza paving with the meander border from the University Mall
  ground(g, tiles("#cfcac2", "#b3aea6", 64, [60, 20]), 160, 50, 0, -18);
  const kc = document.createElement("canvas"); kc.width = 64; kc.height = 16; const kg = kc.getContext("2d");
  kg.fillStyle = "#8f8a82"; kg.fillRect(0, 0, 64, 16); kg.strokeStyle = "#ece8e0"; kg.lineWidth = 3;
  kg.beginPath(); kg.moveTo(0, 13); kg.lineTo(8, 13); kg.lineTo(8, 3); kg.lineTo(24, 3); kg.lineTo(24, 10); kg.lineTo(16, 10); kg.lineTo(16, 7); kg.moveTo(32, 13); kg.lineTo(40, 13); kg.lineTo(40, 3); kg.lineTo(56, 3); kg.lineTo(56, 10); kg.lineTo(48, 10); kg.lineTo(48, 7); kg.stroke();
  const kt = new THREE.CanvasTexture(kc); kt.wrapS = THREE.RepeatWrapping; kt.repeat.set(40, 1); kt.colorSpace = THREE.SRGBColorSpace;
  for (const z of [-2.8, 3.4]) { const s = box(g, 80, 0.02, 0.6, noLine(new THREE.MeshBasicMaterial({ map: kt })), 0, 0, z); s.receiveShadow = true; }
  // Gate of Wisdom (Ju Ming) on a stepped stone platform
  for (let i = 0; i < 3; i++) box(g, 7 - i * 1.4, 0.25, 5 - i * 1.0, toon("#d7c9ae"), -6, i * 0.25, -9);
  const dark = toon("#2d2a2a");
  const l = box(g, 1.3, 4.6, 1.8, dark, -7.6, 0.75, -9); l.rotation.z = 0.1; l.castShadow = true;
  const r = box(g, 1.3, 4.6, 1.8, dark, -4.4, 0.75, -9); r.rotation.z = -0.1; r.castShadow = true;
  box(g, 5.0, 1.3, 2.0, dark, -6, 5.0, -9).castShadow = true;
  // reflecting pools with the pergola (University Mall)
  const water = new THREE.MeshStandardMaterial({ color: "#3a9fb5", roughness: 0.1, metalness: 0.2 });
  box(g, 7, 0.12, 3, water, 10, 0, -9); box(g, 7, 0.3, 0.3, toon("#c9c4bb"), 10, 0, -10.6); box(g, 7, 0.3, 0.3, toon("#c9c4bb"), 10, 0, -7.4);
  for (let x = 7; x <= 13; x += 1.5) { box(g, 0.35, 3, 0.35, toon("#d9d5ce"), x, 0, -12); box(g, 0.35, 3, 0.35, toon("#d9d5ce"), x, 0, -14); }
  for (let x = 7; x <= 13; x += 0.75) box(g, 0.2, 0.3, 2.4, toon("#d9d5ce"), x, 3, -13);
  box(g, 6.6, 0.3, 0.3, toon("#d9d5ce"), 10, 3.2, -12); box(g, 6.6, 0.3, 0.3, toon("#d9d5ce"), 10, 3.2, -14);
  // Pavilion of Harmony (red pillars, green tiled roof)
  for (const dx of [-1.4, 1.4]) for (const dz of [-1.2, 1.2]) cyl(g, 0.14, 2.8, toon("#b8352a"), 20 + dx, 0, -10 + dz, 10);
  add(g, new THREE.CylinderGeometry(0.15, 3.0, 1.5, 6), toon("#2f7a55"), 20, 3.5, -10);
  box(g, 4.2, 0.3, 3.4, toon("#cfc6b4"), 20, 0, -10);
  // globe lamps, planters, trees
  for (const x of [-16, -4, 8, 18]) lampDay(g, x, -3.2, true);
  for (const x of [-20, -12, 0, 14]) { box(g, 2.4, 0.5, 1.2, toon("#b9b4ab"), x, 0, -5.2); box(g, 2.2, 0.35, 1.0, toon("#4f8f3f"), x, 0.5, -5.2); }
  for (const [x, z] of [[-24, -10], [-18, -14], [2, -15], [26, -12]]) leafy(g, x, z, 4.2, 2.2, "#3f8a3a", 80 + x);
  spots.push({ x: -6, z: -2, r: 3.2, key: "gate" }, { x: 10, z: -2, r: 3, key: "station" }, { x: 20, z: -2, r: 3, key: "lib" });
  return { group: g, spots, ...DAY, sky: [[0, "#2a6fd4"], [0.6, "#7fb4ee"], [1, "#e3f1ff"]], fog: ["#dcecfb", 60, 240] };
}

// ------------------------------------------------------------------ character
const hero = new THREE.Group();
scene.add(hero);
let vrm = null;
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

// ---- Tripo avatar (rigged GLB, faces +X in model space). Animated procedurally: Tripo's
// retarget endpoint rejected this rig, so hips / knees / shoulders are found by position
// and swung about the body's lateral axis.
let rig = null;
const loadAvatar = () => new Promise((res) => {
  if (!hasAvatar) return res(null);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(AVATAR_URL, (gltf) => {
    const model = gltf.scene;
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; [].concat(o.material).forEach((m) => (m.userData.outlineParameters = { thickness: 0.0018, color: [0.05, 0.03, 0.04] })); } });
    const box = new THREE.Box3().setFromObject(model);
    const s = 1.78 / (box.max.y - box.min.y);
    const holder = new THREE.Group();
    model.scale.setScalar(s);
    model.position.y = -box.min.y * s;
    model.rotation.y = -Math.PI / 2;           // model +X (its forward) -> group +Z
    holder.add(model);
    holder.updateMatrixWorld(true);
    // collect bones with their rest pose and model-space position
    const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
    const bones = [];
    model.traverse((o) => { if (o.isBone) bones.push({ o, rest: o.quaternion.clone(), p: new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv) }); });
    const byName = (n) => bones.find((b) => b.o.name.replace(/[^A-Za-z0-9_]/g, "").endsWith(n.replace(/[^A-Za-z0-9_]/g, "")));
    // lateral (left-right) axis in model space is Z; express it in each bone's parent space at rest
    const lateral = new THREE.Vector3(0, 0, 1);
    const prep = (b) => {
      if (!b) return null;
      const pq = new THREE.Quaternion();
      b.o.parent.getWorldQuaternion(pq);
      const mq = new THREE.Quaternion(); model.getWorldQuaternion(mq);
      b.axis = lateral.clone().applyQuaternion(mq).applyQuaternion(pq.invert()).normalize();
      return b;
    };
    const hips = ["bone_14", "1_Left_Limb_2"].map(byName).filter(Boolean);
    const knees = ["bone_15", "1_Left_Limb_3"].map(byName).filter(Boolean);
    const arms = ["0_Right_Limb_0", "0_Left_Limb_0"].map(byName).filter(Boolean);
    const elbows = ["0_Right_Limb_1", "0_Left_Limb_1"].map(byName).filter(Boolean);
    [...hips, ...knees, ...arms, ...elbows].forEach(prep);
    const side = (b) => Math.sign(b.p.z) || 1;
    rig = { holder, hips, knees, arms, elbows, side, spine: byName("Spine_1"), head: byName("Head_0") };
    res(holder);
  }, undefined, (e) => { console.warn("avatar load failed", e); res(null); });
});
const swing = (b, a) => { if (b) b.o.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(b.axis, a)).multiply(b.rest); };

// procedural walk / idle on VRM normalized bones
const pose = (phase, amount, time) => {
  if (rig) {
    const s = Math.sin(phase);
    rig.hips.forEach((b) => swing(b, rig.side(b) * s * 0.5 * amount));
    rig.knees.forEach((b) => swing(b, -Math.max(0, -rig.side(b) * Math.sin(phase + 0.6)) * 0.85 * amount));
    rig.arms.forEach((b) => swing(b, -rig.side(b) * s * 0.4 * amount));
    rig.elbows.forEach((b) => swing(b, (0.15 + 0.2 * amount) ));
    rig.holder.position.y = Math.abs(Math.cos(phase)) * 0.025 * amount + Math.sin(time * 1.8) * 0.004 * (1 - amount);
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

// ------------------------------------------------------------------ area switching
let area = null, areaIndex = 0;
const sunOffset = new THREE.Vector3(-14, 22, 14);
const sun = new THREE.DirectionalLight("#ffffff", 2);
const hemi = new THREE.HemisphereLight("#ffffff", "#444444", 1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
sun.shadow.bias = -0.0005;
scene.add(sun, hemi, sun.target);
const builders = [areaCentral, areaUPenn, areaCUHK];
const built = [];
const titleCard = root.querySelector(".world__card");
const tabs = [...root.querySelectorAll("[data-area]")];

function setArea(i, fromEdge = 0) {
  areaIndex = (i + 3) % 3;
  if (area) scene.remove(area.group);
  area = built[areaIndex] || (built[areaIndex] = builders[areaIndex]());
  scene.add(area.group);
  scene.background = skyTex(area.sky);
  scene.fog = new THREE.Fog(...area.fog);
  hemi.color.set(area.hemi[0]); hemi.groundColor.set(area.hemi[1]); hemi.intensity = area.hemi[2];
  sun.color.set(area.sun[0]); sun.intensity = area.sun[1];
  sunOffset.set(...area.sun[2]);
  hero.position.set(fromEdge ? -fromEdge * (BOUNDS.x - 1) : 0, 0, 0.6);
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
};
tabs.forEach((b) => b.addEventListener("click", () => setArea(+b.dataset.area)));
new MutationObserver(() => { titleCard.textContent = t("areas")[areaIndex]; updateEdges(); lastSpot = null; }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

// ------------------------------------------------------------------ input
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
  if (ray.ray.intersectPlane(groundPlane, p)) target = p;
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
let phase = 0, walkAmt = 0, visible = true, autoT = 0;
const look = new THREE.Vector3(0, 2.1, -6);
const camPos = new THREE.Vector3(0, 2.9, 8.2);
const resize = () => {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 1.2 ? 58 : 40;
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(stage);
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(stage);

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  if (!visible) return;
  // input direction
  const dir = new THREE.Vector3((keys.r ? 1 : 0) - (keys.l ? 1 : 0), 0, (keys.dn ? 1 : 0) - (keys.u ? 1 : 0));
  if (target) {
    const d = target.clone().sub(hero.position); d.y = 0;
    if (d.length() < 0.15) target = null; else dir.copy(d);
  }
  // idle auto-stroll so the scene is alive before anyone interacts
  if (!active && !target && dir.lengthSq() === 0) {
    autoT += dt;
    dir.set(Math.cos(autoT * 0.25), 0, Math.sin(autoT * 0.4) * 0.35);
  }
  const moving = dir.lengthSq() > 0.0001;
  const speed = keys.run ? 5.2 : 2.6;
  if (moving) {
    dir.normalize();
    hero.position.addScaledVector(dir, speed * dt);
    const want = Math.atan2(dir.x, dir.z);
    let diff = want - hero.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    hero.rotation.y += diff * Math.min(1, dt * 10);
  }
  hero.position.z = THREE.MathUtils.clamp(hero.position.z, BOUNDS.zMin, BOUNDS.zMax);
  if (hero.position.x > BOUNDS.x) setArea(areaIndex + 1, 1);
  else if (hero.position.x < -BOUNDS.x) setArea(areaIndex - 1, -1);
  walkAmt += ((moving ? 1 : 0) - walkAmt) * Math.min(1, dt * 8);
  phase += dt * (keys.run ? 11 : 7.5) * (moving ? 1 : 0);
  pose(phase, walkAmt, time);
  if (vrm) vrm.update(dt);
  area.tick?.(dt, time);
  sun.position.copy(hero.position).add(sunOffset); sun.target.position.copy(hero.position);
  // hotspots
  showSpot(area.spots.find((s) => Math.hypot(hero.position.x - s.x, hero.position.z - s.z) < s.r) || null);
  // Persona-style follow camera (3/4, slightly above)
  const want = new THREE.Vector3(hero.position.x * 0.9, 0, hero.position.z * 0.5).add(camPos);
  camera.position.lerp(want, Math.min(1, dt * 3));
  look.lerp(new THREE.Vector3(hero.position.x * 0.92, 2.1, hero.position.z * 0.5 - 6), Math.min(1, dt * 3));
  camera.lookAt(look);
  effect.render(scene, camera);
}

setArea(0);
resize();
frame();
const avatar = await loadAvatar();
if (avatar) { hero.remove(placeholder); hero.add(avatar); }
else {
  vrm = await loadVRM();
  if (vrm) { hero.remove(placeholder); hero.add(vrm.scene); }
}
root.classList.add("is-ready");
