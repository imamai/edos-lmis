import { getTests, getPanels } from "@/lib/data/catalog";
import { setTestActive, setPanelActive, deleteTest, deletePanel } from "@/lib/actions/catalog";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActiveToggle } from "@/components/active-toggle";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";

export default async function TestsPage() {
  const [{ data: tests, error: testsError }, { data: panels, error: panelsError }] = await Promise.all([
    getTests(),
    getPanels(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tests &amp; Panels</h1>
          <p className="text-sm text-muted-foreground">The lab&apos;s test menu — pricing, department, and turnaround</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tests/panels/new">
            <Button variant="secondary">
              <Plus size={16} /> New Panel
            </Button>
          </Link>
          <Link href="/tests/new">
            <Button>
              <Plus size={16} /> New Test
            </Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Tests</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Test</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Specimen</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">TAT</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {testsError && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-critical">{testsError}</td></tr>
            )}
            {!testsError && tests.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No tests yet.</td></tr>
            )}
            {tests.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{t.name}</span>{" "}
                  <span className="text-muted-foreground">({t.code})</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.department?.name ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.specimen_type?.name ?? "-"}</td>
                <td className="px-4 py-3 text-foreground">{t.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.turnaround_time_hours ? `${t.turnaround_time_hours}h` : "-"}</td>
                <td className="px-4 py-3">
                  <ActiveToggle id={t.id} isActive={t.is_active} action={setTestActive} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/tests/${t.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Pencil size={14} /> Edit
                      </Button>
                    </Link>
                    <DeleteEntityButton id={t.id} action={deleteTest} canDelete entityLabel="test" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Panels</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Panel</th>
              <th className="px-4 py-3 font-medium">Tests</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {panelsError && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-critical">{panelsError}</td></tr>
            )}
            {!panelsError && panels.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No panels yet.</td></tr>
            )}
            {panels.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{p.name}</span>{" "}
                  <span className="text-muted-foreground">({p.code})</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.test_count} tests</td>
                <td className="px-4 py-3 text-foreground">{p.price.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <ActiveToggle id={p.id} isActive={p.is_active} action={setPanelActive} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/tests/panels/${p.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Pencil size={14} /> Edit
                      </Button>
                    </Link>
                    <DeleteEntityButton id={p.id} action={deletePanel} canDelete entityLabel="panel" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
