import { getPanel, getTests } from "@/lib/data/catalog";
import { EditPanelForm } from "@/components/edit-panel-form";
import { notFound } from "next/navigation";

export default async function EditPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [panel, { data: tests }] = await Promise.all([getPanel(id), getTests()]);
  if (!panel) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Panel</h1>
        <p className="text-sm text-muted-foreground">{panel.code} &middot; {panel.name}</p>
      </div>
      <EditPanelForm panel={panel} tests={tests.filter((t) => t.is_active)} />
    </div>
  );
}
