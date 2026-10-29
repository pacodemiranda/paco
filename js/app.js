import * as store from './store.js';
import * as supa from './supa.js';
import { DEFAULT_PROGRAM, ACTIVITY_TYPES, ACTIVITY_NOTES, validateProgram } from './program.js';
import * as U from './util.js';
import { lineChart, barChart } from './charts.js';

const APP_VERSION = '1.1.0';
const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet-root');
const $toast = document.getElementById('toast');

const ui = {
  view: 'hoje',
  calMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selDay: U.dkey(),
  evEx: null,
  evMetric: null,
  reportDays: 30,
  reportText: '',
  importMsg: '',
  importOk: false,
  sheet: null,
  warmOpen: false,
  confirm: null,
  loginErr: '',
  busy: false
};
const rt = { restEnd: 0, restTotal: 0, restDone: false, setTimer: null, wake: null, audio: null, sheetKey: '' };

/* ---------- ícones ---------- */
const svg = (d, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  hoje: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>'),
  historico: svg('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  evolucao: svg('<path d="M3 17l5-6 4 3 8-9"/><path d="M15 5h5v5"/>'),
  mais: svg('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 24),
  play: svg('<path d="M8 5l11 7-11 7z" fill="currentColor"/>', 20),
  back: svg('<path d="M15 5l-7 7 7 7"/>', 24),
  next: svg('<path d="M9 5l7 7-7 7"/>', 20),
  prev: svg('<path d="M15 5l-7 7 7 7"/>', 20),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 22),
  video: svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor"/>', 18)
};

/* ---------- dados ---------- */
const program = () => (store.get('program') || {}).data;
const settings = () => ({ rest: 60, sound: true, theme: 'auto', ...((store.get('settings') || {}).data || {}) });
const allSessions = () => store.all('session').map(r => r.data);
const doneSessions = () => allSessions().filter(s => s.status === 'done').sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
const activeSession = () => allSessions().find(s => s.status === 'active');
const activities = () => store.all('activity').map(r => r.data);

function saveProgram(p) { store.save('program', 'program', p); supa.scheduleSync(1500); }
function saveSession(s) { store.save('session', s.id, s); supa.scheduleSync(4000); }
function saveSettings(o) { store.save('settings', 'settings', { ...settings(), ...o }); supa.scheduleSync(1500); }

function ensureProgram() {
  if (program()) return;
  if (supa.configured() && !store.getMeta('synced1')) return;
  store.save('program', 'program', JSON.parse(JSON.stringify(DEFAULT_PROGRAM)));
  supa.scheduleSync(800);
}

function lastPerf(exId) {
  const list = doneSessions();
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i].exercises.find(x => x.ex === exId);
    if (!e) continue;
    const sets = e.sets.filter(s => s.done);
    if (sets.length) return sets.map(s => ({ w: s.w, r: s.r, t: s.t }));
  }
  return null;
}

function sessionStats(s) {
  let done = 0, total = 0, volume = 0;
  s.exercises.forEach(e => e.sets.forEach(st => {
    total++;
    if (st.done) {
      done++;
      if (e.mode !== 'time' && st.w && st.r) volume += st.w * st.r;
    }
  }));
  return { done, total, volume };
}

/* ---------- utilidades de interface ---------- */
function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => $toast.classList.remove('show'), 2200);
}

function applyTheme() {
  const t = settings().theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}

function go(view) {
  ui.view = view;
  ui.confirm = null;
  ui.sheet = null;
  try { history.replaceState(null, '', '#' + (view === 'treino' ? 'hoje' : view)); } catch (e) { /* ignore */ }
  render();
  window.scrollTo(0, 0);
}

const isTyping = () => {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
};

/* ---------- áudio, descanso, tela acesa ---------- */
function audioCtx() {
  try {
    if (!rt.audio) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (C) rt.audio = new C();
    }
    if (rt.audio && rt.audio.state === 'suspended') rt.audio.resume();
  } catch (e) { /* ignore */ }
  return rt.audio;
}
function beep() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ }
  if (!settings().sound) return;
  const a = audioCtx();
  if (!a) return;
  const t0 = a.currentTime;
  [0, 0.28, 0.56].forEach((d, i) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.value = i === 2 ? 1040 : 880;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22);
    o.connect(g);
    g.connect(a.destination);
    o.start(t0 + d);
    o.stop(t0 + d + 0.25);
  });
}

function startRest(sec) {
  audioCtx();
  rt.restTotal = sec;
  rt.restEnd = Date.now() + sec * 1000;
  rt.restDone = false;
  paintRest();
}
function stopRest() { rt.restEnd = 0; rt.restDone = false; paintRest(); }

function paintRest() {
  const el = document.getElementById('rest');
  if (!el) return;
  if (!rt.restEnd) { el.hidden = true; return; }
  el.hidden = false;
  const left = Math.max(0, Math.ceil((rt.restEnd - Date.now()) / 1000));
  el.classList.toggle('done', left === 0);
  document.getElementById('rest-t').textContent = left === 0 ? 'Descanso acabou' : 'Descanso ' + U.mmss(left);
  document.getElementById('rest-fill').style.width = (rt.restTotal ? Math.max(0, Math.min(100, 100 * left / rt.restTotal)) : 0) + '%';
}

async function acquireWake() {
  try {
    if (navigator.wakeLock && !rt.wake && !document.hidden) {
      rt.wake = await navigator.wakeLock.request('screen');
      rt.wake.addEventListener('release', () => { rt.wake = null; });
    }
  } catch (e) { rt.wake = null; }
}
function releaseWake() { try { if (rt.wake) rt.wake.release(); } catch (e) { /* ignore */ } rt.wake = null; }

function restFor(s, e) { return e.rest || s.rest || settings().rest; }

function tick() {
  const s = activeSession();
  const now = Date.now();
  const clock = document.getElementById('clock');
  if (clock && s) clock.textContent = U.mmss((now - Date.parse(s.startedAt)) / 1000);
  if (rt.restEnd) {
    const left = Math.ceil((rt.restEnd - now) / 1000);
    if (left <= 0 && !rt.restDone) { rt.restDone = true; beep(); }
    if (left <= 0 && now - rt.restEnd > 10000) stopRest(); else paintRest();
  }
  if (rt.setTimer && s) {
    const t = rt.setTimer;
    const left = Math.ceil((t.end - now) / 1000);
    const el = document.getElementById(`st-${t.ex}-${t.i}`);
    if (el) el.textContent = Math.max(0, left);
    if (left <= 0) completeTimedSet(t);
  }
}

function completeTimedSet(t) {
  rt.setTimer = null;
  const s = activeSession();
  if (!s) return;
  const e = s.exercises[t.ex];
  const st = e && e.sets[t.i];
  if (!st) return;
  st.t = t.total;
  st.done = true;
  { const t0 = new Date().toISOString(); s.firstAt = s.firstAt || t0; s.lastAt = t0; }
  beep();
  startRest(restFor(s, e));
  saveSession(s);
  render();
}

/* ---------- sessão de treino ---------- */
function startSession(workoutId) {
  const p = program();
  const w = p.workouts.find(x => x.id === workoutId);
  if (!w) return;
  const now = new Date();
  const s = {
    id: U.uid(), status: 'active', date: U.dkey(now), workoutId: w.id, workoutName: w.name,
    startedAt: now.toISOString(), endedAt: null, durationSec: 0, kcal: null, notes: '', rest: w.rest || null,
    exercises: w.exercises.map(e => {
      const lib = p.exercises[e.ex] || { name: e.ex };
      const last = lastPerf(e.ex);
      const time = e.mode === 'time';
      const sets = Array.from({ length: e.sets }, (_, i) => {
        const l = last ? (last[i] || last[last.length - 1]) : null;
        return { w: l ? l.w : null, r: time ? null : (l ? l.r : null), t: time ? ((l && l.t) || e.seconds) : null, done: false };
      });
      return { ex: e.ex, name: lib.name, mode: time ? 'time' : 'reps', reps: e.reps || '', seconds: e.seconds || null, side: !!e.side, tag: e.tag || '', rest: e.rest || null, planSets: e.sets, sets };
    })
  };
  saveSession(s);
  rt.restEnd = 0;
  ui.view = 'treino';
  ui.warmOpen = false;
  render();
  window.scrollTo(0, 0);
}

