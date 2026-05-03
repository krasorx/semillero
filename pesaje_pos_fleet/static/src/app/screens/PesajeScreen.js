/** @odoo-module */
import { Component, useState, onMounted, onWillUnmount, xml } from "@odoo/owl";
import { TruckCard } from "../components/TruckCard";
import { BigButton } from "../components/BigButton";
import { WeightModal } from "../components/WeightModal";
import { SubstateSelector } from "../components/SubstateSelector";
import { OfflineBanner } from "../components/OfflineBanner";
import { SyncIndicator } from "../components/SyncIndicator";
import { PesajeFormModal } from "./PesajeFormModal";

export class PesajeScreen extends Component {
    static template = xml`
        <div class="pos-screen pos-flex-col">
            <OfflineBanner isOnline="props.isOnline"/>
            <div class="pos-header">
                <div class="pos-flex pos-items-center pos-gap-3">
                    <span style="font-size:1.5rem;">&#x2696;&#xFE0F;</span>
                    <span class="pos-text-xl pos-font-bold">Pesaje</span>
                    <span class="pos-badge pos-badge-blue" t-esc="'Op: ' + props.employee.name"/>
                </div>
                <div class="pos-flex pos-items-center pos-gap-3">
                    <SyncIndicator pending="props.syncPending"/>
                    <button class="pos-btn pos-btn-gray" t-on-click="() => props.onToDashboard()">&#x1F4CA; Dashboard</button>
                    <button class="pos-btn pos-btn-gray" t-on-click="() => props.onLogout()">Salir</button>
                </div>
            </div>

            <div class="pos-flex pos-flex-1 pos-overflow-hidden">
                <!-- Left: list -->
                <div class="pos-panel-left">
                    <div class="pos-p-3 pos-border" style="border-left:none;border-right:none;border-top:none;">
                        <button class="pos-btn pos-btn-green pos-w-full pos-btn-lg"
                            t-on-click="openNewForm">
                            + Nuevo Pesaje
                        </button>
                    </div>
                    <div class="pos-p-2 pos-overflow-y pos-flex-1 pos-flex-col pos-gap-2">
                        <t t-if="state.loading">
                            <div class="pos-flex pos-justify-center pos-p-4">
                                <div class="pos-spinner"/>
                            </div>
                        </t>
                        <t t-if="!state.loading and state.pesajes.length === 0">
                            <div class="pos-text-gray pos-text-center pos-p-4">Sin pesajes activos</div>
                        </t>
                        <t t-foreach="state.pesajes" t-as="p" t-key="p.id">
                            <TruckCard
                                pesaje="p"
                                selected="state.selected and state.selected.id === p.id"
                                onSelect="(pesaje) => this.selectPesaje(pesaje)"/>
                        </t>
                    </div>
                </div>

                <!-- Right: detail -->
                <div class="pos-panel-right pos-p-4 pos-overflow-y">
                    <t t-if="!state.selected">
                        <div class="pos-flex pos-items-center pos-justify-center pos-h-full">
                            <div class="pos-text-center pos-text-gray">
                                <div style="font-size:4rem;">&#x2696;&#xFE0F;</div>
                                <div class="pos-text-xl pos-mt-2">Seleccionar un camión</div>
                            </div>
                        </div>
                    </t>
                    <t t-if="state.selected">
                        <div class="pos-flex pos-justify-between pos-items-center pos-mb-4">
                            <div>
                                <div class="pos-text-2xl pos-font-bold" t-esc="state.selected.license_plate or state.selected.vehicle_name"/>
                                <div class="pos-text-gray" t-esc="state.selected.driver_name"/>
                            </div>
                            <div class="pos-flex pos-gap-2">
                                <span class="pos-badge pos-badge-blue" t-esc="stateLabel(state.selected.state)"/>
                                <t t-if="state.selected.substate_name">
                                    <span class="pos-badge pos-badge-gray" t-esc="state.selected.substate_name"/>
                                </t>
                            </div>
                        </div>

                        <!-- Pesos -->
                        <div class="pos-grid-3 pos-gap-3 pos-mb-4">
                            <div class="pos-card pos-text-center">
                                <div class="pos-text-gray pos-text-xs">PESO BRUTO</div>
                                <div class="pos-text-2xl pos-font-bold pos-text-white">
                                    <t t-esc="(state.selected.gross_weight || 0).toFixed(0)"/> kg
                                </div>
                            </div>
                            <div class="pos-card pos-text-center">
                                <div class="pos-text-gray pos-text-xs">TARA</div>
                                <div class="pos-text-2xl pos-font-bold pos-text-yellow">
                                    <t t-esc="(state.selected.tara_weight || 0).toFixed(0)"/> kg
                                </div>
                            </div>
                            <div class="pos-card pos-text-center">
                                <div class="pos-text-gray pos-text-xs">NETO</div>
                                <div class="pos-text-2xl pos-font-bold pos-text-green">
                                    <t t-esc="(state.selected.net_weight || 0).toFixed(0)"/> kg
                                </div>
                            </div>
                        </div>

                        <!-- Info -->
                        <div class="pos-card pos-mb-4">
                            <div class="pos-grid-2 pos-gap-2 pos-text-sm">
                                <div>
                                    <span class="pos-text-gray">Material: </span>
                                    <span t-esc="state.selected.product_name or '—'"/>
                                </div>
                                <div>
                                    <span class="pos-text-gray">Lote: </span>
                                    <span t-esc="state.selected.lot_name or '—'"/>
                                </div>
                                <div>
                                    <span class="pos-text-gray">Campo: </span>
                                    <span t-esc="state.selected.campo_name or '—'"/>
                                </div>
                                <div>
                                    <span class="pos-text-gray">Híbrido: </span>
                                    <span t-esc="state.selected.hibrido_name or '—'"/>
                                </div>
                                <div t-if="state.selected.is_discard">
                                    <span class="pos-badge pos-badge-red">DESCARTE</span>
                                </div>
                                <div t-if="state.selected.time_in_plant">
                                    <span class="pos-text-gray">Tiempo: </span>
                                    <span t-esc="formatTime(state.selected.time_in_plant)"/>
                                </div>
                            </div>
                        </div>

                        <!-- Subestado (solo en_planta) -->
                        <t t-if="state.selected.state === 'en_planta' and props.masters">
                            <div class="pos-card pos-mb-4">
                                <SubstateSelector
                                    substates="props.masters.substates"
                                    selected="state.selected.substate_id"
                                    onSelect="(id) => this.setSubstate(id)"/>
                            </div>
                        </t>

                        <!-- Acciones -->
                        <div class="pos-flex-col pos-gap-2">
                            <t t-if="state.selected.state === 'precargado'">
                                <button class="pos-btn pos-btn-blue pos-btn-lg pos-w-full" t-on-click="() => this.doAction('confirm')">
                                    &#x2713; Confirmar (&#x2192; En Camino)
                                </button>
                            </t>
                            <t t-if="state.selected.state === 'en_camino'">
                                <button class="pos-btn pos-btn-yellow pos-btn-lg pos-w-full" t-on-click="() => this.doAction('arrive_outside')">
                                    &#x1F17F; Camión Llegó (&#x2192; Fuera de Planta)
                                </button>
                            </t>
                            <t t-if="state.selected.state === 'fuera_planta'">
                                <button class="pos-btn pos-btn-green pos-btn-lg pos-w-full" t-on-click="() => this.doAction('enter_plant')">
                                    &#x1F3ED; Ingresar a Planta
                                </button>
                            </t>
                            <t t-if="state.selected.state === 'en_planta'">
                                <div class="pos-grid-2 pos-gap-2">
                                    <button class="pos-btn pos-btn-blue pos-btn-lg" t-on-click="openWeightEntry">
                                        &#x2696; Reg. Peso Entrada
                                    </button>
                                    <button class="pos-btn pos-btn-yellow pos-btn-lg" t-on-click="openWeightTara">
                                        &#x2696; Registrar Tara
                                    </button>
                                </div>
                                <button class="pos-btn pos-btn-green pos-btn-xl pos-w-full" t-on-click="() => this.doAction('complete')">
                                    &#x2713; COMPLETAR PESAJE
                                </button>
                            </t>
                            <div class="pos-grid-2 pos-gap-2 pos-mt-2">
                                <button class="pos-btn pos-btn-gray" t-on-click="openEditForm">&#x270F; Editar</button>
                                <button class="pos-btn pos-btn-red"
                                    t-if="state.selected.state !== 'completado'"
                                    t-on-click="openCancelConfirm">
                                    &#x2715; Cancelar
                                </button>
                            </div>
                        </div>
                    </t>
                </div>
            </div>

            <!-- Modals -->
            <t t-if="state.showForm">
                <PesajeFormModal
                    masters="props.masters"
                    pesaje="state.editingPesaje"
                    api="props.api"
                    employee="props.employee"
                    onSave="(p) => this.onFormSave(p)"
                    onCancel="() => { state.showForm = false; state.editingPesaje = null; }"/>
            </t>
            <t t-if="state.showWeightModal">
                <WeightModal
                    title="state.weightModalTitle"
                    onConfirm="(w) => this.onWeightConfirm(w)"
                    onCancel="() => { state.showWeightModal = false; }"/>
            </t>
            <t t-if="state.showCancelConfirm">
                <div class="pos-modal-overlay" t-on-click.self="() => { state.showCancelConfirm = false; }">
                    <div class="pos-modal">
                        <div class="pos-modal-title">Cancelar Pesaje</div>
                        <label class="pos-label">Motivo de cancelación</label>
                        <textarea class="pos-input pos-mb-4" rows="3" t-model="state.cancelReason" placeholder="Ingrese el motivo..."/>
                        <div class="pos-grid-2 pos-gap-3">
                            <button class="pos-btn pos-btn-gray" t-on-click="() => { state.showCancelConfirm = false; }">Volver</button>
                            <button class="pos-btn pos-btn-red" t-on-click="confirmCancel">Cancelar Pesaje</button>
                        </div>
                    </div>
                </div>
            </t>
        </div>
    `;
    static components = { TruckCard, BigButton, WeightModal, SubstateSelector, OfflineBanner, SyncIndicator, PesajeFormModal };
    static props = {
        api: Object,
        masters: { type: Object, optional: true },
        employee: Object,
        isOnline: Boolean,
        syncPending: Number,
        onToDashboard: Function,
        onLogout: Function,
    };

