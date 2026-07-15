import { createClient } from "@/lib/supabase/server";
import { getSettingsList } from "@/lib/data/settings-lists";
import { NewInventoryItemForm } from "@/components/new-inventory-item-form";

export default async function NewInventoryItemPage() {
  const supabase = await createClient();
  const [{ data: departments }, categories] = await Promise.all([
    supabase.from("edoslmis_departments").select("id, name").eq("is_active", true).order("name"),
    getSettingsList("inventory_category"),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Commodity</h1>
        <p className="text-sm text-muted-foreground">Register a reagent, consumable, or other lab commodity</p>
      </div>
      <NewInventoryItemForm departments={departments ?? []} categories={categories} />
    </div>
  );
}