function toggleSet(ei, i) {
  const s = activeSession();
  if (!s) return;
  const e = s.exercises[ei];
  const st = e.sets[i];
  st.done = !st.done;
  if (st.done) {
    const t0 = new Date().toISOString();
    s.firstAt = s.firstAt || t0;
    s.lastAt = t0;
    if (e.mode === 'reps' && st.r == null) { const n = parseInt(e.reps, 10); st.r = Number.isFinite(n) ? n : null; }
    if (e.mode === 'time' && st.t == null) st.t = e.seconds;
    const nx = e.sets[i + 1];
    if (nx && !nx.done) {
      if (nx.w == null) nx.w = st.w;
      if (e.mode === 'reps' && nx.r == null) nx.r = st.r;
    }
    startRest(restFor(s, e));
  } else {
    stopRest();
  }
  saveSession(s);
  render();
}

function toggleSetTimer(ei, i) {
  const s = activeSession();
  if (!s) return;
  audioCtx();
  if (rt.setTimer && rt.setTimer.ex === ei && rt.setTimer.i === i) { rt.setTimer = null; render(); return; }
  const e = s.exercises[ei];
  const total = e.sets[i].t || e.seconds || 30;
  stopRest();
  rt.setTimer = { ex: ei, i, total, end: Date.now() + total * 1000 };
  render();
}

let persistTimer = null;
function persistSoon(s) {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => saveSession(s), 350);
}

function effectiveDuration(s, nowMs = Date.now()) {
  // Ignora tempo parado: treino aberto muito antes da primeira série ou esquecido depois da última.
  const start0 = Date.parse(s.startedAt);
  let start = start0, end = nowMs;
  if (s.firstAt && Date.parse(s.firstAt) - start0 > 30 * 60000) start = Date.parse(s.firstAt) - 60000;
  if (s.lastAt && nowMs - Date.parse(s.lastAt) > 60 * 60000) end = Date.parse(s.lastAt) + 3 * 60000;
  return Math.max(60, Math.round((end - start) / 1000));
}

function finishSession() {
  const s = activeSession();
  if (!s) return;
  const kcal = U.num(document.getElementById('fin-kcal')?.value);
  const notes = (document.getElementById('fin-notes')?.value || '').trim();
  const end = new Date();
  s.status = 'done';
  s.endedAt = end.toISOString();
  const mins = U.num(document.getElementById('fin-min')?.value);
  s.durationSec = mins != null && mins > 0 ? Math.round(mins * 60) : effectiveDuration(s, end.getTime());
  s.kcal = kcal;
  s.notes = notes;
  s.date = U.dkey(new Date(s.startedAt));
  rt.setTimer = null;
  stopRest();
  releaseWake();
  saveSession(s);
  supa.scheduleSync(500);
  ui.sheet = null;
  ui.selDay = s.date;
  ui.calMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  go('historico');
  toast('Treino salvo');
}

function discardSession() {
  const s = activeSession();
  if (!s) return;
  store.remove(s.id);
  supa.scheduleSync(1500);
  rt.setTimer = null;
  stopRest();
  releaseWake();
  ui.sheet = null;
  go('hoje');
  toast('Treino descartado');
}

/* ---------- telas ---------- */
function vLogin() {
  return `<div class="login">
    <div><span class="brand">PACO<i></i></span><p class="muted" style="margin-top:10px">Entre com o e-mail e a senha que você criou no Supabase. Isso é feito uma vez só neste aparelho.</p></div>
    <form data-form="login" class="stack">
      <label class="field"><span>E-mail</span><input class="in" id="lg-email" type="email" autocomplete="username" inputmode="email" autocapitalize="none" value="${U.esc(ui.loginMail || '')}" required></label>
      <label class="field"><span>Senha</span><input class="in" id="lg-pass" type="password" autocomplete="current-password" required></label>
      ${ui.loginErr ? `<p class="err" role="alert">${U.esc(ui.loginErr)}</p>` : ''}
      <button class="btn primary block" type="submit" ${ui.busy ? 'disabled' : ''}>${ui.busy ? 'Entrando...' : 'Entrar'}</button>
    </form>
  </div>`;
}

function vWait() {
  return `<div class="shell"><div class="top"><span class="brand">PACO<i></i></span></div>
    <div class="card stack"><h2 class="h-display h2">Preparando seus dados</h2>
    <p class="muted">Primeira sincronização em andamento. Isso precisa de internet e leva alguns segundos.</p>
    <p class="muted small" id="wait-status">${U.esc(syncLabel(supa.status()))}</p>
    <button class="btn" data-act="sync-now">Tentar de novo</button></div></div>`;
}

function syncLabel(st) {
  if (!supa.configured()) return 'Modo local';
  switch (st.s) {
    case 'syncing': return 'Sincronizando...';
    case 'offline': return 'Sem conexão' + (st.pending ? ` - ${st.pending} pendente${st.pending > 1 ? 's' : ''}` : '');
    case 'error': return 'Erro ao sincronizar';
    case 'signedout': return 'Desconectado';
    default: return st.pending ? `${st.pending} a enviar` : 'Sincronizado';
  }
}

function topbar(extra = '') {
  const st = supa.status();
  const bad = supa.configured() ? (st.s === 'offline' || st.s === 'error' || st.s === 'signedout') : false;
  return `<div class="top"><span class="brand">PACO<i></i></span>${extra}<span class="pill ${bad ? 'warn' : ''}" id="syncpill">${U.esc(syncLabel(st))}</span></div>`;
}

function tabbar() {
  const tabs = [['hoje', 'Hoje'], ['historico', 'Histórico'], ['evolucao', 'Evolução'], ['mais', 'Mais']];
  return `<nav class="tabbar" aria-label="Seções">${tabs.map(([k, l]) =>
    `<button class="tab" data-act="tab" data-v="${k}" ${ui.view === k ? 'aria-current="page"' : ''}>${IC[k]}<span>${l}</span></button>`).join('')}</nav>`;
}

function describeEx(e) {
  if (e.mode === 'time') return `${e.sets} × ${e.seconds} s${e.side ? ' cada lado' : ''}`;
  return `${e.sets} × ${e.reps}${e.side ? ' cada' : ''}`;
}

