const API_BASE = '/api/cases';

const UNAVAILABLE = 'Analysis temporarily unavailable';

let myPieChart = null;
let myBarChart = null;

async function safeJsonResponse(res) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return null;
  }
  const text = await res.text();
  if (!text || !text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --- Handle Form Submission ---
async function handleAnalyze(e) {
  e.preventDefault();

  const descEl = document.getElementById('caseDescription');
  const typeEl = document.getElementById('caseType');
  const dateEl = document.getElementById('filingDate');
  const noEl = document.getElementById('caseNumber');

  const payload = {
    description: descEl.value.trim(),
    caseType: typeEl.value,
    filingDate: dateEl.value,
    caseNumber: noEl.value.trim()
  };

  showLoading(true);

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await safeJsonResponse(res);

    if (!res.ok) {
      const msg =
        res.status === 400 && data && data.reason
          ? data.reason
          : UNAVAILABLE;
      throw new Error(msg);
    }

    if (!data) {
      throw new Error(UNAVAILABLE);
    }

    descEl.value = '';
    typeEl.value = '';
    dateEl.value = '';
    noEl.value = '';

    await refreshDashboard();
  } catch (error) {
    alert(error.message || UNAVAILABLE);
  } finally {
    showLoading(false);
  }
}

// --- Loading Overlay ---
function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  const btn = document.getElementById('analyzeBtn');
  if (show) {
    overlay.classList.remove('hidden');
    btn.disabled = true;
  } else {
    overlay.classList.add('hidden');
    btn.disabled = false;
  }
}

// --- Dashboard Logic ---
async function refreshDashboard() {
  try {
    const [casesRes, recRes] = await Promise.all([
      fetch(`${API_BASE}`),
      fetch(`${API_BASE}/recommend`)
    ]);

    let casesData = { cases: [] };
    let recData = { recommendation: null };

    if (casesRes.ok) {
      const parsed = await safeJsonResponse(casesRes);
      if (parsed) casesData = parsed;
    }

    if (recRes.ok) {
      const parsed = await safeJsonResponse(recRes);
      if (parsed) recData = parsed;
    }

    const cases = casesData.cases || [];

    updateHeaderStats(cases);
    renderRecommendation(recData.recommendation);
    renderCaseList(cases);
    renderCharts(cases);
  } catch (err) {
    console.warn(UNAVAILABLE, err);
  }
}

function updateHeaderStats(cases) {
  document.getElementById('statHigh').textContent = cases.filter(c => c.priority === 'High').length;
  document.getElementById('statMedium').textContent = cases.filter(c => c.priority === 'Medium').length;
  document.getElementById('statLow').textContent = cases.filter(c => c.priority === 'Low').length;
}

function renderRecommendation(rec) {
  const card = document.getElementById('recommendationCard');
  if (!rec) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');

  const summary = rec.summary || '—';
  const reason = rec.reason || '—';
  const caseNum = rec.caseNumber || '—';
  const caseType = rec.caseType || 'General';

  let rangeDot = '🟢';
  if (rec.range === 'Critical') rangeDot = '🔴';
  else if (rec.range === 'Moderate') rangeDot = '🟡';

  const scoreVal = typeof rec.score === 'number' ? rec.score : Number(rec.score) || 0;
  const rangeLabel = rec.range || 'Low';

  document.getElementById('recCaseSummary').textContent = summary;
  document.getElementById('recCaseReason').textContent = reason;
  document.getElementById('recCaseName').innerHTML = `${caseNum} <span class="text-slate-500 font-normal">| ${caseType}</span> <span class="ml-2 text-sm text-gold-400 font-bold bg-gold-900/30 px-2 py-0.5 rounded border border-gold-500/20">${rangeDot} ${scoreVal}/10 — ${rangeLabel} Risk</span>`;
}

function renderCaseList(cases) {
  const listEl = document.getElementById('caseList');
  const emptyEl = document.getElementById('caseListEmpty');

  if (cases.length === 0) {
    listEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  listEl.classList.remove('hidden');

  listEl.innerHTML = cases.map((c, idx) => {
    let badgeColor = 'bg-slate-600 text-slate-100 border-slate-500';
    if (c.priority === 'High') badgeColor = 'bg-red-500/10 border-red-500/30 text-red-500';
    if (c.priority === 'Medium') badgeColor = 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500';
    if (c.priority === 'Low') badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500';

    let rangeDot = '🟢';
    if (c.range === 'Critical') rangeDot = '🔴';
    else if (c.range === 'Moderate') rangeDot = '🟡';

    const isTop = idx === 0 && c.range === 'Critical';
    const summary = c.summary || '—';
    const reason = c.reason || '—';
    const scoreVal = typeof c.score === 'number' ? c.score : Number(c.score) || 0;
    const rangeLabel = c.range || 'Low';

    return `
      <div class="p-5 hover:bg-slate-800/50 transition-colors relative ${isTop ? 'bg-red-500/5 border-l-2 border-red-500' : ''}">
        <div class="flex justify-between items-start mb-2">
          <div class="flex items-center gap-3">
            <span class="text-slate-500 font-bold w-6">#${idx + 1}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${badgeColor}">
              ${c.priority || 'Medium'}
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border bg-surface/50 border-slate-600 text-slate-300 flex items-center gap-1">
              ${rangeDot} ${scoreVal}/10 <span class="uppercase">(${rangeLabel})</span>
            </span>
            <h4 class="text-md font-bold text-slate-200 ml-2">${c.caseNumber || '—'} <span class="text-slate-500 font-normal">| ${c.caseType || 'General'}</span></h4>
          </div>
          <button onclick="removeCase(${c.id})" class="text-xs text-slate-500 hover:text-red-400 transition-colors uppercase font-bold px-2 py-1 rounded hover:bg-red-500/10">Close Case</button>
        </div>
        <div class="pl-9 pr-4">
          <p class="text-slate-300 text-sm mb-2 line-clamp-2">${summary}</p>
          <div class="bg-surface/30 rounded p-2 text-xs border border-slate-700/50">
            <span class="text-gold-500 font-bold uppercase mr-1">Reasoning:</span>
            <span class="text-slate-400">${reason}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function removeCase(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshDashboard();
    }
  } catch (err) {
    console.warn(UNAVAILABLE);
  }
}

// --- Charting Engine ---
function renderCharts(cases) {
  const container = document.getElementById('chartsContainer');
  if (cases.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  const high = cases.filter(c => c.priority === 'High').length;
  const med = cases.filter(c => c.priority === 'Medium').length;
  const low = cases.filter(c => c.priority === 'Low').length;

  const ctxPie = document.getElementById('pieChart').getContext('2d');
  if (myPieChart) myPieChart.destroy();

  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = 'Inter, sans-serif';

  myPieChart = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: [high, med, low],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderColor: '#1e293b',
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12 } }
      },
      cutout: '70%'
    }
  });

  const ctxBar = document.getElementById('barChart').getContext('2d');
  if (myBarChart) myBarChart.destroy();

  const topCases = cases.slice(0, 5);
  const labels = topCases.map(c => c.caseNumber || '—');
  const scores = topCases.map(c => c.priorityScore || 0);

  myBarChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Priority Score',
        data: scores,
        backgroundColor: '#f59e0b',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', refreshDashboard);
