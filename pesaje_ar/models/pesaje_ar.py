from odoo import fields, models


class PesajePesaje(models.Model):
    _inherit = 'pesaje.pesaje'

    nro_inase = fields.Char('N° INASE', tracking=True)
    cot = fields.Char('COT — Código de Operación de Traslado', tracking=True)
    carta_porte = fields.Char('Carta de Porte', tracking=True)
