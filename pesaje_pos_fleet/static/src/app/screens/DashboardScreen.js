/** @odoo-module */
import { Component, useState, onMounted, onWillUnmount, xml } from "@odoo/owl";
import { KpiCard } from "../components/KpiCard";
import { TruckCard } from "../components/TruckCard";
import { OfflineBanner } from "../components/OfflineBanner";
import { SyncIndicator } from "../components/SyncIndicator";

export class DashboardScreen extends Component {
    static template = xml`
        <div class="pos-screen pos-flex-col">
            <OfflineBanner isOnline="props.isOnline"/>
            <div class="pos-header">
                <div class="pos-flex pos-items-center pos-gap-3">
                    <span style="font-size:1.5rem;">&#x2696;&#xFE0F;</span>
                    <span class="pos-text-xl pos-font-bold">Dashboard Planta</span>
                    <span class="pos-text-gray pos-text-sm" t-esc="state.lastUpdate"/>
                </div>
                <div class="pos-flex pos-items-center pos-gap-4">
                    <SyncIndicator pending="props.syncPending"/>
                    <div class="pos-flex pos-gap-2">
                        <button class="pos-btn pos-btn-blue" t-on-click="goToPesaje">
                            &#x2696; Ir a Pesaje
                        </button>
                        <button class="pos-btn pos-btn-gray" t-on-click="props.onLogout">
                            Salir
                        </button>
                    </div>
                </div>
            </div>

            <div class="pos-p-4 pos-flex-col pos-flex-1 pos-overflow-y">
                <!-- KPIs -->
                <div class="pos-grid-4 pos-mb-4" t-if="state.kpis">
                    <KpiCard value="state.kpis.en_camino" label="'En Camino'" color="'var(--yellow-500)'"/>
                    <KpiCard value="state.kpis.fuera_planta" label="'Fuera de Planta'" color="'var(--orange-500)'"/>
                    <KpiCard value="state.kpis.en_planta" label="'En Planta'" color="'var(--blue-500)'"/>
                    <KpiCard value="state.kpis.completados_hoy" label="'Completados Hoy'" color="'var(--green-500)'"/>
                </div>
                <div class="pos-grid-2 pos-mb-4" t-if="state.kpis">
                    <KpiCard value="formatTime(state.kpis.tiempo_promedio)" label="'Tiempo Promedio en Planta'" color="'var(--purple-500)'"/>
                    <div class="pos-kpi-card pos-flex pos-items-center pos-justify-center">
                        <button class="pos-btn pos-btn-green pos-text-lg" t-on-click="refreshNow">
                            &#x21BB; Actualizar
                        </button>
                    </div>
                </div>

                <!-- Columns -->
                <div class="pos-grid-2 pos-flex-1" style="min-height:0;">
                    <div class="pos-flex pos-flex-col" style="overflow:hidden;">
                        <h3 class="pos-text-base pos-font-bold pos-mb-2 pos-text-gray-300">
                            &#x1F17F; Cola Fuera de Planta (<t t-esc="state.fuera.length"/>)
                        </h3>
                        <div class="pos-overflow-y pos-flex-1 pos-flex-col pos-gap-2">
                            <t t-if="state.fuera.length === 0">
                                <div class="pos-text-gray pos-text-center pos-p-4">Sin camiones afuera</div>
                            </t>
                            <t t-foreach="state.fuera" t-as="p" t-key="p.id">
                                <TruckCard pesaje="p" onSelect="() => {}"/>
                            </t>
                        </div>
                    </div>
                    <div class="pos-flex pos-flex-col" style="overflow:hidden;">
                        <h3 class="pos-text-base pos-font-bold pos-mb-2 pos-text-gray-300">
                            &#x1F3ED; En Planta (<t t-esc="state.enPlanta.length"/>)
                        </h3>
                        <div class="pos-overflow-y pos-flex-1 pos-flex-col pos-gap-2">
                            <t t-if="state.enPlanta.length === 0">
                                <div class="pos-text-gray pos-text-center pos-p-4">Sin camiones en planta</div>
                            </t>
                            <t t-foreach="state.enPlanta" t-as="p" t-key="p.id">
                                <TruckCard pesaje="p" onSelect="() => {}"/>
                            </t>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    static components = { KpiCard, TruckCard, OfflineBanner, SyncIndicator };
    static props = {
        api: Object,
        isOnline: Boolean,
        syncPending: Number,
        onGoToPesaje: Function,
        onLogout: Function,
    };

    setup() {
        this.state = useState({
            kpis: null,
            fuera: [],
            enPlanta: [],
            lastUpdate: '',
        });
        this._interval = null;

        onMounted(() => {
            this._load();
            this._interval = setInterval(() => this._load(), 30000);
        });
        onWillUnmount(() => {
            if (this._interval) clearInterval(this._interval);
        });
    }

    async _load() {
        try {
            const data = await this.props.api.getDashboard();
            this.state.kpis = data.kpis;
            this.state.enPlanta = data.en_planta || [];
            this.state.fuera = data.fuera_planta || [];
            const now = new Date();
            this.state.lastUpdate = `Actualizado ${now.toLocaleTimeString()}`;
        } catch (e) {
            console.warn('Dashboard load error', e);
        }
    }

    refreshNow() { this._load(); }

    goToPesaje() { this.props.onGoToPesaje(); }

    formatTime(hours) {
        if (!hours) return '—';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
}
