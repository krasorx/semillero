/** @odoo-module */
import { Component, useState, xml } from "@odoo/owl";

export class KioskoForm extends Component {
    static template = xml`
        <div class="kiosko-form">
            <div class="kiosko-form-header">
                <h3 t-esc="props.pesaje ? 'Editar Pesaje' : 'Nuevo Pesaje'"/>
                <button class="kiosko-icon-btn" t-on-click="() => props.onCancel()">&#x2715;</button>
            </div>

            <div class="kiosko-form-body">
                <div class="kiosko-field">
                    <label class="kiosko-label">Camión *</label>
                    <select class="kiosko-select" t-model="state.vehicle_id">
                        <option value="">— Seleccionar —</option>
                        <t t-foreach="props.masters ? props.masters.vehicles : []" t-as="v" t-key="v.id">
                            <option t-att-value="v.id"
                                t-esc="v.license_plate + (v.name ? ' — ' + v.name : '')"/>
                        </t>
                    </select>
                </div>

                <div class="kiosko-field">
                    <label class="kiosko-label">Empresa Transportista</label>
                    <select class="kiosko-select" t-model="state.transport_company_id">
                        <option value="">— Sin asignar —</option>
                        <t t-foreach="props.masters ? props.masters.partners || [] : []" t-as="p" t-key="p.id">
                            <option t-att-value="p.id" t-esc="p.name"/>
                        </t>
                    </select>
                </div>

                <div class="kiosko-field">
                    <label class="kiosko-label">Conductor</label>
                    <select class="kiosko-select" t-model="state.driver_id">
                        <option value="">— Sin asignar —</option>
                        <t t-foreach="props.masters ? props.masters.employees : []" t-as="e" t-key="e.id">
                            <option t-att-value="e.id" t-esc="e.name"/>
                        </t>
                    </select>
                </div>

                <div class="kiosko-field">
                    <label class="kiosko-label">Material</label>
                    <select class="kiosko-select" t-model="state.product_id">
                        <option value="">— Sin asignar —</option>
                        <t t-foreach="props.masters ? props.masters.products : []" t-as="pr" t-key="pr.id">
                            <option t-att-value="pr.id" t-esc="pr.name"/>
                        </t>
                    </select>
                </div>

                <div class="kiosko-field">
                    <label class="kiosko-label">Lote</label>
                    <select class="kiosko-select" t-model="state.lot_id">
                        <option value="">— Sin lote —</option>
                        <t t-foreach="props.masters ? props.masters.lots : []" t-as="l" t-key="l.id">
                            <option t-att-value="l.id"
                                t-esc="l.name + (l.product_name ? ' (' + l.product_name + ')' : '')"/>
                        </t>
                    </select>
                </div>

                <div class="kiosko-form-row">
                    <div class="kiosko-field">
                        <label class="kiosko-label">Campo</label>
                        <select class="kiosko-select" t-model="state.campo_id">
                            <option value="">—</option>
                            <t t-foreach="props.masters ? props.masters.campos : []" t-as="c" t-key="c.id">
                                <option t-att-value="c.id" t-esc="c.name"/>
                            </t>
                        </select>
                    </div>
                    <div class="kiosko-field">
                        <label class="kiosko-label">Parcela</label>
                        <input class="kiosko-input" type="text"
                            placeholder="Ej: Lote 3"
                            t-model="state.parcela"/>
                    </div>
                </div>

                <div class="kiosko-field">
                    <label class="kiosko-label">Híbrido</label>
                    <select class="kiosko-select" t-model="state.hibrido_id">
                        <option value="">—</option>
                        <t t-foreach="props.masters ? props.masters.hibridos : []" t-as="h" t-key="h.id">
                            <option t-att-value="h.id" t-esc="h.name"/>
                        </t>
                    </select>
                </div>

                <div class="kiosko-field">
                    <label class="kiosko-label">Observaciones</label>
                    <textarea class="kiosko-textarea" rows="2"
                        t-model="state.notes"
                        placeholder="Observaciones sobre el material..."/>
                </div>

                <div class="kiosko-field-inline">
                    <input type="checkbox" id="kiosko-discard-chk" t-model="state.is_discard"/>
                    <label for="kiosko-discard-chk" class="kiosko-label">Es descarte</label>
                </div>

                <t t-if="state.error">
                    <div class="kiosko-error" t-esc="state.error"/>
                </t>
            </div>

            <div class="kiosko-form-footer">
                <button class="kiosko-action-btn ghost"
                    t-on-click="() => props.onCancel()">Cancelar</button>
                <button
                    class="kiosko-action-btn primary"
                    t-att-disabled="!state.vehicle_id || state.saving"
                    t-on-click="save">
                    <t t-if="state.saving">Guardando...</t>
                    <t t-if="!state.saving">Guardar</t>
                </button>
            </div>
        </div>
    `;

    static props = {
        masters: { type: Object, optional: true },
        pesaje: { type: Object, optional: true },
        api: Object,
        employee: Object,
        onSave: Function,
        onCancel: Function,
    };

    setup() {
        const p = this.props.pesaje;
        this.state = useState({
            vehicle_id:           p ? String(p.vehicle_id || '') : '',
            transport_company_id: p ? String(p.transport_company_id || '') : '',
            driver_id:            p ? String(p.driver_id  || '') : '',
            product_id:           p ? String(p.product_id || '') : '',
            lot_id:               p ? String(p.lot_id     || '') : '',
            campo_id:             p ? String(p.campo_id   || '') : '',
            parcela:              p ? (p.parcela || '') : '',
            hibrido_id:           p ? String(p.hibrido_id || '') : '',
            notes:                p ? (p.notes || '') : '',
            is_discard:           p ? (p.is_discard || false) : false,
            saving: false,
            error: '',
        });
    }

    async save() {
        if (!this.state.vehicle_id) {
            this.state.error = 'El camión es obligatorio';
            return;
        }
        this.state.saving = true;
        this.state.error = '';
        try {
            const data = {
                vehicle_id:           parseInt(this.state.vehicle_id),
                transport_company_id: this.state.transport_company_id ? parseInt(this.state.transport_company_id) : false,
                driver_id:            this.state.driver_id   ? parseInt(this.state.driver_id)   : false,
                product_id:           this.state.product_id  ? parseInt(this.state.product_id)  : false,
                lot_id:               this.state.lot_id      ? parseInt(this.state.lot_id)      : false,
                campo_id:             this.state.campo_id    ? parseInt(this.state.campo_id)    : false,
                parcela:              this.state.parcela || '',
                hibrido_id:           this.state.hibrido_id  ? parseInt(this.state.hibrido_id)  : false,
                notes:                this.state.notes || '',
                is_discard:           this.state.is_discard,
                employee_id:          this.props.employee.id,
            };
            let result;
            if (this.props.pesaje) {
                result = await this.props.api.updatePesaje(this.props.pesaje.id, data);
            } else {
                result = await this.props.api.createPesaje(data);
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
