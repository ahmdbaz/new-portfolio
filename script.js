/* ============================================================
   CUSTOM CURSOR
============================================================ */
const cursorDot  = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');

let mouseX = 0, mouseY = 0;
let ringX = 0,  ringY = 0;
let rafId;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function animateCursor() {
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top  = mouseY + 'px';

  ringX += (mouseX - ringX) * 0.1;
  ringY += (mouseY - ringY) * 0.1;
  cursorRing.style.left = ringX + 'px';
  cursorRing.style.top  = ringY + 'px';

  rafId = requestAnimationFrame(animateCursor);
}
animateCursor();

document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => cursorRing.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursorRing.classList.remove('hover'));
});

document.addEventListener('mouseleave', () => {
  cursorDot.style.opacity  = '0';
  cursorRing.style.opacity = '0';
});
document.addEventListener('mouseenter', () => {
  cursorDot.style.opacity  = '1';
  cursorRing.style.opacity = '1';
});

/* ============================================================
   PARTICLE NETWORK CANVAS
============================================================ */
const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');

let W, H;

const AWS_LABELS = [
  'S3','Lambda','CDN','DB','API','VPC',
  'EC2','IAM','SNS','SQS','RDS','ECS',
  'CF','ALB','R53','KMS',
];

const NODE_COUNT    = 60;
const CONNECT_DIST  = 170;
const PARTICLE_COUNT = 14;

let nodes     = [];
let particles = [];

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function createNodes() {
  nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x:       Math.random() * W,
      y:       Math.random() * H,
      vx:      (Math.random() - 0.5) * 0.28,
      vy:      (Math.random() - 0.5) * 0.28,
      r:       Math.random() * 1.6 + 0.8,
      label:   i < AWS_LABELS.length ? AWS_LABELS[i] : null,
      alpha:   Math.random() * 0.35 + 0.15,
    });
  }
}

function pickEdge() {
  let attempts = 0;
  while (attempts++ < 60) {
    const a = Math.floor(Math.random() * NODE_COUNT);
    const b = Math.floor(Math.random() * NODE_COUNT);
    if (a === b) continue;
    const dx = nodes[a].x - nodes[b].x;
    const dy = nodes[a].y - nodes[b].y;
    if (Math.hypot(dx, dy) < CONNECT_DIST) return [a, b];
  }
  return [0, 1];
}

function createParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const [a, b] = pickEdge();
    particles.push({
      a,
      b,
      t:     Math.random(),
      speed: Math.random() * 0.0035 + 0.0018,
    });
  }
}

