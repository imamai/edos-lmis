-- EDOS LMIS Phase 2 — seed representative equipment for tenant "EdosCentre Medical"

insert into edoslmis_equipment (
  tenant_id, branch_id, department_id, code, name, equipment_type, manufacturer, model,
  serial_number, status, installation_date, calibration_interval_days, last_calibration_date,
  next_calibration_due, maintenance_interval_days, last_maintenance_date, next_maintenance_due
)
select
  '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', d.id,
  v.code, v.name, v.etype::edoslmis_equipment_type, v.manufacturer, v.model, v.serial,
  'operational', v.installed::date, v.cal_interval, v.last_cal::date, v.next_cal::date,
  v.maint_interval, v.last_maint::date, v.next_maint::date
from (values
  ('HAEM', 'EQ-HEMA-01', 'Sysmex XN-550 Haematology Analyzer', 'analyzer', 'Sysmex', 'XN-550', 'SXN550-2201',
   '2022-03-10', 90, '2026-05-01', '2026-07-30', 30, '2026-06-10', '2026-07-10'),
  ('CHEM', 'EQ-CHEM-01', 'Mindray BS-240 Chemistry Analyzer', 'analyzer', 'Mindray', 'BS-240', 'MBS240-1187',
   '2021-11-05', 90, '2026-04-15', '2026-07-14', 30, '2026-06-01', '2026-07-01'),
  ('BB', 'EQ-BB-01', 'Blood Bank Refrigerator', 'blood_bank_fridge', 'Helmer', 'iH168', 'HIH168-330',
   '2020-06-01', 30, '2026-06-15', '2026-07-15', 90, '2026-05-01', '2026-08-01'),
  ('MOLBIO', 'EQ-PCR-01', 'Applied Biosystems 7500 Real-Time PCR', 'pcr_machine', 'Applied Biosystems', '7500', 'AB7500-9042',
   '2021-01-20', 180, '2026-01-15', '2026-07-14', 90, '2026-04-01', '2026-07-01'),
  ('HAEM', 'EQ-CENT-01', 'Bench-top Centrifuge', 'centrifuge', 'Hettich', 'EBA 200', 'HEBA200-77',
   '2019-08-12', 180, '2026-02-01', '2026-08-01', 90, '2026-05-01', '2026-08-01'),
  ('MICRO', 'EQ-INCU-01', 'CO2 Incubator', 'incubator', 'Binder', 'CB 150', 'BCB150-410',
   '2020-02-14', 90, '2026-05-20', '2026-08-18', 60, '2026-06-05', '2026-08-05'),
  ('HISTO', 'EQ-AUTO-01', 'Tissue Processor / Autoclave', 'autoclave', 'Leica', 'ASP300S', 'LASP300-556',
   '2019-05-30', 90, '2026-04-10', '2026-07-09', 60, '2026-05-15', '2026-07-15')
) as v(dept_code, code, name, etype, manufacturer, model, serial, installed, cal_interval, last_cal, next_cal, maint_interval, last_maint, next_maint)
join edoslmis_departments d on d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = v.dept_code
on conflict (tenant_id, code) do nothing;
