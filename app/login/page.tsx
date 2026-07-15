"use client";

import { useActionState } from "react";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { FlaskConical } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FlaskConical size={26} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">EDOS LMIS</h1>
          <p className="text-sm text-muted-foreground">
            Laboratory Management Information System
          </p>
        </div>

        <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">
              {state.error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
