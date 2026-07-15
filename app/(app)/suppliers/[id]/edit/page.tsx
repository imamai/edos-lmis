import { getSupplier } from "@/lib/data/procurement";
import { EditSupplierForm } from "@/components/edit-supplier-form";
import { notFound } from "next/navigation";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Supplier</h1>
        <p className="text-sm text-muted-foreground">Update contact details</p>
      </div>
      <EditSupplierForm supplier={supplier} />
    </div>
  );
}
