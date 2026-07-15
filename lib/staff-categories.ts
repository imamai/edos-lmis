// public.staff_category enum values on edoshms_user_profiles (introspected
// from the live schema — this table belongs to the shared edoshms system).
// Kept in its own module (no server-only imports) so client components can
// import it directly without pulling in lib/supabase/server.ts.
export const STAFF_CATEGORIES = [
  "doctor", "nurse", "clinical_officer", "pharmacist", "lab_technician",
  "radiographer", "physiotherapist", "nutritionist", "social_worker",
  "counsellor", "anaesthetist", "surgeon", "dentist", "optician", "admin",
  "cashier", "receptionist", "it", "housekeeper", "security", "other",
] as const;
