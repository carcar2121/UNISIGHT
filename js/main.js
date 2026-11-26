/* =========================================================
   Proyecto Dea — main.js
   Reads the Excel database and builds the page.
   ========================================================= */
(function () {
  const XLSX_PATH = 'database/Dea_Database.xlsx';
  const PLEDGE_KEY = 'dea-pledges';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let DATA = null;
  const UI = {};
  const SETTINGS = {};

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const label = key => (UI[key] && UI[key].Label) || key;
  const arrow = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 9l6-6M4 3h5v5"/></svg>';

  /* ---------- loadDatabase() ---------- */
  async function loadDatabase() {
    // 1) Try the real Excel file (works on GitHub Pages / any web server)
    if (location.protocol !== 'file:' && typeof XLSX !== 'undefined') {
      try {
        const res = await fetch(XLSX_PATH, { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status);
        const wb = XLSX.read(await res.arrayBuffer(), { type: 'array' });
        const out = {};
        wb.SheetNames.forEach(n => { out[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' }); });
        console.info('[Dea] Data loaded from', XLSX_PATH);
        return out;
      } catch (e) {
        console.warn('[Dea] Could not read the Excel file, using js/data.js', e);
      }
    }
    // 2) Fallback: offline copy generated from the same Excel
    return window.DEA_DATA || {};
  }

  /* ---------- applyUI() ---------- */
  function applyUI() {
    (DATA.UI_Elements || []).forEach(r => { UI[r.Key] = r; });
    (DATA.Settings || []).forEach(r => { SETTINGS[r.Key] = r.Value; });

    $$('[data-ui]').forEach(el => { if (UI[el.dataset.ui]) el.textContent = UI[el.dataset.ui].Label; });
    $$('[data-ui-title]').forEach(el => { if (UI[el.dataset.uiTitle]) { el.title = UI[el.dataset.uiTitle].Label; el.setAttribute('aria-label', UI[el.dataset.uiTitle].Label); } });
    $$('[data-setting]').forEach(el => { const v = SETTINGS[el.dataset.setting]; if (v) el.textContent = v; });
    if (SETTINGS.site_title) document.title = `${SETTINGS.site_title} · ${SETTINGS.tagline || ''}`;
    if (SETTINGS.logo) $$('img[src$="logo.webp"]').forEach(i => { i.src = SETTINGS.logo; });
    const src = $('[data-setting-src="video"]');
    if (src && SETTINGS.video && src.getAttribute('src') !== SETTINGS.video) { src.src = SETTINGS.video; $('#meet-video').load(); }
  }

  /* ---------- helpers ---------- */
  function sourceFoot(r) {
    const src = r.Source ? `<span class="card__source">${esc(r.Source)}</span>` : '<span></span>';
    const link = r.Link ? `<a class="source-link" href="${esc(r.Link)}" target="_blank" rel="noopener noreferrer">${esc(label('source_button'))} ${arrow}</a>` : '';
    return `<div class="card__foot">${src}${link}</div>`;
  }
  const rowsOf = section => (DATA.Content || []).filter(r => r.Section === section);

  /* ---------- renderSection() ---------- */
  function renderSDG() {
    const box = $('[data-section="SDG"]');
    box.innerHTML = rowsOf('SDG').map((r, i) => {
      const m = String(r.Topic).match(/SDG\s*(\d+)/);
      const badge = m ? `<span class="card__badge card__badge--${m[1]}">${m[1]}</span>` : '';
      const feature = r.Tag === 'link' ? ' card--feature' : '';
      return `<article class="card tilt reveal${feature}" style="--d:${(i % 3) * .08}s">
        ${badge || `<span class="card__num">${String(i + 1).padStart(2, '0')}</span>`}
        <h3>${esc(r.Topic)}</h3><p>${esc(r.Information)}</p>${sourceFoot(r)}</article>`;
    }).join('');
  }

  function renderProjections() {
    const box = $('[data-section="Projections 2050"]');
    box.innerHTML = rowsOf('Projections 2050').map((r, i) => `
      <article class="card reveal ${['trend', 'action', 'stagnation'].includes(r.Tag) ? 'card--scenario' : ''}" data-tag="${esc(r.Tag)}" style="--d:${(i % 2) * .08}s">
        <span class="card__num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(r.Topic)}</h3><p>${esc(r.Information)}</p>${sourceFoot(r)}
      </article>`).join('');
  }

  function renderAction() {
    const box = $('[data-section="Take Action"]');
    const rows = rowsOf('Take Action');
    box.innerHTML = rows.map((r, i) => `
      <article class="card reveal" data-id="${esc(r.ID)}" style="--d:${(i % 2) * .08}s">
        <span class="card__cat" data-cat="${esc(r.Tag)}">${esc(r.Tag)}</span>
        <h3>${esc(r.Topic)}</h3><p>${esc(r.Information)}</p>
        <div class="card__foot">
          <button class="pledge-btn" data-pledge="${esc(r.ID)}" aria-pressed="false">${esc(label('pledge_button'))}</button>
          ${r.Link ? `<a class="source-link" href="${esc(r.Link)}" target="_blank" rel="noopener noreferrer">${esc(label('source_button'))} ${arrow}</a>` : ''}
        </div>
      </article>`).join('');
    $('#pledge-total').textContent = '/ ' + rows.length;
    $$('[data-pledge]', box).forEach(b => b.addEventListener('click', () => togglePledge(b.dataset.pledge)));

    // filter buttons built from the Tag column (Home, School, Community, Social media)
    const places = [...new Set(rows.map(r => r.Tag).filter(Boolean))];
    const count = p => rows.filter(r => p === 'all' || r.Tag === p).length;
    $('#action-filters').innerHTML = ['all', ...places].map(p =>
      `<button data-filter="${esc(p)}" class="${p === 'all' ? 'is-active' : ''}">${esc(p === 'all' ? label('action_filter_all') : p)} <small>${count(p)}</small></button>`).join('');
    $$('[data-filter]').forEach(b => b.addEventListener('click', () => filterActions(b.dataset.filter)));
  }

  /* ---------- filterActions(place) ---------- */
  function filterActions(place) {
    $$('[data-filter]').forEach(b => b.classList.toggle('is-active', b.dataset.filter === place));
    const byId = {};
    rowsOf('Take Action').forEach(r => { byId[String(r.ID)] = r.Tag; });
    $$('.cards--action .card').forEach((c, i) => {
      const show = place === 'all' || byId[c.dataset.id] === place;
      c.classList.toggle('is-filtered-out', !show);
      if (show && !reduced) c.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: i * 30, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    });
  }

  function renderLegal() {
    const box = $('[data-section="Legal"]');
    box.innerHTML = rowsOf('Legal').map((r, i) => `
      <details class="acc reveal" style="--d:${i * .05}s" ${i === 0 ? 'open' : ''}>
        <summary>${esc(r.Topic)}<small>${r.Tag === 'law' ? 'Law' : 'Site'}</small></summary>
        <div class="acc__body"><p>${esc(r.Information)}</p>${r.Link || r.Source ? sourceFoot(r) : ''}</div>
      </details>`).join('');
  }

  function renderMeet() {
    const box = $('[data-section="Meet Us"]');
    box.innerHTML = rowsOf('Meet Us').map((r, i) => {
      const body = r.Tag === 'values'
        ? `<div class="values">${String(r.Information).split('·').map(v => `<span>${esc(v.trim())}</span>`).join('')}</div>`
        : `<p>${esc(r.Information)}</p>`;
      return `<article class="card reveal ${r.Tag === 'about' ? 'card--feature' : ''}" style="--d:${i * .08}s"><h3>${esc(r.Topic)}</h3>${body}</article>`;
    }).join('');
  }

  /* ---------- renderReferences() / copyReferences() ---------- */
  function apaToHTML(text) {
    return esc(text)
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function sortedRefs() {
    return (DATA.References || []).map(r => String(r.APA || '')).filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  }
  function renderReferences() {
    const refs = sortedRefs();
    $('#references').hidden = !refs.length;
    $('#references-list').innerHTML = refs.map(t => `<li>${apaToHTML(t)}</li>`).join('');
  }
  async function copyReferences() {
    const text = sortedRefs().map(t => t.replace(/\*/g, '')).join('\n\n');
    await copyText(text);
    toast(label('toast_copied'));
  }

  /* ---------- stats + animateCounters() ---------- */
  function renderStats() {
    const rows = (DATA.Chart_Data || []).filter(r => r.Series === 'Counter');
    $('#stats').innerHTML = rows.map((r, i) => {
      const v = Number(r.Value);
      const dec = v >= 1000 ? 0 : (Number.isInteger(v) && !/years/i.test(r.Label) ? 0 : 1);
      const suffix = /%/.test(r.Label) ? '%' : '';
      return `<div class="stat reveal" style="--d:${.6 + i * .08}s"><strong data-count="${v}" data-dec="${dec}" data-suffix="${suffix}">0</strong><span>${esc(String(r.Label).replace('% ', ''))}</span></div>`;
    }).join('');
  }
  function animateCounter(el) {
    const end = Number(el.dataset.count), dec = Number(el.dataset.dec), suf = el.dataset.suffix || '';
    const fmt = n => (end >= 1000 ? Math.round(n).toString() : n.toFixed(dec)) + suf;
    if (reduced) { el.textContent = fmt(end); return; }
    const dur = 1400, t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(end >= 1000 ? end - (1 - e) * 60 : end * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- initReveal() ---------- */
  function splitTitle() {
    const h = $('.hero__title');
    const words = h.textContent.trim().split(/\s+/);
    h.innerHTML = words.map((w, i) => {
      const inner = i === words.length - 1 ? `<em>${esc(w)}</em>` : esc(w);
      return `<span class="word"><span style="transition-delay:${.1 + i * .06}s">${inner}</span></span>`;
    }).join(' ');
  }
  function initReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        $$('[data-count]', en.target).forEach(animateCounter);
        if (en.target.matches('[data-count]')) animateCounter(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  }

  /* ---------- header, nav, progress ---------- */
  function initNav() {
    const header = $('#header'), progress = $('#progress');
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const links = $$('.nav a');
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(s => io.observe(s));

    // toggleMenu()
    const btn = $('#menu-btn'), nav = $('#nav');
    const toggleMenu = open => {
      const o = open ?? btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', o);
      nav.classList.toggle('is-open', o);
      document.body.style.overflow = o ? 'hidden' : '';
    };
    btn.addEventListener('click', () => toggleMenu());
    links.forEach(a => a.addEventListener('click', () => toggleMenu(false)));
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) toggleMenu(false); });
  }

  /* ---------- micro-interactions ---------- */
  function initMagnetic() {
    if (reduced || !matchMedia('(hover: hover)').matches) return;
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .2}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  function initTilt() {
    if (reduced || !matchMedia('(hover: hover)').matches) return;
    $$('.tilt').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- pledges ---------- */
  const getPledges = () => { try { return JSON.parse(localStorage.getItem(PLEDGE_KEY)) || []; } catch { return []; } };
  function renderPledges() {
    const set = new Set(getPledges().map(String));
    const rows = rowsOf('Take Action');
    const counts = {};
    $$('[data-pledge]').forEach(b => {
      const on = set.has(b.dataset.pledge);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on);
      b.textContent = label(on ? 'pledge_button_done' : 'pledge_button');
      b.closest('.card').classList.toggle('is-pledged', on);
    });
    rows.forEach(r => { if (set.has(String(r.ID))) counts[r.Tag] = (counts[r.Tag] || 0) + 1; });
    const n = rows.filter(r => set.has(String(r.ID))).length;
    $('#pledge-count').textContent = n;
    const C = 2 * Math.PI * 52;
    $('#ring-fill').style.strokeDashoffset = C * (1 - (rows.length ? n / rows.length : 0));
    if (window.DeaCharts) DeaCharts.updatePledgeChart(counts, [...new Set(rows.map(r => r.Tag).filter(Boolean))]);
  }
  function togglePledge(id) {
    const list = getPledges().map(String);
    const i = list.indexOf(String(id));
    if (i >= 0) list.splice(i, 1); else { list.push(String(id)); toast(label('toast_pledge')); }
    localStorage.setItem(PLEDGE_KEY, JSON.stringify(list));
    renderPledges();
  }
  function resetPledges() { localStorage.removeItem(PLEDGE_KEY); renderPledges(); }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    }
  }
  async function sharePage() {
    const url = location.href.split('#')[0];
    if (navigator.share) {
      try { await navigator.share({ title: document.title, text: SETTINGS.hero_title || '', url }); return; } catch { /* cancelled */ }
    }
    await copyText(url);
    toast(label('toast_copied'));
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2400);
  }

  /* ---------- playVideo() ---------- */
  function initVideo() {
    const v = $('#meet-video'), btn = $('#video-play');
    const playVideo = () => { v.play(); };
    btn.addEventListener('click', playVideo);
    v.addEventListener('play', () => btn.classList.add('is-hidden'));
    v.addEventListener('pause', () => { if (!v.seeking && v.currentTime === 0) btn.classList.remove('is-hidden'); });
    v.addEventListener('ended', () => btn.classList.remove('is-hidden'));
    // pause when scrolled away
    new IntersectionObserver(([en]) => { if (!en.isIntersecting && !v.paused) v.pause(); }, { threshold: .1 }).observe(v);
  }

  /* ---------- boot ---------- */
  async function boot() {
    document.body.classList.add('is-loading');
    DATA = await loadDatabase();
    applyUI();
    renderStats();
    renderSDG();
    renderProjections();
    renderAction();
    renderLegal();
    renderReferences();
    renderMeet();
    splitTitle();

    if (window.initScene) initScene();
    if (window.DeaCharts) DeaCharts.initCharts(DATA);
    if (window.DeaGame) DeaGame.initGame(DATA, label);
    if (window.DeaWhatIf) DeaWhatIf.initWhatIf(DATA, label, esc);
    renderPledges();

    initNav();
    initMagnetic();
    initTilt();
    initVideo();
    $('#reset-btn').addEventListener('click', resetPledges);
    $('#share-btn').addEventListener('click', sharePage);
    $('#copy-refs').addEventListener('click', copyReferences);

    // hide loader, then start the reveal animations
    setTimeout(() => {
      $('#loader').classList.add('is-done');
      document.body.classList.remove('is-loading');
      initReveal();
      // content is built after load, so jump to #section links again
      const target = location.hash && document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ behavior: 'auto' });
    }, reduced ? 0 : 450);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
