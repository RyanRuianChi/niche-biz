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
  const loadLogos = (root) => {
    root.querySelectorAll("img.logo:not([src])").forEach((img) => {
      const domain = img.dataset.domain;
      const label = img.dataset.mono || (domain || "?").slice(0, 2).toUpperCase();
      if (!domain) return mono(img, label);
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => mono(img, label), { once: true });
      img.src = "https://www.google.com/s2/favicons?sz=128&domain=" + encodeURIComponent(domain);
    });
  };

  // ---------- Bio chips (interpolated into translated bio) ----------
  const chips = {
    insiders: ["https://insiders.bot", "insiders.bot", "insiders.bot"],
    city: ["https://cityprotocol.co", "cityprotocol.co", "City Protocol"],
    cuhk: ["https://www.cuhk.edu.hk", "cuhk.edu.hk", "CUHK"],
    wharton: ["https://www.wharton.upenn.edu", "upenn.edu", "Wharton"],
  };
  const chipHTML = (k) => {
    const [href, domain, label] = chips[k];
    return `<a class="chip" href="${href}" target="_blank" rel="noopener"><img class="logo" data-domain="${domain}" alt="">${label}</a>`;
  };

  // ---------- Social-stats pentagon ----------
  const R = 112;
  const N = SITE.stats.length;
  const pt = (i, r) => {
    const a = (-90 + (360 / N) * i) * Math.PI / 180;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const poly = (r) => SITE.stats.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");
  const el = (tag, attrs) => {
    const n = document.createElementNS(svgNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  const svg = document.querySelector(".radar__svg");
  const labels = document.querySelector(".radar__labels");
  if (svg) {
    const defs = el("defs", {});
    const grad = el("linearGradient", { id: "rg", x1: "0", y1: "0", x2: "1", y2: "1" });
    grad.append(el("stop", { offset: "0", "stop-color": "#ffe14d" }), el("stop", { offset: "1", "stop-color": "#ff2a2a" }));
    defs.append(grad);
    svg.append(defs);

    // spiky star burst behind the chart, like the in-game screen
    const spikes = [];
    for (let i = 0; i < 20; i++) {
      const a = (i * 18 - 90) * Math.PI / 180;
      const r = i % 2 ? 128 : 154;
      spikes.push((Math.cos(a) * r).toFixed(1) + "," + (Math.sin(a) * r).toFixed(1));
    }
    svg.append(el("polygon", { points: spikes.join(" "), class: "radar__burst" }));
    svg.append(el("polygon", { points: poly(R + 8), class: "radar__rim" }));
    for (let l = 5; l >= 1; l--) {
      svg.append(el("polygon", { points: poly((R * l) / 5), class: "radar__ring radar__ring--" + (l % 2 ? "odd" : "even") }));
    }
    SITE.stats.forEach((_, i) => {
      const [x, y] = pt(i, R);
      svg.append(el("line", { x1: 0, y1: 0, x2: x.toFixed(1), y2: y.toFixed(1), class: "radar__spoke" }));
    });
    const val = SITE.stats.map((s, i) => pt(i, (R * s.level) / 5).map((v) => v.toFixed(1)).join(",")).join(" ");
    svg.append(el("polygon", { points: val, class: "radar__shadow", transform: "translate(7 7)" }));
    svg.append(el("polygon", { points: val, class: "radar__value" }));
    SITE.stats.forEach((s, i) => {
      const [x, y] = pt(i, (R * s.level) / 5);
      svg.append(el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 5, class: "radar__dot" }));
    });

    SITE.stats.forEach((s, i) => {
      const [x, y] = pt(i, R + 34);
      const li = document.createElement("li");
      li.className = "radar__label";
      li.style.left = ((x + 160) / 320) * 100 + "%";
      li.style.top = ((y + 160) / 320) * 100 + "%";
      li.style.setProperty("--tilt", ((i % 2 ? 1 : -1) * (3 + i)) + "deg");
      li.innerHTML = `<span class="radar__name" data-stat="${s.key}"></span><span class="radar__rank" data-rank="${s.key}" data-level="${s.level}"></span><em>Lv${s.level}</em>`;
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

    document.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((n) => {
      n.innerHTML = t(n.dataset.i18nHtml).replace(/\{(\w+)\}/g, (_, k) => chipHTML(k));
      loadLogos(n);
    });
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
