import { CrossmatchRequestForm } from "@/components/crossmatch-request-form";

export default function NewCrossmatchRequestPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Crossmatch Request</h1>
        <p className="text-sm text-muted-foreground">Request pre-transfusion compatibility testing for a patient</p>
      </div>
      <CrossmatchRequestForm />
    </div>
  );
}
