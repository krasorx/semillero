from odoo.tests.common import TransactionCase


class TestPesajeBalanza(TransactionCase):

    def test_create_balanza(self):
        balanza = self.env['pesaje.balanza'].create({'name': 'Balanza Norte'})
        self.assertEqual(balanza.name, 'Balanza Norte')
        self.assertTrue(balanza.active)

    def test_archive_balanza(self):
        balanza = self.env['pesaje.balanza'].create({'name': 'B1'})
        balanza.active = False
        results = self.env['pesaje.balanza'].search([('name', '=', 'B1')])
        self.assertFalse(results)
        results_with_archived = self.env['pesaje.balanza'].with_context(active_test=False).search([('name', '=', 'B1')])
        self.assertTrue(results_with_archived)


class TestPesajeCamposNuevos(TransactionCase):

    def setUp(self):
        super().setUp()
        self.vehicle = self.env['fleet.vehicle'].create({
            'model_id': self.env['fleet.vehicle.model'].create({
                'name': 'TestModel',
                'brand_id': self.env['fleet.vehicle.model.brand'].create({'name': 'TestBrand'}).id,
            }).id,
            'license_plate': 'TEST001',
        })
        self.balanza = self.env['pesaje.balanza'].create({'name': 'Balanza Test'})
        self.empresa = self.env['res.partner'].create({'name': 'Trans. Test S.A.', 'is_company': True})

    def test_pesaje_con_campos_nuevos(self):
        pesaje = self.env['pesaje.pesaje'].create({
            'vehicle_id': self.vehicle.id,
            'balanza_id': self.balanza.id,
            'transport_company_id': self.empresa.id,
            'parcela': 'Parcela Norte 3',
        })
        self.assertEqual(pesaje.balanza_id, self.balanza)
        self.assertEqual(pesaje.transport_company_id, self.empresa)
        self.assertEqual(pesaje.parcela, 'Parcela Norte 3')

    def test_pesaje_sin_campos_nuevos(self):
        pesaje = self.env['pesaje.pesaje'].create({'vehicle_id': self.vehicle.id})
        self.assertFalse(pesaje.balanza_id)
        self.assertFalse(pesaje.transport_company_id)
        self.assertFalse(pesaje.parcela)
