/** @odoo-module */
import { Component, useState, onMounted, xml } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";
import { PesajeAPI } from "@pesaje_pos_fleet/app/services/pesaje_api";
import { KioskoLoginScreen } from "./screens/KioskoLoginScreen";
import { KioskoWorkScreen } from "./screens/KioskoWorkScreen";
import { KioskoDashboardScreen } from "./screens/KioskoDashboardScreen";

export class KioskoApp extends Component {
    static template = xml`
        <div class="kiosko-root">
            <t t-if="state.screen === 'login'">
                <KioskoLoginScreen
                    employees="state.masters ? state.masters.employees : []"
                    api="api"
                    onLogin="(emp) => this.onLogin(emp)"/>
            </t>
            <t t-if="state.screen === 'work'">
                <KioskoWorkScreen
                    api="api"
                    masters="state.masters"
                    employee="state.employee"
                    isOnline="state.isOnline"
                    syncPending="state.syncPending"
                    onToDashboard="() => { state.screen = 'dashboard'; }"
                    onLogout="() => this.onLogout()"/>
            </t>
            <t t-if="state.screen === 'dashboard'">
                <KioskoDashboardScreen
                    api="api"
                    isOnline="state.isOnline"
                    syncPending="state.syncPending"
                    onBack="() => { state.screen = 'work'; }"
                    onLogout="() => this.onLogout()"/>
            </t>
        </div>
    `;
    static components = { KioskoLoginScreen, KioskoWorkScreen, KioskoDashboardScreen };
    static props = {
        action: { type: Object, optional: true },
        actionId: { optional: true },
        updateActionState: { type: Function, optional: true },
        className: { type: String, optional: true },
    };

    setup() {
        this.api = new PesajeAPI(rpc);
        this.state = useState({
            screen: 'login',
            employee: null,
            masters: null,
            isOnline: navigator.onLine,
            syncPending: 0,
        });

        window.addEventListener('online', () => { this.state.isOnline = true; });
        window.addEventListener('offline', () => { this.state.isOnline = false; });

        onMounted(() => {
            this._loadMasters();
            setInterval(() => this._updateSyncCount(), 10000);
        });
    }

    async _loadMasters() {
        try {
            const masters = await this.api.loadMasters();
            if (masters) this.state.masters = masters;
        } catch (e) {
            console.warn('Could not load masters', e);
        }
    }

    async _updateSyncCount() {
        this.state.syncPending = await this.api.getPendingCount();
    }

    async onLogin(employee) {
        this.state.employee = employee;
        this.state.screen = 'work';
        await this._loadMasters();
    }

    onLogout() {
        this.state.employee = null;
        this.state.screen = 'login';
    }
}
