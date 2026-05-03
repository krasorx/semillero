/** @odoo-module */
import { Component, xml } from "@odoo/owl";

export class KpiCard extends Component {
    static template = xml`
        <div class="pos-kpi-card">
            <div class="pos-kpi-value" t-att-style="'color:' + (props.color || 'var(--text-white)')">
                <t t-esc="props.value"/>
            </div>
            <div class="pos-kpi-label" t-esc="props.label"/>
        </div>
    `;
    static props = {
        value: [String, Number],
        label: String,
        color: { type: String, optional: true },
    };
}