function vHoje() {
  const p = program();
  const now = new Date();
  const plan = p.schedule[String(now.getDay())] || null;
  const act = activeSession();
  const dsess = doneSessions();
  const acts = activities();
  const mon = U.monday(now);

  let planned = 0, did = 0;
  const strip = Array.from({ length: 7 }, (_, i) => {
    const d = U.addDays(mon, i);
    const k = U.dkey(d);
    const pl = p.schedule[String(d.getDay())];
    const w = pl && pl.w ? p.workouts.find(x => x.id === pl.w) : null;
    if (w) planned++;
    const hasS = dsess.some(x => x.date === k);
    const hasA = acts.some(a => a.date === k);
    if (hasS) did++;
    const lbl = w ? w.name : (pl && pl.a ? pl.a : '');
    return `<button class="wd ${k === U.dkey(now) ? 'today' : ''} ${hasS ? 'done' : ''} ${hasA && !hasS ? 'act' : ''}" data-act="goday" data-k="${k}" aria-label="${U.DOW_LONG[d.getDay()]} ${d.getDate()}">
      <span>${U.DOW[d.getDay()]}</span><b>${d.getDate()}</b><small>${U.esc(lbl)}</small><span class="mark"></span></button>`;
  }).join('');

  let todayCard;
  if (act) {
    const st = sessionStats(act);
    todayCard = `<div class="card today-card stack">
      <span class="eyebrow">Treino em andamento</span>
      <h2 class="h-display h1">${U.esc(act.workoutName)}</h2>
      <p class="muted">${st.done} de ${st.total} séries feitas.</p>
      <button class="btn primary block" data-act="resume">Continuar treino</button></div>`;
  } else if (plan && plan.w && p.workouts.find(x => x.id === plan.w)) {
    const w = p.workouts.find(x => x.id === plan.w);
    todayCard = `<div class="card today-card stack">
      <span class="eyebrow">${U.DOW_LONG[now.getDay()]}, ${now.getDate()} de ${U.MONTHS[now.getMonth()]}</span>
      <h2 class="h-display h1">${U.esc(w.name)}</h2>
      <p class="muted">${U.esc(w.focus || '')}</p>
      <div class="chips"><span class="chip">${w.exercises.length} exercícios</span><span class="chip">${w.minutes || 50} min</span>${w.circuit ? '<span class="chip red">Circuito</span>' : ''}</div>
      <button class="btn primary block" data-act="start" data-w="${U.esc(w.id)}">Iniciar treino</button>
      <button class="btn block" data-act="preview" data-w="${U.esc(w.id)}">Ver treino</button></div>`;
  } else if (plan && plan.a) {
    todayCard = `<div class="card today-card stack">
      <span class="eyebrow">${U.DOW_LONG[now.getDay()]}, ${now.getDate()} de ${U.MONTHS[now.getMonth()]}</span>
      <h2 class="h-display h1">${U.esc(plan.a)}</h2>
      ${plan.note ? `<p class="note">${U.esc(plan.note)}</p>` : ''}
      <button class="btn primary block" data-act="add-activity" data-type="${U.esc(plan.a)}">Registrar atividade</button></div>`;
  } else {
    todayCard = `<div class="card today-card stack">
      <span class="eyebrow">${U.DOW_LONG[now.getDay()]}, ${now.getDate()} de ${U.MONTHS[now.getMonth()]}</span>
      <h2 class="h-display h1">Dia livre</h2>
      <p class="muted">Nada planejado para hoje. Descanse, ou escolha um treino abaixo.</p></div>`;
  }

  const others = p.workouts.filter(w => !(plan && plan.w === w.id) || act);
  const r = p.reminders || {};

  return `<div class="shell stack-lg">${topbar()}
    <div class="week">${strip}</div>
    ${todayCard}
    <div class="card row between"><div class="stat"><b class="num">${did} de ${planned}</b><span class="muted small">treinos de academia nesta semana</span></div></div>
    ${!act && others.length ? `<section class="stack"><h3 class="eyebrow">Ver outro treino</h3>
      ${others.map(w => `<button class="card row between" style="text-align:left;cursor:pointer" data-act="preview" data-w="${U.esc(w.id)}"><span><b>${U.esc(w.name)}</b><br><span class="muted small">${w.exercises.length} exercícios - ${w.minutes || 50} min</span></span>${IC.next}</button>`).join('')}</section>` : ''}
    ${r.rules && r.rules.length ? `<section class="card stack"><h3 class="eyebrow">Regras da fase</h3>
      <div class="stack">${r.rules.map(x => `<div><b>${U.esc(x.t)}</b><p class="muted">${U.esc(x.d)}</p></div>`).join('')}</div>
      ${r.avoid && r.avoid.length ? `<div><b>Evitar por enquanto</b><ul class="bullets">${r.avoid.map(x => `<li>${U.esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${r.next && r.next.length ? `<div><b>Próximas fases</b><ul class="bullets">${r.next.map(x => `<li>${U.esc(x)}</li>`).join('')}</ul></div>` : ''}</section>` : ''}
  </div>`;
}

function setRows(e, ei, runningTimer) {
  const time = e.mode === 'time';
  let h = `<div class="srow shead ${time ? 'time' : ''}"><span></span><span>kg</span><span>${time ? 'seg' : 'reps'}</span>${time ? '<span></span>' : ''}<span></span></div>`;
  e.sets.forEach((st, i) => {
    const run = runningTimer && runningTimer.ex === ei && runningTimer.i === i;
    h += `<div class="srow ${time ? 'time' : ''} ${st.done ? 'done' : ''}">
      <span class="n">${i + 1}</span>
      <input class="in" inputmode="decimal" data-f="w" data-ex="${ei}" data-i="${i}" value="${U.esc(U.fmtNum(st.w))}" placeholder="-" aria-label="Carga da série ${i + 1}, em kg">
      <input class="in" inputmode="numeric" data-f="${time ? 't' : 'r'}" data-ex="${ei}" data-i="${i}" value="${U.esc(U.fmtNum(time ? st.t : st.r))}" placeholder="${time ? e.seconds : U.esc(parseInt(e.reps, 10) || '-')}" aria-label="${time ? 'Segundos' : 'Repetições'} da série ${i + 1}">
      ${time ? `<button class="play ${run ? 'run' : ''}" data-act="timer" data-ex="${ei}" data-i="${i}" aria-label="${run ? 'Parar cronômetro' : 'Iniciar cronômetro'} da série ${i + 1}">${run ? `<span id="st-${ei}-${i}">${Math.max(0, Math.ceil((runningTimer.end - Date.now()) / 1000))}</span>` : IC.play}</button>` : ''}
      <button class="chk ${st.done ? 'on' : ''}" data-act="set" data-ex="${ei}" data-i="${i}" aria-pressed="${st.done}" aria-label="Concluir série ${i + 1}">${IC.check}</button>
    </div>`;
  });
  return h;
}

function vPrevia() {
  const p = program();
  const w = p.workouts.find(x => x.id === ui.previewW);
  if (!w) return vHoje();
  const act = activeSession();
  const cards = w.exercises.map(e => {
    const lib = p.exercises[e.ex] || { name: e.ex };
    const last = lastPerf(e.ex);
    const lastTxt = last ? 'Último: ' + last.map(x => e.mode === 'time' ? `${x.w ? U.fmtNum(x.w) + ' kg × ' : ''}${x.t} s` : `${x.w ? U.fmtNum(x.w) + ' kg × ' : ''}${x.r}`).join(' · ') : 'Primeira vez neste exercício';
    return `<article class="card ex">
      <div class="ex-top"><h3>${U.esc(lib.name)}</h3><span class="rx">${U.esc(describeEx(e))}</span></div>
      ${e.tag ? `<p class="tag">${U.esc(e.tag)}</p>` : ''}
      <p class="last">${U.esc(lastTxt)}</p>
      <div class="ex-foot"><button class="btn small" data-act="video" data-x="${U.esc(e.ex)}">${IC.video} Ver execução</button></div>
    </article>`;
  }).join('');
  return `<div class="shell stack">
    <div class="wk-head"><button class="back" data-act="back" aria-label="Voltar para Hoje">${IC.back}</button>
      <div class="ttl"><span class="eyebrow">Só visualização</span><h1 class="h-display">${U.esc(w.name)}</h1></div></div>
    <div class="chips"><span class="chip">${w.exercises.length} exercícios</span><span class="chip">${w.minutes || 50} min</span>${w.circuit ? '<span class="chip red">Circuito</span>' : ''}</div>
    ${w.focus ? `<p class="muted">${U.esc(w.focus)}</p>` : ''}
    ${w.intro ? `<p class="note">${U.esc(w.intro)}</p>` : ''}
    ${w.warmup ? `<div class="card stack"><b>Aquecimento</b><p class="muted">${U.esc(w.warmup)}</p></div>` : ''}
    ${cards}
    ${act ? '<button class="btn block" data-act="resume">Continuar treino em andamento</button>' : `<button class="btn primary block" data-act="start" data-w="${U.esc(w.id)}">Iniciar treino</button>`}
  </div>`;
}

function vTreino() {
  const s = activeSession();
  const p = program();
  const w = p.workouts.find(x => x.id === s.workoutId);
  const st = sessionStats(s);
  const cards = s.exercises.map((e, ei) => {
    const last = lastPerf(e.ex);
    const lastTxt = last ? 'Último: ' + last.map(x => e.mode === 'time' ? `${x.w ? U.fmtNum(x.w) + ' kg × ' : ''}${x.t} s` : `${x.w ? U.fmtNum(x.w) + ' kg × ' : ''}${x.r}`).join(' · ') : 'Primeira vez neste exercício';
    return `<article class="card ex">
      <div class="ex-top"><h3>${U.esc(e.name)}</h3><span class="rx">${U.esc(describeEx({ ...e, sets: e.planSets || e.sets.length }))}</span></div>
      ${e.tag ? `<p class="tag">${U.esc(e.tag)}</p>` : ''}
      <p class="last">${U.esc(lastTxt)}</p>
      <div class="sets">${setRows(e, ei, rt.setTimer)}</div>
      <div class="ex-foot"><button class="btn small" data-act="video" data-x="${U.esc(e.ex)}">${IC.video} Ver execução</button>
        <span class="row"><button class="btn quiet small" data-act="rm-set" data-ex="${ei}" aria-label="Remover última série">- série</button><button class="btn quiet small" data-act="add-set" data-ex="${ei}">+ série</button></span></div>
    </article>`;
  }).join('');

  return `<div class="shell stack">
    <div class="wk-head"><button class="back" data-act="back" aria-label="Voltar para Hoje">${IC.back}</button>
      <div class="ttl"><span class="eyebrow">Treino em andamento</span><h1 class="h-display">${U.esc(s.workoutName)}</h1></div>
      <span class="clock" id="clock">${U.mmss((Date.now() - Date.parse(s.startedAt)) / 1000)}</span></div>
    ${w && w.intro ? `<p class="note">${U.esc(w.intro)}</p>` : ''}
    ${w && w.warmup ? `<button class="card warm" data-act="warm" aria-expanded="${ui.warmOpen}"><div class="row between"><b>Aquecimento</b><span class="muted small">${ui.warmOpen ? 'Fechar' : 'Ver'}</span></div>${ui.warmOpen ? `<p class="muted" style="margin-top:6px">${U.esc(w.warmup)}</p>` : ''}</button>` : ''}
    ${cards}
    <div class="dock"><div class="dock-in">
      <div id="rest" hidden><span class="rt" id="rest-t"></span><span class="rb"><button data-act="rest-add" data-d="-15" aria-label="Menos 15 segundos">-15</button><button data-act="rest-add" data-d="15" aria-label="Mais 15 segundos">+15</button><button data-act="rest-stop">Pular</button></span><i id="rest-fill"></i></div>
      <div class="dock-row"><span class="num muted" id="prog">${st.done}/${st.total} séries</span><button class="btn primary" data-act="finish">Finalizar treino</button></div>
    </div></div>
  </div>`;
}

function monthCells(first) {
  const startPad = first.getDay();
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return { startPad, days };
}

function vHistorico() {
  const sess = doneSessions();
  const acts = activities();
  const cm = ui.calMonth;
  const { startPad, days } = monthCells(cm);
  const todayK = U.dkey();
  const hasS = new Set(sess.map(s => s.date));
  const hasA = new Set(acts.map(a => a.date));
  let cells = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => `<div class="h">${d}</div>`).join('');
  for (let i = 0; i < startPad; i++) cells += '<div class="cd empty"></div>';
  for (let d = 1; d <= days; d++) {
    const k = U.dkey(new Date(cm.getFullYear(), cm.getMonth(), d));
    cells += `<button class="cd ${k === todayK ? 'today' : ''} ${k === ui.selDay ? 'sel' : ''}" data-act="goday" data-k="${k}" aria-label="${d} de ${U.MONTHS[cm.getMonth()]}"><span>${d}</span><span class="dots">${hasS.has(k) ? '<i></i>' : ''}${hasA.has(k) ? '<i class="a"></i>' : ''}</span></button>`;
  }
  const prefix = `${cm.getFullYear()}-${U.pad(cm.getMonth() + 1)}-`;
  const ms = sess.filter(s => s.date.startsWith(prefix));
  const ma = acts.filter(a => a.date.startsWith(prefix));
  const totalSec = ms.reduce((a, s) => a + (s.durationSec || 0), 0) + ma.reduce((a, x) => a + (x.minutes || 0) * 60, 0);
  const trained = new Set([...ms.map(s => s.date), ...ma.map(a => a.date)]).size;

  const daySess = sess.filter(s => s.date === ui.selDay);
  const dayActs = acts.filter(a => a.date === ui.selDay);
  const selD = U.fromKey(ui.selDay);
  const entries = [
    ...daySess.map(s => {
      const st = sessionStats(s);
      const lines = s.exercises.filter(e => e.sets.some(x => x.done)).map(e => {
        const txt = e.sets.filter(x => x.done).map(x => e.mode === 'time' ? `${x.w ? U.fmtNum(x.w) + '×' : ''}${x.t}s` : `${x.w ? U.fmtNum(x.w) + '×' : ''}${x.r}`).join(' · ');
        return `<div class="ln"><b style="color:var(--ink)">${U.esc(e.name)}</b>: ${U.esc(txt)}</div>`;
      }).join('');
      const conf = ui.confirm === 'del:' + s.id;
      return `<div class="entry"><div class="row between"><b>${U.esc(s.workoutName)}</b><span class="chip red">Academia</span></div>
        <div class="ln">${U.minutes(s.durationSec || 0)} - ${st.done} séries${st.volume ? ` - ${Math.round(st.volume).toLocaleString('pt-BR')} kg de volume` : ''}${s.kcal ? ` - ${U.fmtNum(s.kcal)} kcal` : ''}</div>
        ${s.notes ? `<div class="ln">Nota: ${U.esc(s.notes)}</div>` : ''}${lines}
        <button class="btn quiet small ${conf ? 'danger' : ''}" data-act="del" data-id="${s.id}">${conf ? 'Toque de novo para excluir' : 'Excluir'}</button></div>`;
    }),
    ...dayActs.map(a => {
      const conf = ui.confirm === 'del:' + a.id;
      return `<div class="entry"><div class="row between"><b>${U.esc(a.type)}</b><span class="chip">Atividade</span></div>
        <div class="ln">${a.minutes ? a.minutes + ' min' : 'Sem duração'}${a.kcal ? ` - ${U.fmtNum(a.kcal)} kcal` : ''}</div>${a.notes ? `<div class="ln">${U.esc(a.notes)}</div>` : ''}
        <button class="btn quiet small ${conf ? 'danger' : ''}" data-act="del" data-id="${a.id}">${conf ? 'Toque de novo para excluir' : 'Excluir'}</button></div>`;
    })
  ];

  return `<div class="shell stack-lg">${topbar()}
    <div class="row between"><h1 class="h-display h2" style="text-transform:capitalize">${U.MONTHS[cm.getMonth()]} ${cm.getFullYear()}</h1>
      <span class="row" style="gap:4px"><button class="x" data-act="month" data-d="-1" aria-label="Mês anterior">${IC.prev}</button><button class="x" data-act="month" data-d="1" aria-label="Próximo mês">${IC.next}</button></span></div>
    <div class="card stack"><div class="cal">${cells}</div>
      <div class="row small muted"><span class="row" style="gap:6px"><i style="width:8px;height:8px;border-radius:50%;background:var(--accent)"></i>Academia</span><span class="row" style="gap:6px"><i style="width:8px;height:8px;border-radius:50%;background:var(--muted)"></i>Outras atividades</span></div></div>
    <div class="stats"><div class="stat"><b>${ms.length}</b><span class="muted small">treinos</span></div><div class="stat"><b>${trained}</b><span class="muted small">dias ativos</span></div><div class="stat"><b>${U.minutes(totalSec)}</b><span class="muted small">de movimento</span></div></div>
    <section class="card stack"><div class="row between"><h2 class="h-display h3">${U.DOW_LONG[selD.getDay()]}, ${selD.getDate()} de ${U.MONTHS[selD.getMonth()]}</h2></div>
      ${entries.length ? entries.join('') : '<p class="muted">Nada registrado neste dia.</p>'}
      <button class="btn block" data-act="add-activity" data-type="">Registrar outra atividade</button></section>
  </div>`;
}

function exerciseHistory() {
  const map = {};
  doneSessions().forEach(s => s.exercises.forEach(e => {
    const sets = e.sets.filter(x => x.done);
    if (!sets.length) return;
    (map[e.ex] = map[e.ex] || { name: e.name, mode: e.mode, list: [] }).list.push({ date: s.date, startedAt: s.startedAt, sets });
  }));
  return map;
}

function vEvolucao() {
  const hist = exerciseHistory();
  const keys = Object.keys(hist);
  const sess = doneSessions();
  const now = new Date();
  const wk0 = U.monday(now);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const a = U.addDays(wk0, (i - 7) * 7);
    const b = U.addDays(a, 7);
    const v = sess.filter(s => { const d = U.fromKey(s.date); return d >= a && d < b; }).length;
    return { label: `${a.getDate()}/${a.getMonth() + 1}`, v, hi: i === 7 };
  });
  const bars = `<section class="card stack"><h2 class="h-display h3">Treinos por semana</h2>${barChart(weeks, { label: 'Treinos por semana nas últimas 8 semanas' })}<p class="muted small">Últimas 8 semanas, começando na segunda.</p></section>`;
  if (!keys.length) {
    return `<div class="shell stack-lg">${topbar()}${bars}<div class="card stack"><h2 class="h-display h3">Evolução por exercício</h2><p class="muted">Conclua seu primeiro treino para ver a carga e o volume de cada exercício aqui.</p></div></div>`;
  }
  keys.sort((a, b) => hist[a].name.localeCompare(hist[b].name, 'pt-BR'));
  if (!ui.evEx || !hist[ui.evEx]) {
    ui.evEx = keys.slice().sort((a, b) => (hist[b].list.slice(-1)[0].startedAt < hist[a].list.slice(-1)[0].startedAt ? -1 : 1))[0];
  }
  const h = hist[ui.evEx];
  const metrics = [];
  const hasW = h.list.some(x => x.sets.some(s => s.w));
  if (h.mode === 'time') metrics.push(['tempo', 'Tempo']);
  else { if (hasW) { metrics.push(['carga', 'Carga']); metrics.push(['volume', 'Volume']); } metrics.push(['reps', 'Repetições']); }
  if (!metrics.find(m => m[0] === ui.evMetric)) ui.evMetric = metrics[0][0];
  const val = x => {
    if (ui.evMetric === 'carga') return Math.max(...x.sets.map(s => s.w || 0));
    if (ui.evMetric === 'volume') return x.sets.reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0);
    if (ui.evMetric === 'tempo') return Math.max(...x.sets.map(s => s.t || 0));
    return Math.max(...x.sets.map(s => s.r || 0));
  };
  const unit = { carga: ' kg', volume: ' kg', tempo: ' s', reps: '' }[ui.evMetric];
  const pts = h.list.map(x => { const d = U.fromKey(x.date); return { label: `${d.getDate()}/${d.getMonth() + 1}`, y: val(x) }; });
  const first = pts[0].y, lastV = pts[pts.length - 1].y, best = Math.max(...pts.map(p => p.y));
  const diff = pts.length > 1 && first ? Math.round((lastV - first) / first * 100) : null;
  const recent = h.list.slice(-5).reverse();

  return `<div class="shell stack-lg">${topbar()}
    <section class="card stack"><h2 class="h-display h3">Evolução por exercício</h2>
      <label class="field"><span>Exercício</span><select class="in" data-chg="evex">${keys.map(k => `<option value="${U.esc(k)}" ${k === ui.evEx ? 'selected' : ''}>${U.esc(hist[k].name)}</option>`).join('')}</select></label>
      <div class="seg" role="group" aria-label="Métrica">${metrics.map(m => `<button data-act="ev-metric" data-m="${m[0]}" aria-pressed="${m[0] === ui.evMetric}">${m[1]}</button>`).join('')}</div>
      ${lineChart(pts, { fmtY: v => U.fmtNum(v), label: 'Evolução de ' + h.name })}
      <div class="stats"><div class="stat"><b class="num">${U.fmtNum(lastV)}${unit}</b><span class="muted small">último</span></div><div class="stat"><b class="num">${U.fmtNum(best)}${unit}</b><span class="muted small">melhor</span></div><div class="stat"><b class="num">${diff === null ? '-' : (diff > 0 ? '+' : '') + diff + '%'}</b><span class="muted small">desde o início</span></div></div>
    </section>
    <section class="card stack"><h2 class="h-display h3">Últimos treinos</h2><div>${recent.map(x => {
      const d = U.fromKey(x.date);
      return `<div class="entry"><b>${U.shortDate(d)}</b><div class="ln">${U.esc(x.sets.map(s => h.mode === 'time' ? `${s.w ? U.fmtNum(s.w) + ' kg × ' : ''}${s.t} s` : `${s.w ? U.fmtNum(s.w) + ' kg × ' : ''}${s.r}`).join(' · '))}</div></div>`;
    }).join('')}</div></section>
    ${bars}
  </div>`;
}

