import { getActions } from "@/lib/api";
import { ActionTable } from "@/components/action-table";

export default async function ActionsPage() {
  const actions = await getActions();

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Recommended Actions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {actions.length} AI-generated actions across all macro events
        </p>
      </div>
      <ActionTable data={actions} />
    </div>
  );
}
