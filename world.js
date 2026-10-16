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
const BOUNDS = { x: 19, zMin: -1.8, zMax: 2.4 };
const AREAS = [];

function areaCentral() {
  const g = new THREE.Group();
  const spots = [];
  // street
  box(g, 120, 0.1, 60, toon("#2b2830"), 0, -0.1, -20);
  box(g, 60, 0.12, 7, toon("#4a4550"), 0, -0.1, 1.2);                // pavement
  box(g, 60, 0.12, 0.25, toon("#d8d4cc"), 0, -0.08, -2.3);             // kerb
  for (const z of [-5.5, -6.9, -9.2, -10.6]) box(g, 120, 0.02, 0.08, noLine(toon("#9a96a3")), 0, 0, z);
  // Ding Ding double-decker tram (moves along the tracks)
  const tram = new THREE.Group();
  const green = toon("#0f8f4b");
  box(tram, 9.6, 3.6, 2.4, green, 0, 0.35, 0);
  box(tram, 9.4, 0.24, 2.3, toon("#ece7da"), 0, 3.95, 0);
  const winM = noLine(new THREE.MeshBasicMaterial({ map: windowsTex(12, 2, "#0f8f4b", "#ffe9b0", "#ffe9b0", 1, 4) }));
  add(tram, new THREE.PlaneGeometry(8.8, 2.4), winM, 0, 2.3, 1.22);
  sign(tram, "DING DING · HONG KONG TRAMWAYS", 0, 1.05, 1.225, 8.4, 0.45, { vertical: false, w: 1024, h: 56, bg: "#e60012", fg: "#ffffff", font: "900 34px Inter, Arial, sans-serif" });
  for (const x of [-3.4, 3.4]) { const w = cyl(tram, 0.36, 0.2, toon("#111"), x, 0, 1.2, 12); w.rotation.x = Math.PI / 2; w.position.y = 0.36; }
  const pole = cyl(tram, 0.03, 1.8, toon("#222"), 0, 4.1, 0, 6); pole.rotation.z = 0.6;
  tram.position.set(-30, 0, -6.2);
  g.add(tram);
  // red taxi
  const taxi = new THREE.Group();
  box(taxi, 4.2, 0.9, 1.8, toon("#d81b1b"), 0, 0.32, 0);
  box(taxi, 2.4, 0.7, 1.7, toon("#e8e3d6"), 0.2, 1.2, 0);
  box(taxi, 0.6, 0.2, 0.3, noLine(glow("#fff4b0")), 0.2, 1.9, 0);
  for (const x of [-1.4, 1.4]) for (const z of [-0.9, 0.9]) { const w = cyl(taxi, 0.34, 0.24, toon("#0e0e0e"), x, 0, z, 12); w.rotation.x = Math.PI / 2; w.position.y = 0.34; }
  taxi.position.set(9, 0, -3.4);
  g.add(taxi);
  // street blocks with neon signs (close row)
  const words = ["中環", "茶餐廳", "找換", "大押", "酒吧", "金行", "地產", "涼茶"];
  const neon = ["#ff2a6d", "#05d9e8", "#ffe14d", "#ff6b35", "#7a5cff", "#3ee07a"];
  for (let i = 0; i < 12; i++) {
    const x = -27 + i * 4.9, h = 8 + ((i * 37) % 9), d = 5;
    box(g, 4.6, h, d, facade(4.6, h, d, ["#3a2a3f", "#2d2a44", "#40302a", "#2a3a3f"][i % 4], "#ffcf7a", "#241a2c", 0.45, i + 3), x, 0, -17);
    if (i % 2 === 0) {
      const col = neon[i % neon.length];
      const s = sign(g, words[i % words.length], x + 1.6, 4.5 + (i % 3), -14.4, 1.1, 3.2, { fg: col, border: col }, 0);
      s.rotation.y = Math.PI / 2 - 0.3;
    }
  }
  sign(g, "中環\nCENTRAL", 1, 6.5, -14.45, 4, 2.6, { vertical: false, w: 512, h: 340, bg: "#120610", fg: "#ffe14d", border: "#ff2a6d", font: "900 110px 'Noto Sans TC', 'PingFang TC', sans-serif" });
  // far skyline: IFC 2, Bank of China, HSBC, The Center
  const ifcM = facade(8, 150, 8, "#7b8cab", "#cfe6ff", "#5b6c8f", 0.6, 9);
  [[0, 70, 9], [70, 40, 8], [110, 28, 7], [138, 14, 6]].forEach(([y, h, w]) => box(g, w, h, w, ifcM, -24, y, -95));
  for (const sx of [-1, 1]) box(g, 1.2, 18, 1.2, toon("#a9b8d6"), -24 + sx * 2.6, 152, -95);
  const bocM = toon("#5d7aa8");
  [[0, 120], [1, 100], [2, 80]].forEach(([k, h]) => { const c = add(g, new THREE.CylinderGeometry(k === 2 ? 0.2 : 5, 6.5, h, 4), bocM, 26 + k * 2, h / 2, -110 + k * 2); c.rotation.y = Math.PI / 4; });
  for (let y = 8; y < 100; y += 16) { const x1 = add(g, new THREE.BoxGeometry(0.4, 22, 0.3), noLine(glow("#e8f0ff")), 26, y + 8, -103.8); x1.rotation.z = 0.7; const x2 = x1.clone(); x2.rotation.z = -0.7; g.add(x2); }
  box(g, 0.3, 30, 0.3, toon("#dfe7f5"), 30, 120, -106);
  box(g, 14, 70, 9, facade(14, 70, 9, "#9aa4ad", "#fff1c9", "#6c757d", 0.5, 12), 4, 0, -80);
  const ctr = box(g, 10, 110, 10, facade(10, 110, 10, "#2a1a3a", "#ffd27a", "#2c2048", 0.4, 15), 48, 0, -120);
  ["#ff3b6b", "#ff9f1c", "#ffe14d", "#3ee07a", "#3bc8ff", "#7a5cff"].forEach((c, i) => box(g, 10.2, 1.2, 10.2, noLine(glow(c)), 48, 30 + i * 12, -120));
  for (let i = 0; i < 26; i++) {
    const h = 30 + ((i * 53) % 60), x = -80 + i * 7;
    box(g, 6, h, 6, facade(6, h, 6, "#24163a", "#ffd27a", "#2c2048", 0.35, 20 + i), x, 0, -140 - (i % 3) * 12);
  }
  // near props
  for (const x of [-12, 0, 12]) lamp(g, x, -2.6);
  for (let x = -20; x <= 20; x += 2) box(g, 0.06, 1.0, 0.06, toon("#c9ccd2"), x, 0, -2.8);
  box(g, 40, 0.06, 0.06, toon("#c9ccd2"), 0, 0.95, -2.8);
  spots.push({ x: 6, z: -1, r: 3.2, key: "tram" }, { x: -12, z: -1, r: 3, key: "ifc" }, { x: 1, z: -1.2, r: 2.6, key: "neon" });
  return {
    group: g, spots, sky: [[0, "#0b0518"], [0.5, "#3b0b4a"], [0.8, "#c2185b"], [1, "#ff5a3c"]],
    fog: ["#3a1240", 40, 260], hemi: ["#7a5cff", "#2a1020", 1.1], sun: ["#ffb38a", 1.6, [-6, 10, 8]],
    tick(dt, time) { tram.position.x = ((time * 3.2) % 90) - 45; },
  };
}

