from odoo.tests.common import TransactionCase


class TestDespachoBase(TransactionCase):

    def setUp(self):
        super().setUp()
        self.partner = self.env['res.partner'].create({'name': 'Cliente Despacho'})
        self.vehicle = self.env['fleet.vehicle'].create({
            'model_id': self.env['fleet.vehicle.model'].create({
                'name': 'TModel',
                'brand_id': self.env['fleet.vehicle.model.brand'].create({'name': 'TBrand'}).id,
            }).id,
            'license_plate': 'DESP001',
        })
        self.operador = self.env['hr.employee'].create({'name': 'Operador Desp'})


class TestPesajeDespachoCampos(TestDespachoBase):

    def test_default_operation_type_es_ingreso(self):
        pesaje = self.env['pesaje.pesaje'].create({'vehicle_id': self.vehicle.id})
        self.assertEqual(pesaje.operation_type, 'ingreso')

    def test_crear_despacho_sin_camion(self):
        """Un despacho se puede crear sin camión (se asigna luego)."""
        pesaje = self.env['pesaje.pesaje'].create({
            'operation_type': 'despacho',
            'customer_id': self.partner.id,
        })
        self.assertEqual(pesaje.operation_type, 'despacho')
        self.assertFalse(pesaje.vehicle_id)
        self.assertEqual(pesaje.customer_id, self.partner)


class TestPesajeDespachoMapeo(TestDespachoBase):

    def _en_planta(self, operation_type):
        pesaje = self.env['pesaje.pesaje'].create({
            'operation_type': operation_type,
            'vehicle_id': self.vehicle.id,
            'customer_id': self.partner.id if operation_type == 'despacho' else False,
        })
        pesaje.state = 'en_planta'
        return pesaje

    def test_despacho_entrada_es_tara_salida_es_bruto(self):
        pesaje = self._en_planta('despacho')
        pesaje.register_weighing(8000.0, 'entrada', self.operador.id)   # vacío -> tara
        self.assertEqual(pesaje.gross_weight, 0.0)
        self.assertEqual(pesaje.tara_weight, 8000.0)
        pesaje.register_weighing(20000.0, 'salida', self.operador.id)   # cargado -> bruto
        self.assertEqual(pesaje.gross_weight, 20000.0)
        self.assertEqual(pesaje.net_weight, 12000.0)

    def test_ingreso_entrada_es_bruto_salida_es_tara(self):
        pesaje = self._en_planta('ingreso')
        pesaje.register_weighing(20000.0, 'entrada', self.operador.id)  # cargado -> bruto
        self.assertEqual(pesaje.gross_weight, 20000.0)
        pesaje.register_weighing(8000.0, 'salida', self.operador.id)    # vacío -> tara
        self.assertEqual(pesaje.tara_weight, 8000.0)
        self.assertEqual(pesaje.net_weight, 12000.0)


class TestPesajeDespachoCompletar(TestDespachoBase):

    def setUp(self):
        super().setUp()
        self.product = self.env['product.product'].create({
            'name': 'Bolsa Maíz 25kg', 'type': 'consu', 'is_storable': True,
        })
        self.warehouse = self.env['stock.warehouse'].search([], limit=1)
        self.env['stock.quant']._update_available_quantity(
            self.product, self.warehouse.lot_stock_id, 100.0)

    def _entrega_confirmada(self):
        so = self.env['sale.order'].create({
            'partner_id': self.partner.id,
            'order_line': [(0, 0, {'product_id': self.product.id, 'product_uom_qty': 10.0})],
        })
        so.action_confirm()
        picking = so.picking_ids[:1]
        self.assertTrue(picking, 'La venta debería generar una entrega')
        picking.action_assign()
        return picking

    def test_completar_despacho_valida_entrega(self):
        picking = self._entrega_confirmada()
        pesaje = self.env['pesaje.pesaje'].create({
            'operation_type': 'despacho',
            'vehicle_id': self.vehicle.id,
            'customer_id': self.partner.id,
            'picking_id': picking.id,
        })
        pesaje.state = 'en_planta'
        pesaje.register_weighing(8000.0, 'entrada', self.operador.id)   # vacío
        pesaje.register_weighing(20000.0, 'salida', self.operador.id)   # cargado
        pesaje.action_complete()
        self.assertEqual(pesaje.state, 'completado')
        self.assertEqual(picking.state, 'done')
        self.assertFalse(pesaje.move_failed)
