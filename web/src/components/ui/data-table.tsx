import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import PaginationFooter from "@/components/ui/pagination-footer";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";

interface DataTableColumnHeaderProps {
  column: any;
  title: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClickId?: (id: string) => any
  onRowClick?: (item: TData) => any
  idVisible?: boolean
  globalFilter?: string
  paginationConfig?: any
  paginationFunctions?: any
  noDataMessage?: string
  onGlobalFilterChange?: (value: string) => void
}

export function DataTableColumnHeader({ column, title }: DataTableColumnHeaderProps) {
  const sortDirection = column.getIsSorted();

  return (
    <div
      className="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      {sortDirection && (
        <span className="ml-1">
          {sortDirection === "asc" ? "↑" : "↓"}
        </span>
      )}
      {!sortDirection && (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </div>
  );
}


export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClickId,
  onRowClick,
  idVisible = false,
  noDataMessage = "No results.",
  globalFilter = "",
  paginationConfig,
  paginationFunctions,
  onGlobalFilterChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      columnVisibility: { id: idVisible },
    },
  })

  return (
    <div className="space-y-4">
      {onGlobalFilterChange && (
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
      )}
      <div className="rounded-md border shadow-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.id === "actions" ? "w-[40px]" : ""}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className={
                    onRowClickId || onRowClick ? "hover:bg-muted/50" : ""
                  }
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => {
                    if (onRowClickId) onRowClickId(row.getValue("id"))
                    if (onRowClick) onRowClick(row.original)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {noDataMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {paginationConfig && paginationFunctions && (
        <PaginationFooter
          paginationConfig={paginationConfig}
          paginationFunctions={paginationFunctions}
        />
      )}
    </div>
  )
}