function schedOptions(p, cur) {
  const opts = [['', 'Dia livre']];
  p.workouts.forEach(w => opts.push(['w:' + w.id, w.name + ' (academia)']));
  const acts = ACTIVITY_TYPES.slice();
  if (cur && cur.a && !acts.includes(cur.a)) acts.push(cur.a);
  acts.forEach(a => opts.push(['a:' + a, a]));
  return opts;
}

function vMais() {
  const p = program();
  const st = supa.status();
  const sset = settings();
  const days = [1, 2, 3, 4, 5, 6, 0];
  const conf = k => ui.confirm === k;
  return `<div class="shell stack-lg">${topbar()}
    <section class="card stack"><h2 class="h-display h3">Conta e sincronização</h2>
      ${supa.configured()
        ? `<p class="muted">Conectado como <b style="color:var(--ink)">${U.esc(supa.email() || '-')}</b>. Estado: ${U.esc(syncLabel(st))}${st.last ? ` (última: ${U.pad(st.last.getHours())}:${U.pad(st.last.getMinutes())})` : ''}.</p>
           ${st.s === 'error' ? `<p class="err">${U.esc(st.error)}</p>` : ''}
           <div class="row"><button class="btn grow" data-act="sync-now">Sincronizar agora</button><button class="btn grow ${conf('logout') ? 'danger' : ''}" data-act="logout">${conf('logout') ? 'Toque de novo para sair' : 'Sair'}</button></div>`
        : `<p class="note">Modo local: seus dados ficam só neste aparelho. Para sincronizar e ter backup na nuvem, preencha o arquivo config.js (passo a passo no LEIA-ME).</p>`}
    </section>

    <section class="card stack"><h2 class="h-display h3">Agenda da semana</h2>
      <p class="muted small">Escolha o que fazer em cada dia. As mudanças valem para as próximas semanas.</p>
      ${days.map(d => {
        const cur = p.schedule[String(d)];
        const v = cur ? (cur.w ? 'w:' + cur.w : 'a:' + cur.a) : '';
        return `<label class="field"><span>${U.DOW_LONG[d]}</span><select class="in" data-chg="sched" data-d="${d}">${schedOptions(p, cur).map(([val, lab]) => `<option value="${U.esc(val)}" ${val === v ? 'selected' : ''}>${U.esc(lab)}</option>`).join('')}</select></label>`;
      }).join('')}
    </section>

    <section class="card stack"><h2 class="h-display h3">Relatório do período</h2>
      <p class="muted small">Gera um texto com seus treinos, cargas e atividades. Cole na conversa com o Claude para montar o próximo programa.</p>
      <div class="seg" role="group" aria-label="Período">${[14, 30, 60, 90].map(n => `<button data-act="rep-days" data-n="${n}" aria-pressed="${ui.reportDays === n}">${n} dias</button>`).join('')}</div>
      <button class="btn primary block" data-act="make-report">Gerar e copiar relatório</button>
      ${ui.reportText ? `<textarea class="in ro" id="rep-text" readonly aria-label="Relatório gerado">${U.esc(ui.reportText)}</textarea>` : ''}
    </section>

    <section class="card stack"><h2 class="h-display h3">Programa de treino</h2>
      <p class="muted small">Programa atual: <b style="color:var(--ink)">${U.esc(p.name)}</b>. Para trocar de fase, copie o programa, mande para o Claude com o relatório e cole aqui o novo.</p>
      <button class="btn block" data-act="copy-program">Copiar programa atual (JSON)</button>
      <label class="field"><span>Colar programa novo</span><textarea class="in" id="prog-in" placeholder='{ "name": "Fase 2 ...", "workouts": [...], "exercises": {...} }' spellcheck="false"></textarea></label>
      <button class="btn block" data-act="import-program">Validar e importar</button>
      ${ui.importMsg ? `<p class="${ui.importOk ? 'note' : 'err'}" role="status" style="white-space:pre-line">${U.esc(ui.importMsg)}</p>` : ''}
    </section>

    <section class="card stack"><h2 class="h-display h3">Preferências</h2>
      <label class="field"><span>Descanso padrão entre séries (segundos)</span><input class="in" id="set-rest" inputmode="numeric" value="${sset.rest}" data-chg="rest"></label>
      <label class="field"><span>Aviso sonoro ao fim do descanso</span><select class="in" data-chg="sound"><option value="1" ${sset.sound ? 'selected' : ''}>Ligado</option><option value="0" ${!sset.sound ? 'selected' : ''}>Desligado</option></select></label>
      <label class="field"><span>Tema</span><select class="in" data-chg="theme"><option value="auto" ${sset.theme === 'auto' ? 'selected' : ''}>Automático</option><option value="light" ${sset.theme === 'light' ? 'selected' : ''}>Claro</option><option value="dark" ${sset.theme === 'dark' ? 'selected' : ''}>Escuro</option></select></label>
    </section>

    <section class="card stack"><h2 class="h-display h3">Backup</h2>
      <p class="muted small">Baixa um arquivo com todos os seus registros. Restaurar substitui os dados atuais pelos do arquivo.</p>
      <button class="btn block" data-act="backup">Baixar backup</button>
      <label class="btn block" style="cursor:pointer">Restaurar de um arquivo<input type="file" accept="application/json,.json" data-chg="restore" hidden></label>
    </section>

    <p class="muted small" style="text-align:center">PACO versão ${APP_VERSION}</p>
  </div>`;
}

