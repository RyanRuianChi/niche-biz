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
const DEBUG = params.has("debug");

// Only show once the real avatar exists (or when previewing with ?scene=preview).
const exists = (u) => fetch(u, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
let AVATAR_URL = params.get("avatar");
if (!AVATAR_URL) for (const u of ["assets/models/avatar-v3.glb", "assets/models/avatar-v2.glb", "assets/models/avatar.glb"]) if (await exists(u)) { AVATAR_URL = u; break; }
const hasAvatar = !!AVATAR_URL && (await exists(AVATAR_URL));
const hasVRM = !hasAvatar && (await exists(VRM_URL));
const LIVE = false;   // flip once the user approves the 3D section
if ((!LIVE || (!hasAvatar && !hasVRM)) && params.get("scene") !== "preview") await new Promise(() => {});   // stay hidden until the avatar exists
root.hidden = false;

// ------------------------------------------------------------------ text (5 languages)
// s.<spot> = [place name, Mr.RC's line]
const TXT = {
  en: { hint: "WASD / arrows to walk · Shift to run · E or tap ! to check a place", eve: "Evening", next: "To", check: "Check",
    areas: ["Central · Hong Kong", "UPenn · Philadelphia", "CUHK · Hong Kong", "Marina Bay · Singapore", "Manhattan · New York"],
    s: {
      neon: ["Des Voeux Road", "Central at night. Where I started cofounding crypto projects at 19."],
      tram: ["Ding Ding tram stop", "Ding ding! The HK tram: the best HK$3.3 city tour."],
      court: ["Court of Final Appeal", "Granite columns and a dome from 1912. It used to be the Legislative Council."],
      hsbc: ["HSBC Main Building", "Stephen and Stitt, the bronze lions, have guarded it since 1935. Rub a paw for luck."],
      boc: ["Bank of China Tower", "I. M. Pei's tower, shaped like bamboo shoots growing ever upward."],
      wheel: ["Observation Wheel", "The best seat for Victoria Harbour at night."],
      ferry: ["Star Ferry · Central Pier", "Crossing the harbour since 1888, for a few dollars."],
      ifc: ["Two IFC", "IFC. Where Hong Kong's big deals get done."],
      quad: ["The Quad", "Gothic dorms and gates. Penn at its most Hogwarts."],
      love: ["LOVE", "LOVE. The most photographed corner at Penn."],
      button: ["The Split Button", "The Split Button. Yes, it is a giant button."],
      franklin: ["Ben Franklin", "Penn's founder, keeping watch over College Hall."],
      hall: ["College Hall", "Wharton exchange, 2025. Joined FranklinDAO, Penn's blockchain club."],
      fisher: ["Fisher Fine Arts Library", "Red sandstone outside, a cathedral of a reading room inside. Best study spot on campus."],
      station: ["University Station", "University Station. Every CUHK day starts here."],
      lake: ["Lake Ad Excellentiam", "The fountain, the red pavilion, and late walks after exams."],
      gate: ["Gate of Wisdom", "Gate of Wisdom by Ju Ming."],
      lib: ["University Library", "Global Business & Computer Science. Full scholarship, honors entry."],
      science: ["Science Centre", "The brutalist 'spaceship' wearing the CUHK crest."],
      tower: ["New Asia Water Tower", "The water tower and its amphitheatre, where sunsets and student events happen."],
      pool: ["Pavilion of Harmony", "The infinity pool looking out over Tolo Harbour. The CUHK view."],
      flyer: ["Singapore Flyer", "165 metres above Marina Bay."],
      fullerton: ["The Fullerton", "Once the General Post Office, now a hotel on the water."],
      merlion: ["Merlion", "Half lion, half fish, spouting into Marina Bay since 1972."],
      esplanade: ["Esplanade", "Officially a theatre. Everyone calls it the durian."],
      artscience: ["ArtScience Museum", "A lotus opening toward the bay."],
      helix: ["Helix Bridge", "Curled like DNA. The best walk at night."],
      mbs: ["Marina Bay Sands", "Three towers carrying a 340-metre SkyPark."],
      gardens: ["Gardens by the Bay", "The Supertrees. Stay for the light show."],
      times: ["Times Square", "Screens brighter than daylight, at any hour."],
      flatiron: ["Flatiron Building", "1902. A steel wedge where Fifth Avenue meets Broadway."],
      gct: ["Grand Central Terminal", "Meet me under the clock."],
      bethesda: ["Bethesda Fountain", "The Angel of the Waters, in the middle of Central Park."],
      brooklyn: ["Brooklyn Bridge", "Walk it at night with Manhattan lit up behind you."],
    } },
  "zh-Hant": { hint: "WASD / 方向鍵 行走 · Shift 跑步 · 按 E 或點擊 ! 查看地點", eve: "傍晚", next: "前往", check: "查看",
    areas: ["中環 · 香港", "賓州大學 · 費城", "香港中文大學 · 香港", "濱海灣 · 新加坡", "曼哈頓 · 紐約"],
    s: {
      neon: ["德輔道中", "夜晚的中環。我 19 歲開始聯合創辦加密項目的地方。"],
      tram: ["叮叮電車站", "叮叮！香港電車：HK$3.3 的最佳城市導覽。"],
      court: ["終審法院", "1912 年的花崗岩柱與圓頂，曾經是立法會大樓。"],
      hsbc: ["滙豐總行大廈", "銅獅史提芬與施迪，自 1935 年起守護這裡。摸摸獅爪轉好運。"],
      boc: ["中銀大廈", "貝聿銘設計，像節節上升的竹子。"],
      wheel: ["香港摩天輪", "夜晚看維港的最佳座位。"],
      ferry: ["天星小輪 · 中環碼頭", "自 1888 年起往返維港，只需幾塊錢。"],
      ifc: ["國際金融中心二期", "國際金融中心。香港大交易的發生地。"],
      quad: ["四方院", "哥德式宿舍與拱門，最像霍格華茲的賓大。"],
      love: ["LOVE 雕塑", "LOVE 雕塑。賓大最多人拍照的角落。"],
      button: ["裂開的鈕扣", "裂開的鈕扣。對，就是一顆巨大的鈕扣。"],
      franklin: ["富蘭克林像", "賓大創辦人，守望著學院大樓。"],
      hall: ["學院大樓", "2025 年華頓交換。加入了賓大區塊鏈學會 FranklinDAO。"],
      fisher: ["費舍爾美術圖書館", "外面是紅砂岩，裡面是教堂般的閱覽室。校園最佳溫書地點。"],
      station: ["大學站", "大學站。每一天中大生活的起點。"],
      lake: ["未圓湖", "噴泉、紅色涼亭，還有考完試後的夜行。"],
      gate: ["智慧之門", "朱銘的「智慧之門」。"],
      lib: ["大學圖書館", "環球商業及電腦科學。全額獎學金、榮譽入學。"],
      science: ["科學館", "戴著中大校徽的粗獷主義「太空船」。"],
      tower: ["新亞水塔", "水塔與圓形劇場，看日落和辦學生活動的地方。"],
      pool: ["天人合一亭", "望向吐露港的無邊際水池。中大的經典景色。"],
      flyer: ["新加坡摩天觀景輪", "濱海灣上空 165 米。"],
      fullerton: ["富麗敦酒店", "前身是郵政總局，現在是水邊的酒店。"],
      merlion: ["魚尾獅", "半獅半魚，自 1972 年起向濱海灣噴水。"],
      esplanade: ["濱海藝術中心", "正式名稱是劇院，大家都叫它榴槤。"],
      artscience: ["藝術科學博物館", "向海灣綻放的蓮花。"],
      helix: ["雙螺旋橋", "像 DNA 一樣捲曲，晚上散步最好。"],
      mbs: ["濱海灣金沙", "三座大樓托起 340 米長的空中花園。"],
      gardens: ["濱海灣花園", "超級樹。留下來看燈光秀。"],
      times: ["時代廣場", "任何時候，螢幕都比白天還亮。"],
      flatiron: ["熨斗大廈", "1902 年，第五大道與百老匯交會處的鋼鐵楔子。"],
      gct: ["中央車站", "在大鐘下見。"],
      bethesda: ["畢士達噴泉", "中央公園正中的水之天使。"],
      brooklyn: ["布魯克林大橋", "晚上走一趟，身後是亮起的曼哈頓。"],
    } },
  ja: { hint: "WASD / 矢印キーで歩く · Shift で走る · E か ! をタップで調べる", eve: "夕方", next: "行き先", check: "調べる",
    areas: ["中環 · 香港", "ペンシルベニア大学 · フィラデルフィア", "香港中文大学 · 香港", "マリーナベイ · シンガポール", "マンハッタン · ニューヨーク"],
    s: {
      neon: ["デ・ヴー・ロード", "夜の中環。19歳でクリプト事業を共同創業し始めた場所。"],
      tram: ["トラム停留所", "ディンディン！香港トラム：HK$3.3 の最高の街めぐり。"],
      court: ["終審法院", "1912年の花崗岩の柱とドーム。かつての立法会ビル。"],
      hsbc: ["HSBC本店ビル", "ブロンズの獅子スティーブンとスティット。1935年からここを守る。足をなでると運が開ける。"],
      boc: ["中国銀行タワー", "I・M・ペイ設計。伸びゆく竹のようなタワー。"],
      wheel: ["香港観覧車", "夜のビクトリア・ハーバーを眺める特等席。"],
      ferry: ["スターフェリー · 中環埠頭", "1888年から、数ドルで湾を渡る。"],
      ifc: ["IFC 2", "IFC。香港の大型ディールが動く場所。"],
      quad: ["ザ・クワッド", "ゴシック様式の寮と門。一番ホグワーツっぽいペン。"],
      love: ["LOVE", "LOVE。ペンで一番写真を撮られる場所。"],
      button: ["割れたボタン", "割れたボタン。そう、巨大なボタンです。"],
      franklin: ["フランクリン像", "ペンの創設者が、カレッジ・ホールを見守る。"],
      hall: ["カレッジ・ホール", "2025年ウォートン交換留学。ペンのブロックチェーンクラブ FranklinDAO に参加。"],
      fisher: ["フィッシャー美術図書館", "外は赤砂岩、中は大聖堂のような閲覧室。キャンパスで一番の勉強場所。"],
      station: ["大学駅", "大学駅。中大の一日はここから始まる。"],
      lake: ["未圓湖", "噴水、赤い東屋、試験後の夜の散歩。"],
      gate: ["智慧の門", "朱銘の「智慧の門」。"],
      lib: ["大学図書館", "グローバルビジネス＆CS。全額奨学金・優等入学。"],
      science: ["サイエンスセンター", "中大の校章をつけたブルータリズムの「宇宙船」。"],
      tower: ["新亜水塔", "給水塔と円形劇場。夕日と学生イベントの場所。"],
      pool: ["天人合一亭", "吐露港を望むインフィニティプール。中大を代表する景色。"],
      flyer: ["シンガポール・フライヤー", "マリーナベイの上空165メートル。"],
      fullerton: ["フラトン", "かつての郵便局。今は水辺のホテル。"],
      merlion: ["マーライオン", "半分ライオン、半分魚。1972年からマリーナベイに水を吐く。"],
      esplanade: ["エスプラネード", "正式には劇場。みんなドリアンと呼ぶ。"],
      artscience: ["アートサイエンス・ミュージアム", "湾に向かって開く蓮の花。"],
      helix: ["ヘリックス橋", "DNAのようならせん。夜の散歩に最高。"],
      mbs: ["マリーナベイ・サンズ", "3棟のタワーが340メートルのスカイパークを支える。"],
      gardens: ["ガーデンズ・バイ・ザ・ベイ", "スーパーツリー。ライトショーまで待って。"],
      times: ["タイムズスクエア", "いつでも昼より明るいスクリーン。"],
      flatiron: ["フラットアイアン・ビル", "1902年。五番街とブロードウェイが交わる鉄のくさび。"],
      gct: ["グランド・セントラル駅", "時計の下で会おう。"],
      bethesda: ["ベセスダの噴水", "セントラルパークの真ん中に立つ水の天使。"],
      brooklyn: ["ブルックリン橋", "夜に渡ろう。背後に輝くマンハッタン。"],
    } },
  ko: { hint: "WASD / 방향키로 걷기 · Shift 달리기 · E 또는 ! 를 탭해 살펴보기", eve: "저녁", next: "이동", check: "살펴보기",
    areas: ["센트럴 · 홍콩", "펜실베이니아대 · 필라델피아", "홍콩중문대 · 홍콩", "마리나 베이 · 싱가포르", "맨해튼 · 뉴욕"],
    s: {
      neon: ["데보로드", "밤의 센트럴. 19살에 크립토 프로젝트를 공동 창업하기 시작한 곳."],
      tram: ["트램 정류장", "딩딩! 홍콩 트램: HK$3.3짜리 최고의 시티 투어."],
      court: ["종심법원", "1912년의 화강암 기둥과 돔. 예전 입법회 건물."],
      hsbc: ["HSBC 본점", "청동 사자 스티븐과 스팃이 1935년부터 지키고 있다. 발을 만지면 행운이."],
      boc: ["중국은행 타워", "I. M. 페이의 작품. 쑥쑥 자라는 죽순 같은 타워."],
      wheel: ["홍콩 관람차", "밤의 빅토리아 하버를 보는 최고의 자리."],
      ferry: ["스타페리 · 센트럴 부두", "1888년부터 몇 달러로 바다를 건넌다."],
      ifc: ["IFC 2", "IFC. 홍콩의 큰 딜이 성사되는 곳."],
      quad: ["더 쿼드", "고딕 기숙사와 문. 가장 호그와트 같은 펜."],
      love: ["LOVE", "LOVE. 펜에서 가장 많이 사진 찍히는 곳."],
      button: ["갈라진 단추", "갈라진 단추. 네, 거대한 단추예요."],
      franklin: ["프랭클린 동상", "펜의 설립자가 칼리지 홀을 지켜본다."],
      hall: ["칼리지 홀", "2025년 와튼 교환학생. 펜 블록체인 클럽 FranklinDAO 가입."],
      fisher: ["피셔 미술 도서관", "밖은 붉은 사암, 안은 성당 같은 열람실. 캠퍼스 최고의 공부 장소."],
      station: ["대학역", "대학역. 중문대의 하루는 여기서 시작된다."],
      lake: ["미원호", "분수, 붉은 정자, 시험 끝난 밤의 산책."],
      gate: ["지혜의 문", "주밍의 '지혜의 문'."],
      lib: ["대학 도서관", "글로벌 비즈니스 & 컴퓨터공학. 전액 장학금, 우등 입학."],
      science: ["과학관", "중문대 문장을 단 브루탈리즘 '우주선'."],
      tower: ["신아 급수탑", "급수탑과 원형 극장. 노을과 학생 행사의 장소."],
      pool: ["천인합일정", "투로항을 바라보는 인피니티 풀. 중문대의 대표 풍경."],
      flyer: ["싱가포르 플라이어", "마리나 베이 위 165미터."],
      fullerton: ["풀러턴", "예전 우체국, 지금은 물가의 호텔."],
      merlion: ["멀라이언", "반은 사자, 반은 물고기. 1972년부터 마리나 베이에 물을 뿜는다."],
      esplanade: ["에스플러네이드", "공식적으로는 극장. 다들 두리안이라 부른다."],
      artscience: ["아트사이언스 뮤지엄", "만을 향해 피어나는 연꽃."],
      helix: ["헬릭스 브리지", "DNA처럼 꼬인 다리. 밤 산책에 최고."],
      mbs: ["마리나 베이 샌즈", "세 개의 타워가 340미터 스카이파크를 떠받친다."],
      gardens: ["가든스 바이 더 베이", "슈퍼트리. 라이트 쇼까지 기다려 봐."],
      times: ["타임스 스퀘어", "언제나 낮보다 밝은 스크린."],
      flatiron: ["플랫아이언 빌딩", "1902년. 5번가와 브로드웨이가 만나는 강철 쐐기."],
      gct: ["그랜드 센트럴 터미널", "시계 아래에서 만나."],
      bethesda: ["베데스다 분수", "센트럴 파크 한가운데의 물의 천사."],
      brooklyn: ["브루클린 브리지", "밤에 걸어 봐. 뒤로 빛나는 맨해튼."],
    } },
  fr: { hint: "ZQSD / flèches pour marcher · Maj pour courir · E ou touche ! pour examiner", eve: "Soir", next: "Vers", check: "Examiner",
    areas: ["Central · Hong Kong", "UPenn · Philadelphie", "CUHK · Hong Kong", "Marina Bay · Singapour", "Manhattan · New York"],
    s: {
      neon: ["Des Voeux Road", "Central la nuit. Là où j’ai commencé à cofonder des projets crypto à 19 ans."],
      tram: ["Arrêt du tram", "Ding ding ! Le tram de HK : la meilleure visite de la ville pour 3,3 HK$."],
      court: ["Cour d’appel final", "Colonnes de granit et dôme de 1912 : l’ancien Conseil législatif."],
      hsbc: ["Siège de HSBC", "Stephen et Stitt, les lions de bronze, le gardent depuis 1935. Frotte une patte pour la chance."],
      boc: ["Bank of China Tower", "La tour d’I. M. Pei, comme des pousses de bambou qui montent toujours."],
      wheel: ["Grande roue", "La meilleure place sur le port Victoria la nuit."],
      ferry: ["Star Ferry · Central Pier", "Traverse le port depuis 1888, pour quelques dollars."],
      ifc: ["Two IFC", "IFC. Là où se signent les grosses affaires de Hong Kong."],
      quad: ["The Quad", "Dortoirs et portes gothiques : Penn version Poudlard."],
      love: ["LOVE", "LOVE. Le coin le plus photographié de Penn."],
      button: ["Le Split Button", "Le Split Button. Oui, c’est un bouton géant."],
      franklin: ["Ben Franklin", "Le fondateur de Penn veille sur College Hall."],
      hall: ["College Hall", "Échange à Wharton, 2025. Membre de FranklinDAO, le club blockchain de Penn."],
      fisher: ["Fisher Fine Arts Library", "Grès rouge dehors, salle de lecture-cathédrale dedans. Le meilleur endroit pour réviser."],
      station: ["Station University", "Station University. Chaque journée à CUHK commence ici."],
      lake: ["Lac Ad Excellentiam", "La fontaine, le pavillon rouge et les balades après les examens."],
      gate: ["Porte de la Sagesse", "La Porte de la Sagesse, de Ju Ming."],
      lib: ["Bibliothèque universitaire", "Global Business & informatique. Bourse complète, admission avec mention."],
      science: ["Science Centre", "Le « vaisseau spatial » brutaliste aux armes de CUHK."],
      tower: ["Château d’eau de New Asia", "Le château d’eau et son amphithéâtre : couchers de soleil et événements étudiants."],
      pool: ["Pavillon de l’Harmonie", "La piscine à débordement face au port de Tolo. LA vue de CUHK."],
      flyer: ["Singapore Flyer", "165 mètres au-dessus de Marina Bay."],
      fullerton: ["The Fullerton", "Ancienne poste centrale, aujourd’hui un hôtel au bord de l’eau."],
      merlion: ["Merlion", "Mi-lion, mi-poisson, il crache dans Marina Bay depuis 1972."],
      esplanade: ["Esplanade", "Officiellement un théâtre. Tout le monde l’appelle le durian."],
      artscience: ["ArtScience Museum", "Un lotus qui s’ouvre vers la baie."],
      helix: ["Helix Bridge", "Enroulé comme de l’ADN. La plus belle balade de nuit."],
      mbs: ["Marina Bay Sands", "Trois tours qui portent un SkyPark de 340 mètres."],
      gardens: ["Gardens by the Bay", "Les Supertrees. Reste pour le spectacle de lumière."],
      times: ["Times Square", "Des écrans plus lumineux que le jour, à toute heure."],
      flatiron: ["Flatiron Building", "1902. Un coin d’acier entre la Cinquième Avenue et Broadway."],
      gct: ["Grand Central Terminal", "Rendez-vous sous l’horloge."],
      bethesda: ["Fontaine Bethesda", "L’Ange des Eaux, au cœur de Central Park."],
      brooklyn: ["Pont de Brooklyn", "Traverse-le de nuit, Manhattan illuminé derrière toi."],
    } },
};
const lang = () => (TXT[document.documentElement.lang] ? document.documentElement.lang : "en");
const t = (k) => TXT[lang()][k] ?? TXT.en[k];
const spotText = (k) => TXT[lang()].s[k] ?? TXT.en.s[k];

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

// ------------------------------------------------------------------ wet ground + water (planar reflection, smeared + rippled)
const GroundShader = {
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    map: { value: null }, wetMap: { value: null }, mapInfo: { value: new THREE.Vector4(0, 8, -10, 20) },
    time: { value: 0 }, ambient: { value: new THREE.Color(0.32, 0.36, 0.46) }, mirror: { value: 0 },
    cuts: { value: [new THREE.Vector4(), new THREE.Vector4()] },
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
    uniform vec4 mapInfo; uniform float time, mirror; uniform vec3 ambient; uniform vec4 cuts[2];
    varying vec4 vUv; varying vec2 vW;
    #include <fog_pars_fragment>
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.0), f.x), f.y); }
    void main(){
      for (int i = 0; i < 2; i++) { vec4 c = cuts[i]; if (c.w > 0.5 && vW.x > c.x && vW.x < c.y && vW.y < c.z) discard; }   // water cut-outs
      vec2 muv = vec2((vW.x - mapInfo.x) / mapInfo.y, (vW.y - mapInfo.z) / mapInfo.w);
      vec3 alb = texture2D(map, muv).rgb;
      float wet = texture2D(wetMap, muv).r;
      float n = vn(vW * 0.42) * 0.65 + vn(vW * 1.9 + 3.0) * 0.35;
      float puddle = max(smoothstep(0.5, 0.66, n) * wet, mirror);
      vec2 rip = vec2(vn(vW * 3.0 + time * 1.3), vn(vW * 3.0 - time * 1.5 + 7.0)) - 0.5;
      float smear = mix(0.02, 0.006, puddle) + mirror * 0.01;
      vec4 uv = vUv; uv.xy += rip * (mix(0.008, 0.003, puddle) + mirror * 0.012) * uv.w;
      vec3 refl = vec3(0.0); float tot = 0.0;
      for (int i = -2; i <= 5; i++) { float k = 1.0 - abs(float(i)) / 6.0; vec4 u = uv; u.y += float(i) * smear * u.w; refl += texture2DProj(tDiffuse, u).rgb * k; tot += k; }
      refl /= tot;
      float spec = wet * mix(0.42, 0.95, puddle);
      vec3 c = alb * ambient * (1.0 - 0.55 * puddle * (1.0 - mirror)) + refl * spec * color;
      gl_FragColor = vec4(c, 1.0);
      #include <fog_fragment>
    }`,
};
const reflectors = [];
const mirrorRes = (k) => Math.min(1024, Math.round(innerWidth * PR * k));
const makeMirror = (w, d, k, color = 0xd8e2ff) => {
  const s = mirrorRes(k);
  const m = new Reflector(new THREE.PlaneGeometry(w, d), { shader: GroundShader, textureWidth: s, textureHeight: Math.round(s * 0.56), color, multisample: 0 });
  m.material.fog = true;
  m.material.userData.outlineParameters = { visible: false };
  m.material.uniforms.cuts.value = [new THREE.Vector4(), new THREE.Vector4()];
  m.rotation.x = -Math.PI / 2;
  m.userData.dyn = true;
  m.userData.res = k;
  reflectors.push(m);
  return m;
};
// ground painted along its full length: paint(P) draws with world-space helpers (see painter below)
const wetGround = (g, { x0, len, z0, span, paint, cuts = [] }) => {
  const ppm = Math.min(24, Math.floor(4000 / len));
  const albedo = document.createElement("canvas"), wet = document.createElement("canvas");
  albedo.width = wet.width = Math.round(len * ppm); albedo.height = wet.height = Math.round(span * ppm);
  const ga = albedo.getContext("2d"), gw = wet.getContext("2d");
  gw.fillStyle = "#fff"; gw.fillRect(0, 0, wet.width, wet.height);
  paint(painter(ga, gw, (x) => (x - x0) * ppm, (z) => (z - z0) * ppm, ppm));
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const m = makeMirror(len, span, 0.5);
  const u = m.material.uniforms;
  u.map.value = tex(albedo, true); u.wetMap.value = tex(wet, false); u.mapInfo.value.set(x0, len, z0, span);
  cuts.forEach((c, i) => u.cuts.value[i].set(c[0], c[1], c[2], 1));
  m.position.set(x0 + len / 2, 0, z0 + span / 2);
  g.add(m);
  return m;
};
const waterTex = canvasTex(2, 2, (g) => { g.fillStyle = "#0a1520"; g.fillRect(0, 0, 2, 2); });
const whiteTex = canvasTex(2, 2, (g) => { g.fillStyle = "#fff"; g.fillRect(0, 0, 2, 2); });
// harbour / lake / river surface sunk below a stone edge at z = zEdge
const water = (g, x0, x1, z0, z1, y = -0.45) => {
  const m = makeMirror(x1 - x0, z1 - z0, 0.35, 0xc8d6f0);
  const u = m.material.uniforms;
  u.map.value = waterTex; u.wetMap.value = whiteTex; u.mirror.value = 1;
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  g.add(m);
  return m;
};
const painter = (ga, gw, X, Z, ppm) => {
  const wetc = (w) => { const v = Math.round(w * 255); return `rgb(${v},${v},${v})`; };
  const r = (x0, x1, z0, z1) => [X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0)];
  const P = {
    ppm, X, Z,
    fill(x0, x1, z0, z1, c, wet = 1) { ga.fillStyle = c; ga.fillRect(...r(x0, x1, z0, z1)); gw.fillStyle = wetc(wet); gw.fillRect(...r(x0, x1, z0, z1)); return P; },
    noise(x0, x1, z0, z1, base, R, amt = 20, wet = 1) {
      P.fill(x0, x1, z0, z1, base, wet);
      const [px, pz, pw, ph] = r(x0, x1, z0, z1), n = pw * ph / 300;
      for (let i = 0; i < n; i++) { const v = (R() - 0.5) * amt; ga.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`; ga.fillRect(px + R() * pw, pz + R() * ph, 2 + R() * 5, 2 + R() * 5); }
      return P;
    },
    tiles(x0, x1, z0, z1, a, line, size, wet = 1) {
      P.fill(x0, x1, z0, z1, a, wet);
      ga.strokeStyle = line; ga.lineWidth = 1.5;
      const [px, pz, pw, ph] = r(x0, x1, z0, z1), s = size * ppm;
      ga.beginPath();
      for (let i = px; i <= px + pw; i += s) { ga.moveTo(i, pz); ga.lineTo(i, pz + ph); }
      for (let j = pz; j <= pz + ph; j += s) { ga.moveTo(px, j); ga.lineTo(px + pw, j); }
      ga.stroke();
      return P;
    },
    bricks(x0, x1, z0, z1, R, colors, base = "#4d2219", wet = 1) {
      P.fill(x0, x1, z0, z1, base, wet);
      const [px, pz, pw, ph] = r(x0, x1, z0, z1), bw = 0.24 * ppm, bh = 0.11 * ppm;
      for (let y = pz, k = 0; y < pz + ph; y += bh, k++) for (let x = px - (k % 2) * bw / 2; x < px + pw; x += bw) { ga.fillStyle = pick(R, colors); ga.fillRect(Math.max(px, x) + 0.5, y + 0.5, bw - 1, bh - 1); }
      return P;
    },
    stripe(x0, x1, z, w, c, dash = 0) {   // line along x at z (width w metres); dash = on/off length
      ga.fillStyle = c;
      if (!dash) ga.fillRect(X(x0), Z(z - w / 2), X(x1) - X(x0), w * ppm);
      else for (let x = x0; x < x1; x += dash * 2) ga.fillRect(X(x), Z(z - w / 2), dash * ppm, w * ppm);
      return P;
    },
    zebra(x, z0, z1, c = "#d9d9d4", w = 3.2) { for (let z = z0; z < z1; z += 0.9) { ga.fillStyle = c; ga.fillRect(X(x - w / 2), Z(z), w * ppm, 0.5 * ppm); } return P; },
    disc(x, z, rad, c, wet = 1) { ga.fillStyle = c; ga.beginPath(); ga.arc(X(x), Z(z), rad * ppm, 0, Math.PI * 2); ga.fill(); gw.fillStyle = wetc(wet); gw.beginPath(); gw.arc(X(x), Z(z), rad * ppm, 0, Math.PI * 2); gw.fill(); return P; },
    ring(x, z, rad, w, c) { ga.strokeStyle = c; ga.lineWidth = w * ppm; ga.beginPath(); ga.arc(X(x), Z(z), rad * ppm, 0, Math.PI * 2); ga.stroke(); return P; },
    meander(x0, x1, z, c = "#9a978f", bg = "#2c2c32") {
      P.fill(x0, x1, z - 0.3, z + 0.3, bg);
      ga.strokeStyle = c; ga.lineWidth = 2; ga.beginPath();
      const y = Z(z), u = 0.25 * ppm;
      for (let x = X(x0); x < X(x1); x += 4 * u) { ga.moveTo(x, y + u); ga.lineTo(x + u, y + u); ga.lineTo(x + u, y - u); ga.lineTo(x + 3 * u, y - u); ga.lineTo(x + 3 * u, y + u * 0.4); ga.lineTo(x + 2 * u, y + u * 0.4); ga.lineTo(x + 2 * u, y - u * 0.2); }
      ga.stroke();
      return P;
    },
  };
  return P;
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
const tickCrowd = (crowd, dt, time) => {
  for (const n of crowd) {
    if (n.speed) {
      n.g.position.x += n.dir * n.speed * dt;
      const xa = n.xa ?? -L - 12, xb = n.xb ?? L + 12;
      if (n.dir > 0 && n.g.position.x > xb) n.g.position.x = xa; else if (n.dir < 0 && n.g.position.x < xa) n.g.position.x = xb;
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
// Each area is a 120 m walk along x (crossing an end loads the next area). Zones along the walk hold
// the landmarks from the reference paintings; each landmark has a spot: a floating "!" the hero can
// walk up to and check (E / tap), which swings the camera onto the landmark and shows Mr.RC's line.
const L = 60;
const SKY = (top, mid, low) => canvasTex(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.62, mid); gr.addColorStop(1, low); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); });
const NEON = ["#ff3b5c", "#ffd23f", "#3bf0ff", "#ff6ad5", "#7dff8a", "#ffffff", "#ff8a3b"];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// ---- geometry helpers
const gableGeo = (len, h, base) => {   // triangular prism, ridge along x, base on y = 0
  const g = new THREE.CylinderGeometry(1, 1, len, 3);
  g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2); g.translate(0, 0.5, 0); g.scale(1, h / 1.5, base / 1.732);
  return g;
};
const hipGeo = (w, h, d) => { const g = new THREE.ConeGeometry(0.7071, 1, 4); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); g.scale(w, h, d); return g; };
const strut = (p, a, b, r, mat, seg = 6) => {
  const d = b.clone().sub(a);
  const m = add(p, new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
};
const lines = (p, pts, color = "#0a0b10") => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color })); p.add(l); return l; };
// window textures: gothic / round-arched / square, lit warm at night
const archTex = (cols, rows, wall, seed, lit = 0.55, kind = "gothic") => canvasTex(cols * 32, rows * 48, (g, w, h) => {
  const R = rng(seed);
  g.fillStyle = wall; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(0,0,0,.16)"; for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 1);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * 32 + 8, y = r * 48 + 8, ww = 16, hh = 34, on = R() < lit;
    g.fillStyle = on ? pick(R, ["#ffd38a", "#ffe2a8", "#ffc46b", "#fff0cc"]) : "#121620";
    g.beginPath(); g.moveTo(x, y + hh); g.lineTo(x, y + 10);
    if (kind === "gothic") { g.quadraticCurveTo(x, y, x + ww / 2, y - 3); g.quadraticCurveTo(x + ww, y, x + ww, y + 10); }
    else if (kind === "round") g.arc(x + ww / 2, y + 10, ww / 2, Math.PI, 0);
    else { g.lineTo(x, y); g.lineTo(x + ww, y); }
    g.lineTo(x + ww, y + hh); g.closePath(); g.fill();
    g.fillStyle = "rgba(20,15,10,.6)"; g.fillRect(x + ww / 2 - 1, y + 4, 2, hh - 4); g.fillRect(x, y + hh * 0.55, ww, 2);
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x - 2, y + hh, ww + 4, 3);
  }
});
const litMat = (tex, k = 0.85) => noLine(new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(k, k, k) }));
const doorMat = noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.4, 1.25), map: canvasTex(64, 96, (g, w, h) => {
  g.fillStyle = "#1a1410"; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#ffe0a0"); gr.addColorStop(1, "#ffb860");
  g.fillStyle = gr; g.beginPath(); g.moveTo(8, h); g.lineTo(8, 30); g.arc(32, 30, 24, Math.PI, 0); g.lineTo(56, h); g.fill();
  g.fillStyle = "rgba(40,25,10,.7)"; g.fillRect(30, 24, 4, h); g.fillRect(8, 50, 48, 3);
}) }));
const floodlight = (p, E, x, z, c = "#ffd9a0", r = 3.5, k = 5) => { pool(p, x, z, r, c, 0.3); E.push({ p: V(x, 2.6, z), c, k }); };

