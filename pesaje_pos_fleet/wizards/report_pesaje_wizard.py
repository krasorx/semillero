from odoo import api, fields, models, _
from odoo.exceptions import UserError


class ReportPesajeWizard(models.TransientModel):
    _name = 'pesaje.report.wizard'
    _description = 'Wizard de Reportes de Pesaje'

    report_type = fields.Selection([
        ('diario', 'Reporte Diario'),
        ('vehiculo', 'Por Vehículo / Chófer'),
        ('descarte', 'Descartes'),
        ('tiempos', 'Tiempos en Planta'),
    ], string='Tipo de Reporte', required=True, default='diario')

    date_from = fields.Date('Desde', default=fields.Date.today, required=True)
    date_to = fields.Date('Hasta', default=fields.Date.today, required=True)
    vehicle_id = fields.Many2one('fleet.vehicle', 'Camión (opcional)')
    driver_id = fields.Many2one('hr.employee', 'Chófer (opcional)')
    product_id = fields.Many2one('product.product', 'Material (opcional)')

    def _get_pesajes(self):
        domain = [
            ('state', '=', 'completado'),
            ('exit_datetime', '>=', str(self.date_from)),
            ('exit_datetime', '<=', str(self.date_to) + ' 23:59:59'),
        ]
        if self.vehicle_id:
            domain.append(('vehicle_id', '=', self.vehicle_id.id))
        if self.driver_id:
            domain.append(('driver_id', '=', self.driver_id.id))
        if self.product_id:
            domain.append(('product_id', '=', self.product_id.id))
        if self.report_type == 'descarte':
            domain.append(('is_discard', '=', True))
        return self.env['pesaje.pesaje'].search(domain, order='exit_datetime asc')

    def action_print_report(self):
        self.ensure_one()
        pesajes = self._get_pesajes()
        if not pesajes:
            raise UserError(_('No se encontraron pesajes para los filtros seleccionados.'))
        report_ref = {
            'diario': 'pesaje_pos_fleet.action_report_pesaje_diario',
            'vehiculo': 'pesaje_pos_fleet.action_report_pesaje_vehiculo',
            'descarte': 'pesaje_pos_fleet.action_report_pesaje_descarte',
            'tiempos': 'pesaje_pos_fleet.action_report_pesaje_tiempos',
        }[self.report_type]
        return self.env.ref(report_ref).report_action(self, data={
            'pesaje_ids': pesajes.ids,
            'date_from': str(self.date_from),
            'date_to': str(self.date_to),
        })
