import { NewSupplierForm } from "@/components/new-supplier-form";

export default function NewSupplierPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Supplier</h1>
        <p className="text-sm text-muted-foreground">Add a commodity/reagent supplier</p>
      </div>
      <NewSupplierForm />
    </div>
  );
}
