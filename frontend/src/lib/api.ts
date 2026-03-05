const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

import type { EventListItem, EventDetail, ActionItem, ThemeOverview } from "./types";

export async function getEvents(): Promise<EventListItem[]> {
  return fetchAPI("/api/events");
}

export async function getEvent(id: number): Promise<EventDetail> {
  return fetchAPI(`/api/events/${id}`);
}

export async function getActions(): Promise<ActionItem[]> {
  return fetchAPI("/api/actions");
}

export async function getThemes(): Promise<ThemeOverview[]> {
  return fetchAPI("/api/themes");
}
