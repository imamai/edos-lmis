import { NewDonorForm } from "@/components/new-donor-form";

export default function NewDonorPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Register Donor</h1>
        <p className="text-sm text-muted-foreground">Add a blood donor to the registry</p>
      </div>
      <NewDonorForm />
    </div>
  );
}
