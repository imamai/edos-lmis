import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ShieldAlert } from "lucide-react";

export default async function NoAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-critical/15 text-critical">
          <ShieldAlert size={26} />
        </div>
        <h1 className="text-lg font-semibold text-foreground">No laboratory access</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email ? <>The account <strong>{user.email}</strong> is</> : "This account is"}{" "}
          signed in but has no staff profile in EDOS LMIS. Ask your laboratory administrator to
          create a staff profile for this account, or sign in with a different account.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="secondary" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
