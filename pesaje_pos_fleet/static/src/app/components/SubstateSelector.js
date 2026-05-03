/** @odoo-module */
import { Component, xml } from "@odoo/owl";

const ODOO_COLORS = ['#6b7280','#ef4444','#22c55e','#eab308','#3b82f6','#a855f7','#f97316','#ec4899','#06b6d4','#84cc16','#14b8a6','#f59e0b'];

export class SubstateSelector extends Component {
    static template = xml`
        <div class="pos-flex pos-flex-col pos-gap-2">
            <label class="pos-label">Subestado</label>
            <div class="pos-flex pos-gap-2" style="flex-wrap:wrap;">
                <t t-foreach="props.substates" t-as="sub" t-key="sub.id">
                    <button
                        class="pos-btn pos-text-sm"
                        t-att-style="'background:' + getColor(sub.color) + ';min-height:2.5rem;padding:0.4rem 0.9rem;' + (props.selected === sub.id ? 'outline:2px solid white;' : '')"
                        t-on-click="() => props.onSelect(sub.id)">
                        <t t-esc="sub.name"/>
                    </button>
                </t>
            </div>
        </div>
    `;
    static props = {
        substates: Array,
        selected: { type: Number, optional: true },
        onSelect: Function,
    };

    getColor(idx) {
        return ODOO_COLORS[idx] || ODOO_COLORS[0];
    }
}
