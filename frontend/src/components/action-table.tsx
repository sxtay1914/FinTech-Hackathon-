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
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ImpactDots } from "@/components/impact-dots";
import type { ActionItem } from "@/lib/types";

const directionStyles: Record<string, string> = {
  Buy: "border-emerald-500/30 text-emerald-400",
  Sell: "border-red-500/30 text-red-400",
  Hold: "border-zinc-500/30 text-zinc-400",
  Hedge: "border-orange-500/30 text-orange-400",
};

const urgencyStyles: Record<string, string> = {
  Immediate: "border-red-500/30 text-red-400",
  "Short-term": "border-orange-500/30 text-orange-400",
  "Medium-term": "border-blue-500/30 text-blue-400",
};

const columns: ColumnDef<ActionItem>[] = [
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => (
      <div className="max-w-sm">
        <p className="font-medium leading-snug">{row.original.action}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{row.original.rationale}</p>
      </div>
    ),
  },
  {
    accessorKey: "event_headline",
    header: "Related Event",
    cell: ({ row }) => (
      <p className="max-w-xs text-sm text-muted-foreground line-clamp-1">
        {row.original.event_headline}
      </p>
    ),
  },
  {
    accessorKey: "asset_class",
    header: "Asset Class",
    cell: ({ row }) => <span className="text-sm">{row.original.asset_class}</span>,
  },
  {
    accessorKey: "direction",
    header: "Direction",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={directionStyles[row.original.direction] || directionStyles.Hold}
      >
        {row.original.direction}
      </Badge>
    ),
  },
  {
    accessorKey: "urgency",
    header: "Urgency",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={urgencyStyles[row.original.urgency] || urgencyStyles["Medium-term"]}
      >
        {row.original.urgency}
      </Badge>
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

export function ActionTable({ data }: { data: ActionItem[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [country, setCountry] = useState("");
  const [theme, setTheme] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minOpportunity, setMinOpportunity] = useState(0);
  const [minPortfolio, setMinPortfolio] = useState(0);

  const countries = useMemo(
    () => Array.from(new Set(data.map((a) => a.event_country).filter(Boolean))).sort(),
    [data]
  );
  const themes = useMemo(
    () => Array.from(new Set(data.map((a) => a.event_theme).filter(Boolean))).sort(),
    [data]
  );

  const filteredData = useMemo(() => {
    return data.filter((a) => {
      if (country && a.event_country !== country) return false;
      if (theme && a.event_theme !== theme) return false;
      if (dateFrom && a.event_published_date < dateFrom) return false;
      if (dateTo && a.event_published_date > dateTo) return false;
      if (minOpportunity && a.opportunity_impact < minOpportunity) return false;
      if (minPortfolio && a.portfolio_impact < minPortfolio) return false;
      return true;
    });
  }, [data, country, theme, dateFrom, dateTo, minOpportunity, minPortfolio]);

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

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={selectCls + " w-36"}
          title="From date"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={selectCls + " w-36"}
          title="To date"
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
              onClick={() => router.push(`/events/${row.original.event_id}`)}
              className="cursor-pointer border-border/30 transition-colors hover:bg-muted/50"
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
                No actions match the selected filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
