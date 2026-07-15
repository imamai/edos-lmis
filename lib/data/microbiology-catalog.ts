import { createClient } from "@/lib/supabase/server";

export type OrganismRow = { id: string; name: string; gram_stain: string; is_active: boolean };
export type AntibioticRow = { id: string; name: string; antibiotic_class: string | null; is_active: boolean };

export async function getOrganisms(): Promise<OrganismRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_micro_organisms")
    .select("id, name, gram_stain, is_active")
    .order("name");
  return data ?? [];
}

export async function getAntibiotics(): Promise<AntibioticRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_micro_antibiotics")
    .select("id, name, antibiotic_class, is_active")
    .order("name");
  return data ?? [];
}