/* ---------- gavetas ---------- */
function sheetHTML() {
  const sh = ui.sheet;
  if (!sh) return '';
  const p = program();
  if (sh.type === 'video') {
    const lib = (p.exercises || {})[sh.ex] || { name: sh.ex, cues: [] };
    const vid = U.youtubeId(lib.video);
    return `<div class="sheet-head"><h3>${U.esc(lib.name)}</h3><button class="x" data-act="close" aria-label="Fechar">${IC.close}</button></div>
      ${vid ? (navigator.onLine
        ? `<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${vid}?playsinline=1&rel=0&modestbranding=1" title="Vídeo de ${U.esc(lib.name)}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
        : `<div class="vid-off">Sem conexão. Use as dicas abaixo.</div>`) : `<div class="vid-off">Nenhum vídeo cadastrado para este exercício.</div>`}
      <div class="stack" style="margin-top:12px">
        ${vid ? `<a class="btn" target="_blank" rel="noopener" href="https://youtu.be/${vid}">Abrir no YouTube</a>` : ''}
        ${(lib.cues || []).length ? `<div class="card"><b>Como executar</b><ul class="bullets">${lib.cues.map(c => `<li>${U.esc(c)}</li>`).join('')}</ul></div>` : ''}
        ${lib.warn ? `<p class="note"><b>Atenção:</b> ${U.esc(lib.warn)}</p>` : ''}
        <details><summary>Trocar vídeo deste exercício</summary><div class="stack"><label class="field"><span>Link do YouTube</span><input class="in" id="vurl" inputmode="url" autocapitalize="none" placeholder="https://www.youtube.com/shorts/..."></label>
          <div class="row"><button class="btn grow" data-act="save-video" data-x="${U.esc(sh.ex)}">Salvar vídeo</button><button class="btn grow" data-act="remove-video" data-x="${U.esc(sh.ex)}">Remover vídeo</button></div></div></details>
      </div>`;
  }
  if (sh.type === 'finish') {
    const s = activeSession();
    if (!s) return '';
    const st = sessionStats(s);
    const dur = effectiveDuration(s);
    const conf = ui.confirm === 'discard';
    return `<div class="sheet-head"><h3>Finalizar treino</h3><button class="x" data-act="close" aria-label="Fechar">${IC.close}</button></div>
      <div class="stats" style="margin-bottom:14px"><div class="stat"><b>${U.minutes(dur)}</b><span class="muted small">duração</span></div><div class="stat"><b>${st.done}/${st.total}</b><span class="muted small">séries</span></div><div class="stat"><b>${Math.round(st.volume).toLocaleString('pt-BR')}</b><span class="muted small">kg de volume</span></div></div>
      <div class="stack">
        ${st.done === 0 ? '<p class="note">Nenhuma série foi marcada. Você pode voltar e marcar, ou descartar este treino.</p>' : ''}
        <label class="field"><span>Duração (min)</span><input class="in" id="fin-min" inputmode="numeric" value="${Math.max(1, Math.round(dur / 60))}"></label>
        <label class="field"><span>Calorias do relógio (opcional)</span><input class="in" id="fin-kcal" inputmode="numeric" placeholder="kcal"></label>
        <label class="field"><span>Nota (opcional)</span><input class="in" id="fin-notes" placeholder="Como foi o treino?"></label>
        <button class="btn primary block" data-act="finish-save" ${st.done === 0 ? 'disabled' : ''}>Salvar treino</button>
        <button class="btn quiet block ${conf ? 'danger' : ''}" data-act="discard">${conf ? 'Toque de novo para descartar' : 'Descartar treino'}</button>
      </div>`;
  }
  if (sh.type === 'activity') {
    const types = ACTIVITY_TYPES.slice();
    const sel = sh.pre && types.includes(sh.pre) ? sh.pre : (sh.pre ? 'Outro' : 'Pilates');
    return `<div class="sheet-head"><h3>Registrar atividade</h3><button class="x" data-act="close" aria-label="Fechar">${IC.close}</button></div>
      <div class="stack">
        <label class="field"><span>Atividade</span><select class="in" id="ac-type">${types.map(t => `<option ${t === sel ? 'selected' : ''}>${U.esc(t)}</option>`).join('')}</select></label>
        <label class="field"><span>Data</span><input class="in" id="ac-date" type="date" value="${U.esc(sh.date)}"></label>
        <div class="row"><label class="field grow"><span>Duração (min)</span><input class="in" id="ac-min" inputmode="numeric" placeholder="50"></label><label class="field grow"><span>Calorias (opcional)</span><input class="in" id="ac-kcal" inputmode="numeric" placeholder="kcal"></label></div>
        <label class="field"><span>Nota (opcional)</span><input class="in" id="ac-notes" placeholder="Como foi?"></label>
        <button class="btn primary block" data-act="save-activity">Salvar atividade</button>
      </div>`;
  }
  return '';
}

function renderSheet(force) {
  const key = ui.sheet ? JSON.stringify(ui.sheet) : '';
  if (!force && key === rt.sheetKey) return;
  rt.sheetKey = key;
  if (!ui.sheet) { $sheet.innerHTML = ''; return; }
  const html = sheetHTML();
  $sheet.innerHTML = html ? `<div class="backdrop" data-act="backdrop"><div class="sheet" role="dialog" aria-modal="true"><div class="grip"></div>${html}</div></div>` : '';
}

function openSheet(sh) { ui.sheet = sh; ui.confirm = null; renderSheet(true); }
function closeSheet() { ui.sheet = null; ui.confirm = null; renderSheet(true); }

/* ---------- relatório ---------- */
function buildReport(days) {
  const p = program();
  const end = new Date();
  const start = U.addDays(end, -days + 1);
  const sk = U.dkey(start);
  const sess = doneSessions().filter(s => s.date >= sk);
  const acts = activities().filter(a => a.date >= sk).sort((a, b) => (a.date < b.date ? -1 : 1));
  let planned = 0;
  for (let i = 0; i < days; i++) {
    const pl = p.schedule[String(U.addDays(start, i).getDay())];
    if (pl && pl.w) planned++;
  }
  const totalSec = sess.reduce((a, s) => a + (s.durationSec || 0), 0);
  const sched = [1, 2, 3, 4, 5, 6, 0].map(d => {
    const pl = p.schedule[String(d)];
    const w = pl && pl.w ? p.workouts.find(x => x.id === pl.w) : null;
    return `${U.DOW[d]}: ${w ? w.name : (pl && pl.a ? pl.a : 'livre')}`;
  }).join(' | ');
  const L = [];
  L.push('# Relatório de treino - PACO');
  L.push(`Período: ${U.brDate(sk)} a ${U.brDate(U.dkey(end))} (${days} dias)`);
  L.push(`Programa atual: ${p.name}`);
  L.push(`Agenda: ${sched}`);
  L.push('');
  L.push('## Resumo');
  L.push(`- Treinos de academia feitos: ${sess.length} (planejados no período: ${planned})`);
  L.push(`- Tempo total em treinos de academia: ${U.minutes(totalSec)}`);
  const kc = sess.reduce((a, s) => a + (s.kcal || 0), 0) + acts.reduce((a, x) => a + (x.kcal || 0), 0);
  if (kc) L.push(`- Calorias informadas (relógio): ${Math.round(kc)} kcal`);
  L.push(`- Atividades fora da academia: ${acts.length}`);
  L.push('');
  L.push('## Treinos de academia');
  if (!sess.length) L.push('Nenhum treino registrado no período.');
  sess.forEach(s => {
    L.push(`### ${U.brDate(s.date)} - ${s.workoutName} (${U.minutes(s.durationSec || 0)}${s.kcal ? `, ${U.fmtNum(s.kcal)} kcal` : ''})`);
    s.exercises.forEach(e => {
      const sets = e.sets.filter(x => x.done);
      if (!sets.length) return;
      const txt = sets.map(x => e.mode === 'time' ? `${x.w ? U.fmtNum(x.w) + ' kg, ' : ''}${x.t} s` : `${x.w ? U.fmtNum(x.w) + ' kg x ' : 'peso do corpo x '}${x.r}`).join('; ');
      L.push(`- ${e.name}${e.side ? ' (por lado)' : ''}: ${txt}`);
    });
    if (s.notes) L.push(`- Nota: ${s.notes}`);
  });
  L.push('');
  L.push('## Evolução por exercício (maior carga: primeiro treino -> último)');
  const hist = {};
  sess.forEach(s => s.exercises.forEach(e => {
    const w = Math.max(0, ...e.sets.filter(x => x.done).map(x => x.w || 0));
    (hist[e.name] = hist[e.name] || []).push(w);
  }));
  const names = Object.keys(hist);
  if (!names.length) L.push('Sem dados.');
  names.forEach(n => {
    const a = hist[n];
    L.push(a[0] || a[a.length - 1] ? `- ${n}: ${U.fmtNum(a[0])} kg -> ${U.fmtNum(a[a.length - 1])} kg (${a.length} treino${a.length > 1 ? 's' : ''})` : `- ${n}: sem carga registrada (${a.length} treino${a.length > 1 ? 's' : ''})`);
  });
  L.push('');
  L.push('## Atividades fora da academia');
  if (!acts.length) L.push('Nenhuma.');
  acts.forEach(a => L.push(`- ${U.brDate(a.date)} ${a.type}${a.minutes ? `, ${a.minutes} min` : ''}${a.kcal ? `, ${U.fmtNum(a.kcal)} kcal` : ''}${a.notes ? ` - ${a.notes}` : ''}`));
  L.push('');
  L.push('## Observações');
  L.push('- Peso corporal e alimentação ainda não são registrados nesta versão do app.');
  return L.join('\n');
}

