import { createClient } from "@/lib/supabase/server";
import { getSettingsList } from "@/lib/data/settings-lists";
import { EditInventoryItemForm } from "@/components/edit-inventory-item-form";
import { notFound } from "next/navigation";

export default async function EditInventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: item }, { data: departments }, categories] = await Promise.all([
    supabase
      .from("edoslmis_inventory_items")
      .select("id, code, name, category, unit_of_measure, reorder_level, department_id, tracking_mode")
      .eq("id", id)
      .single(),
    supabase.from("edoslmis_departments").select("id, name").eq("is_active", true).order("name"),
    getSettingsList("inventory_category"),
  ]);

  if (!item) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Commodity</h1>
        <p className="text-sm text-muted-foreground">Update this commodity&apos;s details</p>
      </div>
      <EditInventoryItemForm item={item} departments={departments ?? []} categories={categories} />
    </div>
  );
}
