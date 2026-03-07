import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
    title: 'UI/Skeleton',
    component: Skeleton,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: { type: 'select' },
            options: ['line', 'circle', 'card'],
        },
        size: {
            control: { type: 'select' },
            options: ['sm', 'md', 'lg'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

// Line Skeletons
export const LineSmall: Story = {
    args: {
        variant: 'line',
        size: 'sm',
    },
};

export const LineMedium: Story = {
    args: {
        variant: 'line',
        size: 'md',
    },
};

export const LineLarge: Story = {
    args: {
        variant: 'line',
        size: 'lg',
    },
};

// Circle Skeletons (Avatar placeholders)
export const CircleSmall: Story = {
    args: {
        variant: 'circle',
        size: 'sm',
    },
};

export const CircleMedium: Story = {
    args: {
        variant: 'circle',
        size: 'md',
    },
};

export const CircleLarge: Story = {
    args: {
        variant: 'circle',
        size: 'lg',
    },
};

// Card Skeletons (Content blocks)
export const CardSmall: Story = {
    args: {
        variant: 'card',
        size: 'sm',
    },
};

export const CardMedium: Story = {
    args: {
        variant: 'card',
        size: 'md',
    },
};

export const CardLarge: Story = {
    args: {
        variant: 'card',
        size: 'lg',
    },
};

// Loading Page Example
export const LoadingPage: Story = {
    render: () => (
        <div className="w-full max-w-2xl mx-auto p-6 space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton variant="circle" size="md" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="line" size="md" className="w-1/3" />
                    <Skeleton variant="line" size="sm" className="w-1/4" />
                </div>
            </div>
            <div className="space-y-3 mt-6">
                <Skeleton variant="line" size="md" />
                <Skeleton variant="line" size="md" />
                <Skeleton variant="line" size="sm" className="w-5/6" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
                <Skeleton variant="card" size="sm" />
                <Skeleton variant="card" size="sm" />
                <Skeleton variant="card" size="sm" />
            </div>
        </div>
    ),
};
