/** @odoo-module */
import { Component, useState, onMounted, onWillUnmount, xml } from "@odoo/owl";

export class KioskoDashboardScreen extends Component {
    static template = xml`
        <div class="kiosko-screen">
            <div class="kiosko-header">
                <div class="kiosko-header-left">
                    <button class="kiosko-header-btn ghost" t-on-click="() => props.onBack()">&#x2190; Volver</button>
                    <span class="kiosko-header-title">Dashboard</span>
                </div>
                <div class="kiosko-header-right">
                    <span class="kiosko-text-muted" t-esc="state.lastUpdate"/>
                    <button class="kiosko-header-btn" t-on-click="() => this._load()">&#x21BA; Actualizar</button>
                    <button class="kiosko-header-btn ghost" t-on-click="() => props.onLogout()">Salir</button>
                </div>
            </div>

            <div class="kiosko-dashboard-body">
                <t t-if="!state.kpis">
                    <div class="kiosko-loading">Cargando datos...</div>
                </t>
                <t t-if="state.kpis">
                    <div class="kiosko-kpi-row">
                        <div class="kiosko-kpi-card yellow">
                            <div class="kiosko-kpi-value" t-esc="state.kpis.en_camino"/>
                            <div class="kiosko-kpi-label">En Camino</div>
                        </div>
                        <div class="kiosko-kpi-card orange">
                            <div class="kiosko-kpi-value" t-esc="state.kpis.fuera_planta"/>
                            <div class="kiosko-kpi-label">Fuera de Planta</div>
                        </div>
                        <div class="kiosko-kpi-card blue">
                            <div class="kiosko-kpi-value" t-esc="state.kpis.en_planta"/>
                            <div class="kiosko-kpi-label">En Planta</div>
                        </div>
                        <div class="kiosko-kpi-card green">
                            <div class="kiosko-kpi-value" t-esc="state.kpis.completados_hoy"/>
                            <div class="kiosko-kpi-label">Completados Hoy</div>
                        </div>
                        <div class="kiosko-kpi-card purple">
                            <div class="kiosko-kpi-value" t-esc="formatTime(state.kpis.tiempo_promedio)"/>
                            <div class="kiosko-kpi-label">Promedio en Planta</div>
                        </div>
                    </div>

                    <div class="kiosko-dashboard-lists">
                        <div class="kiosko-dash-list">
                            <h3 class="kiosko-dash-list-title">
                                &#x1F17F; Fuera de Planta
                                <span class="kiosko-dash-count" t-esc="state.fuera.length"/>
                            </h3>
                            <div class="kiosko-dash-list-body">
                                <t t-if="state.fuera.length === 0">
                                    <div class="kiosko-empty">Sin camiones afuera</div>
                                </t>
                                <t t-foreach="state.fuera" t-as="p" t-key="p.id">
                                    <div class="kiosko-dash-item">
                                        <div class="kiosko-dash-item-left">
                                            <span class="kiosko-dash-plate" t-esc="p.license_plate or p.vehicle_name"/>
                                            <span class="kiosko-dash-driver" t-esc="p.driver_name or ''"/>
                                        </div>
                                        <span class="kiosko-dash-product" t-esc="p.product_name or '—'"/>
                                    </div>
                                </t>
                            </div>
                        </div>

                        <div class="kiosko-dash-list">
                            <h3 class="kiosko-dash-list-title">
                                &#x1F3ED; En Planta
                                <span class="kiosko-dash-count" t-esc="state.enPlanta.length"/>
                            </h3>
                            <div class="kiosko-dash-list-body">
                                <t t-if="state.enPlanta.length === 0">
                                    <div class="kiosko-empty">Sin camiones en planta</div>
                                </t>
                                <t t-foreach="state.enPlanta" t-as="p" t-key="p.id">
                                    <div class="kiosko-dash-item">
                                        <div class="kiosko-dash-item-left">
                                            <span class="kiosko-dash-plate" t-esc="p.license_plate or p.vehicle_name"/>
                                            <span class="kiosko-dash-driver" t-esc="p.driver_name or ''"/>
                                        </div>
                                        <div class="kiosko-dash-item-right">
                                            <span class="kiosko-dash-product" t-esc="p.product_name or '—'"/>
                                            <t t-if="p.substate_name">
                                                <span class="kiosko-substate-pill" t-esc="p.substate_name"/>
                                            </t>
                                            <t t-if="p.time_in_plant">
                                                <span class="kiosko-dash-time" t-esc="formatTime(p.time_in_plant)"/>
                                            </t>
                                        </div>
                                    </div>
                                </t>
                            </div>
                        </div>
                    </div>
                </t>
            </div>
        </div>
    `;

    static props = {
        api: Object,
        isOnline: Boolean,
        syncPending: Number,
        onBack: Function,
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

    formatTime(hours) {
        if (!hours) return '—';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
}
