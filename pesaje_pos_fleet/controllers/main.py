from odoo import http, fields
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)


class PesajeController(http.Controller):

    @http.route('/pesaje/masters', type='json', auth='user', methods=['POST'])
    def get_masters(self, **kw):
        env = request.env
        ICP = env['ir.config_parameter'].sudo()
        cat_id = ICP.get_param('pesaje_pos_fleet.product_category_id')

        product_domain = []
        if cat_id:
            product_domain = [('categ_id', 'child_of', int(cat_id))]

        vehicles = env['fleet.vehicle'].sudo().search([('active', '=', True)])
        employees = env['hr.employee'].sudo().search([('active', '=', True)])
        products = env['product.product'].sudo().search(product_domain)
        lots = env['stock.lot'].sudo().search([])
        campos = env['pesaje.campo'].sudo().search([('active', '=', True)])
        hibridos = env['pesaje.hibrido'].sudo().search([('active', '=', True)])
        substates = env['pesaje.substate'].sudo().search([('active', '=', True)], order='sequence')

        return {
            'vehicles': [{'id': v.id, 'name': v.display_name, 'license_plate': v.license_plate or ''} for v in vehicles],
            'employees': [{'id': e.id, 'name': e.name} for e in employees],
            'products': [{'id': p.id, 'name': p.display_name, 'categ_id': p.categ_id.id} for p in products],
            'lots': [{'id': l.id, 'name': l.name, 'product_id': l.product_id.id} for l in lots],
            'campos': [{'id': c.id, 'name': c.name, 'location': c.location or ''} for c in campos],
            'hibridos': [{'id': h.id, 'name': h.name, 'product_id': h.product_id.id if h.product_id else None} for h in hibridos],
            'substates': [{'id': s.id, 'name': s.name, 'color': s.color, 'is_problem': s.is_problem, 'sequence': s.sequence} for s in substates],
        }

    @http.route('/pesaje/pesajes', type='json', auth='user', methods=['POST'])
    def get_pesajes(self, date=None, **kw):
        domain = [('state', 'not in', ['completado', 'cancelado'])]
        if date:
            domain += [('entry_datetime', '>=', date + ' 00:00:00'), ('entry_datetime', '<=', date + ' 23:59:59')]
        pesajes = request.env['pesaje.pesaje'].sudo().search(domain, order='entry_datetime desc', limit=100)
        return {'pesajes': [self._pesaje_to_dict(p) for p in pesajes]}

    @http.route('/pesaje/create', type='json', auth='user', methods=['POST'], csrf=False)
    def create_pesaje(self, **vals):
        allowed = ['vehicle_id', 'driver_id', 'product_id', 'lot_id', 'campo_id', 'hibrido_id',
                   'is_discard', 'notes', 'employee_id', 'state']
        data = {k: v for k, v in vals.items() if k in allowed and v}
        pesaje = request.env['pesaje.pesaje'].sudo().create(data)
        return {'success': True, 'pesaje': self._pesaje_to_dict(pesaje)}

    @http.route('/pesaje/update', type='json', auth='user', methods=['POST'], csrf=False)
    def update_pesaje(self, pesaje_id, **vals):
        pesaje = request.env['pesaje.pesaje'].sudo().browse(int(pesaje_id))
        if not pesaje.exists():
            return {'success': False, 'error': 'Pesaje no encontrado'}
        allowed = ['vehicle_id', 'driver_id', 'product_id', 'lot_id', 'campo_id', 'hibrido_id',
                   'is_discard', 'notes', 'substate_id']
        data = {k: v for k, v in vals.items() if k in allowed}
        pesaje.write(data)
        return {'success': True, 'pesaje': self._pesaje_to_dict(pesaje)}

    @http.route('/pesaje/weigh', type='json', auth='user', methods=['POST'], csrf=False)
    def register_weight(self, pesaje_id, weight, tipo='entrada', employee_id=None, **kw):
        pesaje = request.env['pesaje.pesaje'].sudo().browse(int(pesaje_id))
        if not pesaje.exists():
            return {'success': False, 'error': 'Pesaje no encontrado'}
        weight = float(weight)
        if tipo == 'entrada':
            pesaje.gross_weight = weight
        else:
            request.env['pesaje.tara'].sudo().create({
                'pesaje_id': pesaje.id,
                'peso': weight,
                'tipo': tipo,
                'employee_id': int(employee_id) if employee_id else False,
                'datetime': fields.Datetime.now(),
            })
        return {'success': True, 'pesaje': self._pesaje_to_dict(pesaje)}

    @http.route('/pesaje/state', type='json', auth='user', methods=['POST'], csrf=False)
    def change_state(self, pesaje_id, action, **kw):
        pesaje = request.env['pesaje.pesaje'].sudo().browse(int(pesaje_id))
        if not pesaje.exists():
            return {'success': False, 'error': 'Pesaje no encontrado'}
        action_map = {
            'confirm': pesaje.action_confirm,
            'arrive_outside': pesaje.action_arrive_outside,
            'enter_plant': pesaje.action_enter_plant,
            'complete': pesaje.action_complete,
            'cancel': pesaje.action_cancel,
        }
        if action not in action_map:
            return {'success': False, 'error': f'Acción desconocida: {action}'}
        try:
            action_map[action]()
            return {'success': True, 'pesaje': self._pesaje_to_dict(pesaje)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @http.route('/pesaje/complete', type='json', auth='user', methods=['POST'], csrf=False)
    def complete_pesaje(self, pesaje_id, **kw):
        return self.change_state(pesaje_id=pesaje_id, action='complete')

    @http.route('/pesaje/cancel', type='json', auth='user', methods=['POST'], csrf=False)
    def cancel_pesaje(self, pesaje_id, reason='', **kw):
        pesaje = request.env['pesaje.pesaje'].sudo().browse(int(pesaje_id))
        if not pesaje.exists():
            return {'success': False, 'error': 'Pesaje no encontrado'}
        try:
            pesaje.cancel_reason = reason
            pesaje.action_cancel()
            return {'success': True, 'pesaje': self._pesaje_to_dict(pesaje)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @http.route('/pesaje/dashboard', type='json', auth='user', methods=['POST'])
    def get_dashboard(self, **kw):
        Pesaje = request.env['pesaje.pesaje'].sudo()
        today_start = fields.Date.today()

        en_camino = Pesaje.search_count([('state', '=', 'en_camino')])
        fuera_planta = Pesaje.search_count([('state', '=', 'fuera_planta')])
        en_planta_recs = Pesaje.search([('state', '=', 'en_planta')])
        completados_hoy = Pesaje.search_count([
            ('state', '=', 'completado'),
            ('exit_datetime', '>=', str(today_start)),
        ])

        avg_time = 0.0
        completed_with_time = Pesaje.search([
            ('state', '=', 'completado'),
            ('exit_datetime', '>=', str(today_start)),
            ('time_in_plant', '>', 0),
        ])
        if completed_with_time:
            avg_time = sum(completed_with_time.mapped('time_in_plant')) / len(completed_with_time)

        fuera_list = Pesaje.search([('state', '=', 'fuera_planta')], order='create_date')

        return {
            'kpis': {
                'en_camino': en_camino,
                'fuera_planta': fuera_planta,
                'en_planta': len(en_planta_recs),
                'completados_hoy': completados_hoy,
                'tiempo_promedio': round(avg_time, 2),
            },
            'en_planta': [self._pesaje_to_dict(p) for p in en_planta_recs],
            'fuera_planta': [self._pesaje_to_dict(p) for p in fuera_list],
        }

    def _pesaje_to_dict(self, p):
        return {
            'id': p.id,
            'name': p.name,
            'state': p.state,
            'substate_id': p.substate_id.id if p.substate_id else None,
            'substate_name': p.substate_id.name if p.substate_id else '',
            'substate_color': p.substate_id.color if p.substate_id else 0,
            'vehicle_id': p.vehicle_id.id if p.vehicle_id else None,
            'vehicle_name': p.vehicle_id.display_name if p.vehicle_id else '',
            'license_plate': p.vehicle_id.license_plate if p.vehicle_id else '',
            'driver_id': p.driver_id.id if p.driver_id else None,
            'driver_name': p.driver_id.name if p.driver_id else '',
            'product_id': p.product_id.id if p.product_id else None,
            'product_name': p.product_id.display_name if p.product_id else '',
            'lot_id': p.lot_id.id if p.lot_id else None,
            'lot_name': p.lot_id.name if p.lot_id else '',
            'campo_id': p.campo_id.id if p.campo_id else None,
            'campo_name': p.campo_id.name if p.campo_id else '',
            'hibrido_id': p.hibrido_id.id if p.hibrido_id else None,
            'hibrido_name': p.hibrido_id.name if p.hibrido_id else '',
            'is_discard': p.is_discard,
            'gross_weight': p.gross_weight,
            'tara_weight': p.tara_weight,
            'net_weight': p.net_weight,
            'entry_datetime': p.entry_datetime.isoformat() if p.entry_datetime else None,
            'exit_datetime': p.exit_datetime.isoformat() if p.exit_datetime else None,
            'time_in_plant': p.time_in_plant,
            'employee_id': p.employee_id.id if p.employee_id else None,
            'employee_name': p.employee_id.name if p.employee_id else '',
            'notes': p.notes or '',
            'move_failed': p.move_failed,
            'picking_id': p.picking_id.id if p.picking_id else None,
            'tara_ids': [{'id': t.id, 'peso': t.peso, 'tipo': t.tipo, 'datetime': t.datetime.isoformat() if t.datetime else None} for t in p.tara_ids],
        }
