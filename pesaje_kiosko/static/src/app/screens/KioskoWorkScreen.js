/** @odoo-module */
import { Component, useState, onMounted, onWillUnmount, xml } from "@odoo/owl";
import { KioskoPesajeCard } from "../components/KioskoPesajeCard";
import { KioskoPesajeDetail } from "../components/KioskoPesajeDetail";
import { KioskoForm } from "../components/KioskoForm";

const STATE_TABS = [
    { key: 'precargado',   label: 'Precargado',      icon: '&#x1F4CB;' },
    { key: 'en_camino',    label: 'En Camino',        icon: '&#x1F69B;' },
    { key: 'fuera_planta', label: 'Fuera de Planta',  icon: '&#x1F17F;' },
    { key: 'en_planta',    label: 'En Planta',        icon: '&#x1F3ED;' },
];

export class KioskoWorkScreen extends Component {
    static template = xml`
        <div class="kiosko-screen">
            <div class="kiosko-header">
                <div class="kiosko-header-left">
                    <span class="kiosko-header-icon">&#x2696;</span>
                    <span class="kiosko-header-title">Pesajes</span>
                </div>

                <div class="kiosko-header-center">
                    <t t-foreach="stateTabs" t-as="tab" t-key="tab.key">
                        <button
                            t-attf-class="kiosko-state-tab {{ state.activeTab === tab.key ? 'active' : '' }}"
                            t-on-click="() => this.setTab(tab.key)">
                            <span t-out="tab.icon"/>
                            <span class="kiosko-tab-label" t-esc="tab.label"/>
                            <span class="kiosko-tab-badge" t-esc="countFor(tab.key)"/>
                        </button>
                    </t>
                </div>

                <div class="kiosko-header-right">
                    <span class="kiosko-emp-badge">
                        <span t-attf-class="kiosko-emp-dot {{ props.isOnline ? 'online' : 'offline' }}"/>
                        <t t-esc="props.employee.name"/>
                    </span>
                    <t t-if="props.syncPending > 0">
                        <span class="kiosko-sync-pending" t-esc="props.syncPending + ' pendientes'"/>
                    </t>
                    <button class="kiosko-header-btn" t-on-click="() => props.onToDashboard()">Dashboard</button>
                    <button class="kiosko-header-btn ghost" t-on-click="() => props.onLogout()">Salir</button>
                </div>
            </div>

            <div class="kiosko-body">
                <div class="kiosko-list-panel">
                    <div class="kiosko-list-toolbar">
                        <button class="kiosko-btn-primary" t-on-click="openNewForm">+ Nuevo</button>
                        <button class="kiosko-icon-btn" t-on-click="_loadPesajes" title="Actualizar">&#x21BA;</button>
                    </div>

                    <div class="kiosko-list-content">
                        <t t-if="state.loading">
                            <div class="kiosko-list-loading">
                                <div class="kiosko-spinner"/>
                            </div>
                        </t>
                        <t t-if="!state.loading and filteredPesajes.length === 0">
                            <div class="kiosko-empty">Sin pesajes en este estado</div>
                        </t>
                        <t t-foreach="filteredPesajes" t-as="p" t-key="p.id">
                            <KioskoPesajeCard
                                pesaje="p"
                                selected="!!(state.selected and state.selected.id === p.id)"
                                onSelect="(pesaje) => this.selectPesaje(pesaje)"/>
                        </t>
                    </div>
                </div>

                <div class="kiosko-detail-panel">
                    <t t-if="!state.selected and !state.showForm">
                        <div class="kiosko-empty-detail">
                            <div class="kiosko-empty-icon">&#x2696;</div>
                            <div class="kiosko-empty-text">Seleccioná un pesaje</div>
                            <div class="kiosko-empty-hint">o creá uno nuevo con el botón + Nuevo</div>
                        </div>
                    </t>
                    <t t-if="state.showForm">
                        <KioskoForm
                            masters="props.masters"
                            pesaje="state.editingPesaje"
                            api="props.api"
                            employee="props.employee"
                            onSave="(p) => this.onFormSave(p)"
                            onCancel="() => { state.showForm = false; state.editingPesaje = null; }"/>
                    </t>
                    <t t-if="state.selected and !state.showForm">
                        <KioskoPesajeDetail
                            pesaje="state.selected"
                            masters="props.masters"
                            api="props.api"
                            employee="props.employee"
                            onEdit="() => this.openEditForm()"
                            onUpdate="(p) => this.onDetailUpdate(p)"
                            onCancel="(p) => this.onDetailCancel(p)"/>
                    </t>
                </div>
            </div>
        </div>
    `;
    static components = { KioskoPesajeCard, KioskoPesajeDetail, KioskoForm };
    static props = {
        api: Object,
        masters: { type: Object, optional: true },
        employee: Object,
        isOnline: Boolean,
        syncPending: Number,
        onToDashboard: Function,
        onLogout: Function,
    };

    setup() {
        this.stateTabs = STATE_TABS;
        this.state = useState({
            pesajes: [],
            selected: null,
            loading: false,
            activeTab: 'en_planta',
            showForm: false,
            editingPesaje: null,
        });
        this._interval = null;

        onMounted(async () => {
            await this._loadPesajes();
            this._interval = setInterval(() => this._loadPesajes(), 30000);
        });
        onWillUnmount(() => {
            if (this._interval) clearInterval(this._interval);
        });
    }

    get filteredPesajes() {
        return this.state.pesajes.filter(p => p.state === this.state.activeTab);
    }

    countFor(stateKey) {
        return this.state.pesajes.filter(p => p.state === stateKey).length;
    }

    setTab(key) {
        this.state.activeTab = key;
        this.state.selected = null;
        this.state.showForm = false;
    }

    async _loadPesajes() {
        this.state.loading = true;
        try {
            const data = await this.props.api.loadPesajes();
            this.state.pesajes = data.pesajes || [];
            if (this.state.selected) {
                const updated = this.state.pesajes.find(p => p.id === this.state.selected.id);
                if (updated) this.state.selected = updated;
            }
        } catch (e) {
            console.warn('loadPesajes error', e);
        } finally {
            this.state.loading = false;
        }
    }

    selectPesaje(pesaje) {
        this.state.selected = pesaje;
        this.state.showForm = false;
    }

    openNewForm() {
        this.state.editingPesaje = null;
        this.state.selected = null;
        this.state.showForm = true;
    }

    openEditForm() {
        this.state.editingPesaje = this.state.selected;
        this.state.showForm = true;
    }

    onFormSave(pesaje) {
        this.state.showForm = false;
        this.state.editingPesaje = null;
        if (pesaje) {
            const idx = this.state.pesajes.findIndex(p => p.id === pesaje.id);
            if (idx >= 0) this.state.pesajes[idx] = pesaje;
            else this.state.pesajes.unshift(pesaje);
            this.state.selected = pesaje;
            if (pesaje.state && STATE_TABS.find(t => t.key === pesaje.state)) {
                this.state.activeTab = pesaje.state;
            }
        }
        this._loadPesajes();
    }

    onDetailUpdate(pesaje) {
        if (!pesaje) return;
        this.state.selected = pesaje;
        const idx = this.state.pesajes.findIndex(p => p.id === pesaje.id);
        if (idx >= 0) this.state.pesajes[idx] = pesaje;
        else this._loadPesajes();
        if (pesaje.state && pesaje.state !== this.state.activeTab) {
            this.state.activeTab = pesaje.state;
        }
    }

    onDetailCancel(pesaje) {
        this.state.pesajes = this.state.pesajes.filter(p => p.id !== pesaje.id);
        this.state.selected = null;
    }
}
