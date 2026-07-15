"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type PatientHit = {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  phone_primary: string | null;
};

export function PatientPicker({
  onSelect,
}: {
  onSelect: (patient: PatientHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("edoslmis_patients")
        .select("id, patient_number, first_name, last_name, phone_primary")
        .is("deleted_at", null)
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,patient_number.ilike.%${query}%,phone_primary.ilike.%${query}%`
        )
        .limit(10);
      setResults(data ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative">
      <Input
        placeholder="Search patient by name, number, or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p className="mt-1 text-xs text-muted-foreground">Searching...</p>}
      {results.length > 0 && (
        <Card className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto p-1">
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                onSelect(p);
                setResults([]);
                setQuery(`${p.first_name} ${p.last_name} (${p.patient_number})`);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted"
            >
              <span className="font-medium text-foreground">
                {p.first_name} {p.last_name}
              </span>{" "}
              <span className="text-muted-foreground">
                {p.patient_number} &middot; {p.phone_primary ?? "no phone"}
              </span>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