    setup() {
        this.state = useState({
            pesajes: [],
            selected: null,
            loading: false,
            showForm: false,
            showWeightModal: false,
            showCancelConfirm: false,
            editingPesaje: null,
            weightModalTitle: '',
            weightModalTipo: 'entrada',
            cancelReason: '',
        });
        this._interval = null;

        onMounted(async () => {
            await this._loadPesajes();
            this._interval = setInterval(() => this._loadPesajes(), 30000);
        });
        onWillUnmount(() => {
            if (this._interval) clearInterval(this._interval);
        });
    }

    async _loadPesajes() {
        this.state.loading = true;
        try {
            const data = await this.props.api.loadPesajes();
            this.state.pesajes = data.pesajes || [];
            if (this.state.selected) {
                const updated = this.state.pesajes.find(p => p.id === this.state.selected.id);
                if (updated) this.state.selected = updated;
            }
        } catch (e) {
            console.warn('loadPesajes error', e);
        } finally {
            this.state.loading = false;
        }
    }

    selectPesaje(pesaje) {
        this.state.selected = pesaje;
    }

    openNewForm() {
        this.state.editingPesaje = null;
        this.state.showForm = true;
    }

    openEditForm() {
        this.state.editingPesaje = this.state.selected;
        this.state.showForm = true;
    }

