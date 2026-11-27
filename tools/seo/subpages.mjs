// Builds standalone English pages from sections of the (already prerendered) index.html:
//   /photos  -> photos.html   /art -> art.html   /press -> press.html
// Each page has its own title, description, canonical URL and structured data, so search engines
// get more pages that are about Ryan Chi and that hold his photos. Run by prerender.mjs.
import fs from "fs";

const BASE = "https://www.ryanchi.com/";
const home = fs.readFileSync("index.html", "utf8");
const section = (id) => {
  const a = home.indexOf(`<section id="${id}"`);
  if (a < 0) throw new Error("missing section " + id);
  const b = home.indexOf("</section>", a) + "</section>".length;
  return home.slice(a, b)
    .replace(/\n\s*<h2 class="title[^"]*">[\s\S]*?<\/h2>/, "")       // the page has its own h1
    .replace(' class="photos is-collapsed"', ' class="photos"')
    .replace(/\n\s*<button type="button" class="photos__more"[^>]*>[^<]*<\/button>/, "")
    .replace(/\n\s*<a class="section__more"[^>]*>[^<]*<\/a>/, "")
    .replace(/(src|href|poster)="assets\//g, '$1="/assets/');
};
const images = (html) => [...html.matchAll(/<img src="\/assets\/([^"]+)" alt="([^"]*)" width="(\d+)" height="(\d+)"/g)]
  .map(([, src, alt, w, h]) => ({ url: BASE + "assets/" + src, caption: alt.replace(/&amp;/g, "&").replace(/&quot;/g, '"'), width: +w, height: +h }));
const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const PAGES = [
  {
    file: "photos.html", path: "photos", h1: "Ryan Chi · Photos", navKey: "nav.photos",
    title: "Ryan Chi – Photos",
    desc: "Photos of Ryan Chi (Mr.RC), GTM hacker and artist: on stage at HKU, Solana and Bitget events, with his insiders.bot cofounder, and off the clock.",
    lead: "Photos of Ryan Chi (Mr.RC) on stage, at events and on the road. Click any photo for the full-size file.",
    sections: ["photos"], type: "ImageGallery",
  },
  {
    file: "art.html", path: "art", h1: "Ryan Chi · Paintings", navKey: "nav.paint",
    title: "Ryan Chi – Paintings",
    desc: "Oil paintings by Ryan Chi (Mr.RC): figures half-sunk in water, harbours under split skies, a red boat on a jade lake.",
    lead: "Oil paintings by Ryan Chi (Mr.RC). Water and clouds keep coming back, usually with someone standing in the middle of them.",
    sections: ["art"], type: "ImageGallery", artworks: true,
  },
  {
    file: "press.html", path: "press", h1: "Ryan Chi · Press & Talks", navKey: "nav.feat",
    title: "Ryan Chi – Press & Talks",
    desc: "Ryan Chi (Mr.RC) in BlockBeats, Bloomberg Businessweek, CUHK Business School, Solana, Superteam, FUTUREMODE and The Roundtable Show, plus his Solana Consumer Day pitch.",
    lead: "Where Ryan Chi (Mr.RC) has been written about, interviewed or put on stage.",
    sections: ["featured", "talks"], type: "CollectionPage", og: "https://www.ryanchi.com/assets/video/ryan-chi-solana-consumer-day-poster.jpg",
  },
];

const navLinks = PAGES.map((p) => `<a href="/${p.path}" data-i18n="${p.navKey}">${p.h1.split(" · ")[1]}</a>`).join("\n    ");

for (const p of PAGES) {
  const body = p.sections.map(section).join("\n\n");
  const imgs = images(body);
  const url = BASE + p.path;
  const og = p.og || imgs[0]?.url || BASE + "assets/og-ryan-chi.jpg";
  const person = { "@id": BASE + "#ryan" };
  const graph = [{
    "@type": p.type, "@id": url + "#page", url, name: p.title, description: p.desc,
    inLanguage: "en", isPartOf: { "@id": BASE + "#site" }, about: person, mainEntity: person,
    ...(imgs.length && !p.artworks ? { image: imgs.map((i) => ({ "@type": "ImageObject", contentUrl: i.url, url: i.url, caption: i.caption, width: i.width, height: i.height, creditText: "Ryan Chi", copyrightNotice: "Ryan Chi" })) } : {}),
    ...(p.artworks ? { hasPart: imgs.map((i) => ({ "@type": "VisualArtwork", name: i.caption.replace(/^Painting by Ryan Chi: /, ""), artform: "Painting", artMedium: "Oil paint", creator: person, image: { "@type": "ImageObject", contentUrl: i.url, width: i.width, height: i.height, caption: i.caption } })) } : {}),
  }, {
    "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ryan Chi", item: BASE },
      { "@type": "ListItem", position: 2, name: p.h1.split(" · ")[1], item: url },
    ],
  }];
  const html = `<!doctype html>
<html lang="en" data-page-lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(p.title)}</title>
<meta name="description" content="${attr(p.desc)}">
<meta name="author" content="Ryan Chi">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<link rel="me" href="https://x.com/MrRyanChi">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ryan Chi — Mr.RC">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${attr(p.title)}">
<meta property="og:description" content="${attr(p.desc)}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@MrRyanChi">
<meta name="twitter:title" content="${attr(p.title)}">
<meta name="twitter:description" content="${attr(p.desc)}">
<meta name="twitter:image" content="${og}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath d='M4 8 60 2 52 58 10 62Z' fill='%23e60012'/%3E%3Ctext x='32' y='44' font-family='Impact,Arial Black,sans-serif' font-size='30' fill='%23fff' text-anchor='middle'%3ERC%3C/text%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Permanent+Marker&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 1)}
</script>
</head>
<body class="subpage">
<header class="nav">
  <a class="nav__logo" href="/" aria-label="Ryan Chi home"><span>Mr.</span>RC</a>
  <nav class="nav__menu" aria-label="Pages">
    <a href="/">Ryan Chi</a>
    ${navLinks}
  </nav>
</header>

<main>
<div class="section subpage__head">
  <h1 class="title"><span>${p.h1}</span></h1>
  <p class="subpage__lead">${p.lead}</p>
</div>

${body}
</main>

<footer class="footer">
  <span>© <span id="yr">2026</span> <a href="/">Ryan Chi</a></span>
  <span class="footer__hint" data-i18n="foot">Take your time.</span>
</footer>

<script src="/i18n.js"></script>
<script src="/main.js"></script>
</body>
</html>
`;
  fs.writeFileSync(p.file, html);
  console.log("wrote", p.file, imgs.length, "images");
}
