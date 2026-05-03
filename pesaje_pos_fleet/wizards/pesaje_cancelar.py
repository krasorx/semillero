from odoo import api, fields, models, _
from odoo.exceptions import UserError

class PesajeCancelar(models.TransientModel):
    _name = 'pesaje.cancelar'
    _description = 'Wizard: Cancelar Pesaje'

    pesaje_id = fields.Many2one('pesaje.pesaje', 'Pesaje', required=True)
    reason = fields.Text('Motivo', required=True)

    def action_cancel(self):
        self.ensure_one()
        if not self.reason:
            raise UserError(_('Debe ingresar un motivo de cancelación.'))
        self.pesaje_id.cancel_reason = self.reason
        self.pesaje_id.action_cancel()
        return {'type': 'ir.actions.act_window_close'}
