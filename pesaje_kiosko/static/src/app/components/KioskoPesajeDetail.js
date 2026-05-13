/** @odoo-module */
import { Component, useState, xml, onWillUpdateProps } from "@odoo/owl";
import { SubstateSelector } from "@pesaje_pos_fleet/app/components/SubstateSelector";
import { KioskoDocumentosTab } from "./KioskoDocumentosTab";
import { KioskoHistoricoTab } from "./KioskoHistoricoTab";

export class KioskoPesajeDetail extends Component {
    static template = xml`
        <div class="kiosko-detail">

            <!-- Header -->
            <div class="kiosko-detail-header">
                <div class="kiosko-detail-title-row">
                    <span class="kiosko-detail-plate"
                        t-esc="displayPesaje.license_plate or displayPesaje.vehicle_name or '—'"/>
                    <t t-if="state.historicPesaje">
                        <span class="kiosko-badge-historic">📜 Histórico</span>
                    </t>
                    <t t-if="!state.historicPesaje">
                        <span t-attf-class="kiosko-state-badge state-{{ props.pesaje.state }}"
                            t-esc="stateLabel(props.pesaje.state)"/>
                        <t t-if="props.pesaje.is_discard">
                            <span class="kiosko-badge-danger">DESCARTE</span>
                        </t>
                    </t>
                </div>
                <div class="kiosko-detail-header-right">
                    <t t-if="state.historicPesaje">
                        <button class="kiosko-action-btn ghost small"
                            t-on-click="clearHistoric">← Volver al actual</button>
                    </t>
                    <t t-if="!state.historicPesaje">
                        <div class="kiosko-detail-driver"
                            t-esc="props.pesaje.driver_name or '—'"/>
                    </t>
                </div>
            </div>

            <!-- Weight bar (always visible) -->
            <div class="kiosko-weight-bar">
                <div class="kiosko-weight-cell">
                    <div class="kiosko-weight-label">BRUTO</div>
                    <div class="kiosko-weight-value"
                        t-esc="(displayPesaje.gross_weight || 0).toFixed(0) + ' kg'"/>
                </div>
                <div class="kiosko-weight-sep">−</div>
                <div class="kiosko-weight-cell">
                    <div class="kiosko-weight-label">TARA</div>
                    <div class="kiosko-weight-value tara"
                        t-esc="(displayPesaje.tara_weight || 0).toFixed(0) + ' kg'"/>
                </div>
                <div class="kiosko-weight-sep">=</div>
                <div class="kiosko-weight-cell highlight">
                    <div class="kiosko-weight-label">NETO</div>
                    <div class="kiosko-weight-value net"
                        t-esc="(displayPesaje.net_weight || 0).toFixed(0) + ' kg'"/>
                </div>
            </div>

            <!-- Pesar strip (always visible) -->
            <t t-if="state.historicPesaje">
                <div class="kiosko-pesar-strip locked">
                    <div class="kiosko-pesar-strip-locked-msg">
                        🔒 Modo histórico — solo lectura
                    </div>
                </div>
            </t>
            <t t-if="!state.historicPesaje and props.pesaje.state !== 'en_planta'">
                <div class="kiosko-pesar-strip locked">
                    <div class="kiosko-pesar-strip-locked-msg">
                        ⚖️ El camión debe estar <strong>En Planta</strong> para registrar peso
                    </div>
                </div>
            </t>
            <t t-if="!state.historicPesaje and props.pesaje.state === 'en_planta'">
                <div class="kiosko-pesar-strip">
                    <div class="kiosko-pesar-strip-active">
                        <div class="kiosko-pad-tipo">
                            <button
                                t-attf-class="kiosko-tipo-btn {{ state.weightTipo === 'entrada' ? 'active' : '' }}"
                                t-on-click="() => state.weightTipo = 'entrada'">Entrada</button>
                            <button
                                t-attf-class="kiosko-tipo-btn {{ state.weightTipo === 'salida' ? 'active' : '' }}"
                                t-on-click="() => state.weightTipo = 'salida'">Tara</button>
                        </div>
                        <div class="kiosko-pad-display">
                            <t t-if="state.weightInput">
                                <span class="kiosko-pad-value"
                                    t-esc="state.weightInput + ' kg'"/>
                            </t>
                            <t t-if="!state.weightInput">
                                <span class="kiosko-pad-placeholder">0 kg</span>
                            </t>
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
                </div>
            </t>

            <!-- Tab bar -->
            <div class="kiosko-tab-bar">
                <button
                    t-attf-class="kiosko-tab {{ state.activeTab === 'transaccion' ? 'active' : '' }}"
                    t-on-click="() => this.switchTab('transaccion')">📄 Transacción</button>
                <button
                    t-attf-class="kiosko-tab {{ state.activeTab === 'transporte' ? 'active' : '' }}"
                    t-on-click="() => this.switchTab('transporte')">🚚 Transporte</button>
                <button
                    t-attf-class="kiosko-tab {{ state.activeTab === 'articulos' ? 'active' : '' }}"
                    t-on-click="() => this.switchTab('articulos')">🌽 Artículos</button>
                <button
                    t-attf-class="kiosko-tab {{ state.activeTab === 'documentos' ? 'active' : '' }}"
                    t-on-click="() => this.switchTab('documentos')">📎 Docs</button>
                <button
                    t-attf-class="kiosko-tab {{ state.activeTab === 'historico' ? 'active' : '' }}"
                    t-on-click="() => this.switchTab('historico')">🕐 Historial</button>
            </div>

            <!-- Tab content -->
            <div class="kiosko-tab-content-wrap">

                <!-- ═══ Tab: Transacción ═══ -->
                <t t-if="state.activeTab === 'transaccion'">
                    <div class="kiosko-tab-content">

                        <t t-if="state.historicPesaje">
                            <div class="kiosko-readonly-banner">📜 Modo histórico — solo lectura</div>
                            <div class="kiosko-info-grid">
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Referencia</span>
                                    <span class="kiosko-info-value" t-esc="displayPesaje.name or '—'"/>
                                </div>
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Campo</span>
                                    <span class="kiosko-info-value" t-esc="displayPesaje.campo_name or '—'"/>
                                </div>
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Parcela</span>
                                    <span class="kiosko-info-value" t-esc="displayPesaje.parcela or '—'"/>
                                </div>
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Híbrido</span>
                                    <span class="kiosko-info-value" t-esc="displayPesaje.hibrido_name or '—'"/>
                                </div>
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Operador</span>
                                    <span class="kiosko-info-value" t-esc="displayPesaje.employee_name or '—'"/>
                                </div>
                            </div>
                        </t>

                        <t t-if="!state.historicPesaje">
                            <!-- Read-only -->
                            <div class="kiosko-info-grid">
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Referencia</span>
                                    <span class="kiosko-info-value" t-esc="props.pesaje.name or '—'"/>
                                </div>
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Operador</span>
                                    <span class="kiosko-info-value" t-esc="props.employee.name or '—'"/>
                                </div>
                            </div>

                            <!-- Editable fields -->
                            <div class="kiosko-form-row">
                                <div class="kiosko-field">
                                    <label class="kiosko-label">Campo</label>
                                    <select class="kiosko-select" t-model="state.e_campo_id">
                                        <option value="">—</option>
                                        <t t-foreach="props.masters ? props.masters.campos || [] : []"
                                            t-as="c" t-key="c.id">
                                            <option t-att-value="c.id" t-esc="c.name"/>
                                        </t>
                                    </select>
                                </div>
                                <div class="kiosko-field">
                                    <label class="kiosko-label">Parcela</label>
                                    <input class="kiosko-input" type="text"
                                        placeholder="Ej: Lote 3"
                                        t-model="state.e_parcela"/>
                                </div>
                            </div>
                            <div class="kiosko-field">
                                <label class="kiosko-label">Híbrido</label>
                                <select class="kiosko-select" t-model="state.e_hibrido_id">
                                    <option value="">—</option>
                                    <t t-foreach="props.masters ? props.masters.hibridos || [] : []"
                                        t-as="h" t-key="h.id">
                                        <option t-att-value="h.id" t-esc="h.name"/>
                                    </t>
                                </select>
                            </div>

                            <t t-if="state.saveError and state.activeTab === 'transaccion'">
                                <div class="kiosko-error" t-esc="state.saveError"/>
                            </t>
                            <button class="kiosko-action-btn primary full"
                                t-att-disabled="state.saving"
                                t-on-click="saveTransaccion">
                                <t t-if="state.saving">Guardando...</t>
                                <t t-if="!state.saving and state.saveOk">&#x2713; Guardado</t>
                                <t t-if="!state.saving and !state.saveOk">Guardar datos</t>
                            </button>

                            <!-- Subestado (auto-guarda) -->
                            <t t-if="props.masters and props.pesaje.state === 'en_planta'">
                                <div class="kiosko-section-title">Subestado</div>
                                <SubstateSelector
                                    substates="props.masters.substates"
                                    selected="props.pesaje.substate_id"
                                    onSelect="(id) => this.setSubstate(id)"/>
                            </t>

                            <!-- Acciones de estado -->
                            <div class="kiosko-section-title">Acciones</div>
                            <div class="kiosko-tab-actions">
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
                                <t t-if="props.pesaje.state !== 'completado' and props.pesaje.state !== 'cancelado'">
                                    <button class="kiosko-action-btn danger full"
                                        t-on-click="openCancelModal">
                                        Cancelar pesaje
                                    </button>
                                </t>
                            </div>
                        </t>

                    </div>
                </t>

                <!-- ═══ Tab: Transporte ═══ -->
                <t t-if="state.activeTab === 'transporte'">
                    <div class="kiosko-tab-content">

                        <t t-if="state.historicPesaje">
                            <div class="kiosko-readonly-banner">📜 Modo histórico — solo lectura</div>
                            <div class="kiosko-info-grid">
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Empresa Transportista</span>
                                    <span class="kiosko-info-value"
                                        t-esc="displayPesaje.transport_company_name or '—'"/>
                                </div>
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Camión</span>
                                    <span class="kiosko-info-value"
                                        t-esc="displayPesaje.license_plate or displayPesaje.vehicle_name or '—'"/>
                                </div>
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Conductor</span>
                                    <span class="kiosko-info-value"
                                        t-esc="displayPesaje.driver_name or '—'"/>
                                </div>
                                <t t-if="hasArFields">
                                    <div class="kiosko-info-row">
                                        <span class="kiosko-info-label">N° INASE</span>
                                        <span class="kiosko-info-value"
                                            t-esc="displayPesaje.nro_inase or '—'"/>
                                    </div>
                                    <div class="kiosko-info-row">
                                        <span class="kiosko-info-label">Carta de Porte</span>
                                        <span class="kiosko-info-value"
                                            t-esc="displayPesaje.carta_porte or '—'"/>
                                    </div>
                                    <div class="kiosko-info-row">
                                        <span class="kiosko-info-label">COT</span>
                                        <span class="kiosko-info-value"
                                            t-esc="displayPesaje.cot or '—'"/>
                                    </div>
                                </t>
                            </div>
                        </t>

                        <t t-if="!state.historicPesaje">
                            <div class="kiosko-field">
                                <label class="kiosko-label">Empresa Transportista</label>
                                <select class="kiosko-select" t-model="state.e_transport_company_id">
                                    <option value="">— Sin asignar —</option>
                                    <t t-foreach="props.masters ? props.masters.partners || [] : []"
                                        t-as="p" t-key="p.id">
                                        <option t-att-value="p.id" t-esc="p.name"/>
                                    </t>
                                </select>
                            </div>
                            <div class="kiosko-field">
                                <label class="kiosko-label">Camión</label>
                                <select class="kiosko-select" t-model="state.e_vehicle_id">
                                    <option value="">— Seleccionar —</option>
                                    <t t-foreach="props.masters ? props.masters.vehicles || [] : []"
                                        t-as="v" t-key="v.id">
                                        <option t-att-value="v.id"
                                            t-esc="v.license_plate + (v.name ? ' — ' + v.name : '')"/>
                                    </t>
                                </select>
                            </div>
                            <div class="kiosko-field">
                                <label class="kiosko-label">Conductor</label>
                                <select class="kiosko-select" t-model="state.e_driver_id">
                                    <option value="">— Sin asignar —</option>
                                    <t t-foreach="props.masters ? props.masters.employees || [] : []"
                                        t-as="e" t-key="e.id">
                                        <option t-att-value="e.id" t-esc="e.name"/>
                                    </t>
                                </select>
                            </div>

                            <t t-if="hasArFields">
                                <div class="kiosko-section-title">Documentación ARG</div>
                                <div class="kiosko-field">
                                    <label class="kiosko-label">N° INASE</label>
                                    <input class="kiosko-input" type="text"
                                        placeholder="Número INASE"
                                        t-model="state.e_nro_inase"/>
                                </div>
                                <div class="kiosko-field">
                                    <label class="kiosko-label">Carta de Porte</label>
                                    <input class="kiosko-input" type="text"
                                        placeholder="N° Carta de Porte"
                                        t-model="state.e_carta_porte"/>
                                </div>
                                <div class="kiosko-field">
                                    <label class="kiosko-label">COT</label>
                                    <input class="kiosko-input" type="text"
                                        placeholder="Código de Operación de Traslado"
                                        t-model="state.e_cot"/>
                                </div>
                            </t>

                            <t t-if="state.saveError and state.activeTab === 'transporte'">
                                <div class="kiosko-error" t-esc="state.saveError"/>
                            </t>
                            <button class="kiosko-action-btn primary full"
                                t-att-disabled="state.saving"
                                t-on-click="saveTransporte">
                                <t t-if="state.saving">Guardando...</t>
                                <t t-if="!state.saving and state.saveOk">&#x2713; Guardado</t>
                                <t t-if="!state.saving and !state.saveOk">Guardar datos</t>
                            </button>
                        </t>

                    </div>
                </t>

                <!-- ═══ Tab: Artículos ═══ -->
                <t t-if="state.activeTab === 'articulos'">
                    <div class="kiosko-tab-content">

                        <t t-if="state.historicPesaje">
                            <div class="kiosko-readonly-banner">📜 Modo histórico — solo lectura</div>
                            <div class="kiosko-info-grid">
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Material</span>
                                    <span class="kiosko-info-value"
                                        t-esc="displayPesaje.product_name or '—'"/>
                                </div>
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Lote</span>
                                    <span class="kiosko-info-value"
                                        t-esc="displayPesaje.lot_name or '—'"/>
                                </div>
                                <t t-if="displayPesaje.notes">
                                    <div class="kiosko-info-row">
                                        <span class="kiosko-info-label">Observaciones</span>
                                        <span class="kiosko-info-value"
                                            t-esc="displayPesaje.notes"/>
                                    </div>
                                </t>
                                <div class="kiosko-info-row">
                                    <span class="kiosko-info-label">Descarte</span>
                                    <span class="kiosko-info-value"
                                        t-esc="displayPesaje.is_discard ? 'Sí' : 'No'"/>
                                </div>
                            </div>
                        </t>

                        <t t-if="!state.historicPesaje">
                            <div class="kiosko-field">
                                <label class="kiosko-label">Material</label>
                                <select class="kiosko-select" t-model="state.e_product_id">
                                    <option value="">— Sin asignar —</option>
                                    <t t-foreach="props.masters ? props.masters.products || [] : []"
                                        t-as="pr" t-key="pr.id">
                                        <option t-att-value="pr.id" t-esc="pr.name"/>
                                    </t>
                                </select>
                            </div>
                            <div class="kiosko-field">
                                <label class="kiosko-label">Lote</label>
                                <select class="kiosko-select" t-model="state.e_lot_id">
                                    <option value="">— Sin lote —</option>
                                    <t t-foreach="props.masters ? props.masters.lots || [] : []"
                                        t-as="l" t-key="l.id">
                                        <option t-att-value="l.id"
                                            t-esc="l.name + (l.product_name ? ' (' + l.product_name + ')' : '')"/>
                                    </t>
                                </select>
                            </div>
                            <div class="kiosko-field">
                                <label class="kiosko-label">Observaciones</label>
                                <textarea class="kiosko-textarea" rows="3"
                                    t-model="state.e_notes"
                                    placeholder="Observaciones sobre el material..."/>
                            </div>
                            <div class="kiosko-field-inline">
                                <input type="checkbox" id="kiosko-discard-tab"
                                    t-model="state.e_is_discard"/>
                                <label for="kiosko-discard-tab" class="kiosko-label">
                                    Es descarte
                                </label>
                            </div>

                            <t t-if="state.saveError and state.activeTab === 'articulos'">
                                <div class="kiosko-error" t-esc="state.saveError"/>
                            </t>
                            <button class="kiosko-action-btn primary full"
                                t-att-disabled="state.saving"
                                t-on-click="saveArticulos">
                                <t t-if="state.saving">Guardando...</t>
                                <t t-if="!state.saving and state.saveOk">&#x2713; Guardado</t>
                                <t t-if="!state.saving and !state.saveOk">Guardar datos</t>
                            </button>
                        </t>

                    </div>
                </t>

                <!-- ═══ Tab: Documentos ═══ -->
                <t t-if="state.activeTab === 'documentos'">
                    <KioskoDocumentosTab
                        pesaje="displayPesaje"
                        api="props.api"
                        onUpdate="(p) => this.onDocUpdate(p)"
                        readonly="state.historicPesaje !== null"/>
                </t>

                <!-- ═══ Tab: Histórico ═══ -->
                <t t-if="state.activeTab === 'historico'">
                    <KioskoHistoricoTab
                        api="props.api"
                        masters="props.masters"
                        onSelect="(p) => this.onHistoricoSelect(p)"/>
                </t>

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

    static components = { SubstateSelector, KioskoDocumentosTab, KioskoHistoricoTab };

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
        const p = this.props.pesaje;
        this.state = useState({
            activeTab: 'transaccion',
            historicPesaje: null,
            weightInput: '',
            weightTipo: 'entrada',
            weightError: '',
            showCancelModal: false,
            cancelReason: '',
            saving: false,
            saveError: '',
            saveOk: false,
            // editable fields
            e_campo_id:             String(p.campo_id || ''),
            e_parcela:              p.parcela || '',
            e_hibrido_id:           String(p.hibrido_id || ''),
            e_transport_company_id: String(p.transport_company_id || ''),
            e_vehicle_id:           String(p.vehicle_id || ''),
            e_driver_id:            String(p.driver_id || ''),
            e_product_id:           String(p.product_id || ''),
            e_lot_id:               String(p.lot_id || ''),
            e_notes:                p.notes || '',
            e_is_discard:           p.is_discard || false,
            e_nro_inase:            p.nro_inase || '',
            e_cot:                  p.cot || '',
            e_carta_porte:          p.carta_porte || '',
        });

        onWillUpdateProps((nextProps) => {
            this._syncEditState(nextProps.pesaje);
        });
    }

    _syncEditState(p) {
        Object.assign(this.state, {
            e_campo_id:             String(p.campo_id || ''),
            e_parcela:              p.parcela || '',
            e_hibrido_id:           String(p.hibrido_id || ''),
            e_transport_company_id: String(p.transport_company_id || ''),
            e_vehicle_id:           String(p.vehicle_id || ''),
            e_driver_id:            String(p.driver_id || ''),
            e_product_id:           String(p.product_id || ''),
            e_lot_id:               String(p.lot_id || ''),
            e_notes:                p.notes || '',
            e_is_discard:           p.is_discard || false,
            e_nro_inase:            p.nro_inase || '',
            e_cot:                  p.cot || '',
            e_carta_porte:          p.carta_porte || '',
        });
    }

    get displayPesaje() {
        return this.state.historicPesaje || this.props.pesaje;
    }

    get hasArFields() {
        return 'nro_inase' in this.props.pesaje;
    }

    switchTab(tab) {
        this.state.activeTab = tab;
        this.state.saveError = '';
        this.state.saveOk = false;
    }

    onHistoricoSelect(pesaje) {
        this.state.historicPesaje = pesaje;
        this.state.activeTab = 'transaccion';
    }

    clearHistoric() {
        this.state.historicPesaje = null;
        this.state.activeTab = 'transaccion';
    }

    onDocUpdate(updatedPesaje) {
        if (this.state.historicPesaje) return;
        this.props.onUpdate(updatedPesaje);
    }

    async _doSave(data) {
        this.state.saving = true;
        this.state.saveError = '';
        this.state.saveOk = false;
        try {
            const result = await this.props.api.updatePesaje(this.props.pesaje.id, data);
            if (result.success) {
                this.state.saveOk = true;
                this.props.onUpdate(result.pesaje);
                setTimeout(() => { this.state.saveOk = false; }, 2000);
            } else {
                this.state.saveError = result.error || 'Error al guardar';
            }
        } catch {
            this.state.saveError = 'Error de conexión';
        } finally {
            this.state.saving = false;
        }
    }

    saveTransaccion() {
        const s = this.state;
        return this._doSave({
            campo_id:   s.e_campo_id   ? parseInt(s.e_campo_id)   : false,
            parcela:    s.e_parcela    || '',
            hibrido_id: s.e_hibrido_id ? parseInt(s.e_hibrido_id) : false,
        });
    }

    saveTransporte() {
        const s = this.state;
        const data = {
            transport_company_id: s.e_transport_company_id ? parseInt(s.e_transport_company_id) : false,
            vehicle_id:           s.e_vehicle_id ? parseInt(s.e_vehicle_id) : false,
            driver_id:            s.e_driver_id  ? parseInt(s.e_driver_id)  : false,
        };
        if (this.hasArFields) {
            data.nro_inase   = s.e_nro_inase   || '';
            data.cot         = s.e_cot         || '';
            data.carta_porte = s.e_carta_porte || '';
        }
        return this._doSave(data);
    }

    saveArticulos() {
        const s = this.state;
        return this._doSave({
            product_id: s.e_product_id ? parseInt(s.e_product_id) : false,
            lot_id:     s.e_lot_id     ? parseInt(s.e_lot_id)     : false,
            notes:      s.e_notes      || '',
            is_discard: s.e_is_discard,
        });
    }

    padPress(key) {
        if (key === 'del') {
            this.state.weightInput = this.state.weightInput.slice(0, -1);
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
        const result = await this.props.api.updatePesaje(
            this.props.pesaje.id, { substate_id: substateId }
        );
        if (result.success && result.pesaje) {
            this.props.onUpdate(result.pesaje);
        }
    }

    openCancelModal() {
        this.state.cancelReason = '';
        this.state.showCancelModal = true;
    }

    async confirmCancel() {
        const result = await this.props.api.cancelPesaje(
            this.props.pesaje.id, this.state.cancelReason
        );
        if (result.success) {
            this.state.showCancelModal = false;
            this.props.onCancel(this.props.pesaje);
        }
    }

    stateLabel(state) {
        const labels = {
            precargado: 'Pre-Cargado', en_camino: 'En Camino',
            fuera_planta: 'Fuera de Planta', en_planta: 'En Planta',
            completado: 'Completado', cancelado: 'Cancelado',
        };
        return labels[state] || state;
    }
}
