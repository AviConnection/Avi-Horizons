const DATABASE = 'avi-horizons-logbook';
const FALLBACK = 'avi-horizons.logbook.v1';
const STORES = ['runs', 'events'];

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('runs', { keyPath: 'id' });
      const events = db.createObjectStore('events', { keyPath: 'id' });
      events.createIndex('runId', 'runId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Base de datos bloqueada'));
  });
}

function indexedAdapter(db) {
  return {
    mode: 'IndexedDB',
    write(batch, insertOnly) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
        for (const name of STORES) {
          const store = transaction.objectStore(name);
          for (const item of batch[name] ?? []) {
            if (!insertOnly && name === 'events') {
              store.put(item);
              continue;
            }
            const existing = store.get(item.id);
            existing.onsuccess = () => {
              const current = existing.result;
              if (insertOnly && current) return;
              if (name === 'runs' && current?.endedAt && !item.endedAt) return;
              store.put(item);
            };
          }
        }
      });
    },
    read() {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES, 'readonly');
        const runs = transaction.objectStore('runs').getAll();
        const events = transaction.objectStore('events').getAll();
        transaction.oncomplete = () => resolve({ runs: runs.result, events: events.result });
        transaction.onabort = () => reject(transaction.error);
      });
    },
  };
}

function localAdapter(storage) {
  const read = () => JSON.parse(storage.getItem(FALLBACK) || '{"runs":[],"events":[]}');
  return {
    mode: 'Almacenamiento local alternativo',
    write(batch, insertOnly) {
      const data = read();
      for (const name of STORES) {
        const byId = new Map(data[name].map(item => [item.id, item]));
        for (const item of batch[name] ?? []) {
          const current = byId.get(item.id);
          if (insertOnly && current) continue;
          if (name === 'runs' && current?.endedAt && !item.endedAt) continue;
          byId.set(item.id, item);
        }
        data[name] = [...byId.values()];
      }
      storage.setItem(FALLBACK, JSON.stringify(data));
    },
    read,
  };
}

export function createLogbookStore() {
  let writeFailed = false;
  const adapter = openDatabase().then(indexedAdapter, () => localAdapter(globalThis.localStorage));
  let queue = Promise.resolve();

  function write(batch, { insertOnly = false } = {}) {
    queue = queue.then(async () => {
      try {
        await (await adapter).write(batch, insertOnly);
        return true;
      } catch {
        writeFailed = true;
        return false;
      }
    });
    return queue;
  }

  async function snapshot() {
    await queue;
    try {
      const storage = await adapter;
      return { ...await storage.read(), mode: storage.mode, writeFailed };
    } catch {
      return { runs: [], events: [], mode: 'No disponible', writeFailed: true };
    }
  }

  return { write, snapshot };
}
