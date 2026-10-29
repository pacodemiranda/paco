// Armazenamento local (IndexedDB) com cópia em memória.
// Cada registro: { id, kind, data, updated_at, dirty }  (dirty = 1 quando falta enviar ao servidor)
const DB_NAME = 'paco';
const mem = new Map();
const listeners = new Set();
let idb = null;

export async function init() {
  try {
    idb = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('records')) req.result.createObjectStore('records', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const all = await new Promise((resolve, reject) => {
      const r = idb.transaction('records', 'readonly').objectStore('records').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    all.forEach(r => mem.set(r.id, r));
  } catch (e) {
    idb = null; // sem IndexedDB: funciona só em memória nesta sessão
    console.warn('IndexedDB indisponível', e);
  }
}

function persist(rec) {
  if (!idb) return;
  try {
    const t = idb.transaction('records', 'readwrite');
    t.objectStore('records').put(rec);
  } catch (e) { console.warn('persist', e); }
}

export const get = id => mem.get(id);
export const all = kind => [...mem.values()].filter(r => r.kind === kind && !(r.data && r.data._deleted));
export const dirty = () => [...mem.values()].filter(r => r.dirty);

export function save(kind, id, data) {
  const rec = { id, kind, data, updated_at: new Date().toISOString(), dirty: 1 };
  mem.set(id, rec);
  persist(rec);
  return rec;
}
export const remove = id => {
  const cur = mem.get(id);
  if (!cur) return;
  save(cur.kind, id, { _deleted: true });
};

export function applyRemote(r) {
  const local = mem.get(r.id);
  if (local && local.dirty && Date.parse(local.updated_at) > Date.parse(r.updated_at)) return false;
  const rec = { id: r.id, kind: r.kind, data: r.data, updated_at: r.updated_at, dirty: 0 };
  mem.set(r.id, rec);
  persist(rec);
  listeners.forEach(fn => fn(rec));
  return true;
}

export function markClean(list) {
  list.forEach(r => {
    const cur = mem.get(r.id);
    if (cur && cur.updated_at === r.updated_at) { cur.dirty = 0; persist(cur); }
  });
}

export const on = fn => listeners.add(fn);

export function exportAll() {
  return [...mem.values()].filter(r => !(r.data && r.data._deleted)).map(r => ({ id: r.id, kind: r.kind, data: r.data, updated_at: r.updated_at }));
}

// metadados pequenos (cursor de sincronização etc.)
const META = 'paco.meta';
export function getMeta(k) { try { return (JSON.parse(localStorage.getItem(META)) || {})[k]; } catch (e) { return undefined; } }
export function setMeta(k, v) {
  try {
    const m = JSON.parse(localStorage.getItem(META)) || {};
    m[k] = v;
    localStorage.setItem(META, JSON.stringify(m));
  } catch (e) { /* ignore */ }
}
