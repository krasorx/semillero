from odoo import api, fields, models

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    pesaje_product_category_id = fields.Many2one(
        'product.category',
        string='Categoría de Productos (Pesaje)',
        config_parameter='pesaje_pos_fleet.product_category_id',
    )
    pesaje_auto_validate_stock = fields.Boolean(
        'Validar stock automáticamente al completar',
        config_parameter='pesaje_pos_fleet.auto_validate_stock',
    )
