import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
    title: 'UI/Pagination',
    component: Pagination,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
    render: () => {
        const [page, setPage] = useState(3);
        return (
            <div className="w-[600px]">
                <Pagination
                    page={page}
                    pageSize={50}
                    total={8247}
                    onPageChange={setPage}
                />
            </div>
        );
    },
};

export const FewPages: Story = {
    render: () => {
        const [page, setPage] = useState(1);
        return (
            <div className="w-[600px]">
                <Pagination
                    page={page}
                    pageSize={50}
                    total={150}
                    onPageChange={setPage}
                />
            </div>
        );
    },
};

export const LastPage: Story = {
    render: () => {
        const [page, setPage] = useState(165);
        return (
            <div className="w-[600px]">
                <Pagination
                    page={page}
                    pageSize={50}
                    total={8247}
                    onPageChange={setPage}
                />
            </div>
        );
    },
};
