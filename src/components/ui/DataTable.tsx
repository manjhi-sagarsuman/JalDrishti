import type { Key, ReactNode } from "react"
import { EmptyState } from "./states"

export interface DataTableColumn<Row> {
  key: string
  header: ReactNode
  render: (row: Row) => ReactNode
  align?: "left" | "center" | "right"
  className?: string
}

export interface DataTableProps<Row> {
  caption: string
  columns: readonly DataTableColumn<Row>[]
  rows: readonly Row[]
  getRowKey: (row: Row) => Key
  emptyTitle?: string
  emptyDescription?: string
  emptyContent?: ReactNode
  className?: string
}

const alignments = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyTitle = "No records found",
  emptyDescription = "Try changing the filters or check back later.",
  emptyContent,
  className = "",
}: DataTableProps<Row>) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-line bg-white ${className}`}>
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            {columns.map((column) => (
              <th className={`whitespace-nowrap px-4 py-3 ${alignments[column.align ?? "left"]} ${column.className ?? ""}`} key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length > 0 ? rows.map((row) => (
            <tr className="transition-colors hover:bg-slate-50/70" key={getRowKey(row)}>
              {columns.map((column) => (
                <td className={`px-4 py-3.5 text-ink ${alignments[column.align ?? "left"]} ${column.className ?? ""}`} key={column.key}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td className="p-0" colSpan={Math.max(columns.length, 1)}>
                {emptyContent ?? <EmptyState description={emptyDescription} title={emptyTitle} />}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
