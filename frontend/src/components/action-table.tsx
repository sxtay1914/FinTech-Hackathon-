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
import { useState } from "react";
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

export function ActionTable({ data }: { data: ActionItem[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="rounded-lg border border-border/50 bg-card">
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
        </TableBody>
      </Table>
    </div>
  );
}