// gothic / collegiate hall facing the walk. side = -1: on z < 0 facing +z; +1: on z > 0 facing -z. z = front face
const hall = (p, E, o) => {
  const { x, z, side, w, h, d = 12, wall, roof = "#262a33", seed = 1, kind = "gothic", lit = 0.55, roofH = 0.32, gables = 0, door = true, hip = false } = o;
  const out = -side, ry = side > 0 ? Math.PI : 0, zc = z + side * d / 2;
  const m = litMat(archTex(Math.max(3, Math.round(w / 1.6)), Math.max(2, Math.round(h / 2.7)), wall, seed, lit, kind));
  const rm = toon(roof);
  box(p, w, h, d, [m, m, rm, rm, m, m], x, 0, zc);
  box(p, w + 0.3, 0.3, d + 0.3, toon("#3a3632"), x, h - 0.3, zc);
  if (roofH) add(p, hip ? hipGeo(w + 0.6, h * roofH, d + 0.6) : gableGeo(w + 0.6, h * roofH, d + 0.8), rm, x, h, zc);
  for (let i = 0; i < gables; i++) {
    const gx = x - w / 2 + (i + 0.5) * w / gables;
    add(p, gableGeo(1.6, 2.8, 3.2), rm, gx, h - 0.2, z + out * 0.6).rotation.y = Math.PI / 2;
    box(p, 3.0, 2.2, 1.2, m, gx, h - 0.4, z + out * 0.5);
  }
  if (door) {
    plane(p, 2.4, 3.4, doorMat, x, 1.9, z + out * 0.04, ry);
    for (let s = 0; s < 3; s++) box(p, 4.5 - s * 0.6, 0.18, 1.4 - s * 0.35, toon("#5c5850"), x, s * 0.18, z + out * (0.7 - s * 0.17));
    floodlight(p, E, x, z + out * 2.2);
  }
  return { m, rm, out, ry };
};
// tower block with a roof: "pyramid" | "crenel" | "dome" | "flat"
const towerBlock = (p, x, z, w, h, d, m, roofKind = "pyramid", roofColor = "#2a2e36") => {
  box(p, w, h, d, [m, m, toon(roofColor), toon(roofColor), m, m], x, 0, z);
  if (roofKind === "pyramid") add(p, hipGeo(w + 0.4, w * 1.2, d + 0.4), toon(roofColor), x, h, z);
  else if (roofKind === "crenel") for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { box(p, 0.7, 0.9, 0.7, m, x - w / 2 + 0.35 + i * (w - 0.7) / 3, h, z + s * (d / 2 - 0.35)); box(p, 0.7, 0.9, 0.7, m, x + s * (w / 2 - 0.35), h, z - d / 2 + 0.35 + i * (d - 0.7) / 3); }
  else if (roofKind === "dome") { cyl(p, w * 0.35, 1.2, toon(roofColor), x, h, z, 16); add(p, new THREE.SphereGeometry(w * 0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon("#3d5a52"), x, h + 1.2, z); cyl(p, 0.1, 1.6, toon("#c9a53a"), x, h + 1.2 + w * 0.38, z, 6); }
};
// neoclassical block with a colonnade (Court of Final Appeal, The Fullerton, Grand Central)
const classical = (p, E, o) => {
  const { x, z, side, w, h, d = 14, wall = "#cfc4ae", roof = "#3a4a52", cols = 10, dome = false, seed = 3, hip = true, roofH = 0.22, pediment = true } = o;
  const out = -side, zc = z + side * d / 2;
  const m = litMat(archTex(Math.max(4, Math.round(w / 1.8)), Math.max(2, Math.round(h / 3)), wall, seed, 0.5, "round"), 0.95);
  const stone = toon(wall, { roughness: 0.6 }), rm = toon(roof);
  box(p, w, h, d, [m, m, rm, rm, m, m], x, 0, zc);
  box(p, w + 0.8, 0.9, d + 0.8, stone, x, h, zc);
  if (hip) add(p, hipGeo(w, h * roofH, d), rm, x, h + 0.9, zc);
  box(p, w * 0.86, 0.7, 3.4, stone, x, 0, z + out * 1.7);
  for (let i = 0; i < cols; i++) cyl(p, 0.36, h - 2.6, stone, x - w * 0.4 + i * w * 0.8 / (cols - 1), 0.7, z + out * 2.9, 12);
  box(p, w * 0.86, 1.2, 3.6, stone, x, h - 1.9, z + out * 1.8);
  if (pediment) add(p, gableGeo(3.6, 2.4, w * 0.36), stone, x, h - 0.7, z + out * 1.8).rotation.y = Math.PI / 2;
  if (dome) { cyl(p, 3.2, 2, stone, x, h + 0.9, zc, 20); add(p, new THREE.SphereGeometry(3.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon("#5b6e70", { roughness: 0.4 }), x, h + 2.9, zc); }
  for (const s of [-0.3, 0, 0.3]) floodlight(p, E, x + s * w, z + out * 4.5, "#ffe2b0", 4, 5);
};
const lion = (p, x, z, ry) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  box(g, 1.5, 1.1, 2.8, toon("#8d8a84"), 0, 0, 0);
  const b = toon("#4a3a26", { roughness: 0.35, metalness: 0.5 });
  ball(g, 0.5, b, 0, 1.55, -0.3, [0.9, 0.8, 1.7]);
  ball(g, 0.52, b, 0, 1.95, 0.7, [1.05, 1.1, 0.9]);
  ball(g, 0.34, b, 0, 1.95, 1.05, [0.9, 0.85, 0.9]);
  for (const s of [-1, 1]) ball(g, 0.17, b, s * 0.28, 1.22, 1.15, [1, 0.7, 1.7]);
  return g;
};
const tree = (p, R, x, z, s = 1, colors = ["#1c3326", "#223b2b", "#1a2f22"]) => {
  cyl(p, 0.2 * s, 3.4 * s, toon("#2a2019"), x, 0, z, 8, 0.14 * s);
  for (let i = 0; i < 4; i++) ball(p, (1.3 + R() * 0.6) * s, toon(pick(R, colors)), x + (R() - 0.5) * 1.6 * s, (3.6 + R() * 1.3) * s, z + (R() - 0.5) * 1.2 * s);
};
const palm = (p, R, x, z, h = 6) => {
  const top = V(x + (R() - 0.5) * 0.8, h, z + (R() - 0.5) * 0.8);
  strut(p, V(x, 0, z), top, 0.17, toon("#4a3b2c"));
  const leaf = toon("#1d3a26");
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + R() * 0.3;
    const f = add(p, new THREE.ConeGeometry(0.32, 2.8, 4), leaf, top.x + Math.sin(a) * 1.1, top.y - 0.4, top.z + Math.cos(a) * 1.1);
    f.rotation.order = "YXZ"; f.rotation.y = a; f.rotation.x = Math.PI / 2 + 0.45; f.scale.set(1, 1, 0.25);
  }
};
const skyline = (g, R, x0, x1, z0, z1, n, hMin, hMax, walls = ["#1a2030", "#202634", "#1c2230"]) => {
  for (let i = 0; i < n; i++) { const w = 8 + R() * 10; tower(g, x0 + R() * (x1 - x0), z0 + R() * (z1 - z0), w, hMin + R() * (hMax - hMin), w * (0.7 + R() * 0.5), pick(R, walls), Math.round(R() * 1e4)); }
};
const hills = (g, R, x0, x1, z, n, h, color = "#141f1a") => { for (let i = 0; i < n; i++) ball(g, 1, toon(color), x0 + (i + R() * 0.5) * (x1 - x0) / n, -h * 0.2, z - R() * 30, [25 + R() * 25, h * (0.7 + R() * 0.6), 18]); };
const railing = (p, x0, x1, z, m = toon("#2a2e36", { roughness: 0.3, metalness: 0.4 })) => {
  for (let x = x0; x <= x1; x += 1.8) cyl(p, 0.05, 1.05, m, x, 0, z, 6);
  box(p, x1 - x0, 0.07, 0.07, m, (x0 + x1) / 2, 1.0, z); box(p, x1 - x0, 0.04, 0.04, m, (x0 + x1) / 2, 0.55, z);
};
const seawall = (p, x0, x1, z, y = -0.45) => box(p, x1 - x0, -y + 0.05, 0.5, toon("#4d5056"), (x0 + x1) / 2, y, z + 0.25);
// observation wheel facing the street (rotates; LED rim cycles colour)
const wheel = (p, E, x, z, r, { hub = r + 2.5, gond = 32, led = "#7fd4ff", gondColor = ["#d8263a", "#f2f2f2"] } = {}) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.dyn = true; p.add(g);
  const white = toon("#e8eef8", { roughness: 0.4 });
  for (const s of [-1, 1]) for (const dz of [-1.6, 1.6]) strut(g, V(s * r * 0.45, 0, dz), V(0, hub, 0), 0.35, white);
  const rot = new THREE.Group(); rot.position.y = hub; g.add(rot);
  for (const dz of [-0.6, 0.6]) { add(rot, new THREE.TorusGeometry(r, 0.18, 6, 96), white, 0, 0, dz); add(rot, new THREE.TorusGeometry(r * 0.94, 0.08, 4, 96), white, 0, 0, dz); }
  const ledM = noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(led).multiplyScalar(2.5) }));
  add(rot, new THREE.TorusGeometry(r + 0.25, 0.07, 4, 160), ledM);
  const sp = []; for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; for (const dz of [-0.6, 0.6]) sp.push(0, 0, 0, Math.cos(a) * r, Math.sin(a) * r, dz); }
  lines(rot, sp, "#b8c4d4");
  const hubM = add(rot, new THREE.CylinderGeometry(0.9, 0.9, 1.8, 16), white); hubM.rotation.x = Math.PI / 2;
  const gondolas = [];
  const win = noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.55, 1.3) }));
  for (let i = 0; i < gond; i++) {
    const a = i / gond * Math.PI * 2, c = new THREE.Group(); c.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); rot.add(c);
    box(c, 1.3, 1.4, 1.5, toon(gondColor[i % gondColor.length], { roughness: 0.3 }), 0, -1.6, 0);
    box(c, 1.34, 0.5, 1.2, win, 0, -1.1, 0);
    gondolas.push(c);
  }
  pool(p, x, z - 3, 6, led, 0.25);
  E.push({ p: V(x, 3, z - 3), c: led, k: 7 });
  let hue = 0.55;
  return { tick(dt, time) { rot.rotation.z += dt * 0.04; gondolas.forEach((c) => (c.rotation.z = -rot.rotation.z)); hue = (0.55 + time * 0.03) % 1; ledM.color.setHSL(hue, 0.8, 0.6).multiplyScalar(2.2); } };
};
const ferryBoat = () => {
  const b = new THREE.Group(); b.userData.dyn = true;
  box(b, 12, 1.6, 3.6, toon("#1f5a3c", { roughness: 0.4 }), 0, -0.8, 0);
  box(b, 12.2, 0.25, 3.7, toon("#e9e4d6"), 0, 0.8, 0);
  box(b, 10.5, 1.4, 3.3, toon("#e9e4d6"), 0, 1.05, 0);
  for (const s of [-1, 1]) plane(b, 9.6, 0.7, glow("#ffe9b8", 1.6), 0, 1.75, s * 1.66, s > 0 ? 0 : Math.PI);
  box(b, 10.8, 0.25, 3.6, toon("#1f5a3c"), 0, 2.45, 0);
  box(b, 2.4, 1, 2, toon("#e9e4d6"), 3.5, 2.7, 0);
  for (const s of [-1, 1]) box(b, 0.2, 0.2, 0.2, glow(s > 0 ? "#30ff60" : "#ff3030", 4), 0, 2.9, s * 1.8);
  return b;
};
// "!" marker for an interactable spot (P5-style speech burst)
const markTex = canvasTex(128, 128, (g) => {
  g.translate(64, 64); g.rotate(-0.12);
  g.fillStyle = "#000"; g.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = i % 2 ? 44 : 60; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
  g.fillStyle = "#e60012"; g.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = i % 2 ? 36 : 50; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
  g.fillStyle = "#fff"; g.font = "900 72px 'Anton', 'Arial Black', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 0, 4);
});
const markMat = noLine(new THREE.SpriteMaterial({ map: markTex, depthTest: false, transparent: true }));
const spot = (A, key, x, z, r, look) => {
  const s = new THREE.Sprite(markMat); s.scale.setScalar(0.8); s.position.set(x, 2.6, z); s.renderOrder = 10; noRefl(s);
  A.group.add(s);
  A.spots.push({ key, x, z, r, look: V(...look), marker: s });
};
const newArea = (seed) => ({ group: new THREE.Group(), E: [], crowd: [], spots: [], ticks: [], R: rng(seed) });
// walkers along a lane (wrap within [xa, xb]) and standing figures
const walkers = (A, n, zs, xa = -L - 10, xb = L + 10, umb = 0.65) => { for (let i = 0; i < n; i++) { const c = NPC(A.group, A.R, { x: xa + A.R() * (xb - xa), z: pick(A.R, zs) + (A.R() - 0.5) * 0.8, dir: A.R() < 0.5 ? 1 : -1, speed: 0.9 + A.R() * 0.6, umbrella: A.R() < umb }); c.xa = xa; c.xb = xb; A.crowd.push(c); } };
const standers = (A, list) => list.forEach(([x, z, ry]) => { const n = NPC(A.group, A.R, { x, z, phone: A.R() < 0.6, umbrella: A.R() < 0.5 }); if (ry !== undefined) n.g.rotation.y = ry; A.crowd.push(n); });
const finish = (A, extra) => { bake(A.group); return Object.assign(A, extra, { tick(dt, time) { A.ticks.forEach((f) => f(dt, time)); } }); };
const tram = (A, z, stopX) => {
  const t = new THREE.Group(); t.userData.dyn = true;
  const green = toon("#1f6b45", { roughness: 0.35 });
  box(t, 9.6, 1.4, 2.4, green, 0, 0.35, 0); box(t, 9.6, 0.25, 2.42, toon("#e8e1cf"), 0, 1.75, 0);
  box(t, 9.6, 1.9, 2.4, green, 0, 2.0, 0); box(t, 9.4, 0.2, 2.3, toon("#e8e1cf"), 0, 3.9, 0);
  const tw = noLine(new THREE.MeshBasicMaterial({ map: windowsTex(10, 1, "#1f6b45", 4, 1, false), color: new THREE.Color(1.5, 1.5, 1.4), side: THREE.DoubleSide }));
  for (const y of [1.25, 2.95]) for (const s of [-1, 1]) plane(t, 9.0, 0.9, tw, 0, y, s * 1.215);
  const ad = signMat("叮叮 DING DING", { bg: "#f0e6c8", fg: "#c8202a", w: 512, h: 64, vertical: false }, 1.1);
  for (const s of [-1, 1]) plane(t, 7.5, 0.45, ad, 0, 2.2, s * 1.22);
  box(t, 0.1, 0.4, 1.2, glow("#fff4d0", 4), 4.82, 0.8, 0); box(t, 0.1, 0.4, 1.2, glow("#ff3030", 3), -4.82, 0.8, 0);
  for (const x of [-3.2, 3.2]) { const w = cyl(t, 0.36, 0.24, toon("#111"), x, 0, 1.15, 12); w.rotation.x = Math.PI / 2; w.position.y = 0.36; }
  cyl(t, 0.03, 2.2, toon("#222"), 0, 4.0, 0, 6).rotation.z = 0.55;
  t.position.set(-L - 30, 0, z); A.group.add(t);
  let wait = 0, stopped = false;
  A.ticks.push((dt) => {
    if (wait > 0) { wait -= dt; return; }
    const before = t.position.x;
    t.position.x += 4 * dt;
    if (!stopped && before < stopX && t.position.x >= stopX) { wait = 5; stopped = true; }
    if (t.position.x > L + 30) { t.position.x = -L - 30; stopped = false; }
  });
};
const cars = (A, list, xa, xb, body = "#c9232a", roofC = "#e9e3d6", sign = "#ffe9a0") => {
  for (const [x, z, d] of list) {
    const car = new THREE.Group(); car.userData.dyn = true;
    box(car, 4.2, 0.85, 1.8, toon(body, { roughness: 0.25, metalness: 0.2 }), 0, 0.32, 0);
    box(car, 2.4, 0.66, 1.68, toon(roofC, { roughness: 0.25 }), 0.2, 1.17, 0);
    box(car, 2.3, 0.5, 1.7, noLine(new THREE.MeshBasicMaterial({ color: "#2b3446" })), 0.2, 1.22, 0);
    box(car, 0.5, 0.18, 0.3, glow(sign, 3), 0.2, 1.83, 0);
    for (const s of [-0.6, 0.6]) { box(car, 0.05, 0.16, 0.3, glow("#fff6dc", 6), 2.12, 0.6, s); box(car, 0.05, 0.14, 0.32, glow("#ff2020", 4), -2.12, 0.65, s); }
    for (const wx of [-1.4, 1.4]) for (const wz of [-0.9, 0.9]) { const w = cyl(car, 0.33, 0.22, toon("#0e0e0e"), wx, 0, wz, 12); w.rotation.x = Math.PI / 2; w.position.y = 0.33; }
    car.position.set(x, 0, z); car.rotation.y = d > 0 ? 0 : Math.PI; A.group.add(car);
    const v = 6 + A.R() * 3;
    A.ticks.push((dt) => { car.position.x += d * v * dt; if (d > 0 && car.position.x > xb) car.position.x = xa; if (d < 0 && car.position.x < xa) car.position.x = xb; });
  }
};
// street paint shared by the city areas: road with kerbs, pavements
const street = (P, R, x0, x1, curb, { far = -12, near = 12, tile = "#3f424a", rails = false } = {}) => {
  P.noise(x0, x1, -curb, curb, "#24262c", R, 22);
  P.tiles(x0, x1, curb, near, tile, "#2c2e35", 0.6, 0.8).tiles(x0, x1, far, -curb, tile, "#2c2e35", 0.6, 0.8);
  for (const s of [-1, 1]) { P.stripe(x0, x1, s * curb, 0.22, "#6c6f78"); P.stripe(x0, x1, s * (curb - 0.3), 0.14, "#c9a22a"); }
  if (rails) for (const z of [-2.55, -1.1]) P.stripe(x0, x1, z, 0.1, "#8a8f99");
  P.stripe(x0, x1, 0.2, 0.14, "#d8d8d0", 2);
};

