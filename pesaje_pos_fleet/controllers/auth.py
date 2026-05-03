import json
from odoo import http
from odoo.http import request

class PesajeAuth(http.Controller):

    @http.route('/pesaje/auth', type='json', auth='public', methods=['POST'], csrf=False)
    def employee_login(self, employee_id=None, pin=None, **kw):
        if not employee_id or pin is None:
            return {'success': False, 'error': 'Parámetros requeridos: employee_id, pin'}
        employee = request.env['hr.employee'].sudo().browse(int(employee_id))
        if not employee.exists():
            return {'success': False, 'error': 'Empleado no encontrado'}
        if employee.pin != str(pin):
            return {'success': False, 'error': 'PIN incorrecto'}
        return {
            'success': True,
            'employee': {
                'id': employee.id,
                'name': employee.name,
                'job_title': employee.job_title or '',
            }
        }

    @http.route('/pesaje/employees', type='json', auth='user', methods=['POST'])
    def get_employees(self, **kw):
        employees = request.env['hr.employee'].sudo().search([('active', '=', True)], order='name')
        return {
            'employees': [{'id': e.id, 'name': e.name, 'has_pin': bool(e.pin)} for e in employees]
        }
