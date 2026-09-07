/* Relog dashboard — vanilla JS, no framework. Talks to the same-origin API. */

const $ = (id) => document.getElementById(id);

// ───────────────────────── Settings ─────────────────────────
const DEFAULT_SETTINGS = { url: '', relogKey: sessionStorage.getItem('relog_key') || '', groqKey: sessionStorage.getItem('groq_key') || '' };
let settings = { ...DEFAULT_SETTINGS };

try { settings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('relog_settings') || '{}') }; } catch {}

function persist() {
  localStorage.setItem('relog_settings', JSON.stringify(settings));
  sessionStorage.setItem('relog_key', settings.relogKey);
  sessionStorage.setItem('groq_key', settings.groqKey);
}

function baseUrl() {
  let u = settings.url.replace(/\/+$/, '');
  if (!u) return '';                 // same-origin
  return u.startsWith('http') ? u : `https://${u}`;
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (settings.relogKey) headers['Authorization'] = `Bearer ${settings.relogKey}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(baseUrl() + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(`${res.status} — ${detail}`);
  }
  return res.json();
}

// ───────────────────────── Tabs ─────────────────────────
const tabs = ['live', 'analyze', 'history'];
function switchTab(name) {
  tabs.forEach((t) => {
    document.querySelectorAll(`[data-tab="${t}"]`).forEach((el) => {
      const active = t === name;
      el.classList.toggle('active', active);
      if (active) el.classList.add('text-white', 'bg-white/5');
      else el.classList.remove('text-white', 'bg-white/5');
    });
    $('panel-' + t).classList.toggle('hidden', t !== name);
  });
  if (name === 'live') startLive();
  if (name === 'history') loadHistory();
}
document.querySelectorAll('.tab-btn').forEach((b) =>
  b.addEventListener('click', () => switchTab(b.dataset.tab))
);

// ───────────────────────── Toasts ─────────────────────────
function toast(msg, kind = 'ok') {
  const box = $('toast-box');
  const el = document.createElement('div');
  el.className = 'toast';
  const icon = kind === 'ok' ? '✅' : kind === 'err' ? '⛔' : '⚠️';
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3600);
  setTimeout(() => el.remove(), 4000);
}

// ───────────────────────── Level styling ─────────────────────────
const LEVEL_STYLE = {
  fatal:   { badge: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/30', ai: 'border-fuchsia-400/60' },
  error:   { badge: 'bg-rose-500/15 text-rose-300 border-rose-400/30', ai: 'border-rose-400/60' },
  warning: { badge: 'bg-amber-500/15 text-amber-300 border-amber-400/30', ai: 'border-amber-400/60' },
  info:    { badge: 'bg-sky-500/15 text-sky-300 border-sky-400/30', ai: 'border-sky-400/60' },
};
const LVL = (l) => LEVEL_STYLE[l] || LEVEL_STYLE.error;

function cardHTML(r) {
  const s = LVL(r.level);
  const ai = r.summary && !r.summary.startsWith('Flagged because');
  const sourceTag = r.source ? `<span class="text-slate-500">· ${r.source}</span>` : '';
  return `
  <article class="report report-enter">
    <div class="px-4 py-3 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="badge border ${s.badge}">${r.level}</span>
          <span class="text-xs text-slate-500">line ${r.line_no ?? '—'}</span>
          ${sourceTag}
        </div>
        <pre class="error-line text-slate-100 whitespace-pre-wrap">${escapeHtml(r.error)}</pre>
      </div>
      <div class="text-[10px] text-slate-600 shrink-0 pt-0.5">${r.ts || ''}</div>
    </div>
    <div class="ai ${s.ai} px-4 py-2.5 bg-white/[.02] text-sm text-slate-300 leading-relaxed">
      ${ai ? `<span class="text-[10px] uppercase tracking-widest mr-2 opacity-60">AI</span>` : ''}${escapeHtml(r.summary)}
    </div>
  </article>`;
}

const escapeHtml = (s) => (s || '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ───────────────────────── Stats ─────────────────────────
const stats = { errors: 0, fatal: 0, warnings: 0, explained: 0 };
function bump(level, explained) {
  stats.errors++;
  if (level === 'fatal') stats.fatal++;
  if (level === 'warning') stats.warnings++;
  if (explained) stats.explained++;
  $('stat-errors').textContent = stats.errors;
  $('stat-fatal').textContent = stats.fatal;
  $('stat-warnings').textContent = stats.warnings;
  $('stat-explained').textContent = stats.explained;
}

// ───────────────────────── Live feed (SSE via fetch) ─────────────────────────
let liveAbort = null;
let liveRetrying = false;

async function startLive() {
  if (!settings.relogKey) { updatePill(false); return; }
  if (liveAbort) return;
  const ctrl = new AbortController();
  liveAbort = ctrl;
  updatePill(true);
  try {
    const res = await fetch(baseUrl() + '/api/v1/logs/events', {
      headers: { Authorization: `Bearer ${settings.relogKey}` },
      signal: ctrl.signal,
    });
    if (!res.ok) { updatePill(false); toast(`Live feed: ${res.status}`, 'err'); return; }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
        const d = chunk.split('\n').find((l) => l.startsWith('data:'));
        if (!d) continue;
        const evt = JSON.parse(d.slice(5).trim());
        if (evt.type === 'report') renderLiveEvent(evt);
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    updatePill(false);
    if (!liveRetrying) {
      liveRetrying = true;
      setTimeout(() => { liveRetrying = false; startLive(); }, 3000);
    }
  }
}

function stopLive() { if (liveAbort) { liveAbort.abort(); liveAbort = null; } updatePill(false); }
function updatePill(on) {
  $('conn-pill').classList.toggle('hidden', !on);
  $('conn-pill').classList.toggle('flex', on);
}

function renderLiveEvent(evt) {
  const empty = $('live-empty');
  if (empty) empty.remove();
  const node = document.createElement('div');
  node.innerHTML = cardHTML({
    level: evt.level, error: evt.error, summary: evt.summary,
    line_no: evt.line_no, source: evt.source, ts: new Date().toLocaleTimeString(),
  });
  node.firstChild.classList.add('flash');
  $('live-feed').prepend(node);
  while ($('live-feed').children.length > 40) $('live-feed').lastChild.remove();
  bump(evt.level, !evt.summary.startsWith('Flagged because'));
}

// ───────────────────────── Simulate ─────────────────────────
$('simulate-btn').addEventListener('click', async () => {
  if (!settings.relogKey) { switchTab('analyze'); toast('Set a Relog key in Settings first', 'warn'); return; }
  const sample = [
    '2026-09-05 15:40:02 ERROR Database connection refused on 5432',
    'Traceback (most recent call last):',
    '  File "app/db.py", line 42, in connect',
    '    conn = psycopg2.connect(cfg)',
    'psycopg2.OperationalError: could not connect to server',
    '2026-09-05 15:40:09 WARNING retrying in 3s…',
  ];
  try {
    await api('/api/v1/logs/stream', { method: 'POST', body: { source: 'simulated.log', lines: sample, groq_api_key: settings.groqKey || undefined } });
    toast('Simulated a batch — watch the feed', 'ok');
  } catch (e) { toast(e.message, 'err'); }
});

// ───────────────────────── Analyze ─────────────────────────
$('analyze-btn').addEventListener('click', analyze);
$('file-input').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const text = await f.text();
  $('log-input').value = text;
  toast(`Loaded ${f.name} (${text.split('\n').length} lines)`, 'ok');
});
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') analyze();
});

async function analyze() {
  const text = $('log-input').value;
  if (!text.trim()) { toast('Paste some log lines first', 'warn'); return; }
  const lines = text.split(/\r?\n/);
  $('analyze-btn').disabled = true;
  toast(`Analyzing ${lines.length} lines…`, 'ok');
  try {
    const body = { source: 'paste.log', lines, groq_api_key: settings.groqKey || undefined };
    const res = await api('/api/v1/logs/stream', { method: 'POST', body });
    const box = $('analyze-result');
    box.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'text-xs flex items-center justify-between px-1';
    header.innerHTML = `<span class="text-slate-400">${res.errors_found} error${res.errors_found === 1 ? '' : 's'} in ${res.total_lines} lines</span>
      <button onclick="this.closest('#analyze-result').innerHTML=''" class="text-rose-300/70 hover:text-rose-300">clear</button>`;
    box.appendChild(header);
    res.reports.forEach((r, i) => {
      const n = document.createElement('div');
      n.innerHTML = cardHTML({ ...r, ts: new Date().toLocaleTimeString() });
      n.firstChild.style.animationDelay = `${i * 60}ms`;
      box.appendChild(n);
    });
    res.reports.forEach((r) => bump(r.level, !r.summary.startsWith('Flagged because')));
    if (!res.errors_found) toast('No errors detected — clean logs! 🎉', 'ok');
  } catch (e) { toast(e.message, 'err'); }
  finally { $('analyze-btn').disabled = false; }
}

// ───────────────────────── History ─────────────────────────
async function loadHistory() {
  const list = $('history-list');
  if (!settings.relogKey) {
    list.innerHTML = `<div class="glass rounded-2xl p-10 text-center text-slate-500"><p class="font-medium text-slate-300">No key set.</p><p class="text-sm mt-1">Add your Relog API key in Settings to view saved reports.</p></div>`;
    return;
  }
  try {
    const reports = await api('/api/v1/keys/reports');
    if (!reports.length) {
      list.innerHTML = `<div class="glass rounded-2xl p-10 text-center text-slate-500"><p class="font-medium text-slate-300">No reports saved yet.</p></div>`;
      return;
    }
    list.innerHTML = '';
    reports.forEach((r) => {
      const n = document.createElement('div');
      const d = new Date(r.created_at + 'Z');
      n.innerHTML = cardHTML({
        level: r.level, error: r.error_line, summary: r.summary,
        line_no: r.line_no, source: r.source,
        ts: d.toLocaleDateString() + ' ' + d.toLocaleTimeString(),
      });
      list.appendChild(n);
    });
  } catch (e) { list.innerHTML = `<div class="glass rounded-2xl p-6 text-center text-rose-300">${escapeHtml(e.message)}</div>`; }
}
$('refresh-history').addEventListener('click', loadHistory);

// ───────────────────────── Settings modal ─────────────────────────
function openSettings() {
  $('set-url').value = settings.url;
  $('set-relog').value = settings.relogKey;
  $('set-groq').value = settings.groqKey;
  $('settings-modal').classList.remove('hidden');
}
function closeSettings() { $('settings-modal').classList.add('hidden'); }
function saveSettings() {
  stopLive();
  settings.url = $('set-url').value.trim();
  settings.relogKey = $('set-relog').value.trim();
  settings.groqKey = $('set-groq').value.trim();
  persist();
  closeSettings();
  toast(settings.relogKey ? 'Connected — live feed active' : 'Saved; add a Relog key to enable the live feed', 'ok');
  if (settings.relogKey) setTimeout(startLive, 150);
}
$('settings-btn').addEventListener('click', openSettings);

// ───────────────────────── Init ─────────────────────────
switchTab('live');