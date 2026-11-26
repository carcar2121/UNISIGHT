/* =========================================================
   "What If?" interactive stories
   startStory(name), choose(option), nextStep(), showEnding()
   Stories come from the What_If sheet of the Excel.
   ========================================================= */
(function () {
  const MAX = 6; // max points per meter (3 decisions × 2)
  let stories = {}, order = [], label = k => k, esc = s => s;
  let current = null, step = 0, edu = 0, eq = 0, answered = false;
  const $ = id => document.getElementById(id);

  function parse(rows) {
    stories = {}; order = [];
    rows.forEach(r => {
      const name = String(r.Story || '').trim();
      if (!name) return;
      if (!stories[name]) { stories[name] = { name, intro: '', steps: {}, endings: {} }; order.push(name); }
      const s = stories[name];
      if (r.Intro) s.intro = r.Intro;
      if (String(r.Step) === 'Ending') { s.endings[r.Option] = r.Situation; return; }
      const st = (s.steps[r.Step] = s.steps[r.Step] || { situation: '', options: [] });
      if (r.Situation) st.situation = r.Situation;
      st.options.push({ key: r.Option, choice: r.Choice, result: r.Result, edu: Number(r.Education) || 0, eq: Number(r.Equality) || 0 });
    });
    order.forEach(n => { stories[n].stepList = Object.keys(stories[n].steps).sort((a, b) => a - b).map(k => stories[n].steps[k]); });
  }

  function setMeters() {
    const pct = v => Math.max(0, Math.min(100, 50 + (v / MAX) * 50)); // centre = neutral
    $('m-edu').textContent = (edu > 0 ? '+' : '') + edu;
    $('m-eq').textContent = (eq > 0 ? '+' : '') + eq;
    $('m-edu-bar').style.width = pct(edu) + '%';
    $('m-eq-bar').style.width = pct(eq) + '%';
  }

  function dots() {
    const n = current.stepList.length;
    $('story-dots').innerHTML = Array.from({ length: n + 1 }, (_, i) =>
      `<i class="${i < step || (i === step && answered) ? 'is-done' : i === step ? 'is-current' : ''}"></i>`).join('');
  }

  function swap(html) {
    const main = $('story-main');
    main.classList.add('is-leaving');
    setTimeout(() => {
      main.innerHTML = html;
      main.classList.remove('is-leaving');
      main.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => main.classList.remove('is-entering')));
    }, 220);
  }

  function startStory(name) {
    current = stories[name];
    if (!current) return;
    step = 0; edu = 0; eq = 0; answered = false;
    document.querySelectorAll('#story-tabs button').forEach(b => {
      const on = b.dataset.story === name;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
    });
    setMeters();
    renderStep();
  }

  function renderStep() {
    const st = current.stepList[step];
    answered = false;
    dots();
    swap(`
      ${step === 0 && current.intro ? `<p class="story__intro">${esc(current.intro)}</p>` : ''}
      <p class="story__step">${esc(label('whatif_step'))} ${step + 1} / ${current.stepList.length}</p>
      <h3 class="story__situation">${esc(st.situation)}</h3>
      <div class="story__choices">
        ${st.options.map((o, i) => `<button class="choice" data-i="${i}"><span class="choice__key">${esc(o.key)}</span>${esc(o.choice)}</button>`).join('')}
      </div>
      <div class="story__result" id="story-result"></div>`);
    setTimeout(() => {
      document.querySelectorAll('#story-main .choice').forEach(b => b.addEventListener('click', () => choose(Number(b.dataset.i))));
    }, 240);
  }

  function choose(i) {
    if (answered) return;
    answered = true;
    const st = current.stepList[step];
    const o = st.options[i];
    edu += o.edu; eq += o.eq;
    setMeters();
    dots();
    document.querySelectorAll('#story-main .choice').forEach((b, j) => {
      b.disabled = true;
      b.classList.add(j === i ? 'is-picked' : 'is-dim');
    });
    const good = o.edu + o.eq >= 0;
    const last = step === current.stepList.length - 1;
    const fmt = (n, k) => `<span class="delta ${n >= 0 ? 'up' : 'down'}">${n >= 0 ? '+' : ''}${n} ${esc(label(k))}</span>`;
    const res = $('story-result');
    res.className = 'story__result is-visible ' + (good ? 'is-good' : 'is-bad');
    res.innerHTML = `<p>${esc(o.result)}</p><div class="story__deltas">${fmt(o.edu, 'whatif_education')}${fmt(o.eq, 'whatif_equality')}</div>
      <button class="btn btn--primary btn--sm" id="story-next">${esc(label(last ? 'whatif_see_future' : 'whatif_next'))} →</button>`;
    $('story-next').addEventListener('click', () => (last ? showEnding() : nextStep()));
  }

  function nextStep() { step++; renderStep(); }

  function showEnding() {
    step = current.stepList.length;
    answered = true;
    dots();
    const total = edu + eq;
    const level = total >= 6 ? 'High' : total >= 0 ? 'Medium' : 'Low';
    const text = current.endings[level] || '';
    try {
      const saved = JSON.parse(localStorage.getItem('dea-whatif') || '{}');
      saved[current.name] = level;
      localStorage.setItem('dea-whatif', JSON.stringify(saved));
    } catch { /* storage unavailable */ }
    swap(`
      <div class="ending ending--${level.toLowerCase()}">
        <span class="ending__year">2050</span>
        <p class="ending__text">${esc(String(text).replace(/^2050:\s*/, ''))}</p>
        <button class="btn btn--ghost btn--sm" id="story-restart">↺ ${esc(label('whatif_restart'))}</button>
      </div>`);
    setTimeout(() => $('story-restart').addEventListener('click', () => startStory(current.name)), 240);
  }

  function initWhatIf(data, labelFn, escFn) {
    if (!$('story')) return;
    label = labelFn || label; esc = escFn || esc;
    parse(data.What_If || []);
    if (!order.length) { document.getElementById('whatif').hidden = true; return; }
    $('story-tabs').innerHTML = order.map((n, i) =>
      `<button role="tab" data-story="${esc(n)}" aria-selected="false"><span>${String(i + 1).padStart(2, '0')}</span>${esc(n)}</button>`).join('');
    document.querySelectorAll('#story-tabs button').forEach(b => b.addEventListener('click', () => startStory(b.dataset.story)));
    startStory(order[0]);
  }

  window.DeaWhatIf = { initWhatIf, startStory, choose, nextStep, showEnding };
})();
