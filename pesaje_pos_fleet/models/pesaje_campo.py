from odoo import fields, models

class PesajeCampo(models.Model):
    _name = 'pesaje.campo'
    _description = 'Campo'

    name = fields.Char('Nombre', required=True)
    location = fields.Char('Ubicación')
    active = fields.Boolean('Activo', default=True)
