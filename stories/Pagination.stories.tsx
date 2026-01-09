import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Pagination, PaginationInfo } from '../apps/web/components/ui/Pagination';

/**
 * Pagination component for navigating through pages of content.
 * Supports multiple visual variants, sizes, and display options.
 */
const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    currentPage: {
      control: { type: 'number', min: 1 },
      description: 'Current page number (1-indexed)',
    },
    totalPages: {
      control: { type: 'number', min: 1 },
      description: 'Total number of pages',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the pagination buttons',
      table: {
        type: { summary: 'PaginationSize' },
        defaultValue: { summary: 'md' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'minimal'],
      description: 'Visual style variant',
      table: {
        type: { summary: 'PaginationVariant' },
        defaultValue: { summary: 'default' },
      },
    },
    showFirstLast: {
      control: 'boolean',
      description: 'Whether to show first/last page buttons',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    showNumbers: {
      control: 'boolean',
      description: 'Whether to show page numbers',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    siblingCount: {
      control: { type: 'number', min: 0, max: 3 },
      description: 'Number of visible page buttons on each side of current',
      table: {
        defaultValue: { summary: '1' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the component is disabled',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

/**
 * Default pagination with basic functionality
 */
const DefaultDemo = () => {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      currentPage={page}
      totalPages={10}
      onPageChange={setPage}
    />
  );
};

export const Default: Story = {
  render: () => <DefaultDemo />,
};

/**
 * Pagination starting in the middle
 */
const MiddlePageDemo = () => {
  const [page, setPage] = useState(5);
  return (
    <Pagination
      currentPage={page}
      totalPages={10}
      onPageChange={setPage}
    />
  );
};

export const MiddlePage: Story = {
  render: () => <MiddlePageDemo />,
};

/**
 * Pagination with many pages
 */
const ManyPagesDemo = () => {
  const [page, setPage] = useState(50);
  return (
    <Pagination
      currentPage={page}
      totalPages={100}
      onPageChange={setPage}
    />
  );
};

export const ManyPages: Story = {
  render: () => <ManyPagesDemo />,
};

/**
 * Small size pagination
 */
const SmallSizeDemo = () => {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      currentPage={page}
      totalPages={10}
      onPageChange={setPage}
      size="sm"
    />
  );
};

export const SmallSize: Story = {
  render: () => <SmallSizeDemo />,
};

/**
 * Large size pagination
 */
const LargeSizeDemo = () => {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      currentPage={page}
      totalPages={10}
      onPageChange={setPage}
      size="lg"
    />
  );
};

export const LargeSize: Story = {
  render: () => <LargeSizeDemo />,
};

/**
 * All sizes compared
 */
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-white/60 text-sm mb-2">Small</p>
        <Pagination currentPage={3} totalPages={10} onPageChange={() => {}} size="sm" />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Medium</p>
        <Pagination currentPage={3} totalPages={10} onPageChange={() => {}} size="md" />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Large</p>
        <Pagination currentPage={3} totalPages={10} onPageChange={() => {}} size="lg" />
      </div>
    </div>
  ),
};

/**
 * Outlined variant
 */
const OutlinedDemo = () => {
  const [page, setPage] = useState(3);
  return (
    <Pagination
      currentPage={page}
      totalPages={10}
      onPageChange={setPage}
      variant="outlined"
    />
  );
};

export const Outlined: Story = {
  render: () => <OutlinedDemo />,
};

/**
 * Minimal variant
 */
const MinimalDemo = () => {
  const [page, setPage] = useState(3);
  return (
    <Pagination
      currentPage={page}
      totalPages={10}
      onPageChange={setPage}
      variant="minimal"
    />
  );
};

export const Minimal: Story = {
  render: () => <MinimalDemo />,
};

/**
 * All variants compared
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-white/60 text-sm mb-2">Default</p>
        <Pagination currentPage={3} totalPages={10} onPageChange={() => {}} variant="default" />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Outlined</p>
        <Pagination currentPage={3} totalPages={10} onPageChange={() => {}} variant="outlined" />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Minimal</p>
        <Pagination currentPage={3} totalPages={10} onPageChange={() => {}} variant="minimal" />
      </div>
    </div>
  ),
};

/**
 * Without first/last buttons
 */
const WithoutFirstLastDemo = () => {
  const [page, setPage] = useState(5);
  return (
    <Pagination
      currentPage={page}
      totalPages={10}
      onPageChange={setPage}
      showFirstLast={false}
    />
  );
};

export const WithoutFirstLast: Story = {
  render: () => <WithoutFirstLastDemo />,
};

/**
 * Without page numbers (arrows only)
 */
const ArrowsOnlyDemo = () => {
  const [page, setPage] = useState(3);
  return (
    <div className="flex items-center gap-4">
      <Pagination
        currentPage={page}
        totalPages={10}
        onPageChange={setPage}
        showNumbers={false}
      />
      <span className="text-white">Page {page} of 10</span>
    </div>
  );
};

export const ArrowsOnly: Story = {
  render: () => <ArrowsOnlyDemo />,
};

/**
 * With more sibling pages
 */
const MoreSiblingsDemo = () => {
  const [page, setPage] = useState(10);
  return (
    <Pagination
      currentPage={page}
      totalPages={20}
      onPageChange={setPage}
      siblingCount={2}
    />
  );
};

export const MoreSiblings: Story = {
  render: () => <MoreSiblingsDemo />,
};

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: () => (
    <Pagination
      currentPage={3}
      totalPages={10}
      onPageChange={() => {}}
      disabled
    />
  ),
};

