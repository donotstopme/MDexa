/** Datos que viven sólo en este equipo (qué has visto, respaldos). En Electron serán archivos o SQLite. */
export interface Local {
  get<T>(clave: string): Promise<T | null>;
  set(clave: string, valor: unknown): Promise<void>;
}

export const localEnMemoria = (): Local => {
  const m = new Map<string, unknown>();
  return { get: async <T,>(k: string) => (m.has(k) ? structuredClone(m.get(k)) as T : null), set: async (k, v) => { m.set(k, structuredClone(v)); } };
};

/** IndexedDB (los respaldos incluyen el texto completo del archivo, demasiado para localStorage) */
export function localWeb(): Local {
  const abrir = () => new Promise<IDBDatabase>((ok, mal) => {
    const r = indexedDB.open('gestor-proyectos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
  const tx = async <T,>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => {
    const db = await abrir();
    return new Promise<T>((ok, mal) => {
      const r = f(db.transaction('kv', modo).objectStore('kv'));
      r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
    }).finally(() => db.close());
  };
  return {
    get: async <T,>(k: string) => { try { return ((await tx('readonly', s => s.get(k))) as T) ?? null; } catch { return null; } },
    set: async (k, v) => { try { await tx('readwrite', s => s.put(v, k)); } catch { /* sin almacenamiento local */ } },
  };
}