// ================================================================== Hong Kong · Central
function areaCentral() {
  const A = newArea(7), g = A.group, E = A.E, R = A.R;
  const CURB = 3.6, FRONT = 8.2, SQ0 = -14, SQ1 = 8, WF = 18;
  wetGround(g, {
    x0: -L - 40, len: 2 * L + 80, z0: -12, span: 26, cuts: [[WF, 999, -6.2]], paint(P) {
      street(P, R, -L - 40, L + 40, CURB, { far: -12, near: 14, rails: true });
      P.tiles(SQ0, SQ1, CURB, 14, "#5a5a60", "#46464c", 1.2, 0.9);            // Statue Square granite
      P.tiles(WF, L + 40, -12, -CURB, "#4a4640", "#3a3632", 0.5, 0.9);          // harbour promenade
      P.tiles(WF, L + 40, CURB, 14, "#45464c", "#34353b", 0.8, 0.9);
      P.zebra(-22, -CURB + 0.3, CURB).zebra(12, -CURB + 0.3, CURB);
    },
  });
  // Des Voeux Road shop-houses with Cantonese neon
  const words = ["茶餐廳", "找換店", "大藥房", "金行", "冰室", "酒家", "士多", "眼鏡", "地產", "時裝", "粥麵", "燒臘", "書局", "海味", "麻雀", "唱片"];
  const vwords = ["大押", "按揭", "酒樓", "夜總會", "茶記", "旅館", "電器", "鐘錶", "雲吞麵", "涼茶", "中環", "找換"];
  const cfg = { front: FRONT, wMin: 4.2, wMax: 7.5, hMin: 11, hMax: 24, walls: ["#2a2f3a", "#30303a", "#3a3430", "#283038", "#352f38"], words, vwords, neon: NEON, awning: 0.45, vertical: 0.75, billboards: true };
  shopRow(g, E, R, 1, -L - 30, SQ0, cfg); shopRow(g, E, R, 1, SQ1, WF, cfg);
  shopRow(g, E, R, -1, -L - 30, SQ0 + 2, { ...cfg, hMin: 9, hMax: 20 }); shopRow(g, E, R, -1, SQ1 - 2, WF, { ...cfg, hMin: 9, hMax: 20 });
  // Statue Square: Court of Final Appeal (near side) and HSBC + its lions (far side)
  landmark(g, "court-of-final-appeal", -3, 19, 14, Math.PI, (h) => classical(h, [], { x: 0, z: -7, side: 1, w: 18, h: 11, dome: true }));
  floodlight(g, E, -3, 10.5, "#ffe2b0", 5, 7);
  for (const x of [-11, 5]) { cyl(g, 0.06, 9, toon("#c8c8c8"), x, 0, 11, 6); plane(g, 1.6, 1.0, toon("#c8202a", { side: THREE.DoubleSide }), x + 0.85, 8.4, 11); }
  for (const x of [-9, 3]) { box(g, 4, 0.5, 2.2, toon("#6b6660"), x, 0, 9.6); box(g, 3.6, 0.4, 1.8, toon("#1f3524"), x, 0.5, 9.6); }
  landmark(g, "hsbc", -3, -27, 46, 0, (h) => tower(h, 0, 0, 16, 46, 12, "#262c38", 4));
  box(g, 20, 0.4, 10, toon("#55555a"), -3, 0, -14);
  lion(g, -7.5, -10, 0); lion(g, 1.5, -10, 0);
  floodlight(g, E, -7.5, -8.4, "#ffd9a0", 2.5, 5); floodlight(g, E, 1.5, -8.4, "#ffd9a0", 2.5, 5);
  landmark(g, "bank-of-china", 6, -64, 92, 0.25, (h) => tower(h, 0, 0, 10, 92, 10, "#1d2638", 3));
  landmark(g, "jardine-house", -36, -52, 52, -0.2, (h) => tower(h, 0, 0, 10, 52, 10, "#2a2e36", 5));
  skyline(g, R, -L - 30, 16, -110, -40, 14, 40, 85);
  // harbour front: water, sea wall, railing, Central Pier + Star Ferry, Observation Wheel, IFC
  water(g, WF, L + 120, -150, -6.2);
  seawall(g, WF, L + 120, -6.7); railing(g, WF, L + 40, -6.0);
  landmark(g, "central-pier", 46, -22, 11, 0, (h) => { box(h, 16, 6, 7, toon("#2f5f4a"), 0, 0, 0); box(h, 2.6, 13, 2.6, toon("#e8e1cf"), 6, 0, 0); });
  floodlight(g, E, 46, -14, "#bfe0ff", 4, 4);
  const boat = ferryBoat(); boat.position.set(40, -0.35, -30); g.add(boat);
  A.ticks.push((dt, time) => { boat.position.x = 52 + Math.sin(time * 0.05) * 30; boat.rotation.y = Math.cos(time * 0.05) > 0 ? 0 : Math.PI; });
  skyline(g, R, 0, 160, -190, -150, 18, 20, 70, ["#151b28", "#1a2030"]);   // Kowloon across the water
  tower(g, 60, -170, 12, 118, 12, "#18243a", 77);                          // ICC
  const wh = wheel(g, E, 30, 17, 15); A.ticks.push(wh.tick);
  for (let x = WF + 1; x < 44; x += 4) palm(g, R, x, 10 + R() * 2, 5 + R() * 2);
  box(g, 20, 9, 14, [litMat(windowsTex(16, 3, "#2a3446", 91, 0.8, false)), litMat(windowsTex(16, 3, "#2a3446", 91, 0.8, false)), toon("#1b1e26"), toon("#1b1e26"), litMat(windowsTex(16, 3, "#2a3446", 92, 0.8, false)), litMat(windowsTex(16, 3, "#2a3446", 93, 0.8, false))], 56, 0, 17);
  landmark(g, "ifc2", 58, 40, 120, Math.PI, (h) => tower(h, 0, 0, 12, 120, 12, "#1d2840", 6));
  // street furniture
  const poles = [];
  for (let x = -L - 20; x <= SQ0; x += 13) poles.push(telePole(g, x, -(CURB + 0.35)));
  wires(g, poles, [[V(-34, 0, -CURB - 0.35), V(-34, 0, FRONT), 7.0]]);
  const tw = []; for (let x = -L - 40; x <= L + 40; x += 6) tw.push(x, 6.1, -1.8, x + 6, 6.1, -1.8);
  lines(g, tw);
  for (let x = -L - 6; x <= L + 6; x += 12) lampPost(g, E, x, CURB + 0.3, 1);
  for (let x = -L; x <= WF; x += 12) lampPost(g, E, x + 6, -CURB - 0.3, -1, "#cfe0ff");
  for (let x = WF + 4; x <= L + 6; x += 10) globeLamp(g, E, x, -5.4, "#cfe0ff");
  guardrail(g, -50, -36, CURB + 0.15); guardrail(g, 22, 30, CURB + 0.15);
  for (let x = -L; x <= L; x += 5 + R() * 6) if (Math.abs(x + 30) > 3) bollard(g, x, CURB + 0.25 + R() * 0.1);
  vending(g, E, R, -40.2, FRONT - 0.45, Math.PI); vending(g, E, R, -39.1, FRONT - 0.45, Math.PI); vending(g, E, R, 14.5, FRONT - 0.45, Math.PI);
  for (const x of [-52, -26, -18]) bike(g, x, FRONT - 0.9, 0.05);
  for (const x of [-44, -20]) trash(g, x, CURB + 0.7);
  signPole(g, -22, CURB + 0.4, 0);
  for (const x of [-47, -33]) aBoard(g, R, x, FRONT - 1.4, Math.PI + 0.3);
  // tram stop on the near kerb (the tram pauses here)
  const ts = -30;
  for (const dx of [-2, 2]) cyl(g, 0.06, 2.8, toon("#1f6b45"), ts + dx, 0, CURB + 0.6, 6);
  box(g, 5, 0.12, 1.6, toon("#1f6b45"), ts, 2.8, CURB + 0.9);
  plane(g, 3.6, 0.6, signMat("電車站 TRAM STOP", { bg: "#1f6b45", fg: "#fff6dc", w: 512, h: 80, vertical: false }, 1.5), ts, 3.25, CURB + 0.6, Math.PI);
  pool(g, ts, CURB + 1, 2.4, "#fff2d0", 0.35); E.push({ p: V(ts, 2.4, CURB + 1), c: "#fff2d0", k: 5 });
  tram(A, -1.8, ts + 3);
  cars(A, [[10, 1.8, -1], [-20, 1.8, -1], [-50, 1.8, -1], [5, -2.0, 1], [40, -2.0, 1]], -L - 30, L + 30);
  // crowd
  walkers(A, 16, [4.6, 5.6, 6.8]); walkers(A, 8, [-5, -6.6], -L - 10, WF); walkers(A, 5, [-4.6, -5.4], WF, L + 10, 0.5);
  standers(A, [[-40.2, FRONT - 1.2, 0], [14.5, FRONT - 1.1, 0], [-3, 9.8, Math.PI], [-6, -11.5, 0.3], [-30.5, CURB + 1.1, Math.PI / 2]]);
  spot(A, "neon", -46, 5.8, 3, [-46, 5, 8.5]);
  spot(A, "tram", -30, 4.8, 3, [-36, 2.4, -1.8]);
  spot(A, "court", -3, 8.4, 3.2, [-3, 7, 16]);
  spot(A, "hsbc", -3, 4.4, 2.6, [-3, 10, -12]);
  spot(A, "boc", 9, 5, 2.6, [6, 50, -64]);
  spot(A, "wheel", 30, 7, 3.2, [30, 16, 17]);
  spot(A, "ferry", 45, 4.8, 3, [46, 4, -22]);
  spot(A, "ifc", 56, 6.5, 3, [58, 45, 40]);
  const inSq = (x) => x > SQ0 && x < SQ1, inWf = (x) => x > WF && x < 44;
  return finish(A, {
    zr: (x) => [CURB + 0.35, inSq(x) ? 11 : inWf(x) ? 10 : FRONT - 0.7],
    cz: (x) => [-FRONT + 0.6, inSq(x) ? 12.5 : inWf(x) ? 12 : FRONT - 0.4], lane: CURB + 1.6,
    sky: SKY("#0a0f1a", "#1d2638", "#3a4458"), fog: ["#283245", 0.012], hemi: ["#7f93bd", "#1a1c22", 0.9],
  });
}

