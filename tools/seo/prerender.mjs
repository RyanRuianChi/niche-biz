// Pre-renders the English copy from i18n.js into index.html so search engines and link
// previews see real text without running JavaScript (main.js still swaps languages at runtime).
// Run after editing i18n.js or index.html:  node tools/seo/prerender.mjs
import fs from "fs";
import vm from "vm";

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync("i18n.js", "utf8"), ctx);
const { SITE, I18N } = ctx.window;
const en = I18N.en;
let html = fs.readFileSync("index.html", "utf8");

const chip = (k, inLink) => {
  const L = SITE.logos[k];
  if (!L) return `{${k}}`;
  const img = `<img class="logo" data-logo="${k}" alt="">`;
  if (!L.href || inLink) return `<span class="chip">${img}${L.name}</span>`;
  return `<a class="chip" href="${L.href}" target="_blank" rel="noopener">${img}${L.name}</a>`;
};
const esc = (s) => s.replace(/&(?!amp;|#?\w+;)/g, "&amp;").replace(/</g, "&lt;");

let count = 0, missing = [];
// leaf elements: <tag ... data-i18n="key" ...>anything-without-tags</tag>
html = html.replace(/(<(\w+)\b[^>]*\sdata-i18n(-html)?="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, isHtml, key, inner, close, off) => {
  const v = en[key];
  if (typeof v !== "string") { missing.push(key); return m; }
  if (!isHtml && /<\w/.test(inner)) return m;          // not a leaf, leave it
  const before = html.slice(Math.max(0, off - 2000), off);
  const inLink = before.lastIndexOf("<a ") > before.lastIndexOf("</a>");
  const body = v.includes("{") ? v.replace(/\{(\w+)\}/g, (_, k) => chip(k, inLink)) : esc(v);
  count++;
  return open + body + close;
});
// year tags
html = html.replace(/(<span class="yr" data-from="([^"]+)"(?: data-to="([^"]+)")?>)[^<]*(<\/span>)/g, (m, open, a, b, close) =>
  open + (b ? `${a} – ${b === "now" ? en["yr.now"] : b}` : a) + close);

fs.writeFileSync("index.html", html);
console.log(`prerendered ${count} strings` + (missing.length ? `; no English for: ${[...new Set(missing)].join(", ")}` : ""));
