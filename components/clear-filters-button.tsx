import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function ClearFiltersButton({ href }: { href: string }) {
  return (
    <Link href={href}>
      <Button variant="ghost" size="sm">
        <X size={14} /> Clear
      </Button>
    </Link>
  );
}
