/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-brand-primary text-white",
                secondary: "border-transparent bg-brand-secondary text-white",
                outline: "text-primary border border-border",
                success: "border-transparent bg-success text-white",
                danger: "border-transparent bg-danger text-white",
                warning: "border-transparent bg-warning text-white",
                subtle: "border-transparent bg-brand-primary/10 text-brand-primary",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
