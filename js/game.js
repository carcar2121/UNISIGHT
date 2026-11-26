/* =========================================================
   "Catch the knowledge" mini game — startGame(), togglePause()
   Items, points and facts come from the Game sheet of the Excel.
   ========================================================= */
(function () {
  const COL = { crimson: '#C5192D', coral: '#FF3A21', slate: '#1E293B', rose: '#FEE2E2', smoke: '#F8FAFC' };
  const W = 640, H = 440;
  const BEST_KEY = 'dea-best-score';

  let canvas, ctx, ui, items = [], label = k => k;
  let state = 'idle'; // idle | running | paused | over
  let player, falling, particles, popups, score, lives, elapsed, spawnTimer, last, caughtFacts;
  const keys = { left: false, right: false };

  /* ---------- drawing ---------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawCap(x, y, tilt) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    ctx.fillStyle = COL.slate;
    ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(0, -16); ctx.lineTo(44, 0); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill();
    roundRect(-24, 4, 48, 18, 6); ctx.fill();
    ctx.fillStyle = COL.crimson; ctx.fillRect(-24, 8, 48, 4);
    ctx.strokeStyle = COL.coral; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, 4); ctx.lineTo(36, 22); ctx.stroke();
    ctx.fillStyle = COL.coral; ctx.beginPath(); ctx.arc(36, 25, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawItem(it) {
    const { x, y, r, shape, rot } = it;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (shape === 'book') {
      ctx.fillStyle = COL.crimson; roundRect(-r, -r * .75, r * 2, r * 1.5, 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-r + 4, -r * .75 + 4, r - 6, r * 1.5 - 8); ctx.fillRect(2, -r * .75 + 4, r - 6, r * 1.5 - 8);
      ctx.fillStyle = COL.crimson; ctx.fillRect(-1.5, -r * .75, 3, r * 1.5);
    } else if (shape === 'cap') {
      ctx.scale(.42, .42); ctx.rotate(-rot); drawCap(0, 0, 0);
    } else if (shape === 'scale') {
      ctx.strokeStyle = COL.coral; ctx.fillStyle = COL.coral; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r * .8); ctx.moveTo(-r, -r * .55); ctx.lineTo(r, -r * .55); ctx.stroke();
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(s * r * .8, -r * .05, r * .38, 0, Math.PI); ctx.fill(); });
      roundRect(-r * .5, r * .7, r, r * .25, 3); ctx.fill();
    } else if (shape === 'star') {
      ctx.fillStyle = COL.crimson; ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowColor = COL.coral; ctx.shadowBlur = 16; ctx.fill();
    } else { // barrier
      ctx.rotate(-rot);
      ctx.fillStyle = COL.slate; roundRect(-r * 1.6, -r * .6, r * 3.2, r * 1.2, r * .6); ctx.fill();
      ctx.fillStyle = COL.smoke; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.name.toUpperCase(), 0, 1);
    }
    ctx.restore();
  }

  /* ---------- game loop ---------- */
  function spawn() {
    const roll = Math.random();
    const goods = items.filter(i => i.Kind === 'Good');
    const bonus = items.filter(i => i.Kind === 'Bonus');
    const bad = items.filter(i => i.Kind === 'Barrier');
    const badChance = Math.min(.25 + elapsed / 120, .45);
    let pool = roll < .07 && bonus.length ? bonus : roll < .07 + badChance && bad.length ? bad : goods;
    const def = pool[Math.floor(Math.random() * pool.length)];
    if (!def) return;
    const isBar = def.Kind === 'Barrier';
    const r = isBar ? 16 : 18;
    falling.push({
      def, name: def.Item, shape: def.Shape || (isBar ? 'barrier' : 'book'), r,
      x: 40 + Math.random() * (W - 80), y: -30,
      vy: 110 + Math.random() * 50 + elapsed * 3.2,
      rot: Math.random() * Math.PI, vr: (Math.random() - .5) * (isBar ? 0 : 2),
    });
  }

  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 1, color, size: 2 + Math.random() * 3 });
    }
  }

  function update(dt) {
    elapsed += dt;
    const speed = 520;
    if (keys.left) player.tx -= speed * dt;
    if (keys.right) player.tx += speed * dt;
    player.tx = Math.max(44, Math.min(W - 44, player.tx));
    const prev = player.x;
    player.x += (player.tx - player.x) * Math.min(1, dt * 14);
    player.tilt += (((player.x - prev) / Math.max(dt, .001)) * .0006 - player.tilt) * .2;

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawn(); spawnTimer = Math.max(.38, 1 - elapsed / 60); }

    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i];
      f.y += f.vy * dt; f.rot += f.vr * dt;
      const hit = Math.abs(f.x - player.x) < 44 + f.r * .6 && Math.abs(f.y - player.y) < 22 + f.r * .5;
      if (hit) {
        falling.splice(i, 1);
        const pts = Number(f.def.Points) || 0;
        if (f.def.Kind === 'Barrier') {
          lives--; shake = .35;
          burst(f.x, f.y, COL.slate, 18);
          popups.push({ x: f.x, y: f.y, text: '−1 ♥', color: COL.slate, life: 1 });
          if (f.def.Fact) caughtFacts.push(f.def.Fact);
          renderHud();
          if (lives <= 0) return gameOver();
        } else {
          score += pts;
          burst(f.x, f.y, f.def.Kind === 'Bonus' ? COL.crimson : COL.coral);
          popups.push({ x: f.x, y: f.y, text: '+' + pts, color: f.def.Kind === 'Bonus' ? COL.crimson : COL.coral, life: 1 });
          if (f.def.Fact) caughtFacts.push(f.def.Fact);
          renderHud();
        }
      } else if (f.y > H + 40) falling.splice(i, 1);
    }
    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= dt * 1.6; });
    particles = particles.filter(p => p.life > 0);
    popups.forEach(p => { p.y -= 50 * dt; p.life -= dt * 1.3; });
    popups = popups.filter(p => p.life > 0);
    if (shake > 0) shake -= dt;
  }

  let shake = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - .5) * 8 * shake, (Math.random() - .5) * 8 * shake);
    // background grid dots
    ctx.fillStyle = 'rgba(30,41,59,.07)';
    for (let x = 20; x < W; x += 32) for (let y = 20; y < H; y += 32) ctx.fillRect(x, y, 2, 2);
    // ground line
    ctx.fillStyle = COL.rose; ctx.fillRect(0, H - 18, W, 18);
    falling.forEach(drawItem);
    drawCap(player.x, player.y, player.tilt);
    particles.forEach(p => { ctx.globalAlpha = Math.max(p.life, 0); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });
    ctx.globalAlpha = 1;
    popups.forEach(p => {
      ctx.globalAlpha = Math.max(p.life, 0); ctx.fillStyle = p.color;
      ctx.font = '700 18px Sora, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function loop(now) {
    if (state !== 'running') return;
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    update(dt);
    if (state === 'running') draw();
    requestAnimationFrame(loop);
  }

  /* ---------- state ---------- */
  function best() { return Number(localStorage.getItem(BEST_KEY) || 0); }
  function renderHud() {
    ui.score.textContent = score;
    ui.best.textContent = Math.max(best(), score);
    ui.lives.textContent = '♥'.repeat(Math.max(lives, 0)) + '♡'.repeat(Math.max(3 - lives, 0));
  }
  function overlay(show, title, html, btn) {
    ui.overlay.classList.toggle('is-visible', show);
    if (title) ui.ovTitle.textContent = title;
    if (html !== undefined) ui.ovText.innerHTML = html;
    if (btn) ui.start.textContent = btn;
  }

  function startGame() {
    player = { x: W / 2, tx: W / 2, y: H - 46, tilt: 0 };
    falling = []; particles = []; popups = []; caughtFacts = [];
    score = 0; lives = 3; elapsed = 0; spawnTimer = .4; shake = 0;
    renderHud();
    overlay(false);
    state = 'running';
    ui.pause.textContent = '❚❚';
    last = performance.now();
    requestAnimationFrame(loop);
    canvas.focus({ preventScroll: true });
  }

  function togglePause(force) {
    if (state === 'running' && force !== false) {
      state = 'paused'; ui.pause.textContent = '▶';
      overlay(true, label('game_pause'), '', '▶');
      ui.start.onclick = () => togglePause(false);
    } else if (state === 'paused' && force !== true) {
      state = 'running'; ui.pause.textContent = '❚❚';
      overlay(false); ui.start.onclick = startGame;
      last = performance.now(); requestAnimationFrame(loop);
    }
  }

  function gameOver() {
    state = 'over';
    const isBest = score > best();
    if (isBest) localStorage.setItem(BEST_KEY, score);
    renderHud();
    const pool = caughtFacts.length ? caughtFacts : items.map(i => i.Fact).filter(Boolean);
    const fact = pool[Math.floor(Math.random() * pool.length)] || '';
    overlay(true, label('game_over'),
      `<strong style="font-size:40px;font-family:Sora,sans-serif;color:${COL.coral}">${score}</strong><br>${isBest ? '🏆 New best score!' : 'Best: ' + best()}` +
      (fact ? `<span class="fact" style="display:block;margin-top:12px">💡 ${fact}</span>` : ''),
      label('game_restart'));
    ui.start.onclick = startGame;
  }

  /* ---------- setup ---------- */
  function initGame(data, labelFn) {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    label = labelFn || label;
    items = data.Game || [];
    ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    canvas.tabIndex = 0;

    ui = {
      score: document.getElementById('g-score'), best: document.getElementById('g-best'), lives: document.getElementById('g-lives'),
      overlay: document.getElementById('g-overlay'), ovTitle: document.getElementById('g-ov-title'), ovText: document.getElementById('g-ov-text'),
      start: document.getElementById('g-start'), pause: document.getElementById('g-pause'),
    };
    ui.best.textContent = best();
    ui.ovText.textContent = label('game_intro');
    ui.start.onclick = startGame;
    ui.pause.addEventListener('click', () => togglePause());

    // Legend built from the Game sheet
    const legend = document.getElementById('game-legend');
    const kinds = { Good: COL.coral, Bonus: COL.crimson, Barrier: 'rgba(248,250,252,.14)' };
    legend.innerHTML = items.map(i => {
      const pts = i.Kind === 'Barrier' ? '−1 ♥' : '+' + i.Points;
      return `<li><i style="background:${kinds[i.Kind] || COL.slate};color:#fff">${i.Kind === 'Barrier' ? '✕' : i.Kind === 'Bonus' ? '★' : '✓'}</i><b>${i.Item}</b>&nbsp;${pts}</li>`;
    }).join('');

    // Controls: pointer / touch / keyboard
    const toLocal = e => { const r = canvas.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; };
    canvas.addEventListener('pointermove', e => { if (state === 'running') player.tx = toLocal(e); });
    canvas.addEventListener('pointerdown', e => { if (state === 'running') player.tx = toLocal(e); });
    window.addEventListener('keydown', e => {
      const inGame = state === 'running' || state === 'paused';
      if (!inGame) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
    });
    window.addEventListener('keyup', e => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    });
    // Auto-pause when the game scrolls out of view or the tab is hidden
    new IntersectionObserver(([en]) => { if (!en.isIntersecting) togglePause(true); }, { threshold: .2 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });

    // idle preview frame
    player = { x: W / 2, tx: W / 2, y: H - 46, tilt: 0 };
    falling = []; particles = []; popups = [];
    draw();
  }

  window.DeaGame = { initGame, startGame, togglePause };
})();
