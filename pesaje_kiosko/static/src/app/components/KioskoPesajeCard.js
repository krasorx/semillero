/** @odoo-module */
import { Component, xml } from "@odoo/owl";

export class KioskoPesajeCard extends Component {
    static template = xml`
        <div
            t-attf-class="kiosko-pesaje-card {{ props.selected ? 'selected' : '' }}"
            t-on-click="() => props.onSelect(props.pesaje)">
            <div class="kiosko-card-row">
                <span class="kiosko-card-plate" t-esc="props.pesaje.license_plate or props.pesaje.vehicle_name or '—'"/>
                <t t-if="props.pesaje.net_weight">
                    <span class="kiosko-card-weight" t-esc="(props.pesaje.net_weight || 0).toFixed(0) + ' kg'"/>
                </t>
            </div>
            <div class="kiosko-card-driver" t-esc="props.pesaje.driver_name or '—'"/>
            <div class="kiosko-card-row kiosko-card-meta">
                <span class="kiosko-card-product" t-esc="props.pesaje.product_name or '—'"/>
                <t t-if="props.pesaje.time_in_plant">
                    <span class="kiosko-card-time" t-esc="formatTime(props.pesaje.time_in_plant)"/>
                </t>
            </div>
            <t t-if="props.pesaje.substate_name">
                <div class="kiosko-card-substate">
                    <span class="kiosko-substate-pill" t-esc="props.pesaje.substate_name"/>
                </div>
            </t>
        </div>
    `;

    static props = {
        pesaje: Object,
        selected: Boolean,
        onSelect: Function,
    };

    formatTime(hours) {
        if (!hours) return '';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
}
