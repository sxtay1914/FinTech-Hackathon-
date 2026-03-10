import { getEvents } from "@/lib/api";
import { PortfolioView } from "@/components/portfolio-view";

export default async function PortfolioPage() {
  const events = await getEvents();

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio Intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Screen assets, analyze correlations, and stress-test your portfolio against live macro events
        </p>
      </div>
      <PortfolioView events={events} />
    </div>
  );
}
