import { getEvent } from "@/lib/api";
import { EventDetailView } from "@/components/event-detail-view";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(Number(id));

  return <EventDetailView event={event} />;
}
