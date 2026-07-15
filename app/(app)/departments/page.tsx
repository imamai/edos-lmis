import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DepartmentActiveToggle } from "@/components/department-active-toggle";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { deleteDepartment } from "@/lib/actions/catalog";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  const { data: departments, error } = await supabase
    .from("edoslmis_departments")
    .select("id, code, name, department_type, default_tat_hours, is_active, edoslmis_tests(count)")
    .order("name");

  if (error) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground">Laboratory sections and their test menus</p>
        </div>
        <Link href="/departments/new">
          <Button>
            <Plus size={16} /> New Department
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments?.map((d) => {
          const testCount = (d.edoslmis_tests as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <Card key={d.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{d.name}</CardTitle>
                <Badge tone="neutral">{d.code}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Type: {d.department_type.replace(/_/g, " ")}</p>
                <p>Default TAT: {d.default_tat_hours ? `${d.default_tat_hours}h` : "-"}</p>
                <p>{testCount} tests configured</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <DepartmentActiveToggle departmentId={d.id} isActive={d.is_active} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/departments/${d.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Pencil size={14} /> Edit
                      </Button>
                    </Link>
                    <DeleteEntityButton id={d.id} action={deleteDepartment} canDelete entityLabel="department" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
