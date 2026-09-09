import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  // Pagination
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3 border-b border-paper-alt">
          <div className="h-4 bg-line rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  loading,
  emptyMessage = 'No records found.',
  totalCount,
  page = 1,
  pageSize = 50,
  onPageChange,
}: DataTableProps<T>) {
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;
  const showPagination = Boolean(onPageChange && totalCount && totalCount > pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.headerClassName}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-ink-soft py-12 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-line">
          <span className="text-xs text-ink-soft">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount!)} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="btn-ghost p-1.5 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono text-xs">{page} / {totalPages}</span>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="btn-ghost p-1.5 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
