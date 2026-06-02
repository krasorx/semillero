from odoo import api, fields, models, _
from odoo.exceptions import UserError
import logging

_logger = logging.getLogger(__name__)

STATES = [
    ('precargado', 'PreCargado'),
    ('en_camino', 'En Camino'),
    ('fuera_planta', 'Fuera de Planta'),
    ('en_planta', 'En Planta'),
    ('completado', 'Completado'),
    ('cancelado', 'Cancelado'),
]

class Pesaje(models.Model):
    _name = 'pesaje.pesaje'
    _description = 'Pesaje de Camión'
    _order = 'entry_datetime desc'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char('Referencia', readonly=True, copy=False, default='Nuevo')
    state = fields.Selection(STATES, 'Estado', default='precargado', tracking=True, index=True)
    substate_id = fields.Many2one('pesaje.substate', 'Subestado', tracking=True,
                                   domain=[('active', '=', True)],
                                   group_expand='_read_group_substate_ids')

    # Fleet
    operation_type = fields.Selection(
        [('ingreso', 'Ingreso'), ('despacho', 'Despacho'), ('transferencia', 'Transferencia')],
        'Tipo de Operación', default='ingreso', required=True, tracking=True, index=True)
    vehicle_id = fields.Many2one('fleet.vehicle', 'Camión', tracking=True)
    customer_id = fields.Many2one('res.partner', 'Cliente', tracking=True,
                                  help='Destinatario del despacho (venta/entrega) o contraparte de la transferencia.')
    source_location_id = fields.Many2one(
        'stock.location', 'Depósito de Origen', tracking=True,
        domain=[('usage', '=', 'internal')],
        help='Ubicación interna desde la que ingresa el material (transferencia entre depósitos).')
    driver_id = fields.Many2one('hr.employee', 'Chófer', tracking=True)

    # Carga
    product_id = fields.Many2one('product.product', 'Material', tracking=True)
    lot_id = fields.Many2one('stock.lot', 'Lote', tracking=True,
                              domain="[('product_id', '=', product_id)]")
    campo_id = fields.Many2one('pesaje.campo', 'Campo')
    hibrido_id = fields.Many2one('pesaje.hibrido', 'Híbrido')
    is_discard = fields.Boolean('Es Descarte', default=False)

    # Pesaje
    gross_weight = fields.Float('Peso Bruto (kg)', digits=(10, 2))
    tara_ids = fields.One2many('pesaje.tara', 'pesaje_id', 'Taras')
    net_weight = fields.Float('Peso Neto (kg)', compute='_compute_net_weight', store=True, digits=(10, 2))
    tara_weight = fields.Float('Tara (kg)', compute='_compute_net_weight', store=True, digits=(10, 2))
    uom_id = fields.Many2one('uom.uom', 'Unidad', default=lambda self: self.env.ref('uom.product_uom_kgm', raise_if_not_found=False))

    # Trazabilidad
    employee_id = fields.Many2one('hr.employee', 'Operador POS', tracking=True)
    entry_datetime = fields.Datetime('Entrada a Planta', tracking=True)
    exit_datetime = fields.Datetime('Salida de Planta', tracking=True)
    time_in_plant = fields.Float('Tiempo en Planta (h)', compute='_compute_time_in_plant', store=True)

    # Inventario
    picking_id = fields.Many2one('stock.picking', 'Movimiento de Stock', readonly=True, copy=False)
    move_failed = fields.Boolean('Fallo de Movimiento', default=False)

    # Transporte
    transport_company_id = fields.Many2one(
        'res.partner',
        'Empresa Transportista',
        domain=[('is_company', '=', True)],
        tracking=True,
    )
    parcela = fields.Char('Parcela', tracking=True)

    # Balanza
    balanza_id = fields.Many2one('pesaje.balanza', 'Balanza', tracking=True)

    # Misc
    notes = fields.Text('Observaciones')
    attachment_ids = fields.Many2many('ir.attachment', string='Adjuntos')
    cancel_reason = fields.Text('Motivo de Cancelación')

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'Nuevo') == 'Nuevo':
                vals['name'] = self.env['ir.sequence'].next_by_code('pesaje.pesaje') or 'Nuevo'
        return super().create(vals_list)

    @api.model
    def _read_group_substate_ids(self, substates, domain):
        """Muestra todas las columnas de subestado activas en el kanban,
        incluso las que no tienen pesajes."""
        return self.env['pesaje.substate'].search([('active', '=', True)])

    @api.depends('gross_weight', 'tara_ids.peso', 'tara_ids.tipo')
    def _compute_net_weight(self):
        for rec in self:
            taras = rec.tara_ids.filtered(lambda t: t.tipo == 'salida')
            if not taras:
                taras = rec.tara_ids
            tara = taras[len(taras) - 1].peso if taras else 0.0
            rec.tara_weight = tara
            rec.net_weight = max(0.0, rec.gross_weight - tara)

    @api.depends('entry_datetime', 'exit_datetime')
    def _compute_time_in_plant(self):
        for rec in self:
            if rec.entry_datetime and rec.exit_datetime:
                delta = rec.exit_datetime - rec.entry_datetime
                rec.time_in_plant = delta.total_seconds() / 3600
            else:
                rec.time_in_plant = 0.0

    # State machine methods
    def action_confirm(self):
        self._check_state('precargado')
        self.state = 'en_camino'

    def action_arrive_outside(self):
        self._check_state('en_camino')
        self.state = 'fuera_planta'

    def action_enter_plant(self):
        self._check_state('fuera_planta')
        self.write({
            'state': 'en_planta',
            'entry_datetime': fields.Datetime.now(),
        })
        first_substate = self.env['pesaje.substate'].search([('active', '=', True)], order='sequence asc', limit=1)
        if first_substate:
            self.substate_id = first_substate

    def action_complete(self):
        if self.state not in ('en_planta',):
            raise UserError(_('Solo se puede completar un pesaje en estado "En Planta".'))
        if not self.vehicle_id:
            raise UserError(_('Debe asignar un camión antes de completar.'))
        if not self.gross_weight:
            raise UserError(_('Debe registrar el peso de entrada antes de completar.'))
        if not self.tara_weight:
            raise UserError(_('Debe registrar el peso de salida antes de completar.'))
        terminado = self.env.ref('pesaje_pos_fleet.substate_terminado', raise_if_not_found=False)
        vals = {
            'state': 'completado',
            'exit_datetime': fields.Datetime.now(),
        }
        if terminado:
            vals['substate_id'] = terminado.id
        self.write(vals)
        if self.operation_type == 'despacho':
            self._validate_outgoing_delivery()
        else:
            self._create_incoming_move()

    def action_cancel(self):
        if self.state == 'completado':
            raise UserError(_('No se puede cancelar un pesaje completado.'))
        self.state = 'cancelado'

    def _check_state(self, expected):
        for rec in self:
            if rec.state != expected:
                raise UserError(_('Operación no válida en el estado actual: %s') % rec.state)

    def register_weighing(self, weight, tipo='entrada', employee_id=False):
        """Registra un pesado (entrada = peso bruto, salida = tara) y lo deja
        asentado en el chatter indicando el operador que lo realizó."""
        self.ensure_one()
        weight = float(weight)
        employee = self.env['hr.employee'].browse(int(employee_id)) if employee_id else self.employee_id
        # Neto = bruto - tara siempre. El mapeo del momento (entrada/salida) a
        # bruto/tara depende de la dirección:
        #   ingreso:  entrada = cargado (bruto), salida = vacío (tara)
        #   despacho: entrada = vacío (tara),    salida = cargado (bruto)
        if self.operation_type == 'despacho':
            is_gross = (tipo == 'salida')
        else:
            is_gross = (tipo == 'entrada')
        if is_gross:
            self.gross_weight = weight
        else:
            self.env['pesaje.tara'].create({
                'pesaje_id': self.id,
                'peso': weight,
                'tipo': tipo,
                'employee_id': employee.id or False,
                'datetime': fields.Datetime.now(),
            })
        tipo_label = dict(self.env['pesaje.tara']._fields['tipo'].selection).get(tipo, tipo)
        self.message_post(body=_(
            'Pesado registrado — %(tipo)s: %(peso)s kg · Operador: %(operador)s',
            tipo=tipo_label,
            peso='%.2f' % weight,
            operador=employee.name or _('Desconocido'),
        ))

    def action_register_weight(self, weight, tipo='entrada'):
        self.ensure_one()
        self.register_weighing(weight, tipo, self.employee_id.id)

    def _create_incoming_move(self):
        self.ensure_one()
        if not self.product_id or not self.net_weight:
            return
        location_src = self.env.ref('stock.stock_location_suppliers', raise_if_not_found=False)
        location_dest = self.env['stock.warehouse'].search([], limit=1).lot_stock_id
        if not location_src or not location_dest:
            self.move_failed = True
            _logger.warning('Pesaje %s: no se pudo determinar ubicaciones para stock.move', self.name)
            return
        try:
            picking = self.env['stock.picking'].create({
                'picking_type_id': self.env.ref('stock.picking_type_in').id,
                'location_id': location_src.id,
                'location_dest_id': location_dest.id,
                'origin': self.name,
                'move_ids': [(0, 0, {
                    'description_picking': self.product_id.name,
                    'product_id': self.product_id.id,
                    'product_uom_qty': self.net_weight,
                    'product_uom': self.uom_id.id or self.product_id.uom_id.id,
                    'location_id': location_src.id,
                    'location_dest_id': location_dest.id,
                    'lot_ids': [(4, self.lot_id.id)] if self.lot_id else [],
                })],
            })
            picking.action_confirm()
            picking.button_validate()
            self.picking_id = picking
        except Exception as e:
            self.move_failed = True
            _logger.error('Error al crear stock.move para pesaje %s: %s', self.name, e)

    def _validate_outgoing_delivery(self):
        """Valida la entrega (picking de salida) vinculada al despacho,
        descontando stock. Errores o intervención manual -> move_failed."""
        self.ensure_one()
        picking = self.picking_id
        if not picking:
            self.move_failed = True
            _logger.warning('Despacho %s sin entrega vinculada', self.name)
            return
        try:
            if picking.state not in ('done', 'cancel'):
                result = picking.button_validate()
                if isinstance(result, dict):
                    # button_validate devolvió un wizard (back-order, faltantes, etc.)
                    self.move_failed = True
                    _logger.warning('Despacho %s: la entrega requiere intervención manual', self.name)
                    return
            self.move_failed = False
        except Exception as e:
            self.move_failed = True
            _logger.error('Error al validar entrega del despacho %s: %s', self.name, e)

    def action_retry_stock_move(self):
        self.ensure_one()
        self.move_failed = False
        if self.operation_type == 'despacho':
            self._validate_outgoing_delivery()
        else:
            self._create_incoming_move()

    def action_open_cancel_wizard(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Cancelar Pesaje'),
            'res_model': 'pesaje.cancelar',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_pesaje_id': self.id},
        }
