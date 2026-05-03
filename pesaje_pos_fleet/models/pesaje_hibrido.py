from odoo import fields, models

class PesajeHibrido(models.Model):
    _name = 'pesaje.hibrido'
    _description = 'Híbrido'

    name = fields.Char('Nombre', required=True)
    product_id = fields.Many2one('product.product', 'Producto relacionado')
    active = fields.Boolean('Activo', default=True)