// ================================================================== UPenn · Locust Walk
function areaUPenn() {
  const A = newArea(31), g = A.group, E = A.E, R = A.R;
  const WALK = 4.4;
  wetGround(g, {
    x0: -L - 40, len: 2 * L + 80, z0: -22, span: 44, paint(P) {
      P.noise(-L - 40, L + 40, -22, 22, "#1d2a1d", R, 26, 0.25);                       // lawns
      P.bricks(-L - 40, L + 40, -WALK, WALK, R, ["#7a3426", "#8a3d2c", "#6e2f23", "#93432f"]);
      P.stripe(-L - 40, L + 40, -WALK, 0.25, "#8f877a").stripe(-L - 40, L + 40, WALK, 0.25, "#8f877a");
      for (const [x, s, to] of [[-42, 1, 14], [12, -1, -15], [44, -1, -14], [-14, -1, -6]]) P.bricks(x - 1.6, x + 1.6, s > 0 ? WALK : to, s > 0 ? to : -WALK, R, ["#7a3426", "#8a3d2c", "#6e2f23"]);
    },
  });
  const brick = ["#4a2a22", "#563026", "#3e2620"];
  // far side: generic halls, LOVE, College Hall (+Franklin), Fisher Fine Arts Library
  for (const [x, w] of [[-50, 18], [-32, 14]]) hall(g, E, { x, z: -14, side: -1, w, h: 12, wall: pick(R, brick), seed: x, gables: 3 });
  hall(g, E, { x: -12, z: -21, side: -1, w: 18, h: 13, wall: "#4a2c24", seed: 5, door: false });
  // College Hall: green serpentine stone, big central gable, two towers
  const ch = hall(g, E, { x: 12, z: -15, side: -1, w: 22, h: 13, wall: "#4f5e4a", roof: "#262c30", seed: 11, gables: 2, lit: 0.6 });
  add(g, gableGeo(2.4, 6, 8), ch.rm, 12, 13, -14.6).rotation.y = Math.PI / 2;
  box(g, 7.6, 5, 1.6, ch.m, 12, 11, -14.6);
  for (const dx of [-12.5, 12.5]) towerBlock(g, 12 + dx, -18, 5, 19, 5, ch.m, "pyramid", "#262c30");
  // Ben Franklin, seated, on a plinth
  const bronze = toon("#3c3a34", { roughness: 0.35, metalness: 0.4 });
  box(g, 2.4, 1.0, 2.0, toon("#7d7a72"), 12, 0, -9.5);
  box(g, 1.2, 1.0, 1.0, bronze, 12, 1.0, -9.6); ball(g, 0.42, bronze, 12, 2.4, -9.5, [1, 1.25, 0.9]); ball(g, 0.24, bronze, 12, 3.2, -9.45);
  floodlight(g, E, 12, -8, "#ffd9a0", 2.6, 4);
  // Fisher Fine Arts Library: red sandstone, crenellated tower, great round window
  const fm = hall(g, E, { x: 46, z: -14, side: -1, w: 20, h: 12, wall: "#7a2e22", roof: "#3a2a22", seed: 21, kind: "round", gables: 1, lit: 0.65 });
  towerBlock(g, 34, -17, 6.5, 24, 6.5, fm.m, "crenel");
  const rw = add(g, new THREE.CircleGeometry(2.2, 24), noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.8) })), 50, 8, -13.95);
  add(g, new THREE.RingGeometry(2.2, 2.6, 24), toon("#5a2018"), 50, 8, -13.9);
  hall(g, E, { x: 58, z: -14, side: -1, w: 6, h: 10, wall: "#6a3a2c", seed: 22, door: false });
  // near side: The Quad (gables + gate tower with cupola), then more halls
  const qm = hall(g, E, { x: -44, z: 14, side: 1, w: 34, h: 12, wall: "#5a3226", roof: "#2a2e36", seed: 41, gables: 7, door: false });
  towerBlock(g, -42, 17, 7, 18, 7, qm.m, "dome");
  plane(g, 3, 4.4, doorMat, -42, 2.2, 13.45, Math.PI); floodlight(g, E, -42, 11.5);
  hall(g, E, { x: -14, z: 16, side: 1, w: 16, h: 14, wall: "#3e2620", seed: 42, door: false, kind: "square" });
  hall(g, E, { x: 10, z: 15, side: 1, w: 22, h: 16, wall: "#4a4a4c", roof: "#26282c", seed: 43, kind: "square", roofH: 0 });
  hall(g, E, { x: 40, z: 15, side: 1, w: 24, h: 12, wall: "#563026", seed: 44, gables: 4 });
  skyline(g, R, -L - 60, L + 60, -170, -120, 22, 40, 120);   // Center City beyond
  // LOVE (Robert Indiana) under cherry trees
  box(g, 3, 0.7, 1.8, toon("#1a1a1e"), -14, 0, -6.5);
  const red = toon("#d4202c", { roughness: 0.3 }), blue = toon("#2d4fa3"), grn = toon("#1f6a3a");
  fontReady.then(() => {
    if (!font) return;
    const mk = (s, x, y, rz, m) => { const geo = new TextGeometry(s, { font, size: 1.0, depth: 0.4, curveSegments: 4 }); const o = add(g, geo, [red, m], x, y, -6.7); o.rotation.z = rz; return o; };
    mk("L", -15.3, 1.95, 0, blue); mk("O", -14.35, 2.15, 0.38, grn); mk("V", -15.3, 0.75, 0, grn); mk("E", -14.3, 0.75, 0, blue);
  });
  floodlight(g, E, -14, -5.4, "#ffd9a0", 3, 5);
  for (const [x, z] of [[-17.5, -8], [-11, -9]]) { cyl(g, 0.16, 2.6, toon("#2a2019"), x, 0, z, 8); for (let i = 0; i < 4; i++) ball(g, 1.2 + R() * 0.4, toon("#c97a98"), x + (R() - 0.5) * 1.4, 3 + R(), z + (R() - 0.5)); }
  // The Split Button
  const bm = toon("#e8e6e0", { roughness: 0.3 });
  const b1 = add(g, new THREE.CylinderGeometry(2.0, 2.0, 0.35, 32, 1, false, 0.1, Math.PI - 0.2), bm, -4, 0.18, 6.6); b1.rotation.x = Math.PI / 2 - 0.25; b1.rotation.z = 0.1;
  const b2 = add(g, new THREE.CylinderGeometry(2.0, 2.0, 0.35, 32, 1, false, Math.PI + 0.1, Math.PI - 0.2), bm, -3.75, 0.18, 6.8); b2.rotation.x = Math.PI / 2 - 0.35; b2.rotation.z = -0.15;
  floodlight(g, E, -4, 5.6, "#e8f0ff", 2.6, 3);
  // lamps, benches, trees, bins, bikes
  for (let x = -L - 6; x <= L + 6; x += 9) { globeLamp(g, E, x, -WALK - 0.3); globeLamp(g, E, x + 4.5, WALK + 0.3); }
  const clear = (x) => [-42, -14, -4, 12, 46].every((c) => Math.abs(x - c) > 4);
  for (let x = -L - 10; x <= L + 10; x += 7 + R() * 3) { if (clear(x)) tree(g, R, x, -WALK - 2.2 - R() * 1.5, 1 + R() * 0.3); if (clear(x + 3)) tree(g, R, x + 3, WALK + 2.4 + R() * 1.5, 1 + R() * 0.3); }
  const bench = (x, z) => { const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b); box(b, 1.6, 0.08, 0.45, toon("#4a2e1d"), 0, 0.45, 0); box(b, 1.6, 0.4, 0.06, toon("#4a2e1d"), 0, 0.55, -0.22); for (const sx of [-0.7, 0.7]) box(b, 0.06, 0.45, 0.45, toon("#15161b"), sx, 0, 0); };
  for (const x of [-26, -2, 22, 30]) bench(x, -WALK - 0.9);
  for (const x of [-25, 5, 21]) trash(g, x, WALK + 0.8);
  for (const x of [-20, 18]) bike(g, x, WALK + 1.2, 0.2);
  walkers(A, 20, [-2.6, -1, 1.2, 2.8], -L - 10, L + 10, 0.75);
  standers(A, [[-12, -3.2], [-6, 3.4], [16, -3], [44, -3.4]]);
  spot(A, "quad", -42, 3, 3, [-42, 9, 14]);
  spot(A, "love", -14, -3, 3, [-14, 2, -6.7]);
  spot(A, "button", -4, 3, 2.6, [-4, 1, 6.6]);
  spot(A, "franklin", 7, -3, 2.4, [12, 2.6, -9.5]);
  spot(A, "hall", 16, -3, 2.6, [12, 11, -15]);
  spot(A, "fisher", 44, -3, 3, [42, 10, -14]);
  return finish(A, {
    zr: () => [-WALK + 0.4, WALK - 0.4], cz: () => [-12, 12], lane: 1.2,
    sky: SKY("#0c1220", "#222c40", "#46506a"), fog: ["#2a3448", 0.014], hemi: ["#8798bf", "#1c1f1a", 0.95],
  });
}

