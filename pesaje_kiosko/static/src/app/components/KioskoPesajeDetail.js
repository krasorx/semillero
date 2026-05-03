/** @odoo-module */
import { Component, useState, xml } from "@odoo/owl";
import { SubstateSelector } from "@pesaje_pos_fleet/app/components/SubstateSelector";

export class KioskoPesajeDetail extends Component {
    static template = xml`
        <div class="kiosko-detail">

            <!-- Vehicle header -->
            <div class="kiosko-detail-header">
                <div class="kiosko-detail-title-row">
                    <span class="kiosko-detail-plate"
                        t-esc="props.pesaje.license_plate or props.pesaje.vehicle_name or '—'"/>
                    <span t-attf-class="kiosko-state-badge state-{{ props.pesaje.state }}"
                        t-esc="stateLabel(props.pesaje.state)"/>
                    <t t-if="props.pesaje.is_discard">
                        <span class="kiosko-badge-danger">DESCARTE</span>
                    </t>
                </div>
                <div class="kiosko-detail-driver" t-esc="props.pesaje.driver_name or '—'"/>
            </div>

            <!-- Weight summary bar -->
            <div class="kiosko-weight-bar">
                <div class="kiosko-weight-cell">
                    <div class="kiosko-weight-label">BRUTO</div>
                    <div class="kiosko-weight-value"
                        t-esc="(props.pesaje.gross_weight || 0).toFixed(0) + ' kg'"/>
                </div>
                <div class="kiosko-weight-sep">−</div>
                <div class="kiosko-weight-cell">
                    <div class="kiosko-weight-label">TARA</div>
                    <div class="kiosko-weight-value tara"
                        t-esc="(props.pesaje.tara_weight || 0).toFixed(0) + ' kg'"/>
                </div>
                <div class="kiosko-weight-sep">=</div>
                <div class="kiosko-weight-cell highlight">
                    <div class="kiosko-weight-label">NETO</div>
                    <div class="kiosko-weight-value net"
                        t-esc="(props.pesaje.net_weight || 0).toFixed(0) + ' kg'"/>
                </div>
            </div>

            <!-- Inner tab bar -->
            <div class="kiosko-inner-tabs">
                <button t-attf-class="kiosko-inner-tab {{ state.innerTab === 'info' ? 'active' : '' }}"
                    t-on-click="() => state.innerTab = 'info'">Info</button>
                <button t-attf-class="kiosko-inner-tab {{ state.innerTab === 'pesar' ? 'active' : '' }}"
                    t-on-click="() => state.innerTab = 'pesar'">Pesar</button>
                <t t-if="props.pesaje.state === 'en_planta' and props.masters">
                    <button t-attf-class="kiosko-inner-tab {{ state.innerTab === 'subestado' ? 'active' : '' }}"
                        t-on-click="() => state.innerTab = 'subestado'">Subestado</button>
                </t>
            </div>

            <!-- Inner content -->
            <div class="kiosko-inner-content">

                <!-- INFO TAB -->
                <t t-if="state.innerTab === 'info'">
                    <div class="kiosko-info-grid">
                        <div class="kiosko-info-row">
                            <span class="kiosko-info-label">Referencia</span>
                            <span class="kiosko-info-value" t-esc="props.pesaje.name or '—'"/>
                        </div>
                        <div class="kiosko-info-row">
                            <span class="kiosko-info-label">Material</span>
                            <span class="kiosko-info-value" t-esc="props.pesaje.product_name or '—'"/>
                        </div>
                        <div class="kiosko-info-row">
                            <span class="kiosko-info-label">Lote</span>
                            <span class="kiosko-info-value" t-esc="props.pesaje.lot_name or '—'"/>
                        </div>
                        <div class="kiosko-info-row">
                            <span class="kiosko-info-label">Campo</span>
                            <span class="kiosko-info-value" t-esc="props.pesaje.campo_name or '—'"/>
                        </div>
                        <div class="kiosko-info-row">
                            <span class="kiosko-info-label">Híbrido</span>
                            <span class="kiosko-info-value" t-esc="props.pesaje.hibrido_name or '—'"/>
                        </div>
                        <t t-if="props.pesaje.time_in_plant">
                            <div class="kiosko-info-row">
                                <span class="kiosko-info-label">Tiempo en planta</span>
                                <span class="kiosko-info-value" t-esc="formatTime(props.pesaje.time_in_plant)"/>
                            </div>
                        </t>
                        <t t-if="props.pesaje.notes">
                            <div class="kiosko-info-row">
                                <span class="kiosko-info-label">Notas</span>
                                <span class="kiosko-info-value" t-esc="props.pesaje.notes"/>
                            </div>
                        </t>
                    </div>
                </t>

                <!-- PESAR TAB -->
                <t t-if="state.innerTab === 'pesar'">
                    <t t-if="props.pesaje.state !== 'en_planta'">
                        <div class="kiosko-pesar-locked">
                            <div class="kiosko-pesar-locked-icon">&#x1F512;</div>
                            <div>El camión debe estar <strong>En Planta</strong> para registrar peso</div>
                        </div>
                    </t>
                    <t t-if="props.pesaje.state === 'en_planta'">
                        <div class="kiosko-weight-pad">
                            <div class="kiosko-pad-display">
                                <t t-if="state.weightInput">
                                    <span class="kiosko-pad-value" t-esc="state.weightInput + ' kg'"/>
                                </t>
                                <t t-if="!state.weightInput">
                                    <span class="kiosko-pad-placeholder">0 kg</span>
                                </t>
                            </div>

                            <div class="kiosko-pad-tipo">
                                <button t-attf-class="kiosko-tipo-btn {{ state.weightTipo === 'entrada' ? 'active' : '' }}"
                                    t-on-click="() => state.weightTipo = 'entrada'">Entrada</button>
                                <button t-attf-class="kiosko-tipo-btn {{ state.weightTipo === 'salida' ? 'active' : '' }}"
                                    t-on-click="() => state.weightTipo = 'salida'">Tara (Salida)</button>
                            </div>

                            <div class="kiosko-numpad">
                                <t t-foreach="numpadKeys" t-as="key" t-key="key_index">
                                    <button
                                        t-if="key !== null"
                                        t-attf-class="kiosko-numpad-key {{ key === 'del' ? 'del' : '' }}"
                                        t-on-click="() => this.padPress(key)">
                                        <t t-if="key !== 'del'" t-esc="key"/>
                                        <t t-if="key === 'del'">&#x232B;</t>
                                    </button>
                                    <div t-if="key === null" class="kiosko-numpad-empty"/>
                                </t>
                            </div>

                            <t t-if="state.weightError">
                                <div class="kiosko-error" t-esc="state.weightError"/>
                            </t>

                            <button
                                class="kiosko-action-btn success full"
                                t-att-disabled="!state.weightInput"
                                t-on-click="registerWeight">
                                &#x2713; Registrar Peso
                            </button>
                        </div>
                    </t>
                </t>

                <!-- SUBESTADO TAB -->
                <t t-if="state.innerTab === 'subestado' and props.masters">
                    <div class="kiosko-substate-section">
                        <SubstateSelector
                            substates="props.masters.substates"
                            selected="props.pesaje.substate_id"
                            onSelect="(id) => this.setSubstate(id)"/>
                    </div>
                </t>

            </div>

            <!-- Actions bar -->
            <div class="kiosko-actions-bar">
                <t t-if="props.pesaje.state === 'precargado'">
                    <button class="kiosko-action-btn primary full"
                        t-on-click="() => this.doAction('confirm')">
                        Confirmar &#x2192; En Camino
                    </button>
                </t>
                <t t-if="props.pesaje.state === 'en_camino'">
                    <button class="kiosko-action-btn warning full"
                        t-on-click="() => this.doAction('arrive_outside')">
                        Camión Llegó &#x2192; Fuera de Planta
                    </button>
                </t>
                <t t-if="props.pesaje.state === 'fuera_planta'">
                    <button class="kiosko-action-btn success full"
                        t-on-click="() => this.doAction('enter_plant')">
                        Ingresar a Planta
                    </button>
                </t>
                <t t-if="props.pesaje.state === 'en_planta'">
                    <button class="kiosko-action-btn success full large"
                        t-on-click="() => this.doAction('complete')">
                        &#x2713; COMPLETAR PESAJE
                    </button>
                </t>

                <div class="kiosko-actions-secondary">
                    <button class="kiosko-action-btn ghost" t-on-click="() => props.onEdit()">
                        Editar
                    </button>
                    <t t-if="props.pesaje.state !== 'completado' and props.pesaje.state !== 'cancelado'">
                        <button class="kiosko-action-btn danger" t-on-click="openCancelModal">
                            Cancelar
                        </button>
                    </t>
                </div>
            </div>

            <!-- Cancel modal -->
            <t t-if="state.showCancelModal">
                <div class="kiosko-overlay" t-on-click.self="() => state.showCancelModal = false">
                    <div class="kiosko-modal">
                        <h3 class="kiosko-modal-title">Cancelar Pesaje</h3>
                        <div class="kiosko-field">
                            <label class="kiosko-label">Motivo de cancelación</label>
                            <textarea class="kiosko-textarea" rows="3"
                                t-model="state.cancelReason"
                                placeholder="Ingrese el motivo..."/>
                        </div>
                        <div class="kiosko-modal-footer">
                            <button class="kiosko-action-btn ghost"
                                t-on-click="() => state.showCancelModal = false">Volver</button>
                            <button class="kiosko-action-btn danger"
                                t-on-click="confirmCancel">Confirmar Cancelación</button>
                        </div>
                    </div>
                </div>
            </t>

        </div>
    `;

