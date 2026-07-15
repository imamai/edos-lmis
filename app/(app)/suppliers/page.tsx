import { getSuppliers } from "@/lib/data/procurement";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function SuppliersPage() {
  const { data: suppliers, error } = await getSuppliers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Commodity/reagent suppliers and their contact details</p>
        </div>
        <Link href="/suppliers/new">
          <Button>New Supplier</Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact person</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-critical">{error}</td>
              </tr>
            )}
            {!error && suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No suppliers yet.</td>
              </tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/suppliers/${s.id}`} className="font-medium text-primary hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.contact_person ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.phone ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.email ?? "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone={s.is_active ? "success" : "neutral"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
