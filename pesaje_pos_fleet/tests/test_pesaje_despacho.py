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
