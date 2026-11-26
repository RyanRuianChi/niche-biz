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
  en: ["Ryan Chi",
       "Ryan Chi (Mr.RC) is a GTM hacker and oil painter. He took insiders.bot to $1.3M in trading volume with zero ad spend, then exited. Now building in crypto and AI."],
  "zh-Hant": ["Ryan Chi",
       "Ryan Chi（Mr.RC）是 GTM 駭客，也畫油畫。零廣告預算把 insiders.bot 做到 130 萬美元交易量，然後退出。現在專注加密與 AI。"],
  ja: ["Ryan Chi",
       "Ryan Chi（Mr.RC）は GTM ハッカーで、油絵も描く。広告費ゼロで insiders.bot を取引高 130 万ドルに伸ばしてイグジット。いまはクリプトと AI で次をつくっている。"],
  ko: ["Ryan Chi",
       "Ryan Chi(Mr.RC)는 GTM 해커이자 유화를 그리는 사람. 광고비 0원으로 insiders.bot을 거래량 130만 달러까지 키운 뒤 엑싯. 지금은 크립토와 AI에서 다음을 만드는 중."],
  fr: ["Ryan Chi",
       "Ryan Chi (Mr.RC), hacker GTM et peintre à l’huile. Il a mené insiders.bot à 1,3 M$ de volume sans budget pub, puis en est sorti. Il construit désormais dans la crypto et l’IA."],
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
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(title)}">`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${attr(title)}">`);
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
