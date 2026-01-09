import type { Meta, StoryObj } from '@storybook/react';
import { Badge, BadgeGroup, StatusBadge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'primary',
        'secondary',
        'success',
        'warning',
        'error',
        'info',
        'outline',
      ],
      description: 'Visual style of the badge',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the badge',
    },
    dot: {
      control: 'boolean',
      description: 'Shows a dot indicator',
    },
    removable: {
      control: 'boolean',
      description: 'Shows remove button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// Basic variants
export const Default: Story = {
  args: {
    children: 'Default',
    variant: 'default',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Success: Story = {
  args: {
    children: 'Success',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Warning',
    variant: 'warning',
  },
};

export const Error: Story = {
  args: {
    children: 'Error',
    variant: 'error',
  },
};

export const Info: Story = {
  args: {
    children: 'Info',
    variant: 'info',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

// With dot
export const WithDot: Story = {
  args: {
    children: 'Live',
    variant: 'success',
    dot: true,
  },
};

// With icon
export const WithIcon: Story = {
  args: {
    children: 'Featured',
    variant: 'primary',
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
  },
};

// Removable
export const Removable: Story = {
  args: {
    children: 'Removable',
    variant: 'primary',
    removable: true,
    onRemove: () => alert('Removed!'),
  },
};

// Sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

// All Variants Grid
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

// Badge Group
export const Group: Story = {
  render: () => (
    <BadgeGroup>
      <Badge variant="primary">Electronic</Badge>
      <Badge variant="secondary">Rock</Badge>
      <Badge variant="info">Jazz</Badge>
      <Badge variant="success">Pop</Badge>
    </BadgeGroup>
  ),
};

export const GroupWithMax: Story = {
  render: () => (
    <BadgeGroup max={3}>
      <Badge variant="primary">Electronic</Badge>
      <Badge variant="secondary">Rock</Badge>
      <Badge variant="info">Jazz</Badge>
      <Badge variant="success">Pop</Badge>
      <Badge variant="warning">Classical</Badge>
    </BadgeGroup>
  ),
};

// Status Badges
export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="pending" />
      <StatusBadge status="confirmed" />
      <StatusBadge status="completed" />
      <StatusBadge status="cancelled" />
      <StatusBadge status="refunded" />
      <StatusBadge status="valid" />
      <StatusBadge status="used" />
      <StatusBadge status="expired" />
      <StatusBadge status="active" />
      <StatusBadge status="inactive" />
      <StatusBadge status="draft" />
      <StatusBadge status="published" />
    </div>
  ),
};
