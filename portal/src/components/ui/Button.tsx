/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
    {
        variants: {
            variant: {
                primary: "bg-brand-primary text-white shadow-brand-sm hover:shadow-brand-md hover:bg-brand-primary/90",
                secondary: "bg-brand-secondary text-white shadow-md hover:bg-brand-secondary/90",
                outline: "border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5",
                ghost: "text-brand-primary hover:bg-brand-primary/10",
                danger: "bg-danger text-white hover:bg-danger/90",
                success: "bg-success text-white hover:bg-success/90",
                warning: "bg-warning text-white hover:bg-warning/90",
            },
            size: {
                default: "h-11 px-4 py-2", // 44px pour l'accessibilité tactile 
                sm: "h-10 px-3 rounded-md text-xs", // 40px
                lg: "h-14 px-8 rounded-lg text-base", // 56px
                icon: "h-11 w-11",
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
