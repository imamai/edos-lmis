-- EDOS LMIS Phase 1 — seed data for tenant "EdosCentre Medical"
-- tenant_id 5149e80b-d5a9-4bfa-a1ac-8508c8898c87, branch_id (Main Branch) f201bc43-ea2c-48e1-86ba-6f11ffce76b0

-- ---------------------------------------------------------------------------
-- Lab roles (edoshms_roles is currently empty across the whole DB)
-- ---------------------------------------------------------------------------
insert into edoshms_roles (tenant_id, code, name, description, permissions, is_system, is_active)
values
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'lab_phlebotomist', 'Phlebotomist',
   'Collects specimens', '["edoslmis.order.manage","edoslmis.specimen.collect"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'lab_technologist', 'Lab Technologist',
   'Accessions specimens and enters results', '["edoslmis.order.manage","edoslmis.specimen.collect","edoslmis.result.enter"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'lab_scientist', 'Laboratory Scientist',
   'First-level result verification', '["edoslmis.order.manage","edoslmis.result.enter","edoslmis.result.verify","edoslmis.critical.acknowledge"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'pathologist', 'Pathologist',
   'Final verification and release', '["edoslmis.result.verify","edoslmis.result.release","edoslmis.critical.acknowledge"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'lab_manager', 'Laboratory Manager',
   'Manages catalogue, departments and staff', '["edoslmis.catalog.manage","edoslmis.patient.manage","edoslmis.order.manage","edoslmis.specimen.collect","edoslmis.result.enter","edoslmis.result.verify","edoslmis.result.release","edoslmis.critical.acknowledge"]'::jsonb, false, true)
on conflict do nothing;

-- Assign two existing staff members lab roles so the two-step verification
-- flow (technologist -> scientist) can be exercised end to end.
insert into edoshms_user_roles (tenant_id, user_id, role_id, branch_id, is_active)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', '8b02234d-9b0d-40b2-b72d-b56c21af7ad7',
       r.id, 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', true
from edoshms_roles r where r.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and r.code = 'lab_technologist'
on conflict do nothing;

insert into edoshms_user_roles (tenant_id, user_id, role_id, branch_id, is_active)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', '2f3275b4-08fc-41cd-9213-0365d401429c',
       r.id, 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', true
from edoshms_roles r where r.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and r.code = 'lab_scientist'
on conflict do nothing;

insert into edoshms_user_roles (tenant_id, user_id, role_id, branch_id, is_active)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f02b1786-7a40-47e2-bec4-c59560b93824',
       r.id, 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', true
from edoshms_roles r where r.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and r.code = 'pathologist'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
insert into edoslmis_departments (tenant_id, branch_id, code, name, department_type, default_tat_hours)
values
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'CHEM', 'Clinical Chemistry', 'clinical_chemistry', 6),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'HAEM', 'Haematology', 'haematology', 4),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'MICRO', 'Microbiology', 'microbiology', 72),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'PARA', 'Parasitology', 'parasitology', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'SERO', 'Serology & Immunology', 'immunology', 24),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'BB', 'Blood Bank', 'blood_bank', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'URINE', 'Urinalysis', 'urinalysis', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'MOLBIO', 'Molecular Biology / PCR', 'molecular_biology', 48),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'HISTO', 'Histopathology', 'histopathology', 120)
on conflict (tenant_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- Specimen types
-- ---------------------------------------------------------------------------
insert into edoslmis_specimen_types (tenant_id, code, name, default_container)
values
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'WB_EDTA', 'Whole Blood (EDTA)', 'Purple-top EDTA tube'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'SERUM', 'Serum', 'Red/Gold-top SST tube'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'PLASMA', 'Plasma (Citrate)', 'Blue-top citrate tube'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'URINE', 'Urine', 'Sterile urine container'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'STOOL', 'Stool', 'Stool container'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'SPUTUM', 'Sputum', 'Sputum container'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'CSF', 'Cerebrospinal Fluid', 'Sterile CSF tube'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'SWAB', 'Swab', 'Sterile swab with transport medium'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'WB_NOADD', 'Whole Blood (no additive)', 'Plain tube')
on conflict (tenant_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- Tests + panels (representative Kenyan lab menu)
-- ---------------------------------------------------------------------------

-- Full Haemogram / FBC (panel with components)
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, price, turnaround_time_hours, is_panel, methodology)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, 'FBC', 'Full Haemogram (FBC)', 'FBC', 800, 4, true, 'Automated haematology analyzer'
from edoslmis_departments d, edoslmis_specimen_types st
where d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = 'HAEM'
  and st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = 'WB_EDTA'
