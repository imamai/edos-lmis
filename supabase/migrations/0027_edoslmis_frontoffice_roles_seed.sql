-- EDOS LMIS Phase 7 (extension) — front-office roles
-- Adds receptionist / clinician / cashier roles for the seeded tenant so
-- these three can register patients, place orders, take payments, and run
-- the commodities/procurement module, without touching the existing lab
-- roles (lab_phlebotomist, lab_technologist, lab_scientist, pathologist,
-- lab_manager) seeded in 0007 — those are left exactly as-is for when lab
-- staff are switched on later.
--
-- NOTE: this only creates the role rows. Assigning a real staff login to one
-- of these roles is a separate step (insert into edoshms_user_roles with that
-- person's actual user_id) — no such assignment is made here since no
-- receptionist/clinician/cashier user_id was available at migration time.

insert into edoshms_roles (tenant_id, code, name, description, permissions, is_system, is_active)
values
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'receptionist', 'Receptionist',
   'Registers patients, places orders, and monitors/receives lab commodities',
   '["edoslmis.patient.manage","edoslmis.order.manage","edoslmis.inventory.manage"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'clinician', 'Clinician',
   'Places orders and reviews results/commodity levels (read-only on commodities)',
   '["edoslmis.order.manage"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'cashier', 'Cashier',
   'Takes payments and manages purchase orders/supplier commodity procurement',
   '["edoslmis.billing.manage","edoslmis.inventory.manage"]'::jsonb, false, true)
on conflict do nothing;
