# ryanchi.com

Personal site for Ryan Chi (Mr.RC). Static HTML/CSS/JS — no build step.

- `index.html` — content
- `styles.css` — Persona 5–inspired theme (red / black / white)
- `main.js` — ransom-note lettering, logo loading, scroll reveals
- `assets/` — portrait and touch icon

Project and school logos load from each site's favicon (via Google's favicon service) and fall back to a red monogram badge. To use a custom logo, replace `data-domain="…"` on the `<img class="logo">` with a `src="assets/…"`.

Deploy: point the Vercel project at this repo (framework preset: Other, no build command, output directory `.`).
