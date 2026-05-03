/** @odoo-module */
import { Component, useState, xml } from "@odoo/owl";

export class PesajeFormModal extends Component {
    static template = xml`
        <div class="pos-modal-overlay" t-on-click.self="props.onCancel">
            <div class="pos-modal pos-modal-lg">
                <div class="pos-modal-title">
                    <t t-if="props.pesaje">Editar Pesaje</t>
                    <t t-else="">Nuevo Pesaje / Pre-carga</t>
                </div>

                <div class="pos-grid-2 pos-gap-3 pos-mb-3">
                    <div>
                        <label class="pos-label">Camión *</label>
                        <select class="pos-select" t-model="state.vehicle_id">
                            <option value="">— Seleccionar —</option>
                            <t t-foreach="props.masters.vehicles" t-as="v" t-key="v.id">
                                <option t-att-value="v.id">
                                    <t t-esc="v.license_plate ? v.license_plate + ' — ' + v.name : v.name"/>
                                </option>
                            </t>
                        </select>
                    </div>
                    <div>
                        <label class="pos-label">Chófer</label>
                        <select class="pos-select" t-model="state.driver_id">
                            <option value="">— Ninguno —</option>
                            <t t-foreach="props.masters.employees" t-as="e" t-key="e.id">
                                <option t-att-value="e.id" t-esc="e.name"/>
                            </t>
                        </select>
                    </div>
                </div>

                <div class="pos-grid-2 pos-gap-3 pos-mb-3">
                    <div>
                        <label class="pos-label">Material</label>
                        <select class="pos-select" t-model="state.product_id">
                            <option value="">— Ninguno —</option>
                            <t t-foreach="props.masters.products" t-as="p" t-key="p.id">
                                <option t-att-value="p.id" t-esc="p.name"/>
                            </t>
                        </select>
                    </div>
                    <div>
                        <label class="pos-label">Lote</label>
                        <select class="pos-select" t-model="state.lot_id">
                            <option value="">— Ninguno —</option>
                            <t t-foreach="filteredLots" t-as="l" t-key="l.id">
                                <option t-att-value="l.id" t-esc="l.name"/>
                            </t>
                        </select>
                    </div>
                </div>

                <div class="pos-grid-2 pos-gap-3 pos-mb-3">
                    <div>
                        <label class="pos-label">Campo</label>
                        <select class="pos-select" t-model="state.campo_id">
                            <option value="">— Ninguno —</option>
                            <t t-foreach="props.masters.campos" t-as="c" t-key="c.id">
                                <option t-att-value="c.id" t-esc="c.name"/>
                            </t>
                        </select>
                    </div>
                    <div>
                        <label class="pos-label">Híbrido</label>
                        <select class="pos-select" t-model="state.hibrido_id">
                            <option value="">— Ninguno —</option>
                            <t t-foreach="props.masters.hibridos" t-as="h" t-key="h.id">
                                <option t-att-value="h.id" t-esc="h.name"/>
                            </t>
                        </select>
                    </div>
                </div>

                <div class="pos-mb-3">
                    <label class="pos-label">Observaciones</label>
                    <textarea class="pos-input" rows="2" t-model="state.notes" style="resize:vertical;"/>
                </div>

                <div class="pos-flex pos-items-center pos-gap-3 pos-mb-4">
                    <label class="pos-label" style="margin:0;">Es Descarte</label>
                    <label class="pos-toggle">
                        <input type="checkbox" t-model="state.is_discard"/>
                        <span class="pos-toggle-slider"/>
                    </label>
                </div>

                <t t-if="state.error">
                    <div class="pos-text-red pos-text-sm pos-mb-3" t-esc="state.error"/>
                </t>

                <div class="pos-grid-2 pos-gap-3">
                    <button class="pos-btn pos-btn-gray" t-on-click="props.onCancel">Cancelar</button>
                    <button class="pos-btn pos-btn-green" t-on-click="save" t-att-disabled="state.saving">
                        <t t-if="state.saving">Guardando...</t>
                        <t t-else="">&#x2713; Guardar</t>
                    </button>
                </div>
            </div>
        </div>
    `;
    static props = {
        masters: Object,
        pesaje: { type: Object, optional: true },
        api: Object,
        employee: Object,
        onSave: Function,
        onCancel: Function,
    };

    setup() {
        const p = this.props.pesaje;
        this.state = useState({
            vehicle_id: p ? String(p.vehicle_id || '') : '',
            driver_id: p ? String(p.driver_id || '') : '',
            product_id: p ? String(p.product_id || '') : '',
            lot_id: p ? String(p.lot_id || '') : '',
            campo_id: p ? String(p.campo_id || '') : '',
            hibrido_id: p ? String(p.hibrido_id || '') : '',
            notes: p ? p.notes || '' : '',
            is_discard: p ? p.is_discard : false,
            error: '',
            saving: false,
        });
    }

    get filteredLots() {
        const pid = parseInt(this.state.product_id);
        if (!pid) return this.props.masters.lots || [];
        return (this.props.masters.lots || []).filter(l => l.product_id === pid);
    }

    async save() {
        if (!this.state.vehicle_id) {
            this.state.error = 'El camión es obligatorio.';
            return;
        }
        this.state.saving = true;
        this.state.error = '';
        const vals = {
            vehicle_id: parseInt(this.state.vehicle_id) || false,
            driver_id: parseInt(this.state.driver_id) || false,
            product_id: parseInt(this.state.product_id) || false,
            lot_id: parseInt(this.state.lot_id) || false,
            campo_id: parseInt(this.state.campo_id) || false,
            hibrido_id: parseInt(this.state.hibrido_id) || false,
            notes: this.state.notes,
            is_discard: this.state.is_discard,
            employee_id: this.props.employee.id,
        };
        try {
            let result;
            if (this.props.pesaje && this.props.pesaje.id) {
                result = await this.props.api.updatePesaje(this.props.pesaje.id, vals);
            } else {
                result = await this.props.api.createPesaje(vals);
            }
            if (result.success) {
                this.props.onSave(result.pesaje);
            } else {
                this.state.error = result.error || 'Error al guardar';
            }
        } catch (e) {
            this.state.error = 'Error de conexión';
        } finally {
            this.state.saving = false;
        }
    }
}