/* ---------- renderização ---------- */
function render() {
  const y = window.scrollY;
  document.body.classList.toggle('in-workout', ui.view === 'treino');
  if (supa.configured() && !supa.isSignedIn()) {
    $app.innerHTML = vLogin();
    renderSheet(true);
    return;
  }
  if (!program()) { $app.innerHTML = vWait(); renderSheet(true); return; }
  if (ui.view === 'treino' && !activeSession()) ui.view = 'hoje';
  const views = { hoje: vHoje, historico: vHistorico, evolucao: vEvolucao, mais: vMais, treino: vTreino, previa: vPrevia };
  const body = (views[ui.view] || vHoje)();
  $app.innerHTML = body + (ui.view === 'treino' ? '' : tabbar());
  paintRest();
  if (ui.view === 'treino') acquireWake(); else releaseWake();
  renderSheet(false);
  window.scrollTo(0, y);
}

function paintSync() {
  const el = document.getElementById('syncpill');
  const st = supa.status();
  if (el) {
    el.textContent = syncLabel(st);
    el.classList.toggle('warn', supa.configured() && (st.s === 'offline' || st.s === 'error' || st.s === 'signedout'));
  }
  const w = document.getElementById('wait-status');
  if (w) w.textContent = syncLabel(st);
  if (supa.configured() && st.s === 'idle' && !store.getMeta('synced1')) {
    store.setMeta('synced1', true);
    ensureProgram();
    applyTheme();
    render();
  }
}

