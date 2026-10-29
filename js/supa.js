// Cliente mínimo do Supabase (login por e-mail/senha + tabela "records") sem bibliotecas externas.
import * as store from './store.js';

class AuthError extends Error {}

const LS = 'paco.auth';
let auth = null;
try { auth = JSON.parse(localStorage.getItem(LS)); } catch (e) { auth = null; }

const cfg = () => window.PACO_CONFIG || {};
export const configured = () => !!(cfg().url && cfg().key);
export const isSignedIn = () => !!(auth && auth.refresh_token);
export const email = () => (auth && auth.email) || '';

const state = { s: 'local', pending: 0, last: null, error: '' };
const subs = new Set();
export const onStatus = fn => subs.add(fn);
export const status = () => ({ ...state });
function set(p) { Object.assign(state, p); subs.forEach(f => f({ ...state })); }
if (configured()) state.s = isSignedIn() ? 'idle' : 'signedout';

function saveAuth() {
  try { auth ? localStorage.setItem(LS, JSON.stringify(auth)) : localStorage.removeItem(LS); } catch (e) { /* ignore */ }
}
const base = () => cfg().url.replace(/\/+$/, '');

async function raw(path, { method = 'GET', headers = {}, body, token } = {}) {
  const h = { apikey: cfg().key, ...headers };
  if (token) h.Authorization = 'Bearer ' + token;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  return fetch(base() + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
}

function setSession(j) {
  auth = {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (j.expires_in || 3600) * 1000,
    user_id: (j.user && j.user.id) || (auth && auth.user_id),
    email: (j.user && j.user.email) || (auth && auth.email)
  };
  saveAuth();
}

export async function login(emailAddr, password) {
  const res = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: emailAddr, password } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = j.error_description || j.msg || j.message || '';
    if (/invalid login/i.test(msg)) throw new Error('E-mail ou senha incorretos.');
    throw new Error(msg || 'Não foi possível entrar. Tente de novo.');
  }
  setSession(j);
  set({ s: 'idle', error: '' });
}

export function logout() {
  auth = null;
  saveAuth();
  set({ s: configured() ? 'signedout' : 'local' });
}

async function refresh() {
  if (!auth || !auth.refresh_token) throw new AuthError();
  const res = await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: auth.refresh_token } });
  if (res.status === 400 || res.status === 401 || res.status === 403) { auth = null; saveAuth(); throw new AuthError(); }
  if (!res.ok) throw new Error('Falha ao renovar o login (' + res.status + ')');
  setSession(await res.json());
}

async function api(path, opts = {}) {
  if (!auth) throw new AuthError();
  if (auth.expires_at - Date.now() < 60000) await refresh();
  let res = await raw(path, { ...opts, token: auth.access_token });
  if (res.status === 401) {
    await refresh();
    res = await raw(path, { ...opts, token: auth.access_token });
  }
  return res;
}

async function errText(res) {
  try { const j = await res.json(); return j.message || j.hint || j.error || ('Erro ' + res.status); } catch (e) { return 'Erro ' + res.status; }
}

async function pull() {
  let cursor = store.getMeta('cursor') || null;
  for (;;) {
    let q = '/rest/v1/records?select=id,kind,data,updated_at,server_ts&order=server_ts.asc&limit=500';
    if (cursor) q += '&server_ts=gt.' + encodeURIComponent(cursor);
    const res = await api(q);
    if (!res.ok) throw new Error(await errText(res));
    const rows = await res.json();
    rows.forEach(r => store.applyRemote(r));
    if (rows.length) { cursor = rows[rows.length - 1].server_ts; store.setMeta('cursor', cursor); }
    if (rows.length < 500) break;
  }
}

async function push() {
  const d = store.dirty();
  for (let i = 0; i < d.length; i += 100) {
    const chunk = d.slice(i, i + 100);
    const body = chunk.map(r => {
      const row = { id: r.id, kind: r.kind, data: r.data, updated_at: r.updated_at };
      if (auth && auth.user_id) row.user_id = auth.user_id;
      return row;
    });
    const res = await api('/rest/v1/records?on_conflict=user_id,id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body
    });
    if (!res.ok) throw new Error(await errText(res));
    store.markClean(chunk);
  }
}

let running = false;
let again = false;
let timer = null;

export async function sync() {
  if (!configured()) { set({ s: 'local' }); return; }
  if (!isSignedIn()) { set({ s: 'signedout' }); return; }
  if (running) { again = true; return; }
  running = true;
  set({ s: 'syncing' });
  try {
    await pull();
    await push();
    set({ s: 'idle', last: new Date(), error: '' });
  } catch (e) {
    if (e instanceof AuthError) set({ s: 'signedout' });
    else if (!navigator.onLine || e instanceof TypeError) set({ s: 'offline' });
    else set({ s: 'error', error: e.message });
  } finally {
    running = false;
    set({ pending: store.dirty().length });
    if (again) { again = false; scheduleSync(500); }
  }
}

export function scheduleSync(ms = 3000) {
  if (!configured() || !isSignedIn()) return;
  clearTimeout(timer);
  timer = setTimeout(sync, ms);
}