on conflict (tenant_id, code) do nothing;

insert into edoslmis_test_components (test_id, name, sequence, unit)
select t.id, comp.name, comp.seq, comp.unit
from edoslmis_tests t
cross join (values
  ('White Blood Cells (WBC)', 1, '10^9/L'),
  ('Red Blood Cells (RBC)', 2, '10^12/L'),
  ('Haemoglobin (HGB)', 3, 'g/dL'),
  ('Haematocrit (HCT)', 4, '%'),
  ('Platelets (PLT)', 5, '10^9/L'),
  ('MCV', 6, 'fL'),
  ('MCH', 7, 'pg'),
  ('MCHC', 8, 'g/dL')
) as comp(name, seq, unit)
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC'
  and not exists (select 1 from edoslmis_test_components tc where tc.test_id = t.id and tc.name = comp.name);

-- Reference ranges for HGB (gender specific) and WBC/PLT (generic)
insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'male', 6570, 13.5, 17.5, 6.5, 20
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Haemoglobin (HGB)'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'female', 6570, 12.0, 15.5, 6.5, 20
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Haemoglobin (HGB)'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'all', 0, 4.0, 11.0, 2.0, 30.0
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'White Blood Cells (WBC)'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'all', 0, 150, 450, 20, 1000
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Platelets (PLT)'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC';

-- Renal / U&E&Cr panel
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, price, turnaround_time_hours, is_panel, methodology)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, 'UECR', 'Urea, Electrolytes & Creatinine', 'U&E&Cr', 1200, 6, true, 'Ion-selective electrode / colorimetric'
from edoslmis_departments d, edoslmis_specimen_types st
where d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = 'CHEM'
  and st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = 'SERUM'
on conflict (tenant_id, code) do nothing;

insert into edoslmis_test_components (test_id, name, sequence, unit)
select t.id, comp.name, comp.seq, comp.unit
from edoslmis_tests t
cross join (values
  ('Sodium', 1, 'mmol/L'), ('Potassium', 2, 'mmol/L'), ('Chloride', 3, 'mmol/L'),
  ('Urea', 4, 'mmol/L'), ('Creatinine', 5, 'umol/L')
) as comp(name, seq, unit)
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'UECR'
  and not exists (select 1 from edoslmis_test_components tc where tc.test_id = t.id and tc.name = comp.name);

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'all', 0, 135, 145, 120, 160
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Sodium'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'UECR';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'all', 0, 3.5, 5.1, 2.5, 6.5
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Potassium'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'UECR';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high)
select t.id, tc.id, 'all', 0, 53, 97
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Creatinine'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'UECR';

-- Liver function tests panel
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, price, turnaround_time_hours, is_panel, methodology)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, 'LFT', 'Liver Function Tests', 'LFT', 1500, 6, true, 'Colorimetric / enzymatic'
from edoslmis_departments d, edoslmis_specimen_types st
where d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = 'CHEM'
  and st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = 'SERUM'
on conflict (tenant_id, code) do nothing;

insert into edoslmis_test_components (test_id, name, sequence, unit)
select t.id, comp.name, comp.seq, comp.unit
from edoslmis_tests t
cross join (values
  ('ALT', 1, 'U/L'), ('AST', 2, 'U/L'), ('ALP', 3, 'U/L'),
  ('Total Bilirubin', 4, 'umol/L'), ('Direct Bilirubin', 5, 'umol/L'), ('Total Protein', 6, 'g/L'), ('Albumin', 7, 'g/L')
) as comp(name, seq, unit)
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'LFT'
  and not exists (select 1 from edoslmis_test_components tc where tc.test_id = t.id and tc.name = comp.name);

