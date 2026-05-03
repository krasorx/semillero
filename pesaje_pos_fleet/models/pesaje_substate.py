from odoo import fields, models

class PesajeSubstate(models.Model):
    _name = 'pesaje.substate'
    _description = 'Subestado de Pesaje'
    _order = 'sequence, name'

    name = fields.Char('Nombre', required=True)
    sequence = fields.Integer('Secuencia', default=10)
    color = fields.Integer('Color', default=0)
    is_problem = fields.Boolean('Es Problema', default=False)
    active = fields.Boolean('Activo', default=True)
    fold = fields.Boolean('Plegado en Kanban', default=False)
