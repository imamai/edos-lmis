import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BLOOD_GROUP_LABELS } from "@/lib/blood-compatibility";
import { DonorActiveToggle } from "@/components/donor-active-toggle";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { deleteDonor } from "@/lib/actions/bloodbank";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

export default async function DonorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: donor } = await supabase
    .from("edoslmis_bb_donors")
    .select(
      "id, donor_number, first_name, last_name, gender, date_of_birth, phone, national_id, donor_type, blood_group, last_donation_date, deferred_until, deferral_reason, is_active"
    )
    .eq("id", id)
    .single();

  if (!donor) notFound();

  const { data: units } = await supabase
    .from("edoslmis_bb_blood_units")
    .select("id, unit_number, blood_group, component, status, collection_date, expiry_date")
    .eq("donor_id", id)
    .order("collection_date", { ascending: false });

  const unitCount = units?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {donor.first_name} {donor.last_name}
            {!donor.is_active && <Badge tone="neutral" className="ml-2">Deferred / Inactive</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {donor.donor_number} &middot; {donor.donor_type} &middot;{" "}
            {donor.blood_group ? BLOOD_GROUP_LABELS[donor.blood_group] : "Unknown group"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/blood-bank/donors/${donor.id}/edit`}>
            <Button variant="outline">
              <Pencil size={16} /> Edit
            </Button>
          </Link>
          <DonorActiveToggle donorId={donor.id} isActive={donor.is_active} />
          <DeleteEntityButton
            id={donor.id}
            action={deleteDonor}
            canDelete={unitCount < 2}
            blockedMessage={unitCount >= 2 ? "Has recorded donations — deactivate instead." : undefined}
            entityLabel="donor"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Gender:</span> {donor.gender ?? "-"}</p>
          <p><span className="text-muted-foreground">Date of birth:</span> {donor.date_of_birth ?? "-"}</p>
          <p><span className="text-muted-foreground">Phone:</span> {donor.phone ?? "-"}</p>
          <p><span className="text-muted-foreground">National ID:</span> {donor.national_id ?? "-"}</p>
          <p><span className="text-muted-foreground">Last donation:</span> {donor.last_donation_date ?? "-"}</p>
          {donor.deferred_until && (
            <p><span className="text-muted-foreground">Deferred until:</span> {donor.deferred_until}</p>
          )}
          {donor.deferral_reason && (
            <p className="sm:col-span-2"><span className="text-muted-foreground">Deferral reason:</span> {donor.deferral_reason}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Donation History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Component</th>
                <th className="px-4 py-2 font-medium">Collected</th>
                <th className="px-4 py-2 font-medium">Expiry</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(units?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No donations recorded yet.</td>
                </tr>
              )}
              {units?.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium text-foreground">{u.unit_number}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.component.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.collection_date}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.expiry_date}</td>
                  <td className="px-4 py-2"><Badge tone="neutral">{u.status.replace(/_/g, " ")}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
