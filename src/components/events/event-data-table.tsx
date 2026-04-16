"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";

interface EventRow {
  id: string;
  eventName: string;
  showName: string | null;
  eventDate: string;
  venueName: string;
  guestCount: number;
  status: string;
  lcSentAt: Date | null;
}

const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-grey/20 text-grey",
  confirmed: "bg-cognac/20 text-cognac",
  preparation: "bg-gold/20 text-gold",
  ready: "bg-botanical/20 text-botanical",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-error/10 text-error/60",
};

const columnHelper = createColumnHelper<EventRow>();

export function EventDataTable({ events }: { events: EventRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "eventDate", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => [
      columnHelper.accessor("eventName", {
        header: "Event",
        cell: (info) => (
          <Link
            href={`/events/${info.row.original.id}`}
            className="font-semibold text-charcoal hover:text-gold transition-colors duration-200"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("eventDate", {
        header: "Date",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("venueName", {
        header: "Venue",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("guestCount", {
        header: "Guests",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <span
            className={`inline-block px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] uppercase ${STATUS_COLORS[info.getValue()] || STATUS_COLORS.enquiry}`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("lcSentAt", {
        header: "Brief",
        cell: (info) =>
          info.getValue() ? (
            <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-success">
              SENT
            </span>
          ) : (
            <span className="text-grey/40">&mdash;</span>
          ),
        enableSorting: false,
        enableGlobalFilter: false,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: events,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const hasFilteredRows = table.getRowModel().rows.length > 0;

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search events..."
          className="w-full max-w-sm px-4 py-2.5 bg-cream border border-outline font-[family-name:var(--font-raleway)] text-sm text-charcoal placeholder:text-grey/50 focus:outline-none focus:border-gold transition-colors duration-200 min-h-[44px]"
        />
      </div>

      {/* Table */}
      {hasFilteredRows ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-outline">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`px-4 py-3 text-left font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase text-grey ${
                        header.column.getCanSort()
                          ? "cursor-pointer select-none hover:text-charcoal"
                          : ""
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: " \u2191",
                          desc: " \u2193",
                        }[header.column.getIsSorted() as string] ?? null}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-outline/50 hover:bg-surface-low/50 transition-colors duration-150"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 font-[family-name:var(--font-raleway)] text-sm text-charcoal"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
            No events match &lsquo;{globalFilter}&rsquo;
          </p>
          <button
            onClick={() => setGlobalFilter("")}
            className="mt-4 px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px] cursor-pointer"
          >
            CLEAR SEARCH
          </button>
        </div>
      )}
    </div>
  );
}
