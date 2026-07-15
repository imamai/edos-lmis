export type Department = {
  id: string;
  code: string;
  name: string;
  department_type: string;
  default_tat_hours: number | null;
};

export type SpecimenType = {
  id: string;
  code: string;
  name: string;
  default_container: string | null;
};

export type TestComponent = {
  id: string;
  test_id: string;
  name: string;
  sequence: number;
  unit: string | null;
  data_type: string;
  critical_low: number | null;
  critical_high: number | null;
};

export type Test = {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  price: number;
  turnaround_time_hours: number | null;
  is_panel: boolean;
  department_id: string | null;
  specimen_type_id: string | null;
  methodology: string | null;
  unit: string | null;
  critical_low: number | null;
  critical_high: number | null;
};

export type Patient = {
  id: string;
  patient_number: string;
  national_id: string | null;
  first_name: string;
  last_name: string;
  other_names: string | null;
  gender: string | null;
  date_of_birth: string | null;
  phone_primary: string | null;
  county: string | null;
  patient_category: string;
  created_at: string;
};

export type OrderStatus =
  | "pending"
  | "accessioned"
  | "in_progress"
  | "partially_completed"
  | "completed"
  | "cancelled";

export type Order = {
  id: string;
  order_number: string;
  patient_id: string;
  ordering_clinician: string | null;
  order_source: string;
  priority: "routine" | "urgent" | "stat";
  status: OrderStatus;
  clinical_indication: string | null;
  ordered_at: string;
  created_at: string;
};

export type OrderTestStatus =
  | "pending"
  | "specimen_collected"
  | "received"
  | "in_analysis"
  | "resulted"
  | "verified"
  | "released"
  | "cancelled"
  | "rejected";

export type OrderTest = {
  id: string;
  order_id: string;
  test_id: string;
  panel_id: string | null;
  department_id: string | null;
  specimen_id: string | null;
  price: number;
  status: OrderTestStatus;
  created_at: string;
};

export type SpecimenStatus =
  | "pending_collection"
  | "collected"
  | "in_transit"
  | "received"
  | "accessioned"
  | "rejected"
  | "in_analysis"
  | "analyzed"
  | "disposed";

export type Specimen = {
  id: string;
  order_id: string;
  specimen_number: string;
  specimen_type_id: string | null;
  status: SpecimenStatus;
  collected_at: string | null;
  received_at: string | null;
  condition_on_receipt: string | null;
  rejection_reason: string | null;
  storage_location: string | null;
  created_at: string;
};

export type ResultFlag =
  | "normal"
  | "low"
  | "high"
  | "critical_low"
  | "critical_high"
  | "abnormal";

export type ResultEntry = {
  id: string;
  order_test_id: string;
  component_id: string | null;
  result_value_text: string | null;
  result_value_numeric: number | null;
  unit: string | null;
  flag: ResultFlag | null;
  is_critical: boolean;
  comments: string | null;
  entered_by: string | null;
  entered_at: string;
};

export type VerificationLevel = "technologist" | "scientist" | "pathologist";
export type VerificationStatus = "pending" | "verified" | "rejected_back_for_recollection";

export type ResultVerification = {
  id: string;
  order_test_id: string;
  level: VerificationLevel;
  status: VerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  comments: string | null;
};
