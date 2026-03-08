import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';

export interface Column<T> {
    key: string;
    header: string;
    cell: (row: T) => ReactNode;
    sortable?: boolean;
    className?: string;
}

export interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    emptyMessage?: string;
    className?: string;
    rowKey: (row: T) => string;
}

export function DataTable<T>({
    columns,
    data,
    isLoading = false,
    emptyMessage = 'Aucun résultat',
    className,
    rowKey,
}: DataTableProps<T>) {
    return (
        <div className={cn('w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={cn(
                                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500',
                                    col.className
                                )}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-3">
                                        <Skeleton variant="line" size="sm" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-4 py-12 text-center text-slate-400"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr
                                key={rowKey(row)}
                                className="hover:bg-slate-50 transition-colors"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={cn('px-4 py-3 text-slate-700', col.className)}
                                    >
                                        {col.cell(row)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
