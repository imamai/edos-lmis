import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOut } from "@/lib/actions/auth";
import type { Locale } from "@/lib/i18n/dictionaries";
import { Search, LogOut } from "lucide-react";

export function Topbar({
  staffName,
  branchLabel,
  locale,
}: {
  staffName: string;
  branchLabel: string;
  locale: Locale;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-6">
      <div className="flex flex-1 items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            placeholder="Search patients, orders, specimens..."
            className="h-9 w-full rounded-lg border border-border bg-surface-muted pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">{branchLabel}</span>
        <LanguageSwitcher locale={locale} />
        <ThemeToggle />
        <div className="flex items-center gap-2 border-l border-border pl-3">
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {staffName}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-surface-muted"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
