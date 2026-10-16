(() => {
  const SITE = window.SITE;
  const I18N = window.I18N;
  const svgNS = "http://www.w3.org/2000/svg";

  // ---------- Ransom-note lettering ----------
  const ransomStyles = ["a", "b", "c", "d", "e"];
  document.querySelectorAll("[data-ransom]").forEach((el) => {
    const text = el.dataset.ransom;
    el.textContent = "";
    let word = null;
    [...text].forEach((ch, i) => {
      if (ch === " ") {
        const sp = document.createElement("span");
        sp.className = "sp";
        el.appendChild(sp);
        word = null;
        return;
      }
      if (!word) {
        word = document.createElement("span");
        word.className = "w";
        el.appendChild(word);
      }
      const s = document.createElement("span");
      s.className = "l l--" + ransomStyles[(i * 3 + text.length) % ransomStyles.length];
      s.style.setProperty("--r", (((i * 37) % 17) - 8) + "deg");
      s.style.setProperty("--y", (((i * 13) % 7) - 3) + "px");
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch;
      word.appendChild(s);
    });
  });

  // ---------- Social links ----------
  document.querySelectorAll("[data-social]").forEach((a) => {
    const url = SITE.socials[a.dataset.social];
    if (url) a.href = url;
    else a.remove();
  });

  // ---------- Logos: site favicon, falling back to a monogram badge ----------
  const mono = (img, label) => {
    const b = document.createElement("span");
    b.className = img.className + " logo--mono";
    b.textContent = label;
    b.setAttribute("aria-hidden", "true");
    img.replaceWith(b);
  };
  // Each logo tries, in order: the site's own apple-touch-icon (official, high-res),
  // the org's X avatar (data-x), then Google's favicon service. Google answers
  // unknown sites with a 16px globe, so tiny results count as a miss.
  const loadLogos = (root) => {
    root.querySelectorAll("img.logo:not([data-loading])").forEach((img) => {
      const domain = img.dataset.domain;
      const label = img.dataset.mono || (domain || "?").slice(0, 2).toUpperCase();
      const srcs = [];
      if (domain) srcs.push(`https://${domain}/apple-touch-icon.png`);
      if (img.dataset.x) srcs.push(`https://unavatar.io/x/${img.dataset.x}?fallback=false`);
      if (domain) srcs.push(`https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`);
      if (!srcs.length) return mono(img, label);
      img.dataset.loading = "1";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      let i = 0;
      const next = () => (i < srcs.length ? (img.src = srcs[i++]) : mono(img, label));
      img.addEventListener("error", next);
      img.addEventListener("load", () => { if (img.naturalWidth < 32) next(); });
      next();
    });
  };

  // ---------- Bio chips (interpolated into translated bio) ----------
  const chips = {
    insiders: ["https://insiders.bot", "www.insiders.bot", "insiders.bot"],
    city: ["https://cityprotocol.co", "cityprotocol.co", "City Protocol"],
    cuhk: ["https://www.cuhk.edu.hk", "www.cuhk.edu.hk", "CUHK"],
    wharton: ["https://www.wharton.upenn.edu", "wharton.upenn.edu", "Wharton"],
    edhec: ["https://www.edhec.edu", "edhec.edu", "EDHEC"],
    polymarket: ["https://polymarket.com", "polymarket.com", "Polymarket"],
    evg: ["https://evg.co", "evg.co", "EVG Ventures"],
    pennbc: ["https://pennblockchain.com", "pennblockchain.com", "Penn Blockchain"],
  };
  // Inside an existing link (e.g. confidant cards) chips render as spans.
  const chipHTML = (k, inLink) => {
    const [href, domain, label, monoLabel] = chips[k];
    const img = domain
      ? `<img class="logo" data-domain="${domain}" alt="">`
      : `<img class="logo" data-mono="${monoLabel || label.slice(0, 2)}" alt="">`;
    if (!href || inLink) return `<span class="chip">${img}${label}</span>`;
    return `<a class="chip" href="${href}" target="_blank" rel="noopener">${img}${label}</a>`;
  };
  const fill = (n, str) => {
    if (typeof str === "string" && str.includes("{")) {
      const inLink = !!n.closest("a");
      n.innerHTML = str.replace(/\{(\w+)\}/g, (_, k) => (chips[k] ? chipHTML(k, inLink) : _));
      loadLogos(n);
    } else {
      n.textContent = str;
    }
  };

  // ---------- Social-stats star (Persona 5 "social stats" screen) ----------
  const N = SITE.stats.length;
  const R = 150;          // outer tip radius of the big black star
  const RIN = R * 0.42;   // inner (valley) radius of the big star
  const pt = (deg, r) => {
    const a = (deg * Math.PI) / 180;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const fmt = (p) => p.map((v) => v.toFixed(1)).join(",");
  // star polygon: tip i at -90 + 72i, valley between tips
  const star = (tipR, valleyR) => {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const tip = -90 + (360 / N) * i;
      pts.push(fmt(pt(tip, typeof tipR === "function" ? tipR(i) : tipR)));
      pts.push(fmt(pt(tip + 180 / N, valleyR)));
    }
    return pts.join(" ");
  };
  const el = (tag, attrs) => {
    const n = document.createElementNS(svgNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  const svg = document.querySelector(".radar__svg");
  const labels = document.querySelector(".radar__labels");
  if (svg) {
    // ghost outline star, offset like the in-game layered shapes
    svg.append(el("polygon", { points: star(R + 14, RIN + 6), class: "radar__ghost", transform: "rotate(-6)" }));
    svg.append(el("polygon", { points: star(R, RIN), class: "radar__base" }));
    // level guides along each arm
    for (let l = 1; l < 5; l++) {
      svg.append(el("polygon", { points: star(RIN * 0.55 + (R * 0.8 - RIN * 0.55) * (l / 5), RIN * 0.55), class: "radar__guide" }));
    }
    const valueTip = (i) => RIN * 0.55 + (R * 0.8 - RIN * 0.55) * (SITE.stats[i].level / 5);
    const val = star(valueTip, RIN * 0.55);
    svg.append(el("polygon", { points: val, class: "radar__shadow", transform: "translate(6 6)" }));
    svg.append(el("polygon", { points: val, class: "radar__value" }));

    SITE.stats.forEach((s, i) => {
      const [x, y] = pt(-90 + (360 / N) * i, R + 30);
      const li = document.createElement("li");
      li.className = "radar__label";
      li.style.left = ((x + 215) / 430) * 100 + "%";
      li.style.top = ((y + 215) / 430) * 100 + "%";
      li.style.setProperty("--tilt", ((i % 2 ? 1 : -1) * (4 + i)) + "deg");
      li.innerHTML = `<span class="radar__name"><span data-stat="${s.key}"></span><em>${s.level}</em></span><span class="radar__rank" data-rank="${s.key}" data-level="${s.level}"></span>`;
      labels.append(li);
    });
  }

  // ---------- i18n ----------
  const fontFor = {
    "zh-Hant": "Noto+Sans+TC:wght@500;900",
    ja: "Noto+Sans+JP:wght@500;900",
    ko: "Noto+Sans+KR:wght@500;900",
  };
  const loadedFonts = new Set();
  const loadFont = (lang) => {
    if (!fontFor[lang] || loadedFonts.has(lang)) return;
    loadedFonts.add(lang);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontFor[lang]}&display=swap`;
    document.head.append(link);
  };

  const setLang = (lang) => {
    if (!I18N[lang]) lang = "en";
    const t = (k) => (I18N[lang][k] !== undefined ? I18N[lang][k] : I18N.en[k]);
    loadFont(lang);
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((n) => fill(n, t(n.dataset.i18n)));
    document.querySelectorAll("[data-i18n-html]").forEach((n) => fill(n, t(n.dataset.i18nHtml)));
    document.querySelectorAll("[data-stat]").forEach((n) => { n.textContent = t("stat." + n.dataset.stat); });
    document.querySelectorAll("[data-rank]").forEach((n) => { n.textContent = t("rank." + n.dataset.rank)[n.dataset.level - 1]; });

    const track = document.querySelector(".ticker__track");
    if (track) {
      const items = t("ticker");
      const star = '<svg><use href="#i-star"/></svg>';
      const once = items.map((s) => `<span>${s}</span>${star}`).join("");
      track.innerHTML = once + once;
    }

    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    try { localStorage.setItem("lang", lang); } catch (e) {}
  };

  const pickInitial = () => {
    const q = new URLSearchParams(location.search).get("lang");
    if (q && I18N[q]) return q;
    try {
      const saved = localStorage.getItem("lang");
      if (saved && I18N[saved]) return saved;
    } catch (e) {}
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("zh")) return "zh-Hant";
    if (nav.startsWith("ja")) return "ja";
    if (nav.startsWith("ko")) return "ko";
    return "en";
  };

  document.querySelectorAll("[data-lang]").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang))
  );
  setLang(pickInitial());
  loadLogos(document);

  // ---------- Scroll reveal ----------
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((n, i) => {
      n.style.transitionDelay = (i % 4) * 60 + "ms";
      io.observe(n);
    });
  } else {
    items.forEach((n) => n.classList.add("is-in"));
  }

  document.getElementById("yr").textContent = new Date().getFullYear();
})();
