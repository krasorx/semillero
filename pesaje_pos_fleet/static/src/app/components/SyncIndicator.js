/** @odoo-module */
import { Component, xml } from "@odoo/owl";

export class SyncIndicator extends Component {
    static template = xml`
        <div class="pos-flex pos-items-center pos-gap-2 pos-text-sm pos-text-gray">
            <span t-att-class="'pos-sync-dot ' + (props.pending > 0 ? 'pending' : 'synced')"/>
            <t t-if="props.pending > 0">
                <span><t t-esc="props.pending"/> pendiente(s)</span>
            </t>
            <t t-else="">
                <span>Sincronizado</span>
            </t>
        </div>
    `;
    static props = { pending: Number };
}