/* ---------- eventos ---------- */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const a = t.dataset.act;
  const d = t.dataset;
  switch (a) {
    case 'tab': go(d.v); break;
    case 'backdrop': if (ev.target === t) closeSheet(); break;
    case 'close': closeSheet(); break;
    case 'start': startSession(d.w); break;
    case 'resume': go('treino'); break;
    case 'preview': ui.previewW = d.w; ui.view = 'previa'; render(); window.scrollTo(0, 0); break;
    case 'back': go('hoje'); break;
    case 'warm': ui.warmOpen = !ui.warmOpen; render(); break;
    case 'set': toggleSet(+d.ex, +d.i); break;
    case 'timer': toggleSetTimer(+d.ex, +d.i); break;
    case 'add-set': {
      const s = activeSession(); const e = s.exercises[+d.ex]; const l = e.sets[e.sets.length - 1];
      e.sets.push({ w: l ? l.w : null, r: l ? l.r : null, t: l ? l.t : null, done: false });
      saveSession(s); render(); break;
    }
    case 'rm-set': {
      const s = activeSession(); const e = s.exercises[+d.ex];
      if (e.sets.length > 1) { e.sets.pop(); saveSession(s); render(); }
      break;
    }
    case 'video': openSheet({ type: 'video', ex: d.x }); break;
    case 'save-video': {
      const id = U.youtubeId(document.getElementById('vurl').value);
      if (!id) { toast('Link do YouTube não reconhecido'); break; }
      const p = program(); p.exercises[d.x].video = id; saveProgram(p);
      renderSheet(true); toast('Vídeo atualizado'); break;
    }
    case 'remove-video': {
      const p = program(); p.exercises[d.x].video = ''; saveProgram(p);
      renderSheet(true); toast('Vídeo removido'); break;
    }
    case 'rest-add': if (rt.restEnd) { rt.restEnd += (+d.d) * 1000; rt.restTotal = Math.max(rt.restTotal, Math.ceil((rt.restEnd - Date.now()) / 1000)); rt.restDone = false; paintRest(); } break;
    case 'rest-stop': stopRest(); break;
    case 'finish': openSheet({ type: 'finish' }); break;
    case 'finish-save': finishSession(); break;
    case 'discard':
      if (ui.confirm === 'discard') discardSession(); else { ui.confirm = 'discard'; renderSheet(true); }
      break;
    case 'goday': {
      ui.selDay = d.k;
      const dd = U.fromKey(d.k);
      ui.calMonth = new Date(dd.getFullYear(), dd.getMonth(), 1);
      go('historico'); break;
    }
    case 'month': ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + (+d.d), 1); render(); break;
    case 'add-activity': openSheet({ type: 'activity', pre: d.type || '', date: ui.view === 'historico' ? ui.selDay : U.dkey() }); break;
    case 'save-activity': {
      const rec = {
        id: U.uid(), type: document.getElementById('ac-type').value, date: document.getElementById('ac-date').value || U.dkey(),
        minutes: U.num(document.getElementById('ac-min').value), kcal: U.num(document.getElementById('ac-kcal').value),
        notes: document.getElementById('ac-notes').value.trim()
      };
      store.save('activity', rec.id, rec); supa.scheduleSync(1500);
      ui.selDay = rec.date; const dd = U.fromKey(rec.date); ui.calMonth = new Date(dd.getFullYear(), dd.getMonth(), 1);
      closeSheet(); go('historico'); toast('Atividade salva'); break;
    }
    case 'del':
      if (ui.confirm === 'del:' + d.id) { store.remove(d.id); supa.scheduleSync(1500); ui.confirm = null; render(); toast('Excluído'); }
      else { ui.confirm = 'del:' + d.id; render(); }
      break;
    case 'ev-metric': ui.evMetric = d.m; render(); break;
    case 'rep-days': ui.reportDays = +d.n; ui.reportText = ''; render(); break;
    case 'make-report': {
      ui.reportText = buildReport(ui.reportDays);
      render();
      const ok = await U.copyText(ui.reportText);
      toast(ok ? 'Relatório copiado' : 'Selecione o texto e copie');
      break;
    }
    case 'copy-program': { const ok = await U.copyText(JSON.stringify(program(), null, 2)); toast(ok ? 'Programa copiado' : 'Não foi possível copiar'); break; }
    case 'import-program': {
      const raw = document.getElementById('prog-in').value.trim();
      let obj = null;
      try { obj = JSON.parse(raw); } catch (e) { ui.importOk = false; ui.importMsg = 'O texto colado não é um JSON válido. Confira se copiou tudo, do primeiro { ao último }.'; render(); break; }
      const v = validateProgram(obj);
      if (!v.ok) { ui.importOk = false; ui.importMsg = 'Não foi possível importar:\n- ' + v.errors.slice(0, 8).join('\n- '); render(); break; }
      if (!obj.schedule) obj.schedule = program().schedule;
      saveProgram(obj);
      ui.importOk = true; ui.importMsg = `Programa "${obj.name}" importado. Seu histórico foi mantido.`; render(); toast('Programa importado'); break;
    }
    case 'backup': {
      const data = { app: 'paco', version: 1, exportedAt: new Date().toISOString(), records: store.exportAll() };
      U.download(`paco-backup-${U.dkey()}.json`, JSON.stringify(data));
      toast('Backup gerado'); break;
    }
    case 'sync-now': supa.sync(); break;
    case 'logout':
      if (ui.confirm === 'logout') { supa.logout(); ui.confirm = null; render(); }
      else { ui.confirm = 'logout'; render(); }
      break;
    default: break;
  }
});

