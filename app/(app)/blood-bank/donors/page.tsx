import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BLOOD_GROUP_LABELS } from "@/lib/blood-compatibility";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DonorsPage() {
  const supabase = await createClient();

  const { data: donors, error } = await supabase
    .from("edoslmis_bb_donors")
    .select("id, donor_number, first_name, last_name, donor_type, blood_group, last_donation_date, is_active")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Blood Donors</h1>
          <p className="text-sm text-muted-foreground">Donor registry</p>
        </div>
        <Link href="/blood-bank/donors/new">
          <Button><Plus size={16} /> Register Donor</Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Donor</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Blood Group</th>
              <th className="px-4 py-3 font-medium">Last Donation</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-critical">{error.message}</td>
              </tr>
            )}
            {!error && (donors?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No donors registered yet.</td>
              </tr>
            )}
            {donors?.map((d) => (
              <tr key={d.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/blood-bank/donors/${d.id}`} className="font-medium text-primary hover:underline">
                    {d.first_name} {d.last_name}
                  </Link>
                  <span className="ml-1 text-muted-foreground">({d.donor_number})</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{d.donor_type}</td>
                <td className="px-4 py-3">
                  <Badge tone="neutral">{d.blood_group ? BLOOD_GROUP_LABELS[d.blood_group] : "Unknown"}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{d.last_donation_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone={d.is_active ? "success" : "neutral"}>{d.is_active ? "Active" : "Deferred"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
