(() => {
  // Ransom-note lettering
  const styles = ["a", "b", "c", "d", "e"];
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
      s.className = "l l--" + styles[(i * 3 + text.length) % styles.length];
      s.style.setProperty("--r", (((i * 37) % 17) - 8) + "deg");
      s.style.setProperty("--y", (((i * 13) % 7) - 3) + "px");
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch;
      word.appendChild(s);
    });
  });

  // Logos: site favicon, falling back to a monogram badge
  const mono = (img, label) => {
    const b = document.createElement("span");
    b.className = img.className + " logo--mono";
    b.textContent = label;
    b.setAttribute("aria-hidden", "true");
    img.replaceWith(b);
  };
  document.querySelectorAll("img.logo").forEach((img) => {
    const domain = img.dataset.domain;
    const label = img.dataset.mono || (domain || "?").slice(0, 2).toUpperCase();
    if (!domain) return mono(img, label);
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => mono(img, label), { once: true });
    img.src = "https://www.google.com/s2/favicons?sz=128&domain=" + encodeURIComponent(domain);
  });

  // Scroll reveal
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
    items.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 60 + "ms";
      io.observe(el);
    });
  } else {
    items.forEach((el) => el.classList.add("is-in"));
  }

  document.getElementById("yr").textContent = new Date().getFullYear();
})();