-- Lipid profile panel
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, price, turnaround_time_hours, is_panel, methodology)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, 'LIPID', 'Lipid Profile', 'Lipids', 1300, 6, true, 'Enzymatic colorimetric'
from edoslmis_departments d, edoslmis_specimen_types st
where d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = 'CHEM'
  and st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = 'SERUM'
on conflict (tenant_id, code) do nothing;

insert into edoslmis_test_components (test_id, name, sequence, unit)
select t.id, comp.name, comp.seq, comp.unit
from edoslmis_tests t
cross join (values
  ('Total Cholesterol', 1, 'mmol/L'), ('HDL Cholesterol', 2, 'mmol/L'),
  ('LDL Cholesterol', 3, 'mmol/L'), ('Triglycerides', 4, 'mmol/L')
) as comp(name, seq, unit)
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'LIPID'
  and not exists (select 1 from edoslmis_test_components tc where tc.test_id = t.id and tc.name = comp.name);

-- Single-parameter tests
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, unit, price, turnaround_time_hours, is_panel, methodology, critical_low, critical_high)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, v.code, v.name, v.short_name, v.unit, v.price, v.tat, false, v.method, v.crit_low, v.crit_high
from (values
  ('CHEM', 'SERUM', 'RBS', 'Random Blood Sugar', 'RBS', 'mmol/L', 200, 1, 'Glucose oxidase', 2.2, 22.0),
  ('CHEM', 'SERUM', 'HBA1C', 'Glycated Haemoglobin (HbA1c)', 'HbA1c', '%', 1500, 24, 'HPLC', null, null),
  ('CHEM', 'SERUM', 'TSH', 'Thyroid Stimulating Hormone', 'TSH', 'mIU/L', 1800, 24, 'Immunoassay (CLIA)', null, null),
  ('PARA', 'WB_EDTA', 'MALBS', 'Malaria Blood Slide (BS)', 'Mal BS', null, 300, 2, 'Microscopy', null, null),
  ('PARA', 'WB_EDTA', 'MALRDT', 'Malaria Rapid Diagnostic Test', 'Mal RDT', null, 250, 1, 'Rapid immunochromatography', null, null),
  ('SERO', 'SERUM', 'HIVRT', 'HIV Rapid Test', 'HIV RT', null, 500, 1, 'Rapid immunochromatography', null, null),
  ('SERO', 'SERUM', 'WIDAL', 'Widal Test', 'Widal', null, 600, 4, 'Slide agglutination', null, null),
  ('SERO', 'SERUM', 'VDRL', 'VDRL / RPR (Syphilis)', 'VDRL', null, 500, 4, 'Flocculation', null, null),
  ('SERO', 'SERUM', 'HBSAG', 'Hepatitis B Surface Antigen', 'HBsAg', null, 700, 4, 'Rapid immunochromatography', null, null),
  ('SERO', 'SERUM', 'CRP', 'C-Reactive Protein', 'CRP', 'mg/L', 900, 6, 'Turbidimetric', null, 100),
  ('HAEM', 'WB_NOADD', 'ESR', 'Erythrocyte Sedimentation Rate', 'ESR', 'mm/hr', 300, 2, 'Westergren', null, null),
  ('BB', 'WB_EDTA', 'BGRP', 'Blood Group & Rh Factor', 'Blood Group', null, 500, 2, 'Slide/tube agglutination', null, null),
  ('URINE', 'URINE', 'URINA', 'Urinalysis (Dipstick + Microscopy)', 'Urinalysis', null, 400, 2, 'Dipstick + microscopy', null, null),
  ('MICRO', 'STOOL', 'STOOLMCS', 'Stool Microscopy, Culture & Sensitivity', 'Stool M/C/S', null, 900, 72, 'Culture', null, null),
  ('MOLBIO', 'SWAB', 'COVIDPCR', 'SARS-CoV-2 RT-PCR', 'COVID PCR', null, 3500, 24, 'Real-time RT-PCR', null, null)
) as v(dept_code, spec_code, code, name, short_name, unit, price, tat, method, crit_low, crit_high)
join edoslmis_departments d on d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = v.dept_code
join edoslmis_specimen_types st on st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = v.spec_code
on conflict (tenant_id, code) do nothing;
