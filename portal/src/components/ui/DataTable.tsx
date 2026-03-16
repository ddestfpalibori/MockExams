import type { ReactNode } from 'react';
import { Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

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
    emptyDescription?: string;
    emptyIcon?: LucideIcon;
    emptyAction?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    className?: string;
    rowKey: (row: T) => string;
}

export function DataTable<T>({
    columns,
    data,
    isLoading = false,
    emptyMessage = 'Aucun résultat',
    emptyDescription,
    emptyIcon = Search,
    emptyAction,
    className,
    rowKey,
}: DataTableProps<T>) {
    return (
        <div className={cn('w-full overflow-auto rounded-xl border border-border bg-surface shadow-brand-sm', className)}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-surface-hover">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={cn(
                                    'px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-secondary',
                                    col.className
                                )}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-4">
                                        <Skeleton variant="line" size="sm" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-4 py-12"
                            >
                                <EmptyState
                                    title={emptyMessage}
                                    description={emptyDescription}
                                    icon={emptyIcon}
                                    action={emptyAction}
                                />
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr
                                key={rowKey(row)}
                                className="hover:bg-surface-hover transition-colors"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={cn('px-4 py-4 text-primary', col.className)}
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
