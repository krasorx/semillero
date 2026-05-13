/** @odoo-module */
import { Component, useState, useRef, xml } from "@odoo/owl";

export class KioskoDocumentosTab extends Component {
    static template = xml`
        <div class="kiosko-tab-content">
            <t t-if="!props.readonly">
                <div class="kiosko-upload-zone" t-on-click="triggerUpload"
                    t-on-dragover.prevent="" t-on-drop="onDrop">
                    <div class="kiosko-upload-icon">📎</div>
                    <div class="kiosko-upload-text">Tocá o arrastrá para subir un archivo</div>
                    <input t-ref="fileInput" type="file" style="display:none"
                        t-on-change="onFileChange"/>
                </div>
                <t t-if="state.uploading">
                    <div class="kiosko-upload-progress">Subiendo...</div>
                </t>
                <t t-if="state.uploadError">
                    <div class="kiosko-error" t-esc="state.uploadError"/>
                </t>
            </t>
            <t t-if="props.readonly">
                <div class="kiosko-readonly-banner">📜 Modo histórico — documentos de solo lectura</div>
            </t>

            <div class="kiosko-attachments-list">
                <t t-if="!attachments.length">
                    <div class="kiosko-empty-state">Sin archivos adjuntos</div>
                </t>
                <t t-foreach="attachments" t-as="att" t-key="att.id">
                    <div class="kiosko-attachment-item">
                        <span class="kiosko-attachment-icon" t-esc="mimeIcon(att.mimetype)"/>
                        <span class="kiosko-attachment-name" t-esc="att.name"/>
                    </div>
                </t>
            </div>
        </div>
    `;

    static props = {
        pesaje: Object,
        api: Object,
        onUpdate: Function,
        readonly: { type: Boolean, optional: true },
    };

    setup() {
        this.fileInputRef = useRef('fileInput');
        this.state = useState({ uploading: false, uploadError: '' });
    }

    get attachments() {
        return this.props.pesaje.attachment_ids || [];
    }

    triggerUpload() {
        if (this.fileInputRef.el) {
            this.fileInputRef.el.click();
        }
    }

    onDrop(ev) {
        ev.preventDefault();
        const file = ev.dataTransfer.files[0];
        if (file) this._upload(file);
    }

    onFileChange(ev) {
        const file = ev.target.files[0];
        if (file) this._upload(file);
    }

    async _upload(file) {
        this.state.uploading = true;
        this.state.uploadError = '';
        try {
            const result = await this.props.api.uploadAttachment(this.props.pesaje.id, file);
            if (result.success) {
                const updated = {
                    ...this.props.pesaje,
                    attachment_ids: [
                        ...(this.props.pesaje.attachment_ids || []),
                        result.attachment,
                    ],
                };
                this.props.onUpdate(updated);
            } else {
                this.state.uploadError = result.error || 'Error al subir archivo';
            }
        } catch {
            this.state.uploadError = 'Error de conexión';
        } finally {
            this.state.uploading = false;
        }
    }

    mimeIcon(mimetype) {
        if (!mimetype) return '📄';
        if (mimetype.startsWith('image/')) return '🖼️';
        if (mimetype === 'application/pdf') return '📄';
        return '📎';
    }
}
