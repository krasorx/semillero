/** @odoo-module */
import { Component, xml } from "@odoo/owl";

export class BigButton extends Component {
    static template = xml`
        <button
            class="pos-btn pos-btn-lg pos-w-full"
            t-att-class="props.colorClass || 'pos-btn-blue'"
            t-att-disabled="props.disabled"
            t-on-click="() => props.onClick()">
            <span t-if="props.icon" t-esc="props.icon"/>
            <span t-esc="props.label"/>
        </button>
    `;
    static props = {
        label: String,
        onClick: Function,
        colorClass: { type: String, optional: true },
        icon: { type: String, optional: true },
        disabled: { type: Boolean, optional: true },
    };
}
