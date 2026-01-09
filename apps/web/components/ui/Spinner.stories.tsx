import type { Meta, StoryObj } from '@storybook/react';
import { Spinner, LoadingInline, Skeleton } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Size of the spinner',
    },
    color: {
      control: 'select',
      options: ['primary', 'white', 'current'],
      description: 'Color of the spinner',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

// Basic variants
export const Default: Story = {
  args: {
    size: 'md',
    color: 'primary',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    color: 'primary',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    color: 'primary',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    color: 'primary',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    color: 'primary',
  },
};

// Colors
export const PrimaryColor: Story = {
  args: {
    size: 'lg',
    color: 'primary',
  },
};

export const WhiteColor: Story = {
  args: {
    size: 'lg',
    color: 'white',
  },
};

// All Sizes
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
      <Spinner size="xl" />
    </div>
  ),
};

// Loading Inline
export const InlineLoading: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <LoadingInline />
      <LoadingInline message="Loading data..." />
      <LoadingInline message="Please wait..." />
    </div>
  ),
};

// Skeleton Loaders
export const SkeletonText: Story = {
  render: () => (
    <div className="flex flex-col gap-2 w-[300px]">
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="70%" />
    </div>
  ),
};

export const SkeletonCircular: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={150} />
        <Skeleton variant="text" width={100} />
      </div>
    </div>
  ),
};

export const SkeletonCard: Story = {
  render: () => (
    <div className="w-[300px] p-4 bg-white/5 rounded-xl">
      <Skeleton variant="rectangular" width="100%" height={150} className="mb-4" />
      <Skeleton variant="text" width="70%" className="mb-2" />
      <Skeleton variant="text" width="40%" />
    </div>
  ),
};

export const SkeletonList: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[350px]">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1">
            <Skeleton variant="text" width="60%" className="mb-2" />
            <Skeleton variant="text" width="40%" />
          </div>
        </div>
      ))}
    </div>
  ),
};

// Button Loading State Example
export const ButtonLoadingExample: Story = {
  render: () => (
    <div className="flex gap-4">
      <button className="px-6 py-3 bg-primary-500 rounded-xl text-white font-medium flex items-center gap-2">
        <Spinner size="sm" color="white" />
        Processing...
      </button>
      <button className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium flex items-center gap-2">
        <Spinner size="sm" color="current" />
        Loading...
      </button>
    </div>
  ),
};
