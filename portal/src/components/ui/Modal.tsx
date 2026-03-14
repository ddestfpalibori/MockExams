import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    variant?: 'default' | 'danger';
    className?: string;
}

export function Modal({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    variant = 'default',
    className,
}: ModalProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content
                    className={cn(
                        'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
                        'rounded-xl bg-surface shadow-brand-xl border border-border',
                        'duration-300 ease-out',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                        'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
                        'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
                        className
                    )}
                >
                    {/* Header */}
                    <div className={cn(
                        'flex items-center justify-between px-6 py-4 border-b',
                        variant === 'danger' ? 'border-danger/20 bg-danger/5' : 'border-border'
                    )}>
                        <div>
                            <Dialog.Title className={cn(
                                'text-base font-semibold',
                                variant === 'danger' ? 'text-danger' : 'text-primary'
                            )}>
                                {title}
                            </Dialog.Title>
                            {description && (
                                <Dialog.Description className="text-sm text-secondary mt-0.5">
                                    {description}
                                </Dialog.Description>
                            )}
                        </div>
                        <Dialog.Close asChild>
                            <button
                                className="rounded-md p-1 text-muted hover:text-primary hover:bg-surface-hover transition-colors"
                                aria-label="Fermer"
                            >
                                <X size={18} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                            {footer}
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/** Bouton d'ouverture de modal — wraps Dialog.Trigger */
Modal.Trigger = Dialog.Trigger;
