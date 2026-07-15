-- EDOS LMIS Phase 2 — seed QC materials + a demonstration run history
-- (includes one deliberate out-of-control point so the Westgard engine has
-- something to flag on first load).

insert into edoslmis_qc_materials (tenant_id, branch_id, test_id, level, lot_number, manufacturer, expiry_date, target_mean, target_sd, unit)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', t.id, v.level::edoslmis_qc_level, v.lot, v.manu, v.expiry::date, v.mean, v.sd, v.unit
from (values
  ('RBS', 'level1', 'QC-GLU-L1-2601', 'Bio-Rad Liquichek', '2027-01-31', 5.5, 0.2, 'mmol/L'),
  ('RBS', 'level2', 'QC-GLU-L2-2601', 'Bio-Rad Liquichek', '2027-01-31', 15.0, 0.5, 'mmol/L'),
  ('ESR', 'level1', 'QC-ESR-L1-2601', 'Streck', '2026-12-31', 10.0, 1.0, 'mm/hr')
) as v(test_code, level, lot, manu, expiry, mean, sd, unit)
join edoslmis_tests t on t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = v.test_code
on conflict (tenant_id, test_id, level, lot_number) do nothing;

do $$
declare
  v_rbs_l1 uuid;
  v_rbs_l2 uuid;
  v_esr_l1 uuid;
begin
  if exists (select 1 from edoslmis_qc_runs where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87') then
    return;
  end if;

  select id into v_rbs_l1 from edoslmis_qc_materials
    where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and lot_number = 'QC-GLU-L1-2601';
  select id into v_rbs_l2 from edoslmis_qc_materials
    where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and lot_number = 'QC-GLU-L2-2601';
  select id into v_esr_l1 from edoslmis_qc_materials
    where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and lot_number = 'QC-ESR-L1-2601';

  insert into edoslmis_qc_runs (tenant_id, branch_id, material_id, value, run_at)
  values
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.4, now() - interval '9 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.6, now() - interval '8 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.5, now() - interval '7 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.3, now() - interval '6 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.6, now() - interval '5 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.4, now() - interval '4 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.5, now() - interval '3 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.6, now() - interval '2 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.5, now() - interval '1 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 6.3, now());

  insert into edoslmis_qc_runs (tenant_id, branch_id, material_id, value, run_at)
  values
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 14.9, now() - interval '4 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 15.2, now() - interval '3 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 15.0, now() - interval '2 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 15.1, now() - interval '1 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 14.8, now());

  insert into edoslmis_qc_runs (tenant_id, branch_id, material_id, value, run_at)
  values
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 9.8, now() - interval '4 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 10.2, now() - interval '3 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 10.0, now() - interval '2 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 9.9, now() - interval '1 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 10.1, now());
end $$;
