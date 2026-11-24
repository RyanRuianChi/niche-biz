// Pre-renders the site copy into static HTML so search engines and link previews see real text
// without running JavaScript. index.html = English; zh-hant.html, ja.html, ko.html, fr.html =
// per-language pages (served at /zh-hant, /ja, ... via cleanUrls in vercel.json), linked with hreflang.
// main.js still switches language at runtime. Run after editing i18n.js or index.html:
//   node tools/seo/prerender.mjs
import fs from "fs";
import vm from "vm";

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync("i18n.js", "utf8"), ctx);
const { SITE, I18N } = ctx.window;
const BASE = "https://www.ryanchi.com/";
const PAGES = { en: "", "zh-Hant": "zh-hant", ja: "ja", ko: "ko", fr: "fr" };
const HREFLANG = { en: "en", "zh-Hant": "zh-Hant", ja: "ja", ko: "ko", fr: "fr" };
const META = {
  en: ["Ryan Chi (Mr.RC) — Founder, Artist & Builder · Hong Kong",
       "Ryan Chi (Mr.RC) is a Hong Kong founder and creator in crypto and AI: cofounder of insiders.bot (exited 2026), Academic Labs, Showtime Watch and Sigmaboy.ai. CUHK, Wharton and EDHEC."],
  "zh-Hant": ["Ryan Chi（Mr.RC）— 香港創業者・藝術家・建造者",
       "Ryan Chi（Mr.RC）是香港的加密與 AI 創業者及內容創作者：insiders.bot 聯合創辦人（2026 年退出）、Academic Labs、Showtime Watch 與 Sigmaboy.ai 聯合創辦人。香港中文大學、華頓、EDHEC。"],
  ja: ["Ryan Chi（Mr.RC）— 香港の起業家・アーティスト・ビルダー",
       "Ryan Chi（Mr.RC）は香港のクリプト・AI 領域の起業家・クリエイター。insiders.bot 共同創業者（2026年イグジット）、Academic Labs、Showtime Watch、Sigmaboy.ai 共同創業者。CUHK、ウォートン、EDHEC。"],
  ko: ["Ryan Chi(Mr.RC) — 홍콩 창업가 · 아티스트 · 빌더",
       "Ryan Chi(Mr.RC)는 크립토와 AI 분야의 홍콩 창업가이자 크리에이터입니다. insiders.bot 공동 창업자(2026년 엑싯), Academic Labs, Showtime Watch, Sigmaboy.ai 공동 창업자. CUHK, 와튼, EDHEC."],
  fr: ["Ryan Chi (Mr.RC) — Fondateur, artiste et bâtisseur · Hong Kong",
       "Ryan Chi (Mr.RC) est un fondateur et créateur hongkongais dans la crypto et l’IA : cofondateur d’insiders.bot (sortie en 2026), d’Academic Labs, de Showtime Watch et de Sigmaboy.ai. CUHK, Wharton, EDHEC."],
};
const url = (l) => BASE + PAGES[l];
const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const chip = (k, inLink) => {
  const L = SITE.logos[k];
  if (!L) return `{${k}}`;
  const img = `<img class="logo" data-logo="${k}" alt="">`;
  if (!L.href || inLink) return `<span class="chip">${img}${L.name}</span>`;
  return `<a class="chip" href="${L.href}" target="_blank" rel="noopener">${img}${L.name}</a>`;
};
const esc = (s) => s.replace(/&(?!amp;|#?\w+;)/g, "&amp;").replace(/</g, "&lt;");

function fill(html, lang) {
  const T = (k) => (I18N[lang][k] !== undefined ? I18N[lang][k] : I18N.en[k]);
  html = html.replace(/(<(\w+)\b[^>]*\sdata-i18n(-html)?="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, isHtml, key, inner, close, off) => {
    const v = T(key);
    if (typeof v !== "string") return m;
    if (!isHtml && /<\w/.test(inner)) return m;
    const before = html.slice(Math.max(0, off - 2000), off);
    const inLink = before.lastIndexOf("<a ") > before.lastIndexOf("</a>");
    return open + (v.includes("{") ? v.replace(/\{(\w+)\}/g, (_, k) => chip(k, inLink)) : esc(v)) + close;
  });
  html = html.replace(/(<span class="yr" data-from="([^"]+)"(?: data-to="([^"]+)")?>)[^<]*(<\/span>)/g, (m, open, a, b, close) =>
    open + (b ? `${a} – ${b === "now" ? T("yr.now") : b}` : a) + close);
  return html;
}

function head(html, lang) {
  const [title, desc] = META[lang];
  const alt = Object.keys(PAGES).map((l) => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${url(l)}">`).join("\n") +
    `\n<link rel="alternate" hreflang="x-default" href="${BASE}">`;
  html = html.replace(/<html lang="[^"]*"[^>]*>/, `<html lang="${lang}" data-page-lang="${lang}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${attr(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(desc)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url(lang)}">`);
  html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url(lang)}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(desc)}">`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${attr(desc)}">`);
  html = html.replace(/(<meta property="og:locale"[^>]*>\n)?/, "");
  html = html.replace(/<!-- hreflang -->[\s\S]*?<!-- \/hreflang -->\n?/, "");
  html = html.replace(/<link rel="canonical"[^>]*>\n/, (m) => m + `<!-- hreflang -->\n${alt}\n<!-- /hreflang -->\n`);
  return html;
}

function langLinks(html, lang) {
  const names = { en: "English", "zh-Hant": "繁體中文", ja: "日本語", ko: "한국어", fr: "Français" };
  const nav = `<nav class="footer__langs" aria-label="Languages">` +
    Object.keys(PAGES).map((l) => `<a href="/${PAGES[l]}" hreflang="${HREFLANG[l]}"${l === lang ? ' aria-current="page"' : ""}>${names[l]}</a>`).join(" · ") + `</nav>`;
  html = html.replace(/<nav class="footer__langs"[\s\S]*?<\/nav>\n?/, "");
  return html.replace(/<\/footer>/, `  ${nav}\n</footer>`);
}

const src = fs.readFileSync("index.html", "utf8");
for (const lang of Object.keys(PAGES)) {
  let out = langLinks(head(fill(src, lang), lang), lang);
  if (lang !== "en") {   // the JSON-LD stays English; describe the page language
    out = out.replace(/"inLanguage": "en"/, `"inLanguage": "${HREFLANG[lang]}"`);
  }
  const file = lang === "en" ? "index.html" : `${PAGES[lang]}.html`;
  fs.writeFileSync(file, out);
  console.log("wrote", file);
}
