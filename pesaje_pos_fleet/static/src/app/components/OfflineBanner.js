/** @odoo-module */
import { Component, xml } from "@odoo/owl";

export class OfflineBanner extends Component {
    static template = xml`
        <div t-if="!props.isOnline" class="pos-offline-banner">
            <span>&#x26A0;</span>
            <span>SIN CONEXIÓN — trabajando en modo offline</span>
        </div>
    `;
    static props = { isOnline: Boolean };
}
