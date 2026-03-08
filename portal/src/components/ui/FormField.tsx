import React, { type ReactElement } from 'react';
import { cloneElement } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
    label: string;
    error?: string;
    required?: boolean;
    hint?: string;
    children: ReactElement<{ id?: string; 'aria-describedby'?: string; className?: string }>;
    className?: string;
}

let idCounter = 0;

export function FormField({ label, error, required, hint, children, className }: FormFieldProps) {
    const fieldId = children.props.id ?? `field-${++idCounter}`;
    const descId = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

    const child = cloneElement(children, {
        id: fieldId,
        'aria-describedby': descId,
        className: cn(
            children.props.className,
            error && 'border-danger focus-visible:ring-danger focus-visible:border-danger'
        ),
    });

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <label
                htmlFor={fieldId}
                className="text-sm font-medium text-slate-700"
            >
                {label}
                {required && (
                    <span className="ml-1 text-danger" aria-hidden="true">*</span>
                )}
            </label>

            {child}

            {hint && !error && (
                <p id={`${fieldId}-hint`} className="text-xs text-slate-400">
                    {hint}
                </p>
            )}

            {error && (
                <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

/** Styles partagés pour les inputs utilisés avec FormField */
export const inputClassName = "w-full h-10 px-3 text-sm rounded-md border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary placeholder:text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/** Styles partagés pour les selects utilisés avec FormField */
export const selectClassName = "w-full h-10 px-3 text-sm rounded-md border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/** Input stylisé prêt à l'emploi avec FormField */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn(inputClassName, className)} {...props} />;
}

/** Textarea stylisé prêt à l'emploi avec FormField */
export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            className={cn(
                'w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white resize-y min-h-[80px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                'placeholder:text-slate-400 transition-colors',
                className
            )}
            {...props}
        />
    );
}

/** Select stylisé prêt à l'emploi avec FormField */
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select className={cn(selectClassName, className)} {...props} />;
}
