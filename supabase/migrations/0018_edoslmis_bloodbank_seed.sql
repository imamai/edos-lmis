-- EDOS LMIS Phase 3 — seed donors and available blood units

do $$
declare
  v_tenant uuid := '5149e80b-d5a9-4bfa-a1ac-8508c8898c87';
  v_branch uuid := 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0';
  v_donor_id uuid;
  v_donor_number text;
  v_unit_number text;
  v_row record;
begin
  if exists (select 1 from edoslmis_bb_donors where tenant_id = v_tenant) then
    return;
  end if;

  for v_row in
    select * from (values
      ('Kevin', 'Otieno', 'male'::edoslmis_gender, 'O_pos'::edoslmis_blood_group),
      ('Grace', 'Wanjiru', 'female'::edoslmis_gender, 'A_pos'::edoslmis_blood_group),
      ('Amina', 'Hassan', 'female'::edoslmis_gender, 'B_neg'::edoslmis_blood_group),
      ('Peter', 'Kamau', 'male'::edoslmis_gender, 'O_neg'::edoslmis_blood_group),
      ('Sarah', 'Mutiso', 'female'::edoslmis_gender, 'AB_pos'::edoslmis_blood_group)
    ) as d(first_name, last_name, gender, blood_group)
  loop
    v_donor_number := edoslmis_generate_donor_number();
    insert into edoslmis_bb_donors (tenant_id, branch_id, donor_number, first_name, last_name, gender, donor_type, blood_group, last_donation_date)
    values (v_tenant, v_branch, v_donor_number, v_row.first_name, v_row.last_name, v_row.gender, 'voluntary', v_row.blood_group, current_date - 14)
    returning id into v_donor_id;

    v_unit_number := edoslmis_generate_blood_unit_number();
    insert into edoslmis_bb_blood_units (
      tenant_id, branch_id, unit_number, donor_id, blood_group, component, volume_ml,
      collection_date, expiry_date, status, screening_hiv, screening_hbsag, screening_hcv, screening_syphilis
    ) values (
      v_tenant, v_branch, v_unit_number, v_donor_id, v_row.blood_group, 'whole_blood', 450,
      current_date - 14, current_date + 21, 'available', 'non_reactive', 'non_reactive', 'non_reactive', 'non_reactive'
    );
  end loop;
end $$;
