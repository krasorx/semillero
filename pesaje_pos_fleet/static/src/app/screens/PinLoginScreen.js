/** @odoo-module */
import { Component, useState, xml } from "@odoo/owl";

export class PinLoginScreen extends Component {
    static template = xml`
        <div class="pos-screen pos-flex pos-items-center pos-justify-center pos-bg-900">
            <div style="width:100%;max-width:28rem;">
                <div class="pos-text-center pos-mb-4">
                    <div style="font-size:3rem;">&#x2696;&#xFE0F;</div>
                    <h1 class="pos-text-2xl pos-font-bold pos-text-white">Balanza POS</h1>
                    <p class="pos-text-gray pos-text-sm">Sistema de Pesaje</p>
                </div>

                <div class="pos-card pos-mb-4">
                    <label class="pos-label">Seleccionar Empleado</label>
                    <select class="pos-select" t-on-change="onEmployeeChange">
                        <option value="">— Seleccionar —</option>
                        <t t-foreach="props.employees" t-as="emp" t-key="emp.id">
                            <option t-att-value="emp.id" t-esc="emp.name"/>
                        </t>
                    </select>
                </div>

                <div class="pos-card" t-if="state.selectedEmployee">
                    <div class="pos-text-center pos-mb-4">
                        <div class="pos-text-lg pos-font-semibold" t-esc="state.selectedEmployee.name"/>
                        <div class="pos-pin-display pos-mb-4">
                            <t t-esc="'•'.repeat(state.pin.length) || '——'"/>
                        </div>
                    </div>
                    <div class="pos-grid-3" style="gap:0.5rem;margin-bottom:0.75rem;">
                        <t t-foreach="['1','2','3','4','5','6','7','8','9','&#x232B;','0','OK']" t-as="k" t-key="k">
                            <button
                                class="pos-pin-btn"
                                t-att-style="k === 'OK' ? 'background:var(--green-600)' : k === '⌫' ? 'background:var(--bg-600)' : ''"
                                t-on-click="() => this.pressKey(k)">
                                <t t-esc="k"/>
                            </button>
                        </t>
                    </div>
                    <t t-if="state.error">
                        <div class="pos-text-red pos-text-center pos-text-sm pos-mt-2" t-esc="state.error"/>
                    </t>
                    <t t-if="state.loading">
                        <div class="pos-flex pos-justify-center pos-mt-2">
                            <div class="pos-spinner"/>
                        </div>
                    </t>
                </div>
            </div>
        </div>
    `;
    static props = {
        employees: Array,
        api: Object,
        onLogin: Function,
    };

    setup() {
        this.state = useState({
            selectedEmployee: null,
            pin: '',
            error: '',
            loading: false,
        });
    }

    onEmployeeChange(ev) {
        const id = parseInt(ev.target.value);
        this.state.selectedEmployee = this.props.employees.find(e => e.id === id) || null;
        this.state.pin = '';
        this.state.error = '';
    }

    pressKey(k) {
        if (k === '⌫') {
            this.state.pin = this.state.pin.slice(0, -1);
            this.state.error = '';
        } else if (k === 'OK') {
            this._doLogin();
        } else {
            if (this.state.pin.length < 8) {
                this.state.pin += k;
                this.state.error = '';
            }
        }
    }

    async _doLogin() {
        if (!this.state.selectedEmployee || !this.state.pin) return;
        this.state.loading = true;
        this.state.error = '';
        try {
            const result = await this.props.api.authEmployee(
                this.state.selectedEmployee.id,
                this.state.pin
            );
            if (result.success) {
                this.props.onLogin(result.employee);
            } else {
                this.state.error = result.error || 'PIN incorrecto';
                this.state.pin = '';
            }
        } catch (e) {
            this.state.error = 'Error de conexión';
        } finally {
            this.state.loading = false;
        }
    }
}