// ================================================================== CUHK · campus
function areaCUHK() {
  const A = newArea(57), g = A.group, E = A.E, R = A.R;
  const LAKE = [-62, -26], SEA = 46;
  wetGround(g, {
    x0: -L - 40, len: 2 * L + 80, z0: -32, span: 52, cuts: [[LAKE[0], LAKE[1], -8], [SEA, 999, -8]], paint(P) {
      P.noise(-L - 40, L + 40, -32, 20, "#1c2a1e", R, 24, 0.3);
      P.tiles(-L - 40, L + 40, -8, 7, "#55555a", "#3c3c42", 1.0);
      P.tiles(-24, 4, -20, -8, "#5a5a5e", "#404046", 1.0).tiles(8, 26, -24, -8, "#5a5a5e", "#404046", 1.0).tiles(30, 46, -20, -8, "#58585c", "#3e3e44", 1.0);
      P.meander(-L - 40, L + 40, -7.6).meander(-L - 40, L + 40, 6.6).meander(-24, 4, -19.6);
      P.tiles(-58, -46, 7, 13, "#4a4a50", "#36363c", 0.8);
    },
  });
  hills(g, R, -L - 80, 40, -80, 9, 40);
  // Lake Ad Excellentiam: fountain, red pavilion, arched bridge
  water(g, LAKE[0], LAKE[1], -60, -8, -0.4);
  seawall(g, LAKE[0], LAKE[1], -8.5, -0.4);
  const jet = noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.4, 1.6), transparent: true, opacity: 0.55, depthWrite: false }));
  const fj = cyl(g, 0.12, 8, jet, -44, -0.4, -22, 10, 0.4); add(g, new THREE.ConeGeometry(1.6, 2.4, 14, 1, true), jet, -44, 7.4, -22).rotation.x = Math.PI;
  A.ticks.push((dt, time) => (fj.scale.y = 0.9 + Math.sin(time * 2) * 0.08));
  E.push({ p: V(-44, 2, -18), c: "#cfe8ff", k: 3 });
  for (const dx of [-1.6, 1.6]) for (const dz of [-1.6, 1.6]) cyl(g, 0.14, 3, toon("#a8231c"), -34 + dx, 0, -26 + dz, 10);
  box(g, 4.4, 0.4, 4.4, toon("#7f786c"), -34, -0.4, -26);
  add(g, new THREE.ConeGeometry(3.4, 1.8, 4), toon("#24604a"), -34, 3.9, -26).rotation.y = Math.PI / 4;
  floodlight(g, E, -34, -23, "#ffb070", 2.4, 4);
  const br = add(g, new THREE.TorusGeometry(4, 0.35, 6, 20, Math.PI), toon("#cfc8bb"), -55, -0.6, -24); br.scale.set(1, 0.5, 2.4);
  // University Station (near side)
  for (const [dx, dz] of [[-4, 0], [4, 0], [-4, 4], [4, 4]]) cyl(g, 0.12, 3.6, toon("#c8ccd2"), -52 + dx, 0, 8.5 + dz, 8);
  box(g, 10, 0.3, 5.6, toon("#d8dce2"), -52, 3.6, 10.5);
  const mtr = canvasTex(512, 96, (c, w, h) => { c.fillStyle = "#f4f4f4"; c.fillRect(0, 0, w, h); c.fillStyle = "#c8102e"; c.beginPath(); c.arc(54, 48, 34, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 7; c.beginPath(); c.moveTo(54, 18); c.lineTo(54, 78); c.moveTo(30, 34); c.lineTo(78, 34); c.moveTo(30, 62); c.lineTo(78, 62); c.stroke(); c.fillStyle = "#1a1a1a"; c.font = "900 44px 'Noto Sans TC', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("大學 University", 104, 50); });
  plane(g, 5.4, 1.0, noLine(new THREE.MeshBasicMaterial({ map: mtr, color: new THREE.Color(1.5, 1.5, 1.5) })), -52, 4.3, 8.2, Math.PI);
  for (let i = 0; i < 4; i++) box(g, 0.3, 1.0, 0.9, toon("#9aa3ad"), -54.5 + i * 1.6, 0, 11);
  pool(g, -52, 9, 4, "#e8f0ff", 0.4); E.push({ p: V(-52, 3, 8), c: "#e8f0ff", k: 6 });
  // University Mall: Gate of Wisdom, pergola + pools, University Library
  for (let i = 0; i < 3; i++) box(g, 7 - i * 1.4, 0.25, 5 - i * 1.0, toon("#8c8578"), -14, i * 0.25, -12);
  const dark = toon("#1f1d1d", { roughness: 0.4 });
  box(g, 1.3, 4.6, 1.8, dark, -15.6, 0.75, -12).rotation.z = 0.1; box(g, 1.3, 4.6, 1.8, dark, -12.4, 0.75, -12).rotation.z = -0.1;
  box(g, 5.0, 1.3, 2.0, dark, -14, 5.0, -12);
  floodlight(g, E, -14, -9.5, "#ffe2b0", 3.2, 5);
  const stone = toon("#9b968d");
  const poolM = toon("#1f6f7a", { roughness: 0.05, metalness: 0.3 });
  box(g, 7, 0.12, 3, poolM, -2, 0, -12); box(g, 7, 0.12, 3, poolM, -2, 0, -15.5);
  for (let x = -5; x <= 1; x += 1.5) { box(g, 0.35, 3, 0.35, stone, x, 0, -17); box(g, 0.35, 3, 0.35, stone, x, 0, -19); }
  for (let x = -5; x <= 1; x += 0.75) box(g, 0.2, 0.3, 2.4, stone, x, 3, -18);
  const libM = litMat(windowsTex(24, 5, "#2e3a44", 31, 0.8, false), 0.95);
  box(g, 26, 14, 10, [libM, libM, toon("#d8d8d4"), toon("#d8d8d4"), libM, libM], -10, 0, -31);
  box(g, 26.4, 3, 10.4, toon("#e2e2de"), -10, 14, -31);
  // Science Centre: raised octagon on a pillar, CUHK crest, spiral stairs
  const conc = toon("#c8c6c0", { roughness: 0.7 });
  for (const dx of [-12, 12]) { const bm = litMat(windowsTex(10, 4, "#b8b6b0", 40 + dx, 0.55, false)); box(g, 10, 11, 10, [bm, bm, conc, conc, bm, bm], 16 + dx, 0, -24); }
  cyl(g, 2.4, 6, conc, 16, 0, -22, 12);
  const oct = litMat(windowsTex(26, 2, "#c8c6c0", 51, 0.5, false));
  add(g, new THREE.CylinderGeometry(9, 8, 6, 8, 1), [oct, conc, conc], 16, 9, -22).rotation.y = Math.PI / 8;
  const crest = canvasTex(128, 128, (c) => { c.fillStyle = "#4b2e83"; c.beginPath(); c.moveTo(14, 10); c.lineTo(114, 10); c.lineTo(114, 70); c.quadraticCurveTo(64, 126, 14, 70); c.closePath(); c.fill(); c.strokeStyle = "#d4a82a"; c.lineWidth = 8; c.stroke(); c.fillStyle = "#d4a82a"; c.font = "900 54px 'Noto Sans TC', sans-serif"; c.textAlign = "center"; c.fillText("中", 64, 72); });
  plane(g, 2.6, 2.6, noLine(new THREE.MeshBasicMaterial({ map: crest, transparent: true, color: new THREE.Color(1.3, 1.3, 1.3) })), 16, 9.2, -12.7);
  for (const dx of [-7, 7]) cyl(g, 1.4, 6, conc, 16 + dx, 0, -15, 12);
  floodlight(g, E, 16, -11, "#e8f0ff", 4, 5);
  plane(g, 7, 1.0, signMat("大學站 UNIVERSITY", { bg: "#0b1a3a", fg: "#ffffff", w: 512, h: 72, vertical: false }, 1.6), -52, 2.6, 13.3, Math.PI);
  // New Asia Water Tower + amphitheatre
  box(g, 3.4, 26, 3.4, conc, 38, 0, -24);
  box(g, 8, 6, 8, conc, 38, 24, -24);
  for (const s of [-1, 1]) box(g, 0.8, 4, 8.2, toon("#5a5a5e"), 38 + s * 1.6, 25, -24);
  box(g, 0.3, 0.3, 0.3, glow("#ff2a2a", 4), 38, 30.2, -24);
  for (let i = 0; i < 6; i++) {
    const r0 = 3 + i * 1.2, sh = new THREE.Shape();
    sh.absarc(0, 0, r0 + 1.2, 0, Math.PI, false); sh.absarc(0, 0, r0, Math.PI, 0, true);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.35 * (i + 1), bevelEnabled: false, curveSegments: 20 }); geo.rotateX(-Math.PI / 2);
    add(g, geo, toon("#8f8b84"), 38, 0, -10);
  }
  floodlight(g, E, 38, -10, "#ffe2b0", 4, 4);
  // Pavilion of Harmony: infinity pool over Tolo Harbour, banyan tree, islands
  water(g, SEA, L + 160, -200, -8, -0.3);
  box(g, L + 160 - SEA, 0.3, 0.4, toon("#6a6a70"), (SEA + L + 160) / 2, -0.3, -8.2);
  const ban = toon("#1a2e21");
  cyl(g, 0.9, 5, toon("#3a2e24"), 58, 0, -10, 10, 0.6);
  for (let i = 0; i < 6; i++) ball(g, 3 + R() * 1.5, ban, 58 + (R() - 0.5) * 7, 6 + R() * 1.6, -10 + (R() - 0.5) * 4, [1.4, 0.6, 1.2]);
  for (let i = 0; i < 6; i++) ball(g, 1, toon("#122019"), 50 + i * 22 + R() * 10, -2, -90 - R() * 40, [12 + R() * 14, 6 + R() * 8, 10]);
  // plaza furniture, lamps, trees, campus blocks on the near side
  for (let x = -L - 6; x <= L + 6; x += 10) { if (x < LAKE[0] || x > LAKE[1]) globeLamp(g, E, x, -7.2); globeLamp(g, E, x + 5, 6.2); }
  for (let x = -L - 10; x <= L + 10; x += 8) if (Math.abs(x + 52) > 7) { box(g, 2.4, 0.5, 1.2, stone, x, 0, 7.4); box(g, 2.2, 0.35, 1.0, toon("#1f3524"), x, 0.5, 7.4); }
  for (let x = -L - 10; x <= L + 10; x += 9 + R() * 4) if (Math.abs(x + 52) > 8) tree(g, R, x, 10 + R() * 2, 1.1);
  for (const [x, w] of [[-26, 18], [0, 22], [30, 20]]) { const m = litMat(windowsTex(Math.round(w), 4, "#a8a6a0", x + 99, 0.6, false), 0.8); box(g, w, 12, 9, [m, m, conc, conc, m, m], x, 0, 20); }
  for (const x of [-20, 6, 28]) trash(g, x, -6.8);
  walkers(A, 18, [-5.5, -3, -0.5, 2, 4], -L - 10, L + 10, 0.8);
  standers(A, [[-46, -6.4], [-12, -7], [14, -6.5], [36, -7], [54, -7.3]]);
  spot(A, "station", -52, 4.2, 3, [-52, 3.4, 9]);
  spot(A, "lake", -40, -5.8, 3.2, [-42, 3, -22]);
  spot(A, "gate", -14, -5.8, 3, [-14, 4, -12]);
  spot(A, "lib", -4, -5.8, 2.6, [-8, 8, -26]);
  spot(A, "science", 16, -5.8, 3, [16, 9, -22]);
  spot(A, "tower", 36, -5.8, 3, [38, 18, -24]);
  spot(A, "pool", 54, -5.8, 3, [70, 2, -60]);
  return finish(A, {
    zr: () => [-7.4, 5.6], cz: () => [-13, 9], lane: -1,
    sky: SKY("#0d1322", "#26304a", "#4c5878"), fog: ["#2c3650", 0.012], hemi: ["#8a9cc4", "#1a1d22", 0.95],
  });
}

