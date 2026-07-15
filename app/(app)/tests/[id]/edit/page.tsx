import {
  getTest,
  getDepartments,
  getTestCategories,
  getSpecimenTypes,
  getTestReagentUsage,
  getTestComponents,
} from "@/lib/data/catalog";
import { getProcurableItems } from "@/lib/data/procurement";
import { EditTestForm } from "@/components/edit-test-form";
import { TestReagentUsageManager } from "@/components/test-reagent-usage-manager";
import { TestComponentManager } from "@/components/test-component-manager";
import { notFound } from "next/navigation";

export default async function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [test, { data: departments }, categories, specimenTypes, usage, items, components] = await Promise.all([
    getTest(id),
    getDepartments(),
    getTestCategories(),
    getSpecimenTypes(),
    getTestReagentUsage(id),
    getProcurableItems(),
    getTestComponents(id),
  ]);
  if (!test) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Test</h1>
        <p className="text-sm text-muted-foreground">{test.code} &middot; {test.name}</p>
      </div>
      <EditTestForm
        test={test}
        departments={departments.filter((d) => d.is_active)}
        categories={categories}
        specimenTypes={specimenTypes}
      />
      <TestComponentManager testId={id} components={components} />
      <TestReagentUsageManager testId={id} usage={usage} items={items} />
    </div>
  );
}
