from odoo import http
from odoo.http import request
from odoo.addons.pesaje_pos_fleet.controllers.main import PesajeController


class KioskoController(PesajeController):

    @http.route('/pesaje/masters', type='json', auth='user', methods=['POST'])
    def get_masters(self, **kw):
        data = super().get_masters(**kw)
        ICP = request.env['ir.config_parameter'].sudo()

        cat_id = ICP.get_param('pesaje_kiosko.employee_category_id')
        if cat_id:
            employees = request.env['hr.employee'].sudo().search([
                ('active', '=', True),
                ('category_ids', 'in', [int(cat_id)]),
            ], order='name')
            data['employees'] = [{'id': e.id, 'name': e.name} for e in employees]

        balanza_id = ICP.get_param('pesaje_kiosko.balanza_id')
        if balanza_id:
            balanza = request.env['pesaje.balanza'].sudo().browse(int(balanza_id))
            if balanza.exists() and balanza.active:
                data['current_balanza'] = {'id': balanza.id, 'name': balanza.name}

        return data
