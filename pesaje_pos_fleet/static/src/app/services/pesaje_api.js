/** @odoo-module */

import { offlineDB } from './offline_db';

export class PesajeAPI {
    constructor(rpcService) {
        this._rpc = rpcService;
        this.isOnline = navigator.onLine;
        this._syncRunning = false;

        window.addEventListener('online', () => {
            this.isOnline = true;
            this._flushQueue();
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    async _call(route, params = {}) {
        const result = await this._rpc(route, params);
        return result;
    }

    async loadMasters() {
        if (!this.isOnline) {
            return await offlineDB.getMasters();
        }
        try {
            const data = await this._call('/pesaje/masters', {});
            await offlineDB.saveMasters(data);
            return data;
        } catch (e) {
            console.warn('loadMasters offline fallback', e);
            return await offlineDB.getMasters();
        }
    }

    async loadPesajes() {
        if (!this.isOnline) {
            return { pesajes: await offlineDB.getPesajes() };
        }
        try {
            const data = await this._call('/pesaje/pesajes', {});
            await offlineDB.savePesajes(data.pesajes || []);
            return data;
        } catch (e) {
            console.warn('loadPesajes offline fallback', e);
            return { pesajes: await offlineDB.getPesajes() };
        }
    }

    async getDashboard() {
        return await this._call('/pesaje/dashboard', {});
    }

    async authEmployee(employeeId, pin) {
        return await this._call('/pesaje/auth', { employee_id: employeeId, pin });
    }

    async createPesaje(vals) {
        if (!this.isOnline) {
            const op = { type: 'create', route: '/pesaje/create', params: vals };
            await offlineDB.enqueueSync(op);
            const tempPesaje = { id: `temp_${Date.now()}`, ...vals, state: 'precargado', name: 'Pendiente sync...' };
            await offlineDB.updatePesaje(tempPesaje);
            return { success: true, pesaje: tempPesaje, offline: true };
        }
        const result = await this._call('/pesaje/create', vals);
        if (result.success) await offlineDB.updatePesaje(result.pesaje);
        return result;
    }

    async updatePesaje(pesajeId, vals) {
        if (!this.isOnline) {
            await offlineDB.enqueueSync({ type: 'update', route: '/pesaje/update', params: { pesaje_id: pesajeId, ...vals } });
            return { success: true, offline: true };
        }
        const result = await this._call('/pesaje/update', { pesaje_id: pesajeId, ...vals });
        if (result.success) await offlineDB.updatePesaje(result.pesaje);
        return result;
    }

    async registerWeight(pesajeId, weight, tipo, employeeId) {
        const params = { pesaje_id: pesajeId, weight, tipo, employee_id: employeeId };
        if (!this.isOnline) {
            await offlineDB.enqueueSync({ type: 'weigh', route: '/pesaje/weigh', params });
            return { success: true, offline: true };
        }
        const result = await this._call('/pesaje/weigh', params);
        if (result.success) await offlineDB.updatePesaje(result.pesaje);
        return result;
    }

    async changeState(pesajeId, action) {
        const params = { pesaje_id: pesajeId, action };
        if (!this.isOnline) {
            await offlineDB.enqueueSync({ type: 'state', route: '/pesaje/state', params });
            return { success: true, offline: true };
        }
        const result = await this._call('/pesaje/state', params);
        if (result.success) await offlineDB.updatePesaje(result.pesaje);
        return result;
    }

    async cancelPesaje(pesajeId, reason) {
        const params = { pesaje_id: pesajeId, reason };
        if (!this.isOnline) {
            await offlineDB.enqueueSync({ type: 'cancel', route: '/pesaje/cancel', params });
            return { success: true, offline: true };
        }
        return await this._call('/pesaje/cancel', params);
    }

    async _flushQueue() {
        if (this._syncRunning) return;
        this._syncRunning = true;
        try {
            let queue = await offlineDB.getQueue();
            while (queue.length > 0) {
                const op = queue[0];
                try {
                    await this._call(op.route, op.params);
                    await offlineDB.shiftQueue();
                    queue = await offlineDB.getQueue();
                } catch (e) {
                    console.error('Sync flush error', e);
                    break;
                }
            }
        } finally {
            this._syncRunning = false;
        }
    }

    async getPendingCount() {
        const q = await offlineDB.getQueue();
        return q.length;
    }
}
