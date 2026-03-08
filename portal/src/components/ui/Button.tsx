/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all",
    {
        variants: {
            variant: {
                primary: "bg-brand-primary text-white shadow-md hover:bg-brand-primary/90 shadow-brand-primary/20",
                secondary: "bg-brand-secondary text-white shadow-md hover:bg-brand-secondary/90",
                outline: "border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5",
                ghost: "text-brand-primary hover:bg-brand-primary/10",
                danger: "bg-danger text-white shadow-md hover:bg-danger/90 shadow-danger/20",
                success: "bg-success text-white shadow-md hover:bg-success/90 shadow-success/20",
                warning: "bg-warning text-white shadow-md hover:bg-warning/90 shadow-warning/20",
            },
            size: {
                default: "h-10 py-2 px-4",
                sm: "h-9 px-3 rounded-md text-xs",
                lg: "h-12 px-8 rounded-lg text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, isLoading, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {props.children}
                    </>
                ) : props.children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
