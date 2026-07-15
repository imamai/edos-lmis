import { getDepartment } from "@/lib/data/catalog";
import { EditDepartmentForm } from "@/components/edit-department-form";
import { notFound } from "next/navigation";

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const department = await getDepartment(id);
  if (!department) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Department</h1>
        <p className="text-sm text-muted-foreground">Update this department&apos;s details</p>
      </div>
      <EditDepartmentForm department={department} />
    </div>
  );
}