document.addEventListener('input', ev => {
  const t = ev.target;
  if (!t.dataset || !t.dataset.f) return;
  const s = activeSession();
  if (!s) return;
  const st = s.exercises[+t.dataset.ex].sets[+t.dataset.i];
  st[t.dataset.f] = U.num(t.value);
  persistSoon(s);
});

document.addEventListener('change', async ev => {
  const t = ev.target;
  const c = t.dataset && t.dataset.chg;
  if (!c) return;
  if (c === 'evex') { ui.evEx = t.value; ui.evMetric = null; render(); }
  else if (c === 'sched') {
    const p = program(); const d = t.dataset.d; const v = t.value;
    if (!v) p.schedule[d] = null;
    else if (v.startsWith('w:')) p.schedule[d] = { w: v.slice(2) };
    else { const name = v.slice(2); const prev = p.schedule[d]; p.schedule[d] = { a: name, note: (prev && prev.a === name && prev.note) || ACTIVITY_NOTES[name] || '' }; }
    saveProgram(p); toast('Agenda atualizada');
  } else if (c === 'rest') { const n = Math.max(10, Math.min(600, parseInt(t.value, 10) || 60)); saveSettings({ rest: n }); t.value = n; }
  else if (c === 'sound') saveSettings({ sound: t.value === '1' });
  else if (c === 'theme') { saveSettings({ theme: t.value }); applyTheme(); }
  else if (c === 'restore') {
    const f = t.files && t.files[0];
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!j || j.app !== 'paco' || !Array.isArray(j.records)) throw new Error('arquivo');
      j.records.forEach(r => { if (r && r.id && r.kind && r.data) store.save(r.kind, r.id, r.data); });
      supa.scheduleSync(500); applyTheme(); render(); toast('Backup restaurado');
    } catch (e) { toast('Arquivo de backup inválido'); }
    t.value = '';
  }
});

document.addEventListener('submit', async ev => {
  const f = ev.target.closest('form[data-form]');
  if (!f) return;
  ev.preventDefault();
  if (f.dataset.form === 'login') {
    const mail = document.getElementById('lg-email').value.trim();
    const pass = document.getElementById('lg-pass').value;
    ui.loginMail = mail;
    ui.busy = true; ui.loginErr = ''; render();
    try {
      await supa.login(mail, pass);
      ui.busy = false;
      render();
      supa.sync();
    } catch (e) {
      ui.busy = false;
      ui.loginErr = (e instanceof TypeError || !navigator.onLine) ? 'Sem conexão. O primeiro login precisa de internet.' : e.message;
      render();
    }
  }
});

document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && ui.sheet) closeSheet(); });

/* ---------- inicialização ---------- */
async function main() {
  await store.init();
  applyTheme();
  const h = location.hash.slice(1);
  if (['hoje', 'historico', 'evolucao', 'mais'].includes(h)) ui.view = h;
  supa.onStatus(paintSync);
  store.on(() => { if (!isTyping() && !ui.sheet && ui.view !== 'treino') render(); });
  if (!supa.configured()) ensureProgram();
  render();
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      supa.scheduleSync(300);
      if (ui.view === 'treino') acquireWake();
    }
  });
  window.addEventListener('online', () => supa.scheduleSync(300));
  if (supa.configured() && supa.isSignedIn()) supa.scheduleSync(150);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

main();
