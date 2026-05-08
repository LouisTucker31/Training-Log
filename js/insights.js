/* ============================================================
   insights.js — Insights page
   ============================================================ */

const InsightsPage = (() => {

  let trendDays    = 7;
  let volumeFilter = 'all'; // 'all' | 'cycle' | 'hypertrophy' | 'golf' | 'bjj'

  // ─── Helpers ──────────────────────────────────────────────

  function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function dateStrFromOffset(offset) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    const y  = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
  }

  function shortDate(str) {
    const d = parseLocalDate(str);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  const RAG_COLOUR = { green: '#30D158', amber: '#FF9F0A', red: '#FF453A' };

  // ─── Section 1: Recovery Trend Chart ──────────────────────

  function buildTrendChart(allCheckIns, days) {
    const dates  = Array.from({ length: days }, (_, i) => dateStrFromOffset(days - 1 - i));
    const points = dates.map(d => allCheckIns[d] || null);

    const hasAny = points.some(p => p && p.score !== undefined);
    if (!hasAny) {
      return `<div class="insights-empty">
        <div class="insights-empty-icon">📈</div>
        <div class="insights-empty-text">No check-ins yet.<br>Complete a morning check-in to see your trend.</div>
      </div>`;
    }

    const W      = 340;
    const H      = 160;
    const padL   = 28;
    const padR   = 8;
    const padT   = 12;
    const padB   = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const xStep  = days > 1 ? chartW / (days - 1) : 0;

    // How many x-axis labels to show
    let labelIndices;
    if (days <= 7) {
      labelIndices = Array.from({ length: days }, (_, i) => i); // all 7
    } else if (days <= 14) {
      // every 2 days
      labelIndices = Array.from({ length: days }, (_, i) => i).filter(i => i % 2 === 0);
    } else {
      // every 5 days for 30
      labelIndices = Array.from({ length: days }, (_, i) => i).filter(i => i % 5 === 0);
      if (!labelIndices.includes(days - 1)) labelIndices.push(days - 1);
    }

    const coords = points.map((p, i) => {
      if (!p || p.score === undefined) return null;
      const x = padL + i * xStep;
      const y = padT + chartH - (p.score / 100) * chartH;
      return { x, y, score: p.score, rag: p.rag, date: dates[i] };
    });

    // Y gridlines
    let gridHTML = '';
    [0, 25, 50, 75, 100].forEach(val => {
      const y = padT + chartH - (val / 100) * chartH;
      gridHTML += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"
        stroke="#E5E5EA" stroke-width="0.5"/>`;
      gridHTML += `<text x="${padL - 4}" y="${y + 4}" text-anchor="end"
        font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="9" fill="#AEAEB2">${val}</text>`;
    });

    // X labels
    let xLabelHTML = '';
    labelIndices.forEach(i => {
      const x = padL + i * xStep;
      xLabelHTML += `<text x="${x}" y="${H - 4}" text-anchor="middle"
        font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="9" fill="#AEAEB2">${shortDate(dates[i])}</text>`;
    });

    // Lines
    let lineHTML = '';
    for (let i = 0; i < coords.length - 1; i++) {
      if (coords[i] && coords[i + 1]) {
        lineHTML += `<line x1="${coords[i].x}" y1="${coords[i].y}"
          x2="${coords[i+1].x}" y2="${coords[i+1].y}"
          stroke="#E5E5EA" stroke-width="1.5"/>`;
      }
    }

    // Dots
    let dotHTML = coords.map(c => {
      if (!c) return '';
      const col = RAG_COLOUR[c.rag] || '#30D158';
      return `<circle cx="${c.x}" cy="${c.y}" r="4"
        fill="${col}" stroke="white" stroke-width="1.5"/>`;
    }).join('');

    return `
      <svg class="insights-chart-svg" viewBox="0 0 ${W} ${H}">
        ${gridHTML}${lineHTML}${dotHTML}${xLabelHTML}
      </svg>`;
  }

  // ─── Section 2: Consistency Heatmap ───────────────────────

  function buildHeatmap(allCheckIns) {
    const DAYS = 35, COLS = 7, ROWS = 5;
    const SIZE = 36, GAP = 6;
    const W    = COLS * SIZE + (COLS - 1) * GAP;
    const H    = ROWS * SIZE + (ROWS - 1) * GAP;
    const DAY_LABELS = ['M','T','W','T','F','S','S'];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow      = today.getDay();
    const gridEnd  = new Date(today);
    gridEnd.setDate(today.getDate() + (6 - ((dow + 6) % 7))); // this Sunday
    const gridStart = new Date(gridEnd);
    gridStart.setDate(gridEnd.getDate() - DAYS + 1);

    const dates = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const y  = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${mo}-${dy}`);
    }

    const todayStr = dateStrFromOffset(0);

    let cellsHTML = '';
    dates.forEach((dateStr, i) => {
      const col      = i % COLS;
      const row      = Math.floor(i / COLS);
      const x        = col * (SIZE + GAP);
      const y        = row * (SIZE + GAP);
      const ci       = allCheckIns[dateStr];
      const isFuture = dateStr > todayStr;

      let fill;
      if (isFuture)                          fill = '#F2F2F7';
      else if (!ci || ci.score === undefined) fill = '#E5E5EA';
      else if (ci.rag === 'green')            fill = 'rgba(48,209,88,0.25)';
      else if (ci.rag === 'amber')            fill = 'rgba(255,159,10,0.25)';
      else                                   fill = 'rgba(255,69,58,0.25)';

      const isToday = dateStr === todayStr;
      const dayNum  = parseLocalDate(dateStr).getDate();

      cellsHTML += `
        <rect x="${x}" y="${y}" width="${SIZE}" height="${SIZE}" rx="8"
          fill="${fill}"
          stroke="${isToday ? '#007AFF' : 'none'}"
          stroke-width="${isToday ? 1.5 : 0}"/>
        <text x="${x + SIZE/2}" y="${y + SIZE/2 + 4}" text-anchor="middle"
          font-family="-apple-system,BlinkMacSystemFont,sans-serif"
          font-size="11" font-weight="${isToday ? '700' : '400'}"
          fill="${isToday ? '#007AFF' : (isFuture ? '#C7C7CC' : (ci && ci.score !== undefined ? '#3C3C43' : '#AEAEB2'))}"
        >${dayNum}</text>`;
    });

    let headerHTML = '';
    DAY_LABELS.forEach((label, i) => {
      headerHTML += `<text x="${i * (SIZE + GAP) + SIZE/2}" y="-6" text-anchor="middle"
        font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="10" font-weight="600" fill="#AEAEB2">${label}</text>`;
    });

    // Legend — green, amber, red, none
    const legendItems = [
      { fill: 'rgba(48,209,88,0.25)',  label: 'Green'  },
      { fill: 'rgba(255,159,10,0.25)', label: 'Amber'  },
      { fill: 'rgba(255,69,58,0.25)',  label: 'Red'    },
      { fill: '#E5E5EA',               label: 'No log' },
    ];
    let legendHTML = '';
    legendItems.forEach((item, i) => {
      const lx = i * 68;
      legendHTML += `
        <rect x="${lx}" y="0" width="12" height="12" rx="3" fill="${item.fill}"/>
        <text x="${lx + 16}" y="10"
          font-family="-apple-system,BlinkMacSystemFont,sans-serif"
          font-size="10" fill="#8E8E93">${item.label}</text>`;
    });

    const totalH = 16 + H + 16 + 16;
    return `
      <svg class="insights-chart-svg" viewBox="0 0 ${W} ${totalH}">
        <g transform="translate(0,16)">${headerHTML}</g>
        <g transform="translate(0,26)">${cellsHTML}</g>
        <g transform="translate(0,${26 + H + 14})">${legendHTML}</g>
      </svg>`;
  }

  // ─── Section 3: Weekly Volume Bar Chart ───────────────────

  function buildVolumeChart(allCheckIns, programmeStart, filter) {
    const WEEKS  = 6;
    const W      = 340;
    const H      = 160;
    const padL   = 24;
    const padR   = 8;
    const padT   = 12;
    const padB   = 32;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const today  = new Date();
    today.setHours(0, 0, 0, 0);
    const dow    = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dow + 6) % 7));

    const weeks = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const mon = new Date(monday);
      mon.setDate(monday.getDate() - w * 7);
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        const y  = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        return `${y}-${mo}-${dy}`;
      });
      weeks.push(dates);
    }

    const data = weeks.map(dates => {
      let gym = 0, sport = 0, miles = 0, golf = 0, bjj = 0;
      dates.forEach(dateStr => {
        const ci = allCheckIns[dateStr];
        if (!ci || !ci.completed) return;
        const session = TrainingData.getSessionForDate(dateStr, programmeStart, ci.rag || 'green');
        if (session.type === 'hypertrophy') gym++;
        if (session.type === 'bjj')         bjj++;
        if (session.type === 'golf')        golf++;
        if (session.type === 'cycle')       miles += session.distance || 0;
      });
      return { gym, bjj, golf, miles };
    });

    // Filter config
    const filterConfig = {
      all:          [
        { key: 'gym',   colour: '#007AFF', label: 'Gym'     },
        { key: 'bjj',   colour: '#FF3B30', label: 'BJJ'     },
        { key: 'golf',  colour: '#34C759', label: 'Golf'    },
        { key: 'miles', colour: '#FF9F0A', label: 'Miles'   },
      ],
      hypertrophy:  [{ key: 'gym',   colour: '#007AFF', label: 'Gym sessions'  }],
      bjj:          [{ key: 'bjj',   colour: '#FF3B30', label: 'BJJ sessions'  }],
      golf:         [{ key: 'golf',  colour: '#34C759', label: 'Golf sessions' }],
      cycle:        [{ key: 'miles', colour: '#FF9F0A', label: 'Miles cycled'  }],
    };

    const activeSeries = filterConfig[filter] || filterConfig.all;
    const numBars      = activeSeries.length;

    const maxVal = Math.max(1, ...data.map(d =>
      Math.max(...activeSeries.map(s => d[s.key] || 0))
    ));

    const groupW = chartW / WEEKS;
    const barW   = Math.max(4, Math.floor((groupW - 12) / numBars));

    // Y gridlines
    let gridHTML = '';
    const gridMax = Math.ceil(maxVal);
    for (let v = 0; v <= gridMax; v++) {
      const y = padT + chartH - (v / maxVal) * chartH;
      gridHTML += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"
        stroke="#E5E5EA" stroke-width="0.5"/>`;
      gridHTML += `<text x="${padL - 4}" y="${y + 4}" text-anchor="end"
        font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="9" fill="#AEAEB2">${v}</text>`;
    }

    let barsHTML = '', labelsHTML = '';
    data.forEach((d, i) => {
      const totalBarGroupW = numBars * barW + (numBars - 1) * 2;
      const groupX = padL + i * groupW + (groupW - totalBarGroupW) / 2;

      activeSeries.forEach(({ key, colour }, j) => {
        const v    = d[key] || 0;
        const barH = Math.max(v > 0 ? 2 : 0, (v / maxVal) * chartH);
        const x    = groupX + j * (barW + 2);
        const y    = padT + chartH - barH;
        barsHTML += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}"
          rx="3" fill="${colour}" opacity="0.85"/>`;
      });

      const label  = parseLocalDate(weeks[i][0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const labelX = padL + i * groupW + groupW / 2;
      labelsHTML += `<text x="${labelX}" y="${H - 4}" text-anchor="middle"
        font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="9" fill="#AEAEB2">${label}</text>`;
    });

    // Legend — only show active series
    let legendHTML = '';
    activeSeries.forEach((s, i) => {
      const lx = i * 80;
      legendHTML += `
        <rect x="${lx}" y="0" width="10" height="10" rx="2" fill="${s.colour}" opacity="0.85"/>
        <text x="${lx + 14}" y="9"
          font-family="-apple-system,BlinkMacSystemFont,sans-serif"
          font-size="10" fill="#8E8E93">${s.label}</text>`;
    });

    // Filter toggle buttons
    const filterBtns = [
      { key: 'all',         label: 'All'   },
      { key: 'hypertrophy', label: 'Gym'   },
      { key: 'bjj',         label: 'BJJ'   },
      { key: 'golf',        label: 'Golf'  },
      { key: 'cycle',       label: 'Cycle' },
    ].map(f => `
      <button class="insights-filter-btn ${filter === f.key ? 'active' : ''}"
        data-volume-filter="${f.key}">${f.label}</button>
    `).join('');

    return `
      <div class="insights-filter-row">${filterBtns}</div>
      <svg class="insights-chart-svg" viewBox="0 0 ${W} ${H + 20}">
        ${gridHTML}${barsHTML}${labelsHTML}
        <g transform="translate(${padL},${H + 6})">${legendHTML}</g>
      </svg>`;
  }

  // ─── Section 4: Stat Tiles ─────────────────────────────────

  function calcStats(allCheckIns, programmeStart) {
    const all     = Object.values(allCheckIns);
    const logged  = all.filter(c => c && c.score !== undefined);

    const avgRecovery  = logged.length ? Math.round(logged.reduce((s, c) => s + c.score, 0) / logged.length) : 0;
    const bestRecovery = logged.length ? Math.max(...logged.map(c => c.score)) : 0;

    let totalSessions = 0, totalBJJSessions = 0, totalGolf = 0, totalGym = 0, totalMiles = 0;

    Object.entries(allCheckIns).forEach(([dateStr, ci]) => {
      if (!ci || !ci.completed) return;
      const session = TrainingData.getSessionForDate(dateStr, programmeStart, ci.rag || 'green');
      totalSessions++;
      if (session.type === 'bjj')         totalBJJSessions++;
      if (session.type === 'golf')        totalGolf++;
      if (session.type === 'hypertrophy') totalGym++;
      if (session.type === 'cycle')       totalMiles += session.distance || 0;
    });

    // Longest streak
    const keys = Object.keys(allCheckIns).sort();
    let longest = 0, current = 0, lastDate = null;
    keys.forEach(k => {
      const ci = allCheckIns[k];
      if (!ci || ci.score === undefined) { current = 0; lastDate = null; return; }
      if (!lastDate) { current = 1; }
      else {
        const prev = new Date(lastDate);
        prev.setDate(prev.getDate() + 1);
        current = (prev.toISOString().slice(0, 10) === k) ? current + 1 : 1;
      }
      if (current > longest) longest = current;
      lastDate = k;
    });

    return { totalSessions, avgRecovery, bestRecovery, totalBJJSessions, totalGolf, totalGym, totalMiles, longestStreak: longest };
  }

  function buildStatTiles(stats) {
    const tiles = [
      { sub: 'Sessions',        value: stats.totalSessions,    label: 'completed'          },
      { sub: 'Longest Streak',  value: stats.longestStreak,    label: 'consecutive days'   },
      { sub: 'Avg Recovery',    value: `${stats.avgRecovery}%`, label: 'across programme'  },
      { sub: 'Best Recovery',   value: `${stats.bestRecovery}%`, label: 'single day'       },
      { sub: 'BJJ',             value: stats.totalBJJSessions,  label: 'sessions logged'   },
      { sub: 'Cycling',         value: stats.totalMiles,         label: 'miles total'      },
      { sub: 'Hypertrophy',     value: stats.totalGym,           label: 'sessions logged'  },
      { sub: 'Golf',            value: stats.totalGolf,          label: 'sessions logged'  },
    ];

    return `<div class="insights-tiles-grid">
      ${tiles.map(t => `
        <div class="insights-tile">
          <div class="insights-tile-sub">${t.sub}</div>
          <div class="insights-tile-value">${t.value}</div>
          <div class="insights-tile-label">${t.label}</div>
        </div>`).join('')}
    </div>`;
  }

  // ─── Section 5: RAG Breakdown ──────────────────────────────

  function buildRagBreakdown(allCheckIns) {
    const logged = Object.values(allCheckIns).filter(c => c && c.score !== undefined);
    const total  = logged.length;

    if (total === 0) {
      return `<div class="insights-empty">
        <div class="insights-empty-icon">🟢</div>
        <div class="insights-empty-text">No check-in data yet.</div>
      </div>`;
    }

    const counts = { green: 0, amber: 0, red: 0 };
    logged.forEach(c => { if (counts[c.rag] !== undefined) counts[c.rag]++; });

    return [
      { key: 'green', label: 'Green', colour: '#30D158' },
      { key: 'amber', label: 'Amber', colour: '#FF9F0A' },
      { key: 'red',   label: 'Red',   colour: '#FF453A' },
    ].map(r => {
      const pct = Math.round((counts[r.key] / total) * 100);
      return `
        <div class="insights-rag-row">
          <div class="insights-rag-dot" style="background:${r.colour}"></div>
          <div class="insights-rag-label">${r.label}</div>
          <div class="insights-rag-track">
            <div class="insights-rag-fill" style="width:${pct}%;background:${r.colour}"></div>
          </div>
          <div class="insights-rag-pct">${pct}%</div>
        </div>`;
    }).join('');
  }

  // ─── Render ────────────────────────────────────────────────

  function render() {
    const page = document.getElementById('page-insights');
    if (!page) return;

    const profile     = Store.getProfile();
    const allCheckIns = Store.getAllCheckIns();
    const stats       = calcStats(allCheckIns, profile.programmeStart);

    page.innerHTML = `
      <div class="insights-page">

        <div class="insights-header">
          <h1>Insights</h1>
          <div class="insights-header-sub">Your training at a glance</div>
        </div>

        <div class="insights-body">

          <!-- Section 1: Recovery Trend -->
          <div>
            <div class="insights-section-label">Recovery Trend</div>
            <div class="insights-card">
              <div class="insights-filter-row">
                ${[7, 14, 30].map(d => `
                  <button class="insights-filter-btn ${trendDays === d ? 'active' : ''}"
                    data-trend-days="${d}">${d}D</button>
                `).join('')}
              </div>
              ${buildTrendChart(allCheckIns, trendDays)}
            </div>
          </div>

          <!-- Section 2: Consistency Heatmap -->
          <div>
            <div class="insights-section-label">Consistency</div>
            <div class="insights-card">
              ${buildHeatmap(allCheckIns)}
            </div>
          </div>

          <!-- Section 3: Weekly Volume -->
          <div>
            <div class="insights-section-label">Weekly Volume</div>
            <div class="insights-card" id="insights-volume-card">
              ${buildVolumeChart(allCheckIns, profile.programmeStart, volumeFilter)}
            </div>
          </div>

          <!-- Section 4: Stats -->
          <div>
            <div class="insights-section-label">Personal Bests</div>
            ${buildStatTiles(stats)}
          </div>

          <!-- Section 5: RAG Breakdown -->
          <div>
            <div class="insights-section-label">RAG Breakdown</div>
            <div class="insights-card">
              ${buildRagBreakdown(allCheckIns)}
            </div>
          </div>

        </div>
      </div>
    `;

    // Trend filter buttons
    page.querySelectorAll('.insights-filter-btn[data-trend-days]').forEach(btn => {
      btn.addEventListener('click', () => {
        trendDays = parseInt(btn.dataset.trendDays);
        render();
      });
    });

    // Volume filter buttons
    page.querySelectorAll('.insights-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        volumeFilter = btn.dataset.volumeFilter;
        const card = document.getElementById('insights-volume-card');
        if (card) card.innerHTML = buildVolumeChart(allCheckIns, profile.programmeStart, volumeFilter);
        // Re-bind after inner re-render
        card.querySelectorAll('.insights-filter-btn').forEach(b => {
          b.addEventListener('click', () => {
            volumeFilter = b.dataset.volumeFilter;
            render();
          });
        });
      });
    });
  }

  function init() {
    document.addEventListener('nav:change', e => {
      if (e.detail.target === 'insights') render();
    });
  }

  return { init, render };

})();

document.addEventListener('DOMContentLoaded', () => InsightsPage.init());