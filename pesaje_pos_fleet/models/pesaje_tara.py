from odoo import api, fields, models

class PesajeTara(models.Model):
    _name = 'pesaje.tara'
    _description = 'Registro de Tara'
    _order = 'datetime desc'

    pesaje_id = fields.Many2one('pesaje.pesaje', 'Pesaje', required=True, ondelete='cascade')
    peso = fields.Float('Peso (kg)', required=True, digits=(10, 2))
    datetime = fields.Datetime('Fecha/Hora', default=fields.Datetime.now)
    tipo = fields.Selection([('entrada', 'Entrada'), ('salida', 'Salida')], 'Tipo', default='salida', required=True)
    employee_id = fields.Many2one('hr.employee', 'Operador')
