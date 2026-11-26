/* =========================================================
   initCharts() — interactive charts (Chart.js)
   All numbers come from the Chart_Data sheet of the Excel.
   ========================================================= */
(function () {
  const COL = { crimson: '#C5192D', coral: '#FF3A21', slate: '#1E293B', rose: '#FEE2E2', gray: '#94A3B8', smoke: '#F8FAFC' };
  const SERIES_STYLE = {
    'Women': { color: COL.coral, scenario: 'base' },
    'Men': { color: COL.slate, scenario: 'base' },
    'Women · Trend': { color: COL.crimson, scenario: 'trend', dash: [6, 5] },
    'Women · Action': { color: COL.coral, scenario: 'action', dash: [6, 5] },
    'Women · Stagnation': { color: COL.gray, scenario: 'stagnation', dash: [6, 5] },
    'Men · Trend': { color: COL.slate, scenario: 'base', dash: [2, 4] },
  };
  const charts = {};
  let schoolingSeries = [];

  function setDefaults() {
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = 'rgba(30,41,59,.6)';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = COL.slate;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
    Chart.defaults.animation.duration = 900;
    Chart.defaults.animation.easing = 'easeOutQuart';
    Chart.defaults.maintainAspectRatio = false;
  }

  /* ---------- Chart 1: schooling 2000–2050 ---------- */
  function buildSchooling(rows) {
    const title = rows[0] && rows[0].Chart;
    if (title) document.getElementById('chart1-title').textContent = title;
    const years = [...new Set(rows.map(r => String(r.Label)))].sort();
    const byName = {};
    rows.forEach(r => { (byName[r.Series] = byName[r.Series] || {})[String(r.Label)] = Number(r.Value); });

    // Projections start from the last actual value so the lines connect.
    const lastActual = { 'Women': null, 'Men': null };
    Object.keys(lastActual).forEach(k => {
      const ys = Object.keys(byName[k] || {}).sort();
      lastActual[k] = ys.length ? { year: ys[ys.length - 1], value: byName[k][ys[ys.length - 1]] } : null;
    });

    schoolingSeries = Object.keys(byName).map(name => {
      const style = SERIES_STYLE[name] || { color: COL.gray, scenario: 'base' };
      const points = Object.assign({}, byName[name]);
      const root = name.split(' · ')[0];
      if (name.includes(' · ') && lastActual[root]) points[lastActual[root].year] = lastActual[root].value;
      return { name, style, points };
    });

    const datasets = schoolingSeries.map(s => ({
      label: s.name,
      data: years.filter(y => y in s.points).map(y => ({ x: Number(y), y: s.points[y] })),
      borderColor: s.style.color,
      backgroundColor: s.style.color,
      borderDash: s.style.dash || [],
      borderWidth: s.style.dash ? 2 : 3,
      pointRadius: s.style.dash ? 3 : 4,
      pointHoverRadius: 7,
      pointBackgroundColor: '#fff',
      pointBorderWidth: 2,
      tension: .35,
      spanGaps: true,
      fill: false,
      scenario: s.style.scenario,
    }));
    // soft fill under the actual Women line
    const gto = datasets.find(d => d.label === 'Women');
    if (gto) {
      gto.fill = 'origin';
      gto.backgroundColor = ctx => {
        const { chart } = ctx; const { ctx: c, chartArea } = chart;
        if (!chartArea) return 'transparent';
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, 'rgba(255,58,33,.16)'); g.addColorStop(1, 'rgba(255,58,33,0)');
        return g;
      };
    }

    charts.schooling = new Chart(document.getElementById('chart-schooling'), {
      type: 'line',
      data: { datasets },
      options: {
        interaction: { mode: 'x', intersect: false },
        scales: {
          y: { min: 5, suggestedMax: 15, grid: { color: 'rgba(30,41,59,.06)' }, border: { display: false }, title: { display: true, text: 'Years' } },
          x: { type: 'linear', min: 2000, max: 2050, ticks: { stepSize: 10, callback: v => String(v) }, grid: { display: false }, border: { display: false } },
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { title: c => String(c[0].raw.x), label: c => ` ${c.dataset.label}: ${c.raw.y.toFixed(1)} years` } },
        },
      },
      plugins: [projectionShade(years)],
    });
  }

  // Shades the projection area (after 2020) and labels it.
  function projectionShade(years) {
    return {
      id: 'projectionShade',
      beforeDatasetsDraw(chart) {
        if (!years.includes('2020')) return;
        const { ctx, chartArea, scales } = chart;
        const x = scales.x.getPixelForValue(2020);
        ctx.save();
        ctx.fillStyle = 'rgba(254,226,226,.45)';
        ctx.fillRect(x, chartArea.top, chartArea.right - x, chartArea.bottom - chartArea.top);
        ctx.strokeStyle = 'rgba(197,25,45,.35)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
        ctx.fillStyle = COL.crimson;
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillText('PROJECTION →', x + 8, chartArea.top + 14);
        ctx.restore();
      },
    };
  }

  function setScenario(name) {
    const ch = charts.schooling;
    if (!ch) return;
    ch.data.datasets.forEach(d => { d.hidden = !(d.scenario === 'base' || name === 'all' || d.scenario === name); });
    ch.update();
    document.querySelectorAll('[data-scenario]').forEach(b => b.classList.toggle('is-active', b.dataset.scenario === name));
    updateYear(document.getElementById('year-slider').value);
  }

  function interp(points, year) {
    const ys = Object.keys(points).map(Number).sort((a, b) => a - b);
    if (!ys.length || year < ys[0] || year > ys[ys.length - 1]) return null;
    for (let i = 0; i < ys.length - 1; i++) {
      if (year >= ys[i] && year <= ys[i + 1]) {
        const t = (year - ys[i]) / (ys[i + 1] - ys[i]);
        return points[ys[i]] + t * (points[ys[i + 1]] - points[ys[i]]);
      }
    }
    return points[ys[ys.length - 1]];
  }

  function updateYear(value) {
    const year = Number(value);
    const slider = document.getElementById('year-slider');
    slider.style.setProperty('--p', ((year - slider.min) / (slider.max - slider.min)) * 100 + '%');
    document.getElementById('year-output').textContent = year;
    const hidden = new Set((charts.schooling ? charts.schooling.data.datasets : []).filter(d => d.hidden).map(d => d.label));
    const box = document.getElementById('year-values');
    box.innerHTML = schoolingSeries
      .filter(s => s.name.includes(' · ') && !hidden.has(s.name))
      .map(s => {
        const v = interp(s.points, year);
        return v == null ? '' : `<span class="chip"><i style="background:${s.style.color}"></i>${s.name}<b>${v.toFixed(1)}</b></span>`;
      }).join('');
  }

  /* ---------- Chart 2: share of women vs parity ---------- */
  function buildGender(rows) {
    if (!rows.length) return;
    document.getElementById('chart2-title').textContent = rows[0].Chart;
    const parity = {
      id: 'parity',
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const x = scales.x.getPixelForValue(50);
        ctx.save();
        ctx.strokeStyle = COL.crimson; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, chartArea.top - 6); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
        ctx.fillStyle = COL.crimson; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('PARITY 50%', x, chartArea.top - 10);
        ctx.restore();
      },
    };
    charts.gender = new Chart(document.getElementById('chart-gender'), {
      type: 'bar',
      data: {
        labels: rows.map(r => String(r.Label)),
        datasets: [{
          label: 'Women (%)',
          data: rows.map(r => Number(r.Value)),
          backgroundColor: COL.coral,
          hoverBackgroundColor: COL.crimson,
          borderRadius: 8, borderSkipped: false, maxBarThickness: 34,
        }],
      },
      options: {
        indexAxis: 'y',
        layout: { padding: { top: 20 } },
        scales: {
          x: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(30,41,59,.06)' }, border: { display: false } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: COL.slate, font: { weight: '500' } } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` Women: ${c.raw}%  ·  Men: ${100 - c.raw}%`, afterLabel: c => rows[c.dataIndex].Source ? ` Source: ${rows[c.dataIndex].Source}` : '' } },
        },
        animation: { delay: ctx => ctx.dataIndex * 100 },
      },
      plugins: [parity],
    });
  }

  /* ---------- Chart 3: your pledges ---------- */
  function buildPledges() {
    charts.pledges = new Chart(document.getElementById('chart-pledges'), {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, hoverOffset: 6 }] },
      options: {
        cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { padding: 12 } }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw} pledge${c.raw === 1 ? '' : 's'}` } } },
      },
    });
  }

  const PLACE_COLORS = [COL.crimson, COL.slate, COL.coral, '#94A3B8', '#F87171'];
  function updatePledgeChart(counts, places) {
    if (!charts.pledges) return;
    const ds = charts.pledges.data.datasets[0];
    const labels = places && places.length ? places : Object.keys(counts);
    charts.pledges.data.labels = labels;
    const empty = labels.every(l => !counts[l]);
    ds.data = empty ? labels.map(() => 1) : labels.map(l => counts[l] || 0);
    ds.backgroundColor = empty ? labels.map(() => '#EEF2F6') : labels.map((_, i) => PLACE_COLORS[i % PLACE_COLORS.length]);
    charts.pledges.options.plugins.tooltip.enabled = !empty;
    charts.pledges.update();
  }

  function initCharts(data) {
    if (typeof Chart === 'undefined') return;
    setDefaults();
    const rows = data.Chart_Data || [];
    const charts1 = rows.filter(r => /schooling/i.test(r.Chart));
    const charts2 = rows.filter(r => /share of women/i.test(r.Chart));
    buildSchooling(charts1);
    buildGender(charts2);
    buildPledges();

    document.querySelectorAll('[data-scenario]').forEach(b => b.addEventListener('click', () => setScenario(b.dataset.scenario)));
    const slider = document.getElementById('year-slider');
    slider.addEventListener('input', e => updateYear(e.target.value));
    updateYear(slider.value);
  }

  window.DeaCharts = { initCharts, setScenario, updateYear, updatePledgeChart };
})();
