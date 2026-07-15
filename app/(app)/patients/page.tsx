import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClearFiltersButton } from "@/components/clear-filters-button";
import { DeactivatePatientRowButton } from "@/components/deactivate-patient-row-button";
import { calculateAge } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/get-locale";
import Link from "next/link";
import { Plus, Search, Pencil } from "lucide-react";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const dict = await getDictionary();
  const t = dict.patients;

  let query = supabase
    .from("edoslmis_patients")
    .select("id, patient_number, first_name, last_name, gender, date_of_birth, phone_primary, patient_category, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,patient_number.ilike.%${q}%,national_id.ilike.%${q}%,phone_primary.ilike.%${q}%`
    );
  }

  const { data: patients, error } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Link href="/patients/new">
          <Button>
            <Plus size={16} /> {t.registerButton}
          </Button>
        </Link>
      </div>

      <form className="flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={t.searchPlaceholder} className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">{t.searchButton}</Button>
        {q && <ClearFiltersButton href="/patients" />}
      </form>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t.colPatientNo}</th>
              <th className="px-4 py-3 font-medium">{t.colName}</th>
              <th className="px-4 py-3 font-medium">{t.colGenderAge}</th>
              <th className="px-4 py-3 font-medium">{t.colPhone}</th>
              <th className="px-4 py-3 font-medium">{t.colCategory}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-critical">
                  {error.message}
                </td>
              </tr>
            )}
            {!error && (patients?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  {t.noResults}
                </td>
              </tr>
            )}
            {patients?.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/patients/${p.id}`} className="font-medium text-primary hover:underline">
                    {p.patient_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {p.first_name} {p.last_name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.gender ?? "-"} / {calculateAge(p.date_of_birth) ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.phone_primary ?? "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone="neutral">{p.patient_category}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/patients/${p.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Pencil size={14} /> Edit
                      </Button>
                    </Link>
                    <DeactivatePatientRowButton patientId={p.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