function areaUPenn() {
  const g = new THREE.Group();
  const spots = [];
  box(g, 140, 0.1, 80, toon("#6f9a3c"), 0, -0.1, -25);
  // Locust Walk brick path with a herringbone-ish texture
  const bc = document.createElement("canvas"); bc.width = 64; bc.height = 32;
  const bg = bc.getContext("2d"); bg.fillStyle = "#7a2f20"; bg.fillRect(0, 0, 64, 32);
  bg.fillStyle = "#a8432e"; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) bg.fillRect(x * 16 + (y % 2) * 8 + 1, y * 8 + 1, 14, 6);
  const btex = new THREE.CanvasTexture(bc); btex.wrapS = btex.wrapT = THREE.RepeatWrapping; btex.repeat.set(30, 3); btex.colorSpace = THREE.SRGBColorSpace; btex.magFilter = THREE.NearestFilter;
  box(g, 80, 0.12, 7, new THREE.MeshStandardMaterial({ map: btex, roughness: 0.9 }), 0, -0.1, 0.4);
  // College Hall: green serpentine stone, gothic towers
  const stone = facade(30, 16, 8, "#6f8a6a", "#f3e3b5", "#2e3b2d", 0.25, 31, false);
  box(g, 30, 16, 8, stone, -6, 0, -26);
  const roof = add(g, new THREE.CylinderGeometry(0.2, 18, 7, 4), toon("#3a3f4a"), -6, 19.5, -26, Math.PI / 4); roof.scale.z = 0.35;
  for (const sx of [-1, 1]) {
    box(g, 5, 24, 5, stone, -6 + sx * 10, 0, -21);
    add(g, new THREE.ConeGeometry(3.4, 9, 8), toon("#3a3f4a"), -6 + sx * 10, 28.5, -21);
  }
  box(g, 3, 4.5, 0.3, toon("#2a1a12"), -6, 0, -21.9);
  // Fisher Fine Arts Library (terracotta)
  const terra = facade(16, 14, 9, "#b5523b", "#ffe2a8", "#4a1f16", 0.3, 33, false);
  box(g, 16, 14, 9, terra, 20, 0, -24);
  box(g, 4.5, 22, 4.5, terra, 13, 0, -19);
  add(g, new THREE.CylinderGeometry(0.1, 3.4, 6, 4), toon("#5a2a1e"), 13, 25, -19, Math.PI / 4);
  // flags
  [[-14, "#011f5b"], [-10, "#990000"], [8, "#011f5b"], [12, "#990000"]].forEach(([x, c]) => {
    cyl(g, 0.05, 7, toon("#d9d9d9"), x, 0, -6, 8);
    sign(g, "PENN", x + 0.75, 6.1, -6, 1.4, 0.9, { vertical: false, w: 256, h: 160, bg: c, fg: "#ffffff", font: "900 72px Inter, Arial, sans-serif" });
  });
  // LOVE sculpture (Robert Indiana), the Split Button, Ben Franklin bench
  const red = toon("#d0102b");
  box(g, 2.6, 0.8, 1.6, toon("#9a9a9a"), -12, 0, -4.5);
  fontReady.then(() => {
    if (!font) return;
    const mk = (s, x, y, rz = 0) => { const geo = new TextGeometry(s, { font, size: 0.95, depth: 0.35, curveSegments: 4 }); const m = add(g, geo, red, x, y, -4.6); m.rotation.z = rz; return m; };
    mk("L", -13.2, 1.95); mk("O", -12.25, 2.15, 0.35); mk("V", -13.2, 0.85); mk("E", -12.2, 0.85);
  });
  const btn = add(g, new THREE.CylinderGeometry(2.2, 2.2, 0.55, 40), toon("#f4f1e8"), 5, 1.2, -8);
  btn.rotation.set(Math.PI / 2 - 0.35, 0, 0.25);
  [[-0.6, -0.55], [0.6, -0.55], [-0.6, 0.55], [0.6, 0.55]].forEach(([a, b]) => { const h = add(btn, new THREE.CylinderGeometry(0.24, 0.24, 0.6, 16), toon("#6f9a3c"), a, 0, b); });
  const bronze = toon("#7a5a32");
  box(g, 2.4, 0.12, 0.7, bronze, 15, 0.45, -4); box(g, 2.4, 0.7, 0.1, bronze, 15, 0.5, -4.35);
  for (const [x, y, z] of [[15.4, 0.9, -4]]) { ball(g, 0.34, bronze, x, y, z, [1, 1.3, 1]); ball(g, 0.2, bronze, x, y + 0.6, z); }
  // autumn trees
  const leaves = ["#d9822b", "#c4442a", "#e8b13a", "#b8541f"];
  for (let i = 0; i < 18; i++) tree(g, -40 + i * 4.8, -12 - (i % 3) * 3, 4 + (i % 3), 2.2, leaves[i % 4], "#4a3020", 50 + i);
  for (const x of [-16, 2, 18]) tree(g, x, -4.5, 4.2, 1.8, leaves[(x + 20) % 4], "#4a3020", 90 + x);
  for (const x of [-8, 8]) lamp(g, x, -3, "#fff1b8", "#1b1b1b");
  spots.push({ x: -12, z: -3, r: 3, key: "love" }, { x: 5, z: -5.5, r: 3.4, key: "button" }, { x: -6, z: -3.2, r: 2.6, key: "hall" });
  return {
    group: g, spots, sky: [[0, "#6e5aa8"], [0.45, "#f2826b"], [0.75, "#ffb36b"], [1, "#ffd08a"]],
    fog: ["#f2b08a", 50, 220], hemi: ["#ffe0b0", "#5a7a3a", 1.4], sun: ["#ffd9a8", 2.2, [-10, 12, 6]],
  };
}

