"use client";

import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImpactDots } from "@/components/impact-dots";
import { ThemeBadge } from "@/components/theme-badge";
import type { EventListItem } from "@/lib/types";

const columns: ColumnDef<EventListItem>[] = [
  {
    accessorKey: "headline",
    header: "News",
    cell: ({ row }) => (
      <div className="max-w-md">
        <p className="font-medium leading-snug">{row.original.headline}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{row.original.published_date}</p>
      </div>
    ),
  },
  {
    accessorKey: "country",
    header: "Country",
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">{row.original.country}</span>
    ),
  },
  {
    accessorKey: "theme",
    header: "Theme",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{row.original.theme}</span>
        <ThemeBadge heat={row.original.heat} />
      </div>
    ),
  },
  {
    accessorKey: "opportunity_impact",
    header: "Opportunity",
    cell: ({ row }) => (
      <ImpactDots value={row.original.opportunity_impact} variant="opportunity" />
    ),
  },
  {
    accessorKey: "portfolio_impact",
    header: "Portfolio",
    cell: ({ row }) => (
      <ImpactDots value={row.original.portfolio_impact} variant="portfolio" />
    ),
  },
];

const selectCls =
  "h-8 rounded-md border border-border/60 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer";

export function EventTable({
  data,
  themeFilter,
  onThemeFilterClear,
}: {
  data: EventListItem[];
  themeFilter?: string;
  onThemeFilterClear?: () => void;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id: number }>).detail.id;
      setHighlightedId(id);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedId(null), 2000);
      setTimeout(() => {
        document.getElementById(`event-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    };
    window.addEventListener("meridian:focus-event", handler);
    return () => window.removeEventListener("meridian:focus-event", handler);
  }, []);
  const [country, setCountry] = useState("");
  const [theme, setTheme] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minOpportunity, setMinOpportunity] = useState(0);
  const [minPortfolio, setMinPortfolio] = useState(0);

  const countries = useMemo(
    () => Array.from(new Set(data.map((e) => e.country))).sort(),
    [data]
  );
  const themes = useMemo(
    () => Array.from(new Set(data.map((e) => e.theme))).sort(),
    [data]
  );

  // External themeFilter (from ThemeCloud) takes precedence over internal dropdown
  const effectiveTheme = themeFilter ?? theme;

  const filteredData = useMemo(() => {
    return data.filter((e) => {
      if (country && e.country !== country) return false;
      if (effectiveTheme && e.theme !== effectiveTheme) return false;
      if (dateFrom && e.published_date < dateFrom) return false;
      if (dateTo && e.published_date > dateTo) return false;
      if (minOpportunity && e.opportunity_impact < minOpportunity) return false;
      if (minPortfolio && e.portfolio_impact < minPortfolio) return false;
      return true;
    });
  }, [data, country, effectiveTheme, dateFrom, dateTo, minOpportunity, minPortfolio]);

  const hasFilters = !!(country || theme || dateFrom || dateTo || minOpportunity || minPortfolio);

  const clearFilters = () => {
    setCountry("");
    setTheme("");
    setDateFrom("");
    setDateTo("");
    setMinOpportunity(0);
    setMinPortfolio(0);
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="rounded-lg border border-border/50 bg-card">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={selectCls}
        >
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {themeFilter ? (
          <span className="flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 text-xs text-foreground">
            Theme: <span className="font-medium">{themeFilter}</span>
            <button
              onClick={() => { onThemeFilterClear?.(); }}
              className="ml-1 text-muted-foreground hover:text-foreground"
              title="Clear theme filter"
            >
              ✕
            </button>
          </span>
        ) : (
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className={selectCls}
          >
            <option value="">All Themes</option>
            {themes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={selectCls + " w-36"}
          title="From date"
          placeholder="From"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={selectCls + " w-36"}
          title="To date"
          placeholder="To"
        />

        <select
          value={minOpportunity}
          onChange={(e) => setMinOpportunity(Number(e.target.value))}
          className={selectCls}
        >
          <option value={0}>Opportunity ≥ any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>Opportunity ≥ {n}</option>
          ))}
        </select>

        <select
          value={minPortfolio}
          onChange={(e) => setMinPortfolio(Number(e.target.value))}
          className={selectCls}
        >
          <option value={0}>Portfolio ≥ any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>Portfolio ≥ {n}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="h-8 rounded-md border border-border/60 bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Clear
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {filteredData.length} of {data.length}
        </span>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-border/50 hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              id={`event-row-${row.original.id}`}
              onClick={() => router.push(`/events/${row.original.id}`)}
              className={`cursor-pointer border-border/30 transition-colors hover:bg-muted/50 ${
                highlightedId === row.original.id
                  ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/50"
                  : ""
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                No events match the selected filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
