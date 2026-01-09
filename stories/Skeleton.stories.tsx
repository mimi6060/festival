import type { Meta, StoryObj } from '@storybook/react';
import {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatar,
} from '../apps/web/components/ui/Skeleton';

/**
 * Skeleton loading placeholder component for displaying loading states.
 * Provides multiple variants and pre-built layouts for common patterns.
 */
const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular', 'rounded'],
      description: 'Shape variant of the skeleton',
      table: {
        type: { summary: 'SkeletonVariant' },
        defaultValue: { summary: 'text' },
      },
    },
    width: {
      control: 'text',
      description: 'Width of the skeleton (number for px or string for other units)',
    },
    height: {
      control: 'text',
      description: 'Height of the skeleton (number for px or string for other units)',
    },
    animate: {
      control: 'boolean',
      description: 'Whether to animate the skeleton',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    lines: {
      control: 'number',
      description: 'Number of lines for text variant',
      table: {
        defaultValue: { summary: '1' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

/**
 * Default text skeleton
 */
export const Default: Story = {
  args: {
    variant: 'text',
    width: 200,
  },
};

/**
 * Text skeleton variant
 */
export const Text: Story = {
  args: {
    variant: 'text',
    width: '100%',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Multiple lines of text
 */
export const MultipleLines: Story = {
  args: {
    variant: 'text',
    lines: 3,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Circular skeleton for avatars
 */
export const Circular: Story = {
  args: {
    variant: 'circular',
    width: 48,
    height: 48,
  },
};

/**
 * Rectangular skeleton
 */
export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
    width: 200,
    height: 120,
  },
};

/**
 * Rounded skeleton
 */
export const Rounded: Story = {
  args: {
    variant: 'rounded',
    width: 200,
    height: 80,
  },
};

/**
 * All basic variants
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-white/60 text-sm mb-2">Text</p>
        <Skeleton variant="text" width={200} />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Circular</p>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Rectangular</p>
        <Skeleton variant="rectangular" width={200} height={100} />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Rounded</p>
        <Skeleton variant="rounded" width={200} height={100} />
      </div>
    </div>
  ),
};

/**
 * Skeleton without animation
 */
export const NoAnimation: Story = {
  args: {
    variant: 'rounded',
    width: 200,
    height: 80,
    animate: false,
  },
};

/**
 * Avatar skeleton in different sizes
 */
export const AvatarSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SkeletonAvatar size="sm" />
      <SkeletonAvatar size="md" />
      <SkeletonAvatar size="lg" />
      <SkeletonAvatar size="xl" />
    </div>
  ),
};

/**
 * Card skeleton layout
 */
export const CardSkeleton: Story = {
  render: () => <SkeletonCard />,
  decorators: [
    (Story) => (
      <div style={{ width: '350px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Card skeleton without avatar
 */
export const CardWithoutAvatar: Story = {
  render: () => <SkeletonCard showAvatar={false} lines={4} />,
  decorators: [
    (Story) => (
      <div style={{ width: '350px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Card skeleton with actions
 */
export const CardWithActions: Story = {
  render: () => <SkeletonCard showActions />,
  decorators: [
    (Story) => (
      <div style={{ width: '350px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Table skeleton layout
 */
export const TableSkeleton: Story = {
  render: () => <SkeletonTable />,
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Table skeleton with more columns
 */
export const TableWithMoreColumns: Story = {
  render: () => <SkeletonTable rows={8} columns={6} />,
  decorators: [
    (Story) => (
      <div style={{ width: '800px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Custom composition: User profile loading
 */
export const UserProfileLoading: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <Skeleton variant="circular" width={64} height={64} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="40%" height={16} />
      </div>
      <Skeleton variant="rounded" width={80} height={36} />
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Custom composition: Article loading
 */
export const ArticleLoading: Story = {
  render: () => (
    <div className="space-y-4">
      <Skeleton variant="rectangular" width="100%" height={200} />
      <Skeleton variant="text" width="80%" height={28} />
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width={80} />
      </div>
      <Skeleton variant="text" lines={4} />
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '500px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Custom composition: List loading
 */
export const ListLoading: Story = {
  render: () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 bg-white/5 rounded-xl"
        >
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="50%" height={12} />
          </div>
          <Skeleton variant="text" width={60} />
        </div>
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Custom composition: Dashboard stats loading
 */
export const DashboardStatsLoading: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="40%" height={32} className="mt-2" />
          <div className="flex items-center gap-2 mt-3">
            <Skeleton variant="text" width={40} height={14} />
            <Skeleton variant="text" width={60} height={14} />
          </div>
        </div>
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Festival-specific: Event card loading
 */
export const FestivalEventCardLoading: Story = {
  render: () => (
    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
      <Skeleton variant="rounded" width="100%" height={160} />
      <div className="mt-4 space-y-3">
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={80} height={24} />
        </div>
        <Skeleton variant="text" width="80%" height={24} />
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={120} />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={150} />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-white/10">
          <Skeleton variant="text" width={80} height={28} />
          <Skeleton variant="rounded" width={100} height={40} />
        </div>
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Festival-specific: Ticket list loading
 */
export const FestivalTicketListLoading: Story = {
  render: () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10"
        >
          <Skeleton variant="rounded" width={80} height={80} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" height={20} />
            <Skeleton variant="text" width="40%" />
            <div className="flex gap-2">
              <Skeleton variant="rounded" width={60} height={20} />
              <Skeleton variant="rounded" width={80} height={20} />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="rounded" width={80} height={32} />
          </div>
        </div>
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Grid layout loading
 */
export const GridLoading: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i}>
          <Skeleton variant="rounded" width="100%" height={120} />
          <Skeleton variant="text" width="80%" className="mt-2" />
          <Skeleton variant="text" width="60%" height={14} />
        </div>
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};