// ================================================================== Singapore · Marina Bay
function areaSingapore() {
  const A = newArea(83), g = A.group, E = A.E, R = A.R;
  const EDGE = -6.6;
  wetGround(g, {
    x0: -L - 40, len: 2 * L + 80, z0: -8, span: 32, cuts: [[-999, 999, EDGE]], paint(P) {
      P.tiles(-L - 40, L + 40, -8, 5.8, "#5a5650", "#45423d", 0.75);
      P.stripe(-L - 40, L + 40, 5.8, 0.25, "#6c6f78");
      P.noise(-L - 40, L + 40, 6, 12.5, "#24262c", R, 22).stripe(-L - 40, L + 40, 9.2, 0.14, "#d8d8d0", 2);
      P.tiles(-L - 40, L + 40, 12.5, 24, "#45464c", "#34353b", 0.6);
      P.zebra(-20, 6.2, 12.4).zebra(24, 6.2, 12.4);
    },
  });
  water(g, -260, 260, -260, EDGE);
  seawall(g, -L - 40, L + 40, EDGE - 0.5); railing(g, -L - 40, L + 40, EDGE + 0.1);
  // across the bay: Singapore Flyer, Esplanade, ArtScience, Marina Bay Sands, Supertrees
  const fl = wheel(g, E, -62, -95, 24, { hub: 28, gond: 28, led: "#bfe6ff", gondColor: ["#cfe4f4"] }); A.ticks.push(fl.tick);
  const spikes = canvasTex(128, 128, (c) => { c.fillStyle = "#3a3a32"; c.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 * 8; x < 128; x += 16) { c.fillStyle = "#b9ae82"; c.beginPath(); c.moveTo(x, y + 14); c.lineTo(x + 8, y); c.lineTo(x + 16, y + 14); c.fill(); } }, [6, 3]);
  for (const [x, z, r] of [[-34, -66, 11], [-17, -70, 9]]) {
    const d = add(g, new THREE.SphereGeometry(r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: spikes, roughness: 0.4, metalness: 0.5, emissive: "#3a2c14", emissiveIntensity: 0.6 }), x, 0, z);
    d.scale.set(1.3, 0.85, 1);
  }
  // ArtScience: lotus petals around a glowing base
  const asx = 4, asz = -52;
  cyl(g, 7, 2.5, noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.1, 0.9) })), asx, 0, asz, 20);
  const petal = toon("#eceae4", { roughness: 0.35 });
  for (let i = 0; i < 10; i++) {
    const a = -1.4 + i / 9 * 2.8, tilt = 0.55 + (i % 2) * 0.25;
    const p = add(g, new THREE.ConeGeometry(2.4, 13 + (i % 3) * 2, 4), petal, asx, 0, asz);
    p.geometry.translate(0, 6.5, 0); p.scale.set(1, 1, 0.3);
    p.rotation.order = "YXZ"; p.rotation.y = a; p.rotation.x = tilt; p.position.y = 3;
  }
  floodlight(g, E, asx, -44, "#ffe9c8", 6, 4);
  // Marina Bay Sands: three towers + SkyPark
  const mx = 34, mz = -84;
  const glass = (s) => litMat(windowsTex(8, 22, "#26324a", s, 0.6, false), 0.95);
  for (let i = 0; i < 3; i++) {
    const tx = mx - 26 + i * 26, m = glass(100 + i);
    box(g, 9, 56, 8, [m, m, toon("#20283a"), toon("#20283a"), m, m], tx - 3, 0, mz);
    const lean = box(g, 7, 56, 8, [m, m, toon("#20283a"), toon("#20283a"), m, m], tx + 4, 0, mz); lean.rotation.z = 0.05;
  }
  const sp = add(g, new THREE.CapsuleGeometry(4, 70, 4, 16), toon("#dcdcd8", { roughness: 0.4 }), mx + 4, 58, mz); sp.rotation.z = Math.PI / 2; sp.scale.set(0.5, 1, 1.4);
  box(g, 76, 0.18, 0.2, glow("#ffe2b0", 3), mx + 4, 56.5, mz + 5.5);
  const podium = litMat(windowsTex(30, 3, "#2a3040", 104, 0.8, false));
  box(g, 80, 8, 18, [podium, podium, toon("#2a2e36"), toon("#2a2e36"), podium, podium], mx, 0, mz + 16);
  // Supertrees (light show)
  const canopyM = noLine(new THREE.MeshBasicMaterial({ color: "#ff4fd8", wireframe: true, transparent: true, opacity: 0.9 }));
  for (const [x, z, h] of [[70, -100, 40], [82, -94, 30], [92, -108, 46], [104, -98, 32], [62, -112, 28], [114, -110, 36]]) {
    add(g, new THREE.CylinderGeometry(1.4, 2.2, h, 10), toon("#3a2440"), x, h / 2, z);
    const c = add(g, new THREE.ConeGeometry(h * 0.42, h * 0.3, 18, 3, true), canopyM, x, h + h * 0.12, z); c.rotation.x = Math.PI;
    add(g, new THREE.CylinderGeometry(3, 1.4, 2.4, 12), toon("#d8d4cc"), x, h - 1, z);
  }
  A.ticks.push((dt, time) => canopyM.color.setHSL((0.85 + Math.sin(time * 0.4) * 0.12 + 1) % 1, 0.9, 0.55).multiplyScalar(2.2));
  skyline(g, R, -140, 160, -200, -140, 24, 30, 110, ["#151b28", "#1a2030", "#1c2436"]);
  // Helix Bridge from the promenade out across the water
  const hx = 18, pts = [[], []];
  for (let i = 0; i <= 240; i++) { const t = i / 240, zz = EDGE - 1 - t * 46, a = zz * 0.9; for (let k = 0; k < 2; k++) pts[k].push(V(hx + Math.cos(a + k * Math.PI) * 2.6, 3.2 + Math.sin(a + k * Math.PI) * 2.6, zz)); }
  const helM = toon("#c8d0dc", { roughness: 0.3, metalness: 0.6 });
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts[0]), 400, 0.12, 6), helM);
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts[1]), 400, 0.12, 6), glow("#b8e8ff", 1.6));
  box(g, 4.2, 0.3, 46, toon("#6a6e78"), hx, 1.2, EDGE - 24);
  for (let z = EDGE - 6; z > EDGE - 46; z -= 10) cyl(g, 0.5, 2, toon("#5a5e66"), hx, -0.8, z, 8);
  // promenade side: Merlion on its platform, The Fullerton, CBD towers, palms
  const my = 0, mzz = EDGE - 3.4, mxx = -30;
  box(g, 7, 0.6, 5, toon("#6a6660"), mxx, -0.5, mzz);
  const white = toon("#eceae6", { roughness: 0.5 });
  cyl(g, 2.2, 1.6, toon("#2a4f9a", { roughness: 0.3 }), mxx, 0, mzz, 16);
  cyl(g, 1.25, 4.6, white, mxx, 1.4, mzz, 14, 1.7);
  add(g, new THREE.TorusGeometry(0.7, 0.3, 8, 16, Math.PI * 1.4), white, mxx, 2.6, mzz + 1.6).rotation.y = Math.PI / 2;
  ball(g, 1.2, white, mxx, 7.0, mzz, [1, 1.05, 1.1]);
  const hood = add(g, new THREE.ConeGeometry(1.6, 3.6, 10), white, mxx, 6.4, mzz + 0.4); hood.rotation.x = -0.25;
  const jetPts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; jetPts.push(V(mxx, 7 + t * 1.2 - t * t * 7.4, mzz - 1.3 - t * 7)); }
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(jetPts), 40, 0.16, 6), noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.5, 1.7), transparent: true, opacity: 0.6, depthWrite: false })));
  floodlight(g, E, mxx, mzz + 3, "#e8f0ff", 3, 6);
  classical(g, E, { x: -46, z: 14.2, side: 1, w: 34, h: 15, wall: "#d8cfbc", roof: "#9a4a2a", cols: 14, seed: 61, pediment: false });
  for (const [x, w, h] of [[-20, 14, 70], [-4, 12, 95], [10, 16, 60], [26, 12, 110], [42, 14, 80], [58, 12, 66], [-64, 14, 50]]) tower(g, x, 22, w, h, w, pick(R, ["#1c2436", "#222a3c"]), Math.round(x * 13 + 400));
  for (let x = -L - 6; x <= L + 6; x += 6) if (Math.abs(x + 30) > 4 && Math.abs(x - hx) > 3) palm(g, R, x, 5.2, 5 + R() * 2);
  for (let x = -L - 6; x <= L + 6; x += 12) globeLamp(g, E, x + 3, -5.6, "#ffe8c8");
  for (let x = -L; x <= L; x += 12) lampPost(g, E, x, 12.8, 1);
  cars(A, [[0, 7.6, 1], [-30, 7.6, 1], [20, 10.8, -1], [-45, 10.8, -1]], -L - 30, L + 30, "#2b2b30", "#3a3a40", "#9fe0ff");
  walkers(A, 22, [-5, -3.2, -1.2, 1, 3.4], -L - 10, L + 10, 0.55);
  standers(A, [[-30, -4.8, Math.PI], [-26, -5.4, Math.PI], [4, -5.6, Math.PI], [18, -5.6, Math.PI]]);
  spot(A, "flyer", -54, -4.4, 3, [-62, 26, -95]);
  spot(A, "fullerton", -46, 3.6, 3, [-46, 8, 14]);
  spot(A, "merlion", -30, -4.8, 3, [-30, 6, -10]);
  spot(A, "esplanade", -16, -4.8, 3, [-26, 6, -68]);
  spot(A, "artscience", 4, -4.8, 3, [4, 8, -52]);
  spot(A, "helix", 18, -4.2, 2.6, [18, 3, -30]);
  spot(A, "mbs", 34, -4.8, 3, [34, 40, -84]);
  spot(A, "gardens", 52, -4.8, 3, [86, 30, -102]);
  return finish(A, {
    zr: () => [EDGE + 0.9, 5.2], cz: () => [EDGE + 0.4, 6], lane: -1.5,
    sky: SKY("#0a1020", "#1e2a44", "#3c4a66"), fog: ["#26324a", 0.006], hemi: ["#8a9cc4", "#1a1d22", 0.95],
  });
}

