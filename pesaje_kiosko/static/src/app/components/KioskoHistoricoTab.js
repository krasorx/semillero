/** @odoo-module */
import { Component, useState, xml } from "@odoo/owl";

export class KioskoHistoricoTab extends Component {
    static template = xml`
        <div class="kiosko-tab-content kiosko-historico">
            <div class="kiosko-historico-filters">
                <input class="kiosko-input" type="text"
                    placeholder="Patente..." t-model="state.filterPatente"/>
                <input class="kiosko-input" type="date" t-model="state.filterFrom"/>
                <input class="kiosko-input" type="date" t-model="state.filterTo"/>
                <select class="kiosko-select" t-model="state.filterState">
                    <option value="">Todos los estados</option>
                    <option value="completado">Completado</option>
                    <option value="cancelado">Cancelado</option>
                </select>
                <button class="kiosko-action-btn ghost" t-on-click="loadHistory">Buscar</button>
            </div>

            <t t-if="state.loading">
                <div class="kiosko-loading">Cargando...</div>
            </t>
            <t t-if="state.error">
                <div class="kiosko-error" t-esc="state.error"/>
            </t>
            <t t-if="!state.loading">
                <t t-if="!state.rows.length">
                    <div class="kiosko-empty-state">Sin resultados para los filtros seleccionados</div>
                </t>
                <t t-if="state.rows.length">
                    <div class="kiosko-historico-table">
                        <div class="kiosko-historico-header">
                            <span>Ref</span>
                            <span>Patente</span>
                            <span>Material</span>
                            <span>Neto</span>
                            <span>Empresa</span>
                            <span>Estado</span>
                        </div>
                        <t t-foreach="state.rows" t-as="row" t-key="row.id">
                            <div class="kiosko-historico-row" t-on-click="() => this.selectRow(row)">
                                <span t-esc="row.name or '—'"/>
                                <span t-esc="row.license_plate or '—'"/>
                                <span t-esc="row.product_name or '—'"/>
                                <span t-esc="(row.net_weight || 0).toFixed(0) + ' kg'"/>
                                <span t-esc="row.transport_company_name or '—'"/>
                                <span t-attf-class="kiosko-state-badge state-{{ row.state }}"
                                    t-esc="stateLabel(row.state)"/>
                            </div>
                        </t>
                    </div>
                </t>
            </t>
        </div>
    `;

    static props = {
        api: Object,
        masters: { type: Object, optional: true },
        onSelect: Function,
    };

    setup() {
        const today = new Date().toISOString().split('T')[0];
        this.state = useState({
            filterPatente: '',
            filterFrom: today,
            filterTo: today,
            filterState: '',
            loading: false,
            error: '',
            rows: [],
        });
    }

    async willStart() {
        await this.loadHistory();
    }

    async loadHistory() {
        this.state.loading = true;
        this.state.error = '';
        try {
            const filters = { limit: 50 };
            if (this.state.filterFrom) filters.date_from = this.state.filterFrom;
            if (this.state.filterTo) filters.date_to = this.state.filterTo;
            if (this.state.filterState) filters.state = this.state.filterState;

            const currentBalanza = this.props.masters && this.props.masters.current_balanza;
            if (currentBalanza) filters.balanza_id = currentBalanza.id;

            const result = await this.props.api.loadHistory(filters);
            let rows = result.pesajes || [];

            if (this.state.filterPatente) {
                const pat = this.state.filterPatente.toLowerCase();
                rows = rows.filter(r => (r.license_plate || '').toLowerCase().includes(pat));
            }

            this.state.rows = rows;
        } catch {
            this.state.error = 'Error al cargar historial';
        } finally {
            this.state.loading = false;
        }
    }

    selectRow(row) {
        this.props.onSelect(row);
    }

    stateLabel(state) {
        const labels = { completado: 'Completado', cancelado: 'Cancelado' };
        return labels[state] || state;
    }
}
