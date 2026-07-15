import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { OfflineIndicator } from "@/components/offline-indicator";
import { BackButton } from "@/components/back-button";
import { getCurrentStaff } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/get-locale";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  const locale = await getLocale();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar locale={locale} isPlatformAdmin={staff.isPlatformAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar staffName={`${staff.firstName} ${staff.lastName}`} branchLabel={staff.branchName ?? ""} locale={locale} />
        <OfflineIndicator />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <BackButton />
          {children}
        </main>
      </div>
    </div>
  );
}
