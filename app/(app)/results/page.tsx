import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/lib/i18n/get-locale";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import Link from "next/link";

type Row = {
  id: string;
  status: string;
  edoslmis_tests: { name: string } | { name: string }[] | null;
  edoslmis_departments: { code: string } | { code: string }[] | null;
  edoslmis_orders:
    | { order_number: string; edoslmis_patients: { first_name: string; last_name: string } | null }
    | { order_number: string; edoslmis_patients: { first_name: string; last_name: string } | null }[]
    | null;
};

const specializedWorkflow: Record<string, string> = {
  MICRO: "/microbiology",
  MOLBIO: "/molecular",
  HISTO: "/histopathology",
};

function testName(row: Row) {
  const t = Array.isArray(row.edoslmis_tests) ? row.edoslmis_tests[0] : row.edoslmis_tests;
  return t?.name ?? "-";
}
function resultHref(row: Row) {
  const dept = Array.isArray(row.edoslmis_departments) ? row.edoslmis_departments[0] : row.edoslmis_departments;
  const base = dept?.code ? specializedWorkflow[dept.code] : undefined;
  return base ? `${base}/${row.id}` : `/results/${row.id}`;
}
function orderInfo(row: Row) {
  const o = Array.isArray(row.edoslmis_orders) ? row.edoslmis_orders[0] : row.edoslmis_orders;
  const patient = o?.edoslmis_patients;
  return {
    orderNumber: o?.order_number ?? "-",
    patientName: patient ? `${patient.first_name} ${patient.last_name}` : "-",
  };
}

function Worklist({
  title,
  rows,
  useSpecializedEntry,
  t,
}: {
  title: string;
  rows: Row[];
  useSpecializedEntry?: boolean;
  t: Dictionary["results"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Patient</th>
              <th className="px-4 py-2 font-medium">Test</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  {t.nothingHere}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const { orderNumber, patientName } = orderInfo(row);
              return (
                <tr key={row.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-2 text-muted-foreground">{orderNumber}</td>
                  <td className="px-4 py-2 text-foreground">{patientName}</td>
                  <td className="px-4 py-2 text-foreground">{testName(row)}</td>
                  <td className="px-4 py-2">
                    <Badge tone="info">{row.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={useSpecializedEntry ? resultHref(row) : `/results/${row.id}`} className="font-medium text-primary hover:underline">
                      {t.open}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default async function ResultsPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const t = dict.results;

  const { data: rows } = await supabase
    .from("edoslmis_order_tests")
    .select("id, status, edoslmis_tests(name), edoslmis_departments(code), edoslmis_orders(order_number, edoslmis_patients(first_name, last_name))")
    .in("status", ["received", "in_analysis", "resulted", "verified"])
    .order("created_at", { ascending: true });

  const all = (rows ?? []) as unknown as Row[];
  const pendingEntry = all.filter((r) => ["received", "in_analysis"].includes(r.status));
  const pendingVerification = all.filter((r) => r.status === "resulted");
  const pendingRelease = all.filter((r) => r.status === "verified");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>
      <Worklist title={t.pendingEntry} rows={pendingEntry} useSpecializedEntry t={t} />
      <Worklist title={t.pendingVerification} rows={pendingVerification} t={t} />
      <Worklist title={t.pendingRelease} rows={pendingRelease} t={t} />
    </div>
  );
}
