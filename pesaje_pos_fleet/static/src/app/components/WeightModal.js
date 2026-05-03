/** @odoo-module */
import { Component, useState, xml } from "@odoo/owl";

export class WeightModal extends Component {
    static template = xml`
        <div class="pos-modal-overlay" t-on-click.self="props.onCancel">
            <div class="pos-modal">
                <div class="pos-modal-title" t-esc="props.title or 'Registrar Peso'"/>
                <div class="pos-weight-display">
                    <t t-if="state.input">
                        <t t-esc="state.input"/> kg
                    </t>
                    <t t-else="">
                        <span style="color:var(--text-400);font-size:1.5rem;">0.00 kg</span>
                    </t>
                </div>
                <div class="pos-grid-3 pos-gap-2 pos-mb-4">
                    <t t-foreach="['7','8','9','4','5','6','1','2','3','.','0','&#x232B;']" t-as="k" t-key="k">
                        <button class="pos-pin-btn" t-on-click="() => this.pressKey(k)">
                            <t t-esc="k"/>
                        </button>
                    </t>
                </div>
                <div class="pos-grid-2 pos-gap-3">
                    <button class="pos-btn pos-btn-gray" t-on-click="props.onCancel">Cancelar</button>
                    <button
                        class="pos-btn pos-btn-green"
                        t-att-disabled="!state.input"
                        t-on-click="confirm">
                        &#x2713; Confirmar
                    </button>
                </div>
            </div>
        </div>
    `;
    static props = {
        title: { type: String, optional: true },
        onConfirm: Function,
        onCancel: Function,
    };

    setup() {
        this.state = useState({ input: '' });
    }

    pressKey(k) {
        if (k === '⌫') {
            this.state.input = this.state.input.slice(0, -1);
        } else if (k === '.') {
            if (!this.state.input.includes('.')) this.state.input += '.';
        } else {
            if (this.state.input.length < 10) this.state.input += k;
        }
    }

    confirm() {
        const val = parseFloat(this.state.input);
        if (!isNaN(val) && val > 0) {
            this.props.onConfirm(val);
        }
    }
}
