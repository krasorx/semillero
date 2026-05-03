/** @odoo-module */
import { Component, useState, onMounted, xml } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";
import { PesajeAPI } from "./services/pesaje_api";
import { PinLoginScreen } from "./screens/PinLoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { PesajeScreen } from "./screens/PesajeScreen";
import { OfflineBanner } from "./components/OfflineBanner";

export class PosApp extends Component {
    static template = xml`
        <t t-if="state.screen === 'login'">
            <PinLoginScreen
                employees="state.masters ? state.masters.employees : []"
                api="api"
                onLogin="(emp) => this.onLogin(emp)"/>
        </t>
        <t t-if="state.screen === 'dashboard'">
            <DashboardScreen
                api="api"
                isOnline="state.isOnline"
                syncPending="state.syncPending"
                onGoToPesaje="() => { state.screen = 'pesaje'; }"
                onLogout="() => this.onLogout()"/>
        </t>
        <t t-if="state.screen === 'pesaje'">
            <PesajeScreen
                api="api"
                masters="state.masters"
                employee="state.employee"
                isOnline="state.isOnline"
                syncPending="state.syncPending"
                onToDashboard="() => { state.screen = 'dashboard'; }"
                onLogout="() => this.onLogout()"/>
        </t>
    `;
    static components = { PinLoginScreen, DashboardScreen, PesajeScreen, OfflineBanner };
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
        this.state.screen = 'pesaje';
        await this._loadMasters();
    }

    onLogout() {
        this.state.employee = null;
        this.state.screen = 'login';
    }
}
