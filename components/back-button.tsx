"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const NO_BACK_PATHS = new Set(["/dashboard"]);

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  // Deferred to a client-only effect (rather than checked at render time) so
  // the server-rendered and first-client-rendered markup always match —
  // history.length is only meaningful in the browser, so checking it during
  // render would cause a hydration mismatch whenever there's no history yet.
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  if (NO_BACK_PATHS.has(pathname) || !canGoBack) return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={16} /> Back
    </button>
  );
}
