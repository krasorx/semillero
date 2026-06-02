from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


class TestTransferenciaBase(TransactionCase):

    def setUp(self):
        super().setUp()
        self.partner = self.env['res.partner'].create({'name': 'Depósito Norte'})
        self.vehicle = self.env['fleet.vehicle'].create({
            'model_id': self.env['fleet.vehicle.model'].create({
                'name': 'TModel',
                'brand_id': self.env['fleet.vehicle.model.brand'].create({'name': 'TBrand'}).id,
            }).id,
            'license_plate': 'TRANS001',
        })
        self.operador = self.env['hr.employee'].create({'name': 'Operador Trans'})
        self.warehouse = self.env['stock.warehouse'].search([], limit=1)
        self.product = self.env['product.product'].create({
            'name': 'Maíz Granel Transf', 'type': 'consu', 'is_storable': True,
            'uom_id': self.env.ref('uom.product_uom_kgm').id,
        })
        # ubicación interna de origen (otro depósito)
        self.source_loc = self.env['stock.location'].create({
            'name': 'Depósito Origen Test',
            'usage': 'internal',
            'location_id': self.warehouse.view_location_id.id,
        })


class TestTransferenciaCampos(TestTransferenciaBase):

    def test_crear_transferencia(self):
        pesaje = self.env['pesaje.pesaje'].create({
            'operation_type': 'transferencia',
            'vehicle_id': self.vehicle.id,
            'product_id': self.product.id,
            'source_location_id': self.source_loc.id,
            'customer_id': self.partner.id,
        })
        self.assertEqual(pesaje.operation_type, 'transferencia')
        self.assertEqual(pesaje.source_location_id, self.source_loc)
        self.assertEqual(pesaje.customer_id, self.partner)


class TestTransferenciaMapeo(TestTransferenciaBase):

    def test_mapeo_igual_a_ingreso(self):
        pesaje = self.env['pesaje.pesaje'].create({
            'operation_type': 'transferencia',
            'vehicle_id': self.vehicle.id,
            'product_id': self.product.id,
            'source_location_id': self.source_loc.id,
        })
        pesaje.state = 'en_planta'
        pesaje.register_weighing(30000.0, 'entrada', self.operador.id)  # cargado -> bruto
        self.assertEqual(pesaje.gross_weight, 30000.0)
        pesaje.register_weighing(12000.0, 'salida', self.operador.id)   # vacío -> tara
        self.assertEqual(pesaje.tara_weight, 12000.0)
        self.assertEqual(pesaje.net_weight, 18000.0)


class TestTransferenciaCompletar(TestTransferenciaBase):

    def setUp(self):
        super().setUp()
        # stock en el depósito de origen
        self.env['stock.quant']._update_available_quantity(
            self.product, self.source_loc, 50000.0)

    def _pesaje_listo(self, source=True):
        pesaje = self.env['pesaje.pesaje'].create({
            'operation_type': 'transferencia',
            'vehicle_id': self.vehicle.id,
            'product_id': self.product.id,
            'source_location_id': self.source_loc.id if source else False,
            'customer_id': self.partner.id,
        })
        pesaje.state = 'en_planta'
        pesaje.register_weighing(30000.0, 'entrada', self.operador.id)
        pesaje.register_weighing(12000.0, 'salida', self.operador.id)
        return pesaje

    def test_completar_mueve_stock_entre_depositos(self):
        dest = self.warehouse.lot_stock_id
        src_before = self.product.with_context(location=self.source_loc.id).qty_available
        dest_before = self.product.with_context(location=dest.id).qty_available
        pesaje = self._pesaje_listo()
        pesaje.action_complete()
        self.assertEqual(pesaje.state, 'completado')
        self.assertFalse(pesaje.move_failed)
        self.assertTrue(pesaje.picking_id)
        self.assertEqual(pesaje.picking_id.picking_type_id.code, 'internal')
        self.assertEqual(pesaje.picking_id.state, 'done')
        src_after = self.product.with_context(location=self.source_loc.id).qty_available
        dest_after = self.product.with_context(location=dest.id).qty_available
        self.assertEqual(src_after, src_before - 18000.0)
        self.assertEqual(dest_after, dest_before + 18000.0)

    def test_completar_sin_origen_falla(self):
        pesaje = self._pesaje_listo(source=False)
        with self.assertRaises(UserError):
            pesaje.action_complete()
        self.assertEqual(pesaje.state, 'en_planta')
