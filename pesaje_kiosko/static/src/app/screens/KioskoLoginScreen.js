/** @odoo-module */
import { Component, useState, xml } from "@odoo/owl";

export class KioskoLoginScreen extends Component {
    static template = xml`
        <div class="kiosko-login">
            <div class="kiosko-login-card">
                <div class="kiosko-login-header">
                    <div class="kiosko-login-icon">&#x2696;</div>
                    <h1 class="kiosko-login-title">Sistema de Pesaje</h1>
                    <p class="kiosko-login-subtitle">Identificación de operario</p>
                </div>

                <div class="kiosko-login-body">
                    <div class="kiosko-field">
                        <label class="kiosko-label">Operario</label>
                        <select class="kiosko-select" t-model="state.selectedEmpId">
                            <option value="">— Seleccionar —</option>
                            <t t-foreach="props.employees" t-as="emp" t-key="emp.id">
                                <option t-att-value="emp.id" t-esc="emp.name"/>
                            </t>
                        </select>
                    </div>

                    <div class="kiosko-pin-display">
                        <t t-foreach="pinDots()" t-as="dot" t-key="dot_index">
                            <div t-attf-class="kiosko-pin-dot {{ dot ? 'filled' : '' }}"/>
                        </t>
                    </div>

                    <div class="kiosko-pinpad">
                        <t t-foreach="[1,2,3,4,5,6,7,8,9,null,0,'del']" t-as="key" t-key="key_index">
                            <button
                                t-if="key !== null"
                                t-attf-class="kiosko-pinpad-btn {{ key === 'del' ? 'delete' : '' }}"
                                t-on-click="() => this.pressKey(key)">
                                <t t-if="key !== 'del'" t-esc="key"/>
                                <t t-if="key === 'del'">&#x232B;</t>
                            </button>
                            <div t-if="key === null" class="kiosko-pinpad-empty"/>
                        </t>
                    </div>

                    <t t-if="state.error">
                        <div class="kiosko-error" t-esc="state.error"/>
                    </t>

                    <button
                        class="kiosko-btn-primary kiosko-btn-full"
                        t-att-disabled="!state.selectedEmpId || state.pin.length &lt; 4 || state.loading"
                        t-on-click="doLogin">
                        <t t-if="state.loading">Verificando...</t>
                        <t t-if="!state.loading">Ingresar</t>
                    </button>
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
            selectedEmpId: '',
            pin: '',
            error: '',
            loading: false,
        });
    }

    pinDots() {
        return Array.from({ length: 6 }, (_, i) => i < this.state.pin.length);
    }

    pressKey(key) {
        if (key === 'del') {
            this.state.pin = this.state.pin.slice(0, -1);
        } else if (this.state.pin.length < 8) {
            this.state.pin += String(key);
        }
        this.state.error = '';
    }

    async doLogin() {
        if (!this.state.selectedEmpId || this.state.pin.length < 4) return;
        this.state.loading = true;
        this.state.error = '';
        try {
            const result = await this.props.api.authEmployee(
                parseInt(this.state.selectedEmpId),
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