/**
 * With pagination info
 */
const WithInfoDemo = () => {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalItems = 95;
  const totalPages = Math.ceil(totalItems / perPage);

  return (
    <div className="flex flex-col items-center gap-4">
      <PaginationInfo
        currentPage={page}
        perPage={perPage}
        totalItems={totalItems}
      />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};

export const WithInfo: Story = {
  render: () => <WithInfoDemo />,
};

/**
 * Full pagination layout (common pattern)
 */
const FullLayoutDemo = () => {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalItems = 253;
  const totalPages = Math.ceil(totalItems / perPage);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <PaginationInfo
          currentPage={page}
          perPage={perPage}
          totalItems={totalItems}
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          size="sm"
        />
      </div>
    </div>
  );
};

export const FullLayout: Story = {
  render: () => <FullLayoutDemo />,
};

/**
 * Few pages (no ellipsis needed)
 */
const FewPagesDemo = () => {
  const [page, setPage] = useState(2);
  return (
    <Pagination
      currentPage={page}
      totalPages={5}
      onPageChange={setPage}
    />
  );
};

export const FewPages: Story = {
  render: () => <FewPagesDemo />,
};

/**
 * Single page (edge case)
 */
export const SinglePage: Story = {
  render: () => (
    <Pagination
      currentPage={1}
      totalPages={1}
      onPageChange={() => {}}
    />
  ),
};

/**
 * Festival-specific: Event listings pagination
 */
const FestivalListingDemo = () => {
  const [page, setPage] = useState(1);

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
        <h3 className="text-white font-semibold mb-2">Upcoming Events</h3>
        <p className="text-white/50 text-sm">Browse all available festival events</p>
      </div>

      {/* Mock event cards */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-3 bg-white/5 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-white font-medium">Event {(page - 1) * 5 + i + 1}</p>
              <p className="text-white/50 text-sm">July {15 + i}, 2025</p>
            </div>
            <span className="text-primary-400 font-semibold">$79</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <PaginationInfo
          currentPage={page}
          perPage={5}
          totalItems={47}
        />
        <Pagination
          currentPage={page}
          totalPages={10}
          onPageChange={setPage}
          size="sm"
          variant="outlined"
        />
      </div>
    </div>
  );
};

export const FestivalListing: Story = {
  render: () => <FestivalListingDemo />,
};

/**
 * Festival-specific: Order history pagination
 */
const FestivalOrderHistoryDemo = () => {
  const [page, setPage] = useState(1);

  return (
    <div className="w-full max-w-lg space-y-4">
      <h3 className="text-white font-semibold">Order History</h3>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-primary-400 font-mono text-sm">#ORD-{2025}-{String((page - 1) * 3 + i + 1).padStart(3, '0')}</span>
              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">Completed</span>
            </div>
            <p className="text-white font-medium">Summer Festival 2025</p>
            <div className="flex justify-between mt-2">
              <span className="text-white/50 text-sm">2x VIP Pass</span>
              <span className="text-white font-semibold">$298.00</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Pagination
          currentPage={page}
          totalPages={8}
          onPageChange={setPage}
          size="sm"
          showFirstLast={false}
        />
      </div>
    </div>
  );
};

export const FestivalOrderHistory: Story = {
  render: () => <FestivalOrderHistoryDemo />,
};
