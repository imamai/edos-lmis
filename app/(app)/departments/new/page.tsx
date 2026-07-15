import { NewDepartmentForm } from "@/components/new-department-form";

export default function NewDepartmentPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Department</h1>
        <p className="text-sm text-muted-foreground">Add a lab section</p>
      </div>
      <NewDepartmentForm />
    </div>
  );
}
