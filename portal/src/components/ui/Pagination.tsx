import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface PaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
    const totalPages = Math.ceil(total / pageSize);
    const from = Math.min((page - 1) * pageSize + 1, total);
    const to = Math.min(page * pageSize, total);

    if (total === 0) return null;

    return (
        <div className={cn('flex items-center justify-between px-2 py-3', className)}>
            <p className="text-sm text-secondary">
                Résultats <span className="font-medium text-primary">{from}-{to}</span>{' '}
                sur <span className="font-medium text-primary">{total.toLocaleString('fr-FR')}</span>
            </p>

            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    aria-label="Page précédente"
                >
                    <ChevronLeft size={16} />
                </Button>

                {buildPageNumbers(page, totalPages).map((p, i) =>
                    p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-muted">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            className={cn(
                                'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                                page === p
                                    ? 'bg-brand-primary text-white'
                                    : 'text-secondary hover:bg-surface-hover'
                            )}
                            aria-current={page === p ? 'page' : undefined}
                        >
                            {p}
                        </button>
                    )
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Page suivante"
                >
                    <ChevronRight size={16} />
                </Button>
            </div>
        </div>
    );
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [1];

    if (current > 3) pages.push('...');

    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
        pages.push(p);
    }

    if (current < total - 2) pages.push('...');

    pages.push(total);

    return pages;
}
