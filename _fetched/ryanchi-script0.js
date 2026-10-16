/* ============================================================
   MR.RC — main.js v5 — GAME UI EDITION
   ============================================================ */

/* ── CUSTOM CURSOR ── */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  let mx = 0, my = 0, fx = 0, fy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  function followLoop() {
    fx += (mx - fx) * 0.12;
    fy += (my - fy) * 0.12;
    follower.style.left = fx + 'px';
    follower.style.top  = fy + 'px';
    requestAnimationFrame(followLoop);
  }
  followLoop();

  document.querySelectorAll('a, button, .quest-tab').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width = '14px';
      cursor.style.height = '14px';
      follower.style.width = '50px';
      follower.style.height = '50px';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width = '8px';
      cursor.style.height = '8px';
      follower.style.width = '36px';
      follower.style.height = '36px';
    });
  });
})();

/* ── PARTICLE CANVAS ── */
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], mouse = { x: -999, y: -999 };

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });

  const COUNT = Math.min(80, Math.floor(window.innerWidth / 16));
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(254,250,224,0.35)';
      ctx.fill();
    });

    // connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(254,250,224,${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      // mouse connection
      const dx = particles[i].x - mouse.x;
      const dy = particles[i].y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 160) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(254,250,224,${0.12 * (1 - dist / 160)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── NAV SCROLL ── */
(function initNav() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  });
})();

/* ── HERO PARALLAX ── */
(function initHeroParallax() {
  const hero = document.querySelector('.hero-content');
  if (!hero) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    if (scrollY < vh) {
      const ratio = scrollY / vh;
      hero.style.transform = `translateY(${scrollY * 0.3}px)`;
      hero.style.opacity = 1 - ratio * 1.2;
    }
  });
})();

/* ── PROGRESS BAR ── */
(function initProgressBar() {
  const bar = document.getElementById('progressBar');
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (scrollTop / docHeight * 100) + '%';
  });
})();

/* ── SCROLL REVEAL ── */
(function initScrollReveal() {
  const items = document.querySelectorAll('.scroll-reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  items.forEach(item => obs.observe(item));
})();

/* ── TIMELINE ITEMS REVEAL ── */
(function initTimelineReveal() {
  const items = document.querySelectorAll('.timeline-item');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  items.forEach(item => obs.observe(item));
})();

/* ── COUNTER ANIMATION ── */
(function initCounters() {
  const counters = document.querySelectorAll('.stat-num');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      obs.unobserve(el);

      let current = 0;
      const duration = 2000;
      const start = performance.now();

      function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        current = Math.floor(eased * target);

        if (target >= 1000000) {
          el.textContent = '$' + (current / 1000000).toFixed(1) + 'M';
        } else if (target >= 1000) {
          el.textContent = current.toLocaleString();
        } else {
          el.textContent = current;
        }

        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => obs.observe(c));
})();

/* ── STAT BAR ANIMATION ── */
(function initStatBars() {
  const bars = document.querySelectorAll('.stat-bar-fill');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const targetWidth = bar.dataset.width;
        setTimeout(() => {
          bar.style.width = targetWidth + '%';
        }, 200);
        obs.unobserve(bar);
      }
    });
  }, { threshold: 0.3 });
  bars.forEach(bar => obs.observe(bar));
})();

/* ── QUEST TAB SWITCHING ── */
(function initQuestTabs() {
  const tabs = document.querySelectorAll('.quest-tab');
  const panels = document.querySelectorAll('.quest-panel');
  const journeyCalligraphy = document.getElementById('journeyCalligraphy');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      if (journeyCalligraphy) {
        journeyCalligraphy.textContent = target === 'side' ? '浮世草' : '恒之道';
      }

      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active panel
      panels.forEach(p => {
        p.classList.remove('active');
        if (p.id === 'quest-' + target) {
          p.classList.add('active');
          // Re-trigger scroll reveals for newly visible items
          p.querySelectorAll('.scroll-reveal').forEach(el => {
            el.classList.remove('visible');
            setTimeout(() => {
              const rect = el.getBoundingClientRect();
              if (rect.top < window.innerHeight) {
                el.classList.add('visible');
              }
            }, 50);
          });
          // Re-trigger timeline items
          p.querySelectorAll('.timeline-item').forEach(el => {
            el.classList.remove('visible');
            setTimeout(() => {
              const rect = el.getBoundingClientRect();
              if (rect.top < window.innerHeight) {
                el.classList.add('visible');
              }
            }, 50);
          });
        }
      });
    });
  });
})();

/* ── PROJECT CARD 3D TILT ── */
(function initCardTilt() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateY(0) rotateX(0)';
    });
  });
})();

/* ── SECTION DIVIDER WIPE LINES ── */
(function initWipeLines() {
  const sections = document.querySelectorAll('.about, .journey, .projects, .groups, .honors, .writing, .connect');
  sections.forEach(section => {
    const line = document.createElement('div');
    line.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: var(--yellow);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1;
    `;
    section.style.position = 'relative';
    section.prepend(line);

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        line.style.transform = 'scaleX(1)';
        obs.disconnect();
      }
    }, { threshold: 0 });
    obs.observe(section);
  });
})();

/* ── HONOR ITEMS STAGGER ── */
(function initHonorStagger() {
  const items = document.querySelectorAll('.honor-item');
  items.forEach((item, i) => {
    item.style.transitionDelay = `${i * 0.06}s`;
  });
})();

/* ── GLITCH TEXT EFFECT ON HERO NAME ── */
(function initGlitch() {
  const heroName = document.querySelector('.reveal-line');
  if (!heroName) return;

  setInterval(() => {
    heroName.style.textShadow = `
      ${Math.random() * 4 - 2}px ${Math.random() * 2 - 1}px 0 rgba(254,250,224,0.15),
      ${Math.random() * -4 + 2}px ${Math.random() * 2 - 1}px 0 rgba(254,250,224,0.1)
    `;
    setTimeout(() => {
      heroName.style.textShadow = 'none';
    }, 80);
  }, 4000);
})();
