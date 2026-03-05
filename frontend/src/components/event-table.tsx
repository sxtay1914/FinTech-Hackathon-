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

export function EventTable({ data }: { data: EventListItem[] }) {
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
              onClick={() => router.push(`/events/${row.original.id}`)}
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
