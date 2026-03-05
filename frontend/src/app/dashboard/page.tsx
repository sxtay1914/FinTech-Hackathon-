import { getEvents, getThemes } from "@/lib/api";
import { HeroGlobe } from "@/components/hero-globe";
import { DashboardContent } from "@/components/dashboard-content";

export default async function DashboardPage() {
  const [events, themes] = await Promise.all([getEvents(), getThemes()]);

  return (
    <div>
      {/* Globe banner */}
      <div className="relative h-[280px] w-full overflow-hidden border-b border-border/40">
        <HeroGlobe />
        {/* Gradient overlay at bottom for smooth transition */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>

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
