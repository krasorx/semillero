/** @odoo-module */
import { Component, xml } from "@odoo/owl";

export class TruckCard extends Component {
    static template = xml`
        <div
            t-att-class="'pos-truck-card ' + (props.selected ? 'selected' : '') + (props.pesaje.substate_id and props.pesaje.is_problem ? ' problem' : '')"
            t-on-click="() => props.onSelect(props.pesaje)">
            <div class="pos-flex pos-justify-between pos-items-center">
                <span class="pos-truck-card-plate">&#x1F69B; <t t-esc="props.pesaje.license_plate or props.pesaje.vehicle_name"/></span>
                <t t-if="props.pesaje.substate_name">
                    <span class="pos-badge pos-badge-blue" t-esc="props.pesaje.substate_name"/>
                </t>
            </div>
            <div class="pos-truck-card-info">
                <span t-esc="props.pesaje.driver_name or '—'"/>
                <t t-if="props.pesaje.product_name">
                    · <span t-esc="props.pesaje.product_name"/>
                </t>
            </div>
            <div class="pos-flex pos-justify-between pos-mt-2">
                <span class="pos-truck-time" t-esc="formatTime(props.pesaje.time_in_plant)"/>
                <t t-if="props.pesaje.net_weight">
                    <span class="pos-text-sm pos-text-green pos-font-bold">
                        <t t-esc="props.pesaje.net_weight.toFixed(0)"/> kg neto
                    </span>
                </t>
            </div>
        </div>
    `;
    static props = {
        pesaje: Object,
        selected: { type: Boolean, optional: true },
        onSelect: Function,
    };

    formatTime(hours) {
        if (!hours) return '';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
}
