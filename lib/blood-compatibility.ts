const RECIPIENT_COMPATIBLE_DONORS: Record<string, string[]> = {
  O_neg: ["O_neg"],
  O_pos: ["O_neg", "O_pos"],
  A_neg: ["O_neg", "A_neg"],
  A_pos: ["O_neg", "O_pos", "A_neg", "A_pos"],
  B_neg: ["O_neg", "B_neg"],
  B_pos: ["O_neg", "O_pos", "B_neg", "B_pos"],
  AB_neg: ["O_neg", "A_neg", "B_neg", "AB_neg"],
  AB_pos: ["O_neg", "O_pos", "A_neg", "A_pos", "B_neg", "B_pos", "AB_neg", "AB_pos"],
};

export function compatibleDonorGroups(recipientGroup: string | null): string[] {
  if (!recipientGroup) return Object.keys(RECIPIENT_COMPATIBLE_DONORS);
  return RECIPIENT_COMPATIBLE_DONORS[recipientGroup] ?? [];
}

export const BLOOD_GROUP_LABELS: Record<string, string> = {
  O_neg: "O−", O_pos: "O+", A_neg: "A−", A_pos: "A+",
  B_neg: "B−", B_pos: "B+", AB_neg: "AB−", AB_pos: "AB+",
};

// Shared with every blood-bank form so the option list only lives in one
// place — previously copy-pasted verbatim across donor/unit/crossmatch forms.
export const BLOOD_COMPONENT_LABELS: Record<string, string> = {
  whole_blood: "Whole Blood",
  packed_red_cells: "Packed Red Cells",
  fresh_frozen_plasma: "Fresh Frozen Plasma",
  platelet_concentrate: "Platelet Concentrate",
  cryoprecipitate: "Cryoprecipitate",
};

export const DONOR_TYPE_LABELS: Record<string, string> = {
  voluntary: "Voluntary",
  replacement: "Replacement",
  autologous: "Autologous",
};