// ================================================================== New York · Manhattan
function areaNewYork() {
  const A = newArea(97), g = A.group, E = A.E, R = A.R;
  const CURB = 3.6, FRONT = 8.2, RIVER = 40;
  wetGround(g, {
    x0: -L - 40, len: 2 * L + 80, z0: -12, span: 26, cuts: [[RIVER, 999, -6.2]], paint(P) {
      street(P, R, -L - 40, RIVER, CURB, { far: -12, near: 14 });
      P.tiles(RIVER, L + 40, -12, 14, "#4a4640", "#3a3632", 0.6, 0.9);
      P.zebra(-24, -CURB + 0.3, CURB, "#e0e0dc").zebra(0, -CURB + 0.3, CURB, "#e0e0dc").zebra(27, -CURB + 0.3, CURB, "#e0e0dc");
      P.fill(24, RIVER, -12, -CURB, "#2a2c26", 0.5).fill(28, 44, -12, -7, "#3e2a24");   // park edge + Bethesda terrace bricks
    },
  });
  // Times Square: storefronts under giant screens, TKTS red steps, Father Duffy
  const words = ["DELI", "PIZZA", "BAGELS", "DINER", "PHARMACY", "BODEGA", "COFFEE", "HOTEL", "BAR", "THEATRE", "RAMEN"];
  const cfg = { front: FRONT, wMin: 5, wMax: 9, hMin: 18, hMax: 34, walls: ["#2a2c34", "#30323a", "#36302c"], words, vwords: ["HOTEL", "BAR", "OPEN", "LIVE"], neon: NEON, awning: 0.5, vertical: 0.4, billboards: false };
  shopRow(g, E, R, 1, -L - 30, RIVER - 14, cfg);
  shopRow(g, E, R, -1, -L - 30, -26, cfg);
  const poster = (seed) => canvasTex(256, 384, (c, w, h) => {
    const r = rng(seed), [a, b] = pick(r, [["#2f5bd8", "#9fc3ff"], ["#e8384f", "#ffd2a8"], ["#f2f0e8", "#e8384f"], ["#ff4fa0", "#3a6cf0"], ["#1c2a6a", "#ffcf5a"]]);
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, a); gr.addColorStop(1, b); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const k = Math.floor(r() * 3);
    if (k === 0) { c.fillStyle = "#f04a3a"; c.beginPath(); c.arc(w / 2, h * 0.4, w * 0.28, 0, Math.PI * 2); c.fill(); }
    else if (k === 1) { c.fillStyle = "rgba(20,30,90,.85)"; for (let x = 0; x < w; x += 18) { const bh = 40 + r() * 140; c.fillRect(x, h - bh, 14, bh); } c.fillStyle = "#fff"; c.beginPath(); c.arc(w * 0.75, h * 0.3, 26, 0, Math.PI * 2); c.fill(); }
    else { c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.moveTo(0, h * 0.7); c.lineTo(w, h * 0.3); c.lineTo(w, h * 0.5); c.lineTo(0, h); c.fill(); }
  });
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1, x = -L - 2 + (i >> 1) * 4.6 + R() * 2, w = 5 + R() * 5, h = 6 + R() * 6;
    plane(g, w, h, noLine(new THREE.MeshBasicMaterial({ map: poster(i * 7 + 3), color: new THREE.Color(1.5, 1.5, 1.5) })), x, 6 + h / 2 + R() * 6, side * (FRONT - 0.3), side > 0 ? Math.PI : 0);
    E.push({ p: V(x, 6, side * (FRONT - 2)), c: pick(R, ["#5a8cff", "#ff4f6a", "#ff9ad0", "#ffe0a0"]), k: 6 });
  }
  const tsT = litMat(windowsTex(6, 18, "#1a1e2a", 501, 0.5, false));
  box(g, 10, 50, 10, [tsT, tsT, toon("#20242c"), toon("#20242c"), tsT, tsT], -22, 0, -16);
  for (let i = 0; i < 4; i++) plane(g, 8, 5, noLine(new THREE.MeshBasicMaterial({ map: poster(90 + i), color: new THREE.Color(1.5, 1.5, 1.5) })), -22, 10 + i * 5.6, -10.9);
  const redStep = noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.16, 0.2) }));
  for (let i = 0; i < 8; i++) { box(g, 7, 0.4, 0.8, toon("#3a0c10"), -46, i * 0.4, FRONT + 0.4 + i * 0.8); box(g, 7, 0.04, 0.8, redStep, -46, i * 0.4 + 0.4, FRONT + 0.4 + i * 0.8); }
  E.push({ p: V(-46, 1.5, FRONT), c: "#ff3040", k: 8 });
  box(g, 1.4, 1.2, 1.4, toon("#5a5650"), -38, 0, -6); box(g, 0.6, 3.6, 0.5, toon("#3c3a34"), -38, 1.2, -6); box(g, 1.8, 0.5, 0.5, toon("#3c3a34"), -38, 3.6, -6);
  // Flatiron: a wedge where Broadway meets Fifth
  const fx = -12, fz = -FRONT - 0.2;
  const sh = new THREE.Shape([new THREE.Vector2(fx - 11, -fz), new THREE.Vector2(fx + 10, -fz), new THREE.Vector2(fx - 11, -(fz - 15))]);
  const fg = new THREE.ExtrudeGeometry(sh, { depth: 30, bevelEnabled: false }); fg.rotateX(-Math.PI / 2);
  const ft = canvasTex(128, 128, (c) => { const r = rng(7); c.fillStyle = "#c9bca2"; c.fillRect(0, 0, 128, 128); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = r() < 0.55 ? pick(r, ["#ffd68a", "#ffe6b0"]) : "#1a1c22"; c.fillRect(x * 32 + 9, y * 32 + 6, 14, 20); } }, [1, 1]);
  ft.repeat.set(1 / 8.8, 1 / 12.8);
  add(g, fg, noLine(new THREE.MeshBasicMaterial({ map: ft, color: new THREE.Color(0.9, 0.88, 0.85) })), 0, 0, 0);
  for (const dx of [-6, 2]) floodlight(g, E, fx + dx, fz + 2, "#ffe2b0", 3.5, 5);
  // Grand Central: three great arched windows, columns, the clock
  const gx = 14, gz = -FRONT - 1.4, gw = 24, gh = 17;
  const gm = toon("#cdbf9f", { roughness: 0.6 });
  box(g, gw, gh, 22, gm, gx, 0, gz - 11);
  const arch = canvasTex(96, 192, (c, w, h) => { c.fillStyle = "#2a2418"; c.fillRect(0, 0, w, h); c.fillStyle = "#ffcf86"; c.beginPath(); c.moveTo(6, h); c.lineTo(6, 48); c.arc(48, 48, 42, Math.PI, 0); c.lineTo(90, h); c.fill(); c.strokeStyle = "rgba(40,30,20,.75)"; c.lineWidth = 3; for (let x = 12; x < 90; x += 12) { c.beginPath(); c.moveTo(x, 10); c.lineTo(x, h); c.stroke(); } for (let y = 30; y < h; y += 14) { c.beginPath(); c.moveTo(6, y); c.lineTo(90, y); c.stroke(); } });
  const archM = noLine(new THREE.MeshBasicMaterial({ map: arch, color: new THREE.Color(1.4, 1.3, 1.15) }));
  for (const dx of [-7, 0, 7]) plane(g, 5, 10, archM, gx + dx, 7.5, gz + 0.05);
  for (const dx of [-10.5, -9.3, -3.7, 3.7, 9.3, 10.5]) cyl(g, 0.45, 12.5, gm, gx + dx, 1.2, gz + 0.7, 12);
  box(g, gw + 1, 1.2, 2, gm, gx, 13.8, gz); box(g, 10, 3.6, 1.2, gm, gx, gh, gz - 0.4);
  const clock = canvasTex(128, 128, (c) => { c.fillStyle = "#f4ead0"; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#7a5a1a"; c.lineWidth = 8; c.stroke(); c.lineWidth = 5; c.strokeStyle = "#222"; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 22); c.moveTo(64, 64); c.lineTo(94, 72); c.stroke(); });
  add(g, new THREE.CircleGeometry(1.5, 24), noLine(new THREE.MeshBasicMaterial({ map: clock, color: new THREE.Color(1.6, 1.5, 1.3) })), gx, gh + 1.7, gz + 0.25);
  for (const dx of [-2.6, 2.6]) { ball(g, 0.55, toon("#3c3a34"), gx + dx, gh + 2.6, gz); box(g, 0.9, 2.2, 0.7, toon("#3c3a34"), gx + dx, gh, gz); }
  plane(g, 9, 0.8, signMat("GRAND CENTRAL TERMINAL", { bg: "#cdbf9f", fg: "#3a2e1e", w: 512, h: 48, vertical: false }, 1.1), gx, 14.4, gz + 1.05);
  for (const dx of [-8, 0, 8]) floodlight(g, E, gx + dx, gz + 3, "#ffe2b0", 4, 6);
  tower(g, gx, -48, 26, 70, 18, "#1c2230", 703);
  // Central Park: Bethesda Terrace arcade + fountain with the Angel of the Waters
  const bx = 34;
  const ark = litMat(archTex(6, 1, "#8a7556", 77, 0.9, "round"), 0.9);
  box(g, 16, 6, 4, [ark, ark, toon("#6e5c44"), toon("#6e5c44"), ark, ark], bx, 0, -21);
  for (let x = bx - 7.5; x <= bx + 7.5; x += 1.5) cyl(g, 0.12, 1, toon("#8a7556"), x, 6, -19.2, 6);
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) box(g, 3, 0.5, 1, toon("#7a6a52"), bx + s * 10, i * 0.5, -21 + i);
  const pwater = toon("#1a3440", { roughness: 0.05, metalness: 0.4 });
  add(g, new THREE.TorusGeometry(5, 0.35, 6, 40), toon("#8a7a62"), bx, 0.3, -12).rotation.x = Math.PI / 2;
  add(g, new THREE.CircleGeometry(5, 40), pwater, bx, 0.35, -12).rotation.x = -Math.PI / 2;
  cyl(g, 1.2, 1.6, toon("#5a5040"), bx, 0, -12, 10); cyl(g, 2.4, 0.3, toon("#5a5040"), bx, 1.6, -12, 16); cyl(g, 0.5, 1.4, toon("#5a5040"), bx, 1.9, -12, 10);
  const ang = toon("#2e3a2e", { roughness: 0.35, metalness: 0.5 });
  add(g, new THREE.ConeGeometry(0.5, 2, 10), ang, bx, 4.3, -12); ball(g, 0.22, ang, bx, 5.45, -12);
  for (const s of [-1, 1]) { const wing = plane(g, 1.4, 1.8, ang, bx + s * 0.7, 5.2, -12.2); wing.rotation.y = s * 0.5; wing.rotation.z = -s * 0.4; wing.material.side = THREE.DoubleSide; }
  const fall = noLine(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.3, 1.5), transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
  add(g, new THREE.CylinderGeometry(2.4, 2.6, 1.6, 20, 1, true), fall, bx, 0.8, -12);
  floodlight(g, E, bx, -9, "#ffe2b0", 4, 5);
  for (let x = 22; x <= 46; x += 4) { tree(g, R, x, -9 - R() * 2, 1.2); tree(g, R, x + 2, -24 - R() * 3, 1.3); }
  // Brooklyn Bridge across the East River, Lower Manhattan + One World Trade beyond
  water(g, RIVER, 320, -260, -6.2);
  seawall(g, RIVER, L + 40, -6.7); railing(g, RIVER, L + 40, -6.0);
  const bz = -46, bdeck = 13, stone = toon("#7a6a58", { roughness: 0.8 });
  const btex = canvasTex(64, 128, (c) => { c.fillStyle = "#7a6a58"; c.fillRect(0, 0, 64, 128); c.fillStyle = "#14161c"; for (const x of [8, 36]) { c.beginPath(); c.moveTo(x, 128); c.lineTo(x, 60); c.quadraticCurveTo(x, 34, x + 10, 26); c.quadraticCurveTo(x + 20, 34, x + 20, 60); c.lineTo(x + 20, 128); c.fill(); } });
  const bt = noLine(new THREE.MeshBasicMaterial({ map: btex, color: new THREE.Color(0.8, 0.78, 0.75) }));
  const towersX = [70, 170];
  for (const tx of towersX) box(g, 6, 42, 14, [stone, stone, stone, stone, bt, bt], tx, -1, bz);
  box(g, 260, 1.2, 10, toon("#3a3632"), 120, bdeck, bz);
  box(g, 260, 0.12, 0.12, glow("#ffd9a0", 3), 120, bdeck + 1.2, bz + 5);
  const cab = [];
  const cable = (dz) => {
    const seg = (x0, y0, x1, y1, sag) => { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(V(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - sag * 4 * t * (1 - t), bz + dz)); } for (let i = 0; i < 24; i++) cab.push(...pts[i].toArray(), ...pts[i + 1].toArray()); for (let i = 1; i < 24; i += 1) if (pts[i].y > bdeck + 1.5) cab.push(pts[i].x, pts[i].y, bz + dz, pts[i].x, bdeck + 1.2, bz + dz); };
    seg(20, bdeck + 2, towersX[0], 40, 4); seg(towersX[0], 40, towersX[1], 40, 22); seg(towersX[1], 40, 230, bdeck + 2, 4);
  };
  cable(-4.6); cable(4.6);
  lines(g, cab, "#9aa0aa");
  skyline(g, R, 60, 300, -230, -150, 40, 30, 120, ["#151b28", "#1a2030", "#1c2436"]);
  const wtc = add(g, new THREE.CylinderGeometry(4.5, 10, 150, 4), litMat(windowsTex(8, 40, "#1c2a44", 909, 0.45, false)), 150, 75, -200); wtc.rotation.y = Math.PI / 4;
  cyl(g, 0.4, 40, glow("#e8f0ff", 1.4), 150, 150, -200, 6);
  // street furniture: lamps, NYC traffic lights, hydrants, taxis
  for (let x = -L - 6; x <= RIVER; x += 12) lampPost(g, E, x, CURB + 0.3, 1, "#ffe0b0");
  for (let x = -L; x <= RIVER - 16; x += 12) lampPost(g, E, x + 6, -CURB - 0.3, -1, "#ffe0b0");
  for (let x = RIVER + 2; x <= L + 6; x += 8) globeLamp(g, E, x, -5.4, "#ffe8c8");
  const tl = (x, z, s) => { cyl(g, 0.09, 5.4, toon("#1a1c20"), x, 0, z, 8); box(g, 0.1, 0.1, 3.6, toon("#1a1c20"), x, 5.2, z - s * 1.8); box(g, 0.45, 1.2, 0.45, toon("#e8b400"), x, 4.0, z - s * 3.2); box(g, 0.2, 0.2, 0.05, glow("#30ff70", 4), x, 4.2, z - s * 3.2 + s * 0.25); };
  for (const x of [-24, 0, 27]) { tl(x - 2, CURB + 0.3, 1); tl(x + 2, -CURB - 0.3, -1); }
  for (const x of [-50, -16, 8]) { cyl(g, 0.16, 0.7, toon("#c22a2a"), x, 0, CURB + 0.5, 10); ball(g, 0.16, toon("#c22a2a"), x, 0.75, CURB + 0.5); }
  for (const x of [-44, -6, 20]) trash(g, x, CURB + 0.7);
  for (let x = RIVER + 3; x < L + 10; x += 6) { const b = new THREE.Group(); b.position.set(x, 0, -5.2); g.add(b); box(b, 1.6, 0.08, 0.45, toon("#5a3a22"), 0, 0.45, 0); box(b, 1.6, 0.4, 0.06, toon("#5a3a22"), 0, 0.55, 0.22); }
  cars(A, [[10, 1.8, -1], [-20, 1.8, -1], [-44, 1.8, -1], [5, -2.0, 1], [-30, -2.0, 1], [-52, -2.0, 1]], -L - 30, RIVER - 4, "#f2c21a", "#f2c21a", "#ffffff");
  walkers(A, 16, [4.6, 5.6, 6.8], -L - 10, RIVER); walkers(A, 8, [-5, -6.6], -L - 10, 24); walkers(A, 6, [-4.6, -3, 0, 3], RIVER, L + 10, 0.5);
  standers(A, [[-46, FRONT - 0.8, Math.PI], [-38, -7.4, 0], [14, -6.8, 0.2], [34, -7.4, 0]]);
  spot(A, "times", -42, 5.6, 3.2, [-42, 12, -8]);
  spot(A, "flatiron", -10, 5, 3, [-12, 16, -14]);
  spot(A, "gct", 14, 5, 3, [14, 10, -10]);
  spot(A, "bethesda", 34, 5, 3, [34, 4, -12]);
  spot(A, "brooklyn", 52, -4, 3.2, [110, 22, -46]);
  return finish(A, {
    zr: (x) => [x > RIVER ? -5.6 : CURB + 0.35, FRONT - 0.7], cz: (x) => [x > RIVER ? -6 : -FRONT + 0.6, FRONT - 0.4], lane: CURB + 1.6,
    sky: SKY("#0a0f1c", "#1f2840", "#3e4660"), fog: ["#283245", 0.01], hemi: ["#8296c0", "#1a1c22", 0.9],
  });
}

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
    m.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((mt) => { mt.color?.multiplyScalar(0.6); mt.emissive?.set("#8a8478"); mt.emissiveMap = mt.map; mt.emissiveIntensity = 0.75; mt.userData.outlineParameters = { thickness: 0.001, color: [0.04, 0.05, 0.09] }; }); });
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

