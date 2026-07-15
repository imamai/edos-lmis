"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function setLocale(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border px-1 py-1">
      <Languages size={14} className="ml-1 text-muted-foreground" />
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded px-2 py-0.5 text-xs font-medium ${locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("sw")}
        className={`rounded px-2 py-0.5 text-xs font-medium ${locale === "sw" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        SW
      </button>
    </div>
  );
}
