import { FileQuestion, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    className?: string;
}

export const EmptyState = ({
    icon: Icon = FileQuestion,
    title,
    description,
    action,
    className,
}: EmptyStateProps) => {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500",
            className
        )}>
            <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mb-4 border border-border shadow-inner">
                <Icon className="w-8 h-8 text-muted-foreground/50" />
            </div>

            <h3 className="text-lg font-semibold text-primary mb-1">
                {title}
            </h3>

            {description && (
                <p className="text-sm text-muted max-w-[280px] leading-relaxed mb-6">
                    {description}
                </p>
            )}

            {action && (
                <Button onClick={action.onClick} variant="outline" size="sm" className="gap-2">
                    {action.icon && <action.icon className="w-4 h-4" />}
                    {action.label}
                </Button>
            )}
        </div>
    );
};
