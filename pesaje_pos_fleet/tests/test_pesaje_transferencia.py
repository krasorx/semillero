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
