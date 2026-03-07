/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const skeletonVariants = cva(
    "animate-pulse bg-slate-200",
    {
        variants: {
            variant: {
                line: "rounded-sm w-full",
                circle: "rounded-full aspect-square",
                card: "rounded-lg w-full",
            },
            size: {
                sm: "",
                md: "",
                lg: "",
            },
        },
        compoundVariants: [
            // line sizes
            { variant: "line", size: "sm", class: "h-3" },
            { variant: "line", size: "md", class: "h-4" },
            { variant: "line", size: "lg", class: "h-5" },
            // circle sizes
            { variant: "circle", size: "sm", class: "w-8 h-8" },
            { variant: "circle", size: "md", class: "w-12 h-12" },
            { variant: "circle", size: "lg", class: "w-16 h-16" },
            // card sizes
            { variant: "card", size: "sm", class: "h-24" },
            { variant: "card", size: "md", class: "h-40" },
            { variant: "card", size: "lg", class: "h-56" },
        ],
        defaultVariants: {
            variant: "line",
            size: "md",
        },
    }
);

export interface SkeletonProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> { }

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <div
                className={cn(skeletonVariants({ variant, size, className }))}
                ref={ref}
                aria-busy="true"
                role="status"
                aria-label="Chargement en cours..."
                {...props}
            />
        );
    }
);
Skeleton.displayName = "Skeleton";

export { Skeleton, skeletonVariants };

