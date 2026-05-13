from odoo import fields, models


class PesajeBalanza(models.Model):
    _name = 'pesaje.balanza'
    _description = 'Balanza'

    name = fields.Char('Nombre', required=True)
    active = fields.Boolean('Activo', default=True)
    notes = fields.Char('Notas')
