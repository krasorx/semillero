from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    pesaje_kiosko_employee_category_id = fields.Many2one(
        'hr.employee.category',
        string='Categoría de Balanceros',
        help='Solo los empleados con esta categoría aparecerán en el login del kiosko. '
             'Si no se configura, aparecen todos los empleados activos.',
        config_parameter='pesaje_kiosko.employee_category_id',
    )
