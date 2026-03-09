import { getEvents, getThemes } from "@/lib/api";
import { DashboardHero } from "@/components/dashboard-hero";
import { DashboardContent } from "@/components/dashboard-content";

export default async function DashboardPage() {
  const [events, themes] = await Promise.all([getEvents(), getThemes()]);

  return (
    <div>
      <DashboardHero events={events} />

      {/* Dashboard content */}
      <div className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Macro Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length} active events across global markets
          </p>
        </div>
        <DashboardContent events={events} themes={themes} />
      </div>
    </div>
  );
}
