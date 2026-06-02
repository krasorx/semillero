from odoo import _, api, fields, models


class StockPicking(models.Model):
    _inherit = 'stock.picking'

    pesaje_id = fields.Many2one('pesaje.pesaje', 'Pesaje de Despacho', copy=False)
    pesaje_count = fields.Integer(compute='_compute_pesaje_count')

    @api.depends('pesaje_id')
    def _compute_pesaje_count(self):
        for rec in self:
            rec.pesaje_count = 1 if rec.pesaje_id else 0

    def action_create_pesaje_despacho(self):
        self.ensure_one()
        if not self.pesaje_id:
            pesaje = self.env['pesaje.pesaje'].create({
                'operation_type': 'despacho',
                'picking_id': self.id,
                'customer_id': self.partner_id.id,
                'state': 'fuera_planta',
            })
            self.pesaje_id = pesaje
        return {
            'type': 'ir.actions.act_window',
            'name': _('Pesaje de Despacho'),
            'res_model': 'pesaje.pesaje',
            'res_id': self.pesaje_id.id,
            'view_mode': 'form',
            'target': 'current',
        }
