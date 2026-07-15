import { getDepartments, getTestCategories, getSpecimenTypes } from "@/lib/data/catalog";
import { NewTestForm } from "@/components/new-test-form";

export default async function NewTestPage() {
  const [{ data: departments }, categories, specimenTypes] = await Promise.all([
    getDepartments(),
    getTestCategories(),
    getSpecimenTypes(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Test</h1>
        <p className="text-sm text-muted-foreground">Add a test to the lab&apos;s menu</p>
      </div>
      <NewTestForm
        departments={departments.filter((d) => d.is_active)}
        categories={categories}
        specimenTypes={specimenTypes}
      />
    </div>
  );
}
