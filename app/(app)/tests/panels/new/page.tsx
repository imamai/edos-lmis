import { getTests } from "@/lib/data/catalog";
import { NewPanelForm } from "@/components/new-panel-form";

export default async function NewPanelPage() {
  const { data: tests } = await getTests();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Panel</h1>
        <p className="text-sm text-muted-foreground">Bundle several tests together (e.g. LFT, U&amp;E)</p>
      </div>
      <NewPanelForm tests={tests.filter((t) => t.is_active)} />
    </div>
  );
}