    static components = { SubstateSelector };
    static props = {
        pesaje: Object,
        masters: { type: Object, optional: true },
        api: Object,
        employee: Object,
        onEdit: Function,
        onUpdate: Function,
        onCancel: Function,
    };

    setup() {
        this.numpadKeys = [7, 8, 9, 4, 5, 6, 1, 2, 3, null, 0, 'del'];
        this.state = useState({
            innerTab: 'info',
            weightInput: '',
            weightTipo: 'entrada',
            weightError: '',
            showCancelModal: false,
            cancelReason: '',
        });
    }

    padPress(key) {
        if (key === 'del') {
            this.state.weightInput = this.state.weightInput.slice(0, -1);
        } else if (key === '.') {
            if (!this.state.weightInput.includes('.')) {
                this.state.weightInput += '.';
            }
        } else if (this.state.weightInput.length < 9) {
            this.state.weightInput += String(key);
        }
        this.state.weightError = '';
    }

    async registerWeight() {
        const w = parseFloat(this.state.weightInput);
        if (!w || w <= 0) {
            this.state.weightError = 'Ingrese un peso válido';
            return;
        }
        const result = await this.props.api.registerWeight(
            this.props.pesaje.id, w, this.state.weightTipo, this.props.employee.id
        );
        if (result.success) {
            this.state.weightInput = '';
            this.state.weightError = '';
            if (result.pesaje) this.props.onUpdate(result.pesaje);
        } else {
            this.state.weightError = result.error || 'Error al registrar peso';
        }
    }

    async doAction(action) {
        const result = await this.props.api.changeState(this.props.pesaje.id, action);
        if (result.success && result.pesaje) {
            this.props.onUpdate(result.pesaje);
        } else if (result.error) {
            alert(result.error);
        }
    }

    async setSubstate(substateId) {
        const result = await this.props.api.updatePesaje(this.props.pesaje.id, { substate_id: substateId });
        if (result.success && result.pesaje) {
            this.props.onUpdate(result.pesaje);
        }
    }

    openCancelModal() {
        this.state.cancelReason = '';
        this.state.showCancelModal = true;
    }

    async confirmCancel() {
        const result = await this.props.api.cancelPesaje(this.props.pesaje.id, this.state.cancelReason);
        if (result.success) {
            this.state.showCancelModal = false;
            this.props.onCancel(this.props.pesaje);
        }
    }

    stateLabel(state) {
        const labels = {
            precargado: 'Pre-Cargado',
            en_camino: 'En Camino',
            fuera_planta: 'Fuera de Planta',
            en_planta: 'En Planta',
            completado: 'Completado',
            cancelado: 'Cancelado',
        };
        return labels[state] || state;
    }

    formatTime(hours) {
        if (!hours) return '—';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
}
