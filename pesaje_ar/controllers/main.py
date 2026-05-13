from odoo import http
from odoo.addons.pesaje_kiosko.controllers.main import KioskoController


class PesajeArController(KioskoController):

    def _pesaje_to_dict(self, p):
        d = super()._pesaje_to_dict(p)
        d['nro_inase'] = p.nro_inase or ''
        d['cot'] = p.cot or ''
        d['carta_porte'] = p.carta_porte or ''
        return d

    @http.route('/pesaje/create', type='json', auth='user', methods=['POST'], csrf=False)
    def create_pesaje(self, **vals):
        ar_data = {}
        for field in ('nro_inase', 'cot', 'carta_porte'):
            if field in vals:
                ar_data[field] = vals.pop(field)
        result = super().create_pesaje(**vals)
        if result.get('success') and ar_data:
            pesaje = self._env_pesaje(result['pesaje']['id'])
            pesaje.write(ar_data)
            result['pesaje'] = self._pesaje_to_dict(pesaje)
        return result

    @http.route('/pesaje/update', type='json', auth='user', methods=['POST'], csrf=False)
    def update_pesaje(self, pesaje_id, **vals):
        ar_data = {}
        for field in ('nro_inase', 'cot', 'carta_porte'):
            if field in vals:
                ar_data[field] = vals.pop(field)
        result = super().update_pesaje(pesaje_id=pesaje_id, **vals)
        if result.get('success') and ar_data:
            pesaje = self._env_pesaje(int(pesaje_id))
            pesaje.write(ar_data)
            result['pesaje'] = self._pesaje_to_dict(pesaje)
        return result

    def _env_pesaje(self, pesaje_id):
        from odoo.http import request
        return request.env['pesaje.pesaje'].sudo().browse(int(pesaje_id))
