from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


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


class TestPesajeCompletar(TransactionCase):

    def setUp(self):
        super().setUp()
        self.vehicle = self.env['fleet.vehicle'].create({
            'model_id': self.env['fleet.vehicle.model'].create({
                'name': 'TestModel',
                'brand_id': self.env['fleet.vehicle.model.brand'].create({'name': 'TestBrand'}).id,
            }).id,
            'license_plate': 'COMP001',
        })

    def _pesaje_en_planta(self, gross_weight=0.0):
        pesaje = self.env['pesaje.pesaje'].create({'vehicle_id': self.vehicle.id})
        pesaje.write({'state': 'en_planta', 'gross_weight': gross_weight})
        return pesaje

    def test_completar_sin_tara_falla(self):
        """Con peso bruto pero sin tara no se puede completar."""
        pesaje = self._pesaje_en_planta(gross_weight=15000.0)
        self.assertFalse(pesaje.tara_weight)
        with self.assertRaises(UserError):
            pesaje.action_complete()
        self.assertEqual(pesaje.state, 'en_planta')

    def test_completar_sin_bruto_falla(self):
        """Sin peso bruto no se puede completar (con o sin tara)."""
        pesaje = self._pesaje_en_planta(gross_weight=0.0)
        self.env['pesaje.tara'].create({
            'pesaje_id': pesaje.id, 'peso': 3000.0, 'tipo': 'salida',
        })
        with self.assertRaises(UserError):
            pesaje.action_complete()
        self.assertEqual(pesaje.state, 'en_planta')

    def test_completar_con_bruto_y_tara_ok(self):
        """Con peso bruto y tara registrada se completa correctamente."""
        pesaje = self._pesaje_en_planta(gross_weight=15000.0)
        self.env['pesaje.tara'].create({
            'pesaje_id': pesaje.id, 'peso': 3000.0, 'tipo': 'salida',
        })
        self.assertEqual(pesaje.tara_weight, 3000.0)
        pesaje.action_complete()
        self.assertEqual(pesaje.state, 'completado')
        self.assertEqual(pesaje.net_weight, 12000.0)

    def test_autocomplete_solo_con_bruto_no_completa(self):
        """Con solo peso bruto (sin tara) el autocompletado no dispara."""
        pesaje = self._pesaje_en_planta(gross_weight=15000.0)
        pesaje._autocomplete_if_ready()
        self.assertEqual(pesaje.state, 'en_planta')

    def test_autocomplete_con_bruto_y_tara_completa(self):
        """Al tener bruto y tara, el autocompletado marca completado."""
        pesaje = self._pesaje_en_planta(gross_weight=15000.0)
        self.env['pesaje.tara'].create({
            'pesaje_id': pesaje.id, 'peso': 3000.0, 'tipo': 'salida',
        })
        pesaje._autocomplete_if_ready()
        self.assertEqual(pesaje.state, 'completado')
