-- EDOS LMIS Phase 1 — enums
-- Independent LMIS module. Tenancy/RBAC/audit identity comes from edoshms_*; everything
-- domain-specific to the lab is new and prefixed edoslmis_.

do $$ begin
  create type edoslmis_department_type as enum (
    'clinical_chemistry','haematology','microbiology','virology','parasitology',
    'immunology','histopathology','cytology','molecular_biology','pcr','blood_bank',
    'urinalysis','toxicology','serology','tb_laboratory','hiv_laboratory','covid',
    'research','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_gender_applicability as enum ('all','male','female');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_gender as enum ('male','female','other','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_patient_category as enum (
    'walk_in','inpatient','outpatient','corporate','insurance','referral','research'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_order_source as enum (
    'manual','emr','api','hl7','fhir','referral','bulk_import'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_order_priority as enum ('routine','urgent','stat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_order_status as enum (
    'pending','accessioned','in_progress','partially_completed','completed','cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_order_test_status as enum (
    'pending','specimen_collected','received','in_analysis','resulted','verified',
    'released','cancelled','rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_specimen_status as enum (
    'pending_collection','collected','in_transit','received','accessioned','rejected',
    'in_analysis','analyzed','disposed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_tracking_event as enum (
    'ordered','collected','received','rejected','accessioned','routed',
    'analysis_started','analysis_completed','verified','released','disposed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_result_flag as enum (
    'normal','low','high','critical_low','critical_high','abnormal'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_verification_level as enum ('technologist','scientist','pathologist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_verification_status as enum (
    'pending','verified','rejected_back_for_recollection'
  );
exception when duplicate_object then null; end $$;
