/**
 * API base: same-origin when opened via Express (e.g. localhost:3000).
 * Live Server / VS Code (ports like 5503) has no /api — use backend origin.
 */
function resolveApiBase() {
  const meta = document.querySelector('meta[name="casrank-api-origin"]');
  if (meta && meta.content && String(meta.content).trim()) {
    return String(meta.content).trim().replace(/\/$/, '') + '/api/cases';
  }

  const loc = window.location;
  const port = loc.port || '';

  if (loc.protocol === 'file:') {
    return 'http://127.0.0.1:3000/api/cases';
  }

  const staticDevPorts = new Set([
    '5500', '5501', '5502', '5503', '5504', '5505', '5506', '5507', '5508', '5509', '5510',
    '5173', '4173', '8080', '8888'
  ]);
  if (staticDevPorts.has(port)) {
    const host = loc.hostname || '127.0.0.1';
    return `http://${host}:3000/api/cases`;
  }

  return '/api/cases';
}

const API_BASE = resolveApiBase();

const UNAVAILABLE = 'Analysis temporarily unavailable';
const NETWORK_HINT =
  'Cannot reach the CaseRank API. Start the backend (cd backend && npm start). Live Server users: API must run on port 3000, or add <meta name="casrank-api-origin" content="http://127.0.0.1:YOUR_PORT"> to index.html.';

function isLikelyNetworkFailure(err) {
  if (!err) return false;
  const msg = String(err.message || '');
  return (
    err.name === 'TypeError' ||
    msg === 'Failed to fetch' ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed')
  );
}

function alertApiError(err) {
  alert(isLikelyNetworkFailure(err) ? NETWORK_HINT : err.message || UNAVAILABLE);
}

const MSG_READING = 'Reading file...';
const MSG_ANALYZING = 'Analyzing with AI...';

let myPieChart = null;
let myBarChart = null;

function setLoadingMessage(msg) {
  const el = document.getElementById('loadingOverlayMsg');
  if (el) el.textContent = msg;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function autoDetectedBadgeHtml(show) {
  if (!show) return '';
  return '<span class="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border border-gold-500/30 text-gold-400 bg-gold-500/10 whitespace-nowrap">Auto-detected</span>';
}

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

  setLoadingMessage(MSG_ANALYZING);
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
    alertApiError(error);
  } finally {
    showLoading(false);
    setLoadingMessage(MSG_ANALYZING);
  }
}

// --- Loading Overlay ---
function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  const btn = document.getElementById('analyzeBtn');
  const uploadBtn = document.getElementById('uploadAnalyzeBtn');
  if (!overlay) return;
  if (show) {
    overlay.classList.remove('hidden');
    if (btn) btn.disabled = true;
    if (uploadBtn) uploadBtn.disabled = true;
  } else {
    overlay.classList.add('hidden');
    if (btn) btn.disabled = false;
    if (uploadBtn) uploadBtn.disabled = false;
  }
}

function applySelectCaseType(selectEl, value) {
  if (!selectEl || !value) return;
  const v = String(value).trim();
  const opt = Array.from(selectEl.options).find(o => o.value.toLowerCase() === v.toLowerCase());
  if (opt) selectEl.value = opt.value;
  else selectEl.value = '';
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(UNAVAILABLE));
    reader.readAsText(file);
  });
}

