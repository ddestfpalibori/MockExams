import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';

const statCardVariants = cva(
    'rounded-xl border p-6 flex flex-col gap-3 shadow-brand-sm transition-shadow hover:shadow-brand-md',
    {
        variants: {
            variant: {
                default: 'bg-surface border-border',
                success: 'bg-success/5 border-success/30',
                warning: 'bg-warning/5 border-warning/30',
                danger: 'bg-danger/5 border-danger/30',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

const iconVariants = cva('rounded-lg p-2.5 flex items-center justify-center', {
    variants: {
        variant: {
            default: 'bg-brand-primary/10 text-brand-primary',
            success: 'bg-success/10 text-success',
            warning: 'bg-warning/10 text-warning',
            danger: 'bg-danger/10 text-danger',
        },
    },
    defaultVariants: { variant: 'default' },
});

const valueVariants = cva('text-2xl font-bold tracking-tight', {
    variants: {
        variant: {
            default: 'text-primary',
            success: 'text-success',
            warning: 'text-warning',
            danger: 'text-danger',
        },
    },
    defaultVariants: { variant: 'default' },
});

export interface StatCardProps extends VariantProps<typeof statCardVariants> {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: ReactNode;
    isLoading?: boolean;
    className?: string;
}

export function StatCard({ title, value, subtitle, icon, variant, isLoading, className }: StatCardProps) {
    return (
        <div className={cn(statCardVariants({ variant }), className)}>
            <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-secondary">{title}</p>
                {icon && (
                    <div className={iconVariants({ variant })}>
                        {icon}
                    </div>
                )}
            </div>
            <div>
                {isLoading ? (
                    <Skeleton variant="line" size="md" className="w-16 h-8" />
                ) : (
                    <p className={valueVariants({ variant })}>{value}</p>
                )}
                {subtitle && (
                    <p className="text-xs text-muted mt-1">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
