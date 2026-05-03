from odoo import http
from odoo.http import request
from odoo.addons.pesaje_pos_fleet.controllers.main import PesajeController


class KioskoController(PesajeController):
    """Override /pesaje/masters para filtrar empleados por categoría de balancero."""

    @http.route('/pesaje/masters', type='json', auth='user', methods=['POST'])
    def get_masters(self, **kw):
        data = super().get_masters(**kw)

        cat_id = request.env['ir.config_parameter'].sudo().get_param(
            'pesaje_kiosko.employee_category_id'
        )

        if cat_id:
            employees = request.env['hr.employee'].sudo().search([
                ('active', '=', True),
                ('category_ids', 'in', [int(cat_id)]),
            ], order='name')
            data['employees'] = [{'id': e.id, 'name': e.name} for e in employees]

        return data