function drawCanvas() {
  ctx.clearRect(0, 0, W, H);

  // Connections
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const na = nodes[i], nb = nodes[j];
      const dx   = na.x - nb.x;
      const dy   = na.y - nb.y;
      const dist = Math.hypot(dx, dy);
      if (dist < CONNECT_DIST) {
        const a = (1 - dist / CONNECT_DIST) * 0.11;
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = `rgba(0,229,184,${a})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();
      }
    }
  }

  // Traveling particles
  for (const p of particles) {
    const na = nodes[p.a], nb = nodes[p.b];
    const x  = na.x + (nb.x - na.x) * p.t;
    const y  = na.y + (nb.y - na.y) * p.t;

    // Fade in/out at edges of path
    const edge  = Math.min(p.t, 1 - p.t) * 8;
    const alpha = Math.min(edge, 1);

    // Glow halo
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
    grad.addColorStop(0,   `rgba(0,229,184,${alpha * 0.6})`);
    grad.addColorStop(1,   'rgba(0,229,184,0)');
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,229,184,${alpha})`;
    ctx.fill();

    p.t += p.speed;
    if (p.t >= 1) {
      p.t = 0;
      const [a, b] = pickEdge();
      p.a = a; p.b = b;
    }
  }

  // Nodes
  ctx.font = '8.5px "JetBrains Mono", monospace';
  for (const n of nodes) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,229,184,${n.alpha})`;
    ctx.fill();

    if (n.label) {
      ctx.fillStyle = `rgba(0,229,184,${n.alpha * 0.45})`;
      ctx.fillText(n.label, n.x + n.r + 3, n.y + 3);
    }

    n.x += n.vx;
    n.y += n.vy;
    if (n.x < -20 || n.x > W + 20) n.vx *= -1;
    if (n.y < -20 || n.y > H + 20) n.vy *= -1;
  }

  requestAnimationFrame(drawCanvas);
}

window.addEventListener('resize', () => { resize(); createNodes(); createParticles(); });
resize();
createNodes();
createParticles();
drawCanvas();

/* ============================================================
   DRAGGABLE ORBITAL ANIMATIONS
   Works for both hero (.hv-hub) and contact (.signal-hub)
============================================================ */
function initDraggableHub(hubEl, orbitEls, pillEls, speeds) {
  // speeds: deg/ms per orbit, negative = counter-clockwise
  let angles   = orbitEls.map((_, i) => i * (360 / orbitEls.length));
  let lastTs   = null;
  let dragging = false;
  let dragBasePointerAngle = 0;
  let dragBaseAngles = [];

  function pointerAngle(cx, cy) {
    const r = hubEl.getBoundingClientRect();
    return Math.atan2(cy - (r.top + r.height / 2), cx - (r.left + r.width / 2)) * (180 / Math.PI);
  }

  function applyTransforms() {
    orbitEls.forEach((el, i) => {
      el.style.transform = `rotate(${angles[i]}deg)`;
    });
    pillEls.forEach((el, i) => {
      el.style.transform = `translateX(-50%) rotate(${-angles[i]}deg)`;
    });
  }

  (function tick(ts) {
    if (!dragging && lastTs !== null) {
      const dt = ts - lastTs;
      angles = angles.map((a, i) => a + speeds[i] * dt);
    }
    lastTs = ts;
    applyTransforms();
    requestAnimationFrame(tick);
  })(performance.now());

  function onStart(cx, cy) {
    dragging = true;
    dragBasePointerAngle = pointerAngle(cx, cy);
    dragBaseAngles = [...angles];
    hubEl.style.cursor = 'grabbing';
  }
  function onMove(cx, cy) {
    if (!dragging) return;
    const delta = pointerAngle(cx, cy) - dragBasePointerAngle;
    angles = dragBaseAngles.map(a => a + delta);
    lastTs = null; // avoid time-jump on resume
  }
  function onEnd() {
    if (!dragging) return;
    dragging = false;
    lastTs = null;
    hubEl.style.cursor = 'grab';
  }

  hubEl.addEventListener('mousedown',  e => { e.preventDefault(); onStart(e.clientX, e.clientY); });
  hubEl.addEventListener('touchstart', e => { onStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  document.addEventListener('mousemove',  e => onMove(e.clientX, e.clientY));
  document.addEventListener('touchmove',  e => { if (dragging) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  document.addEventListener('mouseup',  onEnd);
  document.addEventListener('touchend', onEnd);
}

// Hero orbital
const hvHub = document.querySelector('.hv-hub');
if (hvHub) {
  initDraggableHub(
    hvHub,
    [...hvHub.querySelectorAll('.hv-orbit')],
    [...hvHub.querySelectorAll('.hv-pill')],
    [360/9000, 360/13000, -360/17000, 360/11000]
  );
}

// Contact signal hub
const signalHub = document.querySelector('.signal-hub');
if (signalHub) {
  initDraggableHub(
    signalHub,
    [...signalHub.querySelectorAll('.orbit')],
    [...signalHub.querySelectorAll('.orbit-msg')],
    [360/10000, -360/14000, 360/18000]
  );
}

/* ============================================================
   NAVIGATION - scroll state, progress bar, active link
============================================================ */
const nav         = document.getElementById('nav');
const progressBar = document.getElementById('nav-progress');
const navLinks    = document.querySelectorAll('.nav-link');
const allSections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', onScroll, { passive: true });

function onScroll() {
  const sy = window.scrollY;

  // Scrolled background
  nav.classList.toggle('scrolled', sy > 10);

  // Progress bar
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (sy / maxScroll * 100) + '%';

  // Active nav link
  let current = '';
  allSections.forEach(s => {
    if (sy >= s.offsetTop - 130) current = s.id;
  });
  navLinks.forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === '#' + current);
  });
}
onScroll();

/* ============================================================
   MOBILE NAV
============================================================ */
const burger    = document.getElementById('nav-burger');
const mobileNav = document.getElementById('nav-mobile');

burger.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});

document.querySelectorAll('.nav-mobile-link').forEach(l => {
  l.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
  });
});

/* ============================================================
   SMOOTH SCROLL - account for fixed nav height
============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const navH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h')
    ) || 64;
    window.scrollTo({ top: target.offsetTop - navH, behavior: 'smooth' });
  });
});

/* ============================================================
   MAGNETIC LETTER EFFECT - hero name + all section titles
============================================================ */
(function initMagneticLetters() {
  // Wrap chars in hero name lines AND every section title
  const targets = [
    ...document.querySelectorAll('.name-line1, .name-line2'),
    ...document.querySelectorAll('.section-title'),
  ];

  targets.forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'name-char';
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
    });
  });

  const RADIUS    = 85;
  const MAX_SCALE = 0.28;
  const MAX_Y     = -8;

  document.addEventListener('mousemove', e => {
    document.querySelectorAll('.name-char').forEach(char => {
      const r  = char.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const d  = Math.hypot(e.clientX - cx, e.clientY - cy);

      if (d < RADIUS) {
        const f     = 1 - d / RADIUS;
        const scale = 1 + f * MAX_SCALE;
        const ty    = f * MAX_Y;
        char.style.transform = `scale(${scale.toFixed(3)}) translateY(${ty.toFixed(1)}px)`;
        char.style.color     = `rgba(0,229,184,${(f * 0.7).toFixed(2)})`;
      } else {
        char.style.transform = '';
        char.style.color     = '';
      }
    });
  });

  document.addEventListener('mouseleave', () => {
    document.querySelectorAll('.name-char').forEach(c => {
      c.style.transform = '';
      c.style.color     = '';
    });
  });
})();

/* ============================================================
   HERO - glitch reveal then typewriter roles
============================================================ */
const heroName = document.getElementById('hero-name');
heroName.classList.add('glitch');
setTimeout(() => heroName.classList.remove('glitch'), 800);

const ROLES = [
  'Cloud Computing Enthusiast',
  'AWS Serverless Architect',
  'Infrastructure Designer',
  'DevOps Engineer',
  'Scalable Systems Builder',
];

let roleIdx   = 0;
let charIdx   = 0;
let deleting  = false;
const roleEl  = document.getElementById('hero-role');

function typeRole() {
  const current = ROLES[roleIdx];

  if (!deleting) {
    charIdx++;
    roleEl.textContent = current.slice(0, charIdx);
    if (charIdx === current.length) {
      deleting = true;
      setTimeout(typeRole, 2000);
      return;
    }
    setTimeout(typeRole, 58 + Math.random() * 28);
  } else {
    charIdx--;
    roleEl.textContent = current.slice(0, charIdx);
    if (charIdx === 0) {
      deleting = false;
      roleIdx  = (roleIdx + 1) % ROLES.length;
      setTimeout(typeRole, 320);
      return;
    }
    setTimeout(typeRole, 28 + Math.random() * 12);
  }
}
setTimeout(typeRole, 1100);

/* ============================================================
   REVEAL ON SCROLL - staggered for grids
============================================================ */
const revealEls = document.querySelectorAll('.reveal');

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const el     = entry.target;
    const parent = el.parentElement;
    const isGrid = parent && (
      parent.classList.contains('about-cards')   ||
      parent.classList.contains('skills-grid')   ||
      parent.classList.contains('projects-grid')
    );

    const delay = isGrid
      ? [...parent.children].indexOf(el) * 110
      : 0;

    setTimeout(() => el.classList.add('visible'), delay);
    revealObs.unobserve(el);
  });
}, {
  threshold: 0.08,
  rootMargin: '-30px 0px',
});

revealEls.forEach(el => revealObs.observe(el));

/* ============================================================
   SKILL BARS - animate width on scroll entry
============================================================ */
const skillFills = document.querySelectorAll('.skill-fill');

const skillObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.style.width = entry.target.dataset.pct + '%';
    skillObs.unobserve(entry.target);
  });
}, { threshold: 0.4 });

skillFills.forEach(el => skillObs.observe(el));

/* ============================================================
   VISITOR COUNTER
============================================================ */
(async () => {
  try {
    const res  = await fetch('https://0mpt4rv12e.execute-api.us-east-1.amazonaws.com/count');
    const data = await res.json();
    const count = data.count ?? data.visits ?? data.visitor_count;
    if (count !== undefined) {
      document.getElementById('visitor-count').textContent = '#' + Number(count).toLocaleString();
    }
  } catch {
    /* silently fail - counter is non-critical */
  }
})();

/* ============================================================
   LIVE METRICS CARD
============================================================ */
(function initMetrics() {
  const clockEl    = document.getElementById('mc-clock');
  const cacheValEl = document.getElementById('mc-cache-val');
  const cacheBarEl = document.getElementById('mc-cache-bar');
  const latencyEl  = document.getElementById('mc-latency');
  const sparkEl    = document.getElementById('mc-spark-line');
  const visitorsEl = document.getElementById('mc-visitors');

  if (!clockEl) return; // card not present

  // Clock
  function tickClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = h + ':' + m + ':' + s + ' UTC';
  }
  tickClock();
  setInterval(tickClock, 1000);

  // Sparkline data (last 20 latency readings)
  const sparkData = [];
  for (let i = 0; i < 20; i++) sparkData.push(12 + Math.random() * 16);

  function drawSparkline() {
    if (!sparkEl) return;
    const w = 100, h = 28;
    const min = 8, max = 32;
    const pts = sparkData.map((v, i) => {
      const x = (i / (sparkData.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    sparkEl.setAttribute('points', pts.join(' '));
  }
  drawSparkline();

  // Fluctuate metrics every 2.8s
  function fluctuate() {
    const lat = (12 + Math.random() * 14).toFixed(0);
    if (latencyEl) latencyEl.textContent = lat + 'ms';
    sparkData.push(parseFloat(lat));
    if (sparkData.length > 20) sparkData.shift();
    drawSparkline();

    const cache = (95 + Math.random() * 4.4).toFixed(1);
    if (cacheValEl) cacheValEl.textContent = cache + '%';
    if (cacheBarEl) cacheBarEl.style.setProperty('--w', cache + '%');
  }
  setInterval(fluctuate, 2800);

  // Sync visitors from main counter
  function syncVisitors() {
    const mainCount = document.getElementById('visitor-count');
    if (mainCount && visitorsEl && mainCount.textContent !== '—') {
      visitorsEl.textContent = mainCount.textContent;
    }
  }
  const syncInterval = setInterval(() => {
    syncVisitors();
    const mainCount = document.getElementById('visitor-count');
    if (mainCount && mainCount.textContent !== '—') clearInterval(syncInterval);
  }, 1000);
})();

/* ============================================================
   FOOTER YEAR
============================================================ */
document.getElementById('footer-year').textContent = new Date().getFullYear();