// ---- Tripo avatar (rigged GLB)
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
    const bones = {};
    model.traverse((o) => { if (o.isBone) bones[o.name.replace(/^tripo:*/, "")] = o; });
    model.updateMatrixWorld(true);
    const lay = rigLayout(bones);
    const leg = lay.legs[0], fwd = bones[leg.toe].getWorldPosition(new THREE.Vector3()).sub(bones[leg.ankle].getWorldPosition(new THREE.Vector3()));
    const bb = new THREE.Box3().setFromObject(model);
    const s = 1.78 / (bb.max.y - bb.min.y);
    const holder = new THREE.Group();
    model.scale.setScalar(s);
    model.position.y = -bb.min.y * s;
    const baseY = model.position.y;
    model.rotation.y = -Math.atan2(fwd.x, fwd.z);   // the model's forward -> group +Z
    holder.add(model);
    holder.updateMatrixWorld(true);
    rig = { holder, model, baseY, bones, lay, rest: new Map(Object.values(bones).map((o) => [o, o.quaternion.clone()])) };
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
// Tripo rig layouts. v1 (avatar.glb): each leg is hip -> knee -> ankle with two foot children (toe + heel);
// the heel bone just follows the ankle. v2+ (avatar-v2/v3.glb): clean chains, 4 bones per limb.
const rigLayout = (B) => B["1_Right_Limb_3"] ? {
  spine: [["Spine_0", "Spine_1", "Spine", "Spine1"], ["Spine_1", "Spine_2", "Spine1", "Spine2"], ["Spine_2", "Head_0", "Spine2", "Neck"], ["Head_0", "Head_1", "Neck", "HeadTop_End"]],
  arms: ["Right", "Left"].map((s) => [`0_${s}_Limb_0`, `0_${s}_Limb_1`, `0_${s}_Limb_2`, `0_${s}_Limb_3`]),
  legs: ["Right", "Left"].map((s) => ({ hip: `1_${s}_Limb_0`, knee: `1_${s}_Limb_1`, ankle: `1_${s}_Limb_2`, toe: `1_${s}_Limb_3` })),
} : {
  spine: [["Spine_0", "Spine_1", "Spine", "Spine2"], ["Spine_1", "Head_0", "Spine2", "Neck"], ["Head_0", "Head_1", "Neck", "HeadTop_End"]],
  arms: [["0_Right_Limb_0", "0_Right_Limb_1", "0_Right_Limb_2"], ["0_Left_Limb_0", "0_Left_Limb_1", "0_Left_Limb_2"]],
  legs: [
    { hip: "bone_14", knee: "bone_15", ankle: "bone_16", toe: "bone_17", heel: "bone_18" },
    { hip: "1_Left_Limb_2", knee: "1_Left_Limb_3", ankle: "bone_23", toe: "bone_24", heel: "1_Left_Limb_4" },
  ],
};
function buildMap() {
  const B = rig.bones, S = motion.S;
  const wp = (o) => o.getWorldPosition(new THREE.Vector3());
  rig.holder.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(rig.holder.matrixWorld).invert();
  const sideOf = (o) => Math.sign(wp(o).applyMatrix4(inv).x);   // +X = character's left (faces +Z)
  const lay = rig.lay;
  const map = lay.spine.map(([a, b, c, d]) => [B[a], B[b], S[c], S[d]]);
  const follow = [];
  for (const a of lay.arms) {
    const [c, u, f, hd] = a.map((n) => B[n]); if (!c || !u || !f) continue;
    const P = sideOf(u) > 0 ? "Left" : "Right";
    map.push([c, u, S[P + "Arm"], S[P + "ForeArm"]], [u, f, S[P + "ForeArm"], S[P + "Hand"]]);
    if (hd) map.push([f, hd, S[P + "Hand"], S[P + "HandMiddle1"]]);
  }
  for (const l of lay.legs) {
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
const builders = [areaCentral, areaUPenn, areaCUHK, areaSingapore, areaNewYork];
const N = builders.length;
const built = [];
const titleCard = root.querySelector(".world__card");
const tabs = [...root.querySelectorAll("[data-area]")];
const timeEl = root.querySelector(".world__time");
const prompt = root.querySelector(".world__prompt");

function setArea(i, fromEdge = 0) {
  areaIndex = (i + N) % N;
  if (area) scene.remove(area.group);
  area = built[areaIndex] || (built[areaIndex] = builders[areaIndex]());
  scene.add(area.group);
  scene.background = area.sky;
  scene.fog = new THREE.FogExp2(...area.fog);
  hemi.color.set(area.hemi[0]); hemi.groundColor.set(area.hemi[1]); hemi.intensity = area.hemi[2];
  hero.position.set(fromEdge ? -fromEdge * (L - 1) : -L + 8, 0, area.lane);
  hero.rotation.y = fromEdge < 0 ? -Math.PI / 2 : Math.PI / 2;
  camYaw = hero.rotation.y + (fromEdge < 0 ? -0.35 : 0.35);
  snapCam = true;
  target = null; cine = null; near = null; autoDir = fromEdge < 0 ? -1 : 1;
  tabs.forEach((b, k) => b.setAttribute("aria-pressed", String(k === areaIndex)));
  titleCard.textContent = t("areas")[areaIndex];
  root.classList.remove("is-wipe"); void root.offsetWidth; root.classList.add("is-wipe");
  updateEdges();
  showSpot(null); showPrompt(null);
}
const edgeL = root.querySelector(".world__edge--l"), edgeR = root.querySelector(".world__edge--r");
const updateEdges = () => {
  edgeL.textContent = "◀ " + t("next") + " " + t("areas")[(areaIndex + N - 1) % N].split(" · ")[0];
  edgeR.textContent = t("next") + " " + t("areas")[(areaIndex + 1) % N].split(" · ")[0] + " ▶";
  root.querySelector(".world__hint").textContent = t("hint");
  // P5-style calendar badge: date, weekday, rain, time of day
  const d = new Date();
  const wd = new Intl.DateTimeFormat(lang(), { weekday: "short" }).format(d);
  timeEl.innerHTML = `<b>${d.getMonth() + 1}/${d.getDate()}</b><span>${wd}</span><i aria-hidden="true">☂</i><small>${t("eve")}</small>`;
};
tabs.forEach((b) => b.addEventListener("click", () => setArea(+b.dataset.area)));
new MutationObserver(() => { titleCard.textContent = t("areas")[areaIndex]; updateEdges(); lastSpot = null; lastPrompt = null; }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

// ------------------------------------------------------------------ input (camera-relative) + checking places
const keys = {};
let target = null, active = false, near = null, cine = null;
const KEYMAP = { ArrowLeft: "l", a: "l", q: "l", ArrowRight: "r", d: "r", ArrowUp: "u", w: "u", z: "u", ArrowDown: "dn", s: "dn" };
const interact = (s) => { if (!s) return; cine = { s, t: 0 }; showSpot(s, true); showPrompt(null); };
addEventListener("keydown", (e) => {
  if (!active) return;
  const k = KEYMAP[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (k) { keys[k] = true; e.preventDefault(); target = null; }
  if (e.key === "Shift") keys.run = true;
  if ((e.key === "e" || e.key === "E" || e.key === "Enter") && near) { e.preventDefault(); interact(near); }
});
addEventListener("keyup", (e) => { const k = KEYMAP[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (k) keys[k] = false; if (e.key === "Shift") keys.run = false; });
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
canvas.addEventListener("pointerdown", (e) => {
  active = true; root.classList.add("is-active");
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(area.spots.map((s) => s.marker))[0];   // tapped a "!" marker
  if (hit) { const s = area.spots.find((q) => q.marker === hit.object); target = V(s.x, 0, s.z); pendingSpot = s; return; }
  const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(groundPlane, p)) { const [a, b] = area.zr(p.x); p.z = THREE.MathUtils.clamp(p.z, a, b); target = p; pendingSpot = null; }
});
let pendingSpot = null;
prompt.addEventListener("click", () => { active = true; interact(near); });
canvas.addEventListener("mouseenter", () => (active = true));
canvas.addEventListener("mouseleave", () => { active = false; Object.keys(keys).forEach((k) => (keys[k] = false)); });

// ------------------------------------------------------------------ dialog + prompt
const dialog = root.querySelector(".world__dialog");
let lastSpot = null, lastPrompt = null;
const showSpot = (s) => {
  if (s === lastSpot) return;
  lastSpot = s;
  if (!s) { dialog.classList.remove("is-on"); return; }
  const [name, line] = spotText(s.key);
  dialog.querySelector("small").textContent = name;
  dialog.querySelector("p").textContent = line;
  dialog.classList.remove("is-on"); void dialog.offsetWidth; dialog.classList.add("is-on");
};
const showPrompt = (s) => {
  if (s === lastPrompt) return;
  lastPrompt = s;
  prompt.hidden = !s;
  if (s) prompt.innerHTML = `<kbd>E</kbd> ${t("check")} <b>${spotText(s.key)[0]}</b>`;
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
  reflectors.forEach((m) => { const s = Math.min(1024, Math.round(w * PR * m.userData.res)); m.getRenderTarget().setSize(s, Math.round(s * h / w)); });
  camera.aspect = w / h;
  camera.fov = w / h < 1.2 ? 64 : 50;
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(stage);
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(stage);

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), dir = new THREE.Vector3(), want = new THREE.Vector3(), lookWant = new THREE.Vector3(), _v = new THREE.Vector3();
function step(dt, time) {
  clockDt = dt;
  // input relative to the camera: up = away from the camera
  fwd.set(Math.sin(camYaw), 0, Math.cos(camYaw));
  right.set(-Math.cos(camYaw), 0, Math.sin(camYaw));
  dir.set(0, 0, 0).addScaledVector(fwd, (keys.u ? 1 : 0) - (keys.dn ? 1 : 0)).addScaledVector(right, (keys.r ? 1 : 0) - (keys.l ? 1 : 0));
  if (target) {
    const d = target.clone().sub(hero.position); d.y = 0;
    if (d.length() < 0.25) { target = null; if (pendingSpot) { interact(pendingSpot); pendingSpot = null; } } else dir.copy(d);
  }
  // idle stroll so the scene is alive before anyone interacts
  const demo = !active && !target && dir.lengthSq() === 0;
  if (demo) {
    if (hero.position.x > L - 8) autoDir = -1; else if (hero.position.x < -L + 8) autoDir = 1;
    dir.set(autoDir, 0, (area.lane - hero.position.z) * 0.4);
  }
  const moving = dir.lengthSq() > 0.0001;
  if (moving && !demo) cine = null;
  const speed = keys.run ? 4.4 : 1.45;
  if (moving) {
    dir.normalize();
    hero.position.addScaledVector(dir, speed * dt);
    let diff = Math.atan2(dir.x, dir.z) - hero.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    hero.rotation.y += diff * Math.min(1, dt * 9);
  }
  const [zMin, zMax] = area.zr(hero.position.x);
  hero.position.z = THREE.MathUtils.clamp(hero.position.z, zMin, zMax);
  if (hero.position.x > L) setArea(areaIndex + 1, 1);
  else if (hero.position.x < -L) setArea(areaIndex - 1, -1);
  walkAmt += ((moving ? 1 : 0) - walkAmt) * Math.min(1, dt * 7);
  phase += dt * (keys.run ? 11 : 7.5) * (moving ? 1 : 0);
  pose(phase, walkAmt, time);
  if (vrm) vrm.update(dt);
  area.tick(dt, time);
  tickCrowd(area.crowd, dt, time);
  lightT += dt; if (lightT > 0.05) { lightT = 0; updateLights(); }
  // places: "!" markers bob; in range -> prompt (demo mode just shows the line)
  near = area.spots.find((s) => Math.hypot(hero.position.x - s.x, hero.position.z - s.z) < s.r) || null;
  area.spots.forEach((s, i) => { s.marker.visible = !cine; s.marker.position.y = 2.6 + Math.sin(time * 3 + i) * 0.12; s.marker.scale.setScalar(s === near ? 1.05 : 0.8); });
  if (demo) { showSpot(near); showPrompt(null); }
  else {
    if (cine && cine.s !== near) cine = null;
    if (!cine) showSpot(null);
    showPrompt(cine ? null : near);
  }
  // low, close chase camera over the right shoulder; swings round behind the hero as it turns
  if (moving) {
    let dy = hero.rotation.y - camYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    if (Math.abs(dy) < 2.3) camYaw += dy * Math.min(1, dt * 1.6);
  }
  fwd.set(Math.sin(camYaw), 0, Math.cos(camYaw));
  right.set(-Math.cos(camYaw), 0, Math.sin(camYaw));
  const [cz0, cz1] = area.cz(hero.position.x);
  if (cine) {
    // frame the landmark: stand behind the hero on the line from the landmark, look up at it
    cine.t += dt;
    _v.copy(hero.position).sub(cine.s.look); _v.y = 0; _v.normalize();
    want.copy(hero.position).addScaledVector(_v, 3.4).add(_a.set(-_v.z, 0, _v.x).multiplyScalar(0.9)); want.y = 1.25;
    lookWant.copy(cine.s.look);
  } else {
    want.copy(hero.position).addScaledVector(fwd, -3.2).addScaledVector(right, 0.55);
    want.y = 1.42 + walkAmt * 0.04;
    lookWant.copy(hero.position).addScaledVector(fwd, 3.5).addScaledVector(right, 0.25).setY(1.3);
  }
  want.z = THREE.MathUtils.clamp(want.z, cz0, cz1);
  const k = snapCam ? 1 : Math.min(1, dt * (cine ? 2 : 4));
  camera.position.lerp(want, k);
  look.lerp(lookWant, snapCam ? 1 : Math.min(1, dt * (cine ? 2.5 : 5)));
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
if (DEBUG) window.__world = { hero, camera, scene, setArea, step, keys, interact, get area() { return area; }, render: () => { composer.render(0.016); return canvas.toDataURL("image/jpeg", 0.85); }, set active(v) { active = v; } };
