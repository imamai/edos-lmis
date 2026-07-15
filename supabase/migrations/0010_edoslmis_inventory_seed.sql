-- EDOS LMIS Phase 1 (extension) — grant inventory permission, seed commodities

update edoshms_roles
set permissions = permissions || '["edoslmis.inventory.manage"]'::jsonb
where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87'
  and code = 'lab_manager'
  and not (permissions @> '["edoslmis.inventory.manage"]'::jsonb);

insert into edoslmis_inventory_items (tenant_id, branch_id, department_id, category, code, name, unit_of_measure, reorder_level)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', d.id, v.cat::edoslmis_inventory_category, v.code, v.name, v.uom, v.reorder
from (values
  ('HAEM', 'reagent', 'RGT-CBC-DIL', 'CBC Diluent (Haematology Analyzer)', 'litre', 5),
  ('HAEM', 'reagent', 'RGT-CBC-LYSE', 'CBC Lyse Reagent', 'litre', 5),
  ('CHEM', 'reagent', 'RGT-GLUCOSE', 'Glucose Oxidase Reagent Kit', 'kit', 3),
  ('CHEM', 'reagent', 'RGT-UECR', 'U&E&Cr Reagent Kit', 'kit', 3),
  ('CHEM', 'reagent', 'RGT-LFT', 'LFT Reagent Kit', 'kit', 3),
  ('CHEM', 'reagent', 'RGT-LIPID', 'Lipid Profile Reagent Kit', 'kit', 3),
  ('PARA', 'consumable', 'CON-GIEMSA', 'Giemsa Stain', 'litre', 2),
  ('SERO', 'kit', 'KIT-HIV-RT', 'HIV Rapid Test Kit', 'box', 10),
  ('SERO', 'kit', 'KIT-WIDAL', 'Widal Test Kit', 'box', 5),
  ('SERO', 'kit', 'KIT-VDRL', 'VDRL Test Kit', 'box', 5),
  ('BB', 'kit', 'KIT-BLOODGRP', 'Blood Grouping Antisera Kit', 'box', 5),
  ('URINE', 'consumable', 'CON-URINE-STRIP', 'Urinalysis Test Strips', 'box', 10),
  ('HAEM', 'consumable', 'CON-EDTA-TUBE', 'EDTA Vacutainer Tubes', 'box', 20),
  ('CHEM', 'consumable', 'CON-SST-TUBE', 'SST (Gold-top) Vacutainer Tubes', 'box', 20)
) as v(dept_code, cat, code, name, uom, reorder)
join edoslmis_departments d on d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = v.dept_code
on conflict (tenant_id, code) do nothing;

-- Opening balances for each seeded item (idempotent: only if the item has no transactions yet)
insert into edoslmis_stock_transactions (tenant_id, branch_id, item_id, transaction_type, quantity_change, balance_after, notes, performed_by)
select
  i.tenant_id, i.branch_id, i.id, 'opening_balance',
  ob.qty, ob.qty, 'Initial stock setup', null
from edoslmis_inventory_items i
join (values
  ('RGT-CBC-DIL', 20), ('RGT-CBC-LYSE', 20), ('RGT-GLUCOSE', 10), ('RGT-UECR', 10),
  ('RGT-LFT', 10), ('RGT-LIPID', 10), ('CON-GIEMSA', 8), ('KIT-HIV-RT', 40),
  ('KIT-WIDAL', 20), ('KIT-VDRL', 20), ('KIT-BLOODGRP', 15), ('CON-URINE-STRIP', 30),
  ('CON-EDTA-TUBE', 50), ('CON-SST-TUBE', 50)
) as ob(code, qty) on ob.code = i.code
where i.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87'
  and not exists (select 1 from edoslmis_stock_transactions t where t.item_id = i.id);

-- Reagent usage mapping so entering a result auto-deducts stock
insert into edoslmis_test_reagent_usage (tenant_id, test_id, item_id, quantity_per_test)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', t.id, i.id, m.qty
from (values
  ('FBC', 'RGT-CBC-DIL', 0.01), ('FBC', 'RGT-CBC-LYSE', 0.005),
  ('RBS', 'RGT-GLUCOSE', 1), ('UECR', 'RGT-UECR', 1), ('LFT', 'RGT-LFT', 1), ('LIPID', 'RGT-LIPID', 1),
  ('HIVRT', 'KIT-HIV-RT', 1), ('WIDAL', 'KIT-WIDAL', 1), ('VDRL', 'KIT-VDRL', 1),
  ('BGRP', 'KIT-BLOODGRP', 1), ('URINA', 'CON-URINE-STRIP', 1)
) as m(test_code, item_code, qty)
join edoslmis_tests t on t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = m.test_code
join edoslmis_inventory_items i on i.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and i.code = m.item_code
on conflict (test_id, item_id) do nothing;