async function handleUploadAnalyze() {
  const input = document.getElementById('caseFileInput');
  const file = input && input.files && input.files[0];
  if (!file) {
    alert('Please choose a .txt file.');
    return;
  }
  const name = (file.name || '').toLowerCase();
  if (!name.endsWith('.txt') && file.type !== 'text/plain') {
    alert('Only .txt files are supported.');
    return;
  }

  setLoadingMessage(MSG_READING);
  showLoading(true);

  let content;
  try {
    content = await readFileAsText(file);
  } catch {
    setLoadingMessage(MSG_ANALYZING);
    showLoading(false);
    alert(UNAVAILABLE);
    return;
  }

  setLoadingMessage(MSG_ANALYZING);

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });

    const data = await safeJsonResponse(res);

    if (!res.ok) {
      const msg =
        res.status === 400 && data && data.reason ? data.reason : UNAVAILABLE;
      throw new Error(msg);
    }

    if (!data) {
      throw new Error(UNAVAILABLE);
    }

    const noEl = document.getElementById('caseNumber');
    const typeEl = document.getElementById('caseType');
    const dateEl = document.getElementById('filingDate');
    const descEl = document.getElementById('caseDescription');

    if (noEl) noEl.value = data.caseId || '';
    if (dateEl) dateEl.value = data.filingDate || '';
    if (descEl) descEl.value = data.case && data.case.description ? data.case.description : '';
    applySelectCaseType(typeEl, data.caseType);

    if (input) input.value = '';

    await refreshDashboard();
    switchInputTab('manual');
  } catch (error) {
    alertApiError(error);
  } finally {
    showLoading(false);
    setLoadingMessage(MSG_ANALYZING);
  }
}

function switchInputTab(mode) {
  const panelManual = document.getElementById('panelManual');
  const panelFile = document.getElementById('panelFile');
  const tabManual = document.getElementById('tabManual');
  const tabFile = document.getElementById('tabFile');
  if (!panelManual || !panelFile || !tabManual || !tabFile) return;

  const manual = mode === 'manual';
  panelManual.classList.toggle('hidden', !manual);
  panelFile.classList.toggle('hidden', manual);
  tabManual.classList.toggle('bg-gold-600', manual);
  tabManual.classList.toggle('text-white', manual);
  tabManual.classList.toggle('bg-surface', !manual);
  tabManual.classList.toggle('text-slate-300', !manual);
  tabFile.classList.toggle('bg-gold-600', !manual);
  tabFile.classList.toggle('text-white', !manual);
  tabFile.classList.toggle('bg-surface', manual);
  tabFile.classList.toggle('text-slate-300', manual);
  tabManual.setAttribute('aria-selected', manual ? 'true' : 'false');
  tabFile.setAttribute('aria-selected', manual ? 'false' : 'true');
}

function initInputTabs() {
  const tabManual = document.getElementById('tabManual');
  const tabFile = document.getElementById('tabFile');
  const uploadBtn = document.getElementById('uploadAnalyzeBtn');
  if (tabManual) tabManual.addEventListener('click', () => switchInputTab('manual'));
  if (tabFile) tabFile.addEventListener('click', () => switchInputTab('file'));
  if (uploadBtn) uploadBtn.addEventListener('click', () => handleUploadAnalyze());
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
  const typeLine = `${escapeHtml(caseType)}${autoDetectedBadgeHtml(!!rec.caseTypeAutoDetected)}`;

  let rangeDot = '🟢';
  if (rec.range === 'Critical') rangeDot = '🔴';
  else if (rec.range === 'Moderate') rangeDot = '🟡';

  const scoreVal = typeof rec.score === 'number' ? rec.score : Number(rec.score) || 0;
  const rangeLabel = rec.range || 'Low';

  document.getElementById('recCaseSummary').textContent = summary;
  document.getElementById('recCaseReason').textContent = reason;
  document.getElementById('recCaseName').innerHTML = `${escapeHtml(caseNum)} <span class="text-slate-500 font-normal">| ${typeLine}</span> <span class="ml-2 text-sm text-gold-400 font-bold bg-gold-900/30 px-2 py-0.5 rounded border border-gold-500/20">${rangeDot} ${scoreVal}/10 — ${rangeLabel} Risk</span>`;
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
            <h4 class="text-md font-bold text-slate-200 ml-2">${escapeHtml(c.caseNumber || '—')} <span class="text-slate-500 font-normal">| ${escapeHtml(c.caseType || 'General')}${autoDetectedBadgeHtml(!!c.caseTypeAutoDetected)}</span></h4>
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

document.addEventListener('DOMContentLoaded', () => {
  initInputTabs();
  refreshDashboard();
});