    onFormSave(pesaje) {
        this.state.showForm = false;
        this.state.editingPesaje = null;
        if (pesaje) {
            const idx = this.state.pesajes.findIndex(p => p.id === pesaje.id);
            if (idx >= 0) this.state.pesajes[idx] = pesaje;
            else this.state.pesajes.unshift(pesaje);
            this.state.selected = pesaje;
        }
        this._loadPesajes();
    }

    openWeightEntry() {
        this.state.weightModalTitle = 'Registrar Peso de Entrada';
        this.state.weightModalTipo = 'entrada';
        this.state.showWeightModal = true;
    }

    openWeightTara() {
        this.state.weightModalTitle = 'Registrar Tara (Salida)';
        this.state.weightModalTipo = 'salida';
        this.state.showWeightModal = true;
    }

    async onWeightConfirm(weight) {
        this.state.showWeightModal = false;
        if (!this.state.selected) return;
        const result = await this.props.api.registerWeight(
            this.state.selected.id,
            weight,
            this.state.weightModalTipo,
            this.props.employee.id
        );
        if (result.success && result.pesaje) {
            this.state.selected = result.pesaje;
            const idx = this.state.pesajes.findIndex(p => p.id === result.pesaje.id);
            if (idx >= 0) this.state.pesajes[idx] = result.pesaje;
        }
    }

    async doAction(action) {
        if (!this.state.selected) return;
        const result = await this.props.api.changeState(this.state.selected.id, action);
        if (result.success && result.pesaje) {
            this.state.selected = result.pesaje;
            const idx = this.state.pesajes.findIndex(p => p.id === result.pesaje.id);
            if (idx >= 0) this.state.pesajes[idx] = result.pesaje;
            else await this._loadPesajes();
        } else if (result.error) {
            alert(result.error);
        }
    }

    async setSubstate(substateId) {
        if (!this.state.selected) return;
        const result = await this.props.api.updatePesaje(this.state.selected.id, { substate_id: substateId });
        if (result.success && result.pesaje) {
            this.state.selected = result.pesaje;
            const idx = this.state.pesajes.findIndex(p => p.id === result.pesaje.id);
            if (idx >= 0) this.state.pesajes[idx] = result.pesaje;
        }
    }

    openCancelConfirm() {
        this.state.cancelReason = '';
        this.state.showCancelConfirm = true;
    }

    async confirmCancel() {
        if (!this.state.selected) return;
        const result = await this.props.api.cancelPesaje(this.state.selected.id, this.state.cancelReason);
        if (result.success) {
            this.state.showCancelConfirm = false;
            this.state.pesajes = this.state.pesajes.filter(p => p.id !== this.state.selected.id);
            this.state.selected = null;
        }
    }

    stateLabel(state) {
        const labels = {
            precargado: 'PreCargado', en_camino: 'En Camino',
            fuera_planta: 'Fuera de Planta', en_planta: 'En Planta',
            completado: 'Completado', cancelado: 'Cancelado',
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
