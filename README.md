# ryanchi.com

Personal site for Ryan Chi (Mr.RC). Static HTML/CSS/JS — no build step.

- `index.html` — content
- `styles.css` — Persona 5–inspired theme (red / black / white)
- `i18n.js` — social links, stat levels, and all copy in English, 繁體中文, 日本語, 한국어
- `main.js` — ransom-note lettering, social-stats pentagon, language switcher, logo loading, scroll reveals
- `assets/` — portrait and touch icon

Project and school logos load from each site's favicon (via Google's favicon service) and fall back to a red monogram badge. To use a custom logo, replace `data-domain="…"` on the `<img class="logo">` with a `src="assets/…"`.

Deploy: point the Vercel project at this repo (framework preset: Other, no build command, output directory `.`).

## SEO
- `node tools/seo/prerender.mjs` after editing copy or `index.html`: writes the text into `index.html` (English) and `zh-hant.html`, `ja.html`, `ko.html`, `fr.html` (served at /zh-hant etc. via `vercel.json`), with hreflang links.
- Person / ProfilePage structured data and meta tags live in the `<head>` of `index.html`; `robots.txt` and `sitemap.xml` (with image entries) at the root. Add new photos of Ryan to the page and to `sitemap.xml`.