function areaCUHK() {
  const g = new THREE.Group();
  const spots = [];
  box(g, 160, 0.1, 90, toon("#79b85a"), 0, -0.1, -30);
  box(g, 80, 0.12, 7, toon("#cfc4ae"), 0, -0.1, 0.4);
  // Ma On Shan ridge + Tolo Harbour
  box(g, 400, 0.2, 80, toon("#3da6d9"), 0, -0.4, -120);
  [[-90, 60, 44], [-30, 50, 60], [10, 34, 78], [60, 60, 52], [120, 70, 40]].forEach(([x, s, h]) => ball(g, 1, toon("#5e8f5a"), x, -4, -190, [s, h, 18]));
  [[-40, 30], [0, 34], [45, 28]].forEach(([x, s]) => ball(g, 1, toon("#6fb24f"), x, -6, -60, [s, 16, 14]));
  // University Library (modernist concrete, fins)
  const conc = facade(18, 12, 10, "#d8d2c4", "#bfe3ff", "#6b7f8c", 0.25, 41, false);
  box(g, 18, 12, 10, conc, -14, 0, -30);
  for (let y = 2; y < 12; y += 2.4) box(g, 18.6, 0.35, 0.6, toon("#efe9db"), -14, y, -24.8);
  box(g, 12, 18, 10, facade(12, 18, 10, "#e3ddd0", "#bfe3ff", "#6b7f8c", 0.25, 44, false), 18, 0, -34);
  // Gate of Wisdom (Ju Ming)
  const rust = toon("#8b5e3c");
  const l = box(g, 1.2, 5.2, 1.8, rust, -4, 0, -9); l.rotation.z = 0.12;
  const r = box(g, 1.2, 5.2, 1.8, rust, -0.6, 0, -9); r.rotation.z = -0.12;
  box(g, 4.8, 1.1, 1.9, rust, -2.3, 5.0, -9);
  // Chinese pavilion
  for (const dx of [-1.6, 1.6]) for (const dz of [-1.2, 1.2]) cyl(g, 0.15, 3, toon("#c0392b"), 12 + dx, 0, -10 + dz, 10);
  add(g, new THREE.CylinderGeometry(0.2, 3.4, 1.8, 4), toon("#2f6d4a"), 12, 3.9, -10, Math.PI / 4);
  box(g, 4.8, 0.25, 4, toon("#cfc6b4"), 12, 0, -10);
  // University MTR station sign
  sign(g, "大學\nUniversity", -14, 2.6, -5, 4.6, 1.5, { vertical: false, w: 640, h: 210, bg: "#1f8a4c", fg: "#ffffff", font: "800 74px 'Noto Sans TC', 'PingFang TC', Inter, sans-serif" });
  for (const dx of [-2, 2]) cyl(g, 0.06, 1.9, toon("#3a3a3a"), -14 + dx, 0, -5.05, 8);
  // CUHK purple & gold banners
  for (const x of [-20, -8, 4, 16]) {
    cyl(g, 0.05, 5.2, toon("#cfcfcf"), x, 0, -5.5, 8);
    sign(g, "CUHK", x + 0.45, 4.0, -5.5, 0.8, 2, { vertical: false, w: 128, h: 320, bg: "#5b2c83", fg: "#d4a514", font: "900 48px Inter, Arial, sans-serif" });
  }
  // bauhinia (pink) + green trees
  for (let i = 0; i < 16; i++) tree(g, -36 + i * 5, -16 - (i % 2) * 4, 4 + (i % 3), 2, i % 3 === 0 ? "#e85d9c" : "#3f8f3a", "#4a3020", 70 + i);
  for (const x of [-18, 6]) tree(g, x, -4.2, 3.8, 1.6, "#e85d9c", "#4a3020", 99 + x);
  for (const x of [-8, 14]) lamp(g, x, -3, "#ffffff", "#3b3b44");
  spots.push({ x: -2.3, z: -6.5, r: 3, key: "gate" }, { x: -14, z: -3, r: 3, key: "station" }, { x: 12, z: -7.5, r: 3, key: "lib" });
  return {
    group: g, spots, sky: [[0, "#3a8fd1"], [0.6, "#9fdcf5"], [1, "#e6f7ff"]],
    fog: ["#cfeefa", 60, 300], hemi: ["#ffffff", "#5a8a3a", 1.5], sun: ["#fff4dc", 2.4, [-8, 14, 10]],
  };
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
const sun = new THREE.DirectionalLight("#ffffff", 2);
const hemi = new THREE.HemisphereLight("#ffffff", "#444444", 1);
scene.add(sun, hemi);
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
  sun.color.set(area.sun[0]); sun.intensity = area.sun[1]; sun.position.set(...area.sun[2]);
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
