/** @odoo-module */

const DB_NAME = 'pesaje_pos_db';
const DB_VERSION = 1;
const STORES = ['masters', 'pesajes', 'sync_queue'];

let _db = null;

async function getDB() {
    if (_db) return _db;
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            STORES.forEach(name => {
                if (!db.objectStoreNames.contains(name)) {
                    db.createObjectStore(name, { keyPath: 'key' });
                }
            });
        };
        req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
        req.onerror = (e) => reject(e.target.error);
    });
}

async function dbGet(store, key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
    });
}

async function dbSet(store, key, value) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put({ key, value });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

async function dbGetAll(store) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result.map(r => r.value));
        req.onerror = () => reject(req.error);
    });
}

async function dbClear(store) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

export const offlineDB = {
    async saveMasters(data) {
        await dbSet('masters', 'data', data);
        await dbSet('masters', 'timestamp', Date.now());
    },
    async getMasters() {
        return await dbGet('masters', 'data');
    },
    async savePesajes(list) {
        await dbSet('pesajes', 'list', list);
    },
    async getPesajes() {
        return (await dbGet('pesajes', 'list')) || [];
    },
    async updatePesaje(pesaje) {
        const list = await this.getPesajes();
        const idx = list.findIndex(p => p.id === pesaje.id);
        if (idx >= 0) list[idx] = pesaje;
        else list.unshift(pesaje);
        await this.savePesajes(list);
    },
    async enqueueSync(operation) {
        const queue = (await dbGet('sync_queue', 'queue')) || [];
        queue.push({ ...operation, ts: Date.now(), id: Math.random().toString(36).slice(2) });
        await dbSet('sync_queue', 'queue', queue);
    },
    async getQueue() {
        return (await dbGet('sync_queue', 'queue')) || [];
    },
    async shiftQueue() {
        const queue = (await dbGet('sync_queue', 'queue')) || [];
        queue.shift();
        await dbSet('sync_queue', 'queue', queue);
    },
    async clearQueue() {
        await dbSet('sync_queue', 'queue', []);
    },
};
