import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator } from '../apps/web/components/ui/Breadcrumb';

/**
 * Breadcrumb navigation component for showing the user's location in the site hierarchy.
 * Supports various sizes, custom separators, and collapsible items.
 */
const meta: Meta<typeof Breadcrumb> = {
  title: 'UI/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    items: {
      description: 'Array of breadcrumb items with label and optional href',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the breadcrumb',
      table: {
        type: { summary: 'BreadcrumbSize' },
        defaultValue: { summary: 'md' },
      },
    },
    maxItems: {
      control: 'number',
      description: 'Maximum number of items to show (collapses middle items)',
    },
    showHomeIcon: {
      control: 'boolean',
      description: 'Whether to show home icon for first item',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

/**
 * Default breadcrumb with basic navigation
 */
export const Default: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Festivals', href: '/festivals' },
      { label: 'Summer Festival 2025' },
    ],
  },
};

/**
 * Simple two-level breadcrumb
 */
export const TwoLevels: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'My Tickets' },
    ],
  },
};

/**
 * Deep navigation breadcrumb
 */
export const DeepNavigation: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Festivals', href: '/festivals' },
      { label: 'Summer Festival', href: '/festivals/summer' },
      { label: 'Tickets', href: '/festivals/summer/tickets' },
      { label: 'VIP Pass', href: '/festivals/summer/tickets/vip' },
      { label: 'Checkout' },
    ],
  },
};

/**
 * Collapsed breadcrumb (max items)
 */
export const Collapsed: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Festivals', href: '/festivals' },
      { label: 'Summer Festival', href: '/festivals/summer' },
      { label: 'Tickets', href: '/festivals/summer/tickets' },
      { label: 'VIP Pass', href: '/festivals/summer/tickets/vip' },
      { label: 'Checkout' },
    ],
    maxItems: 4,
  },
};

/**
 * Small size breadcrumb
 */
export const SmallSize: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Festivals', href: '/festivals' },
      { label: 'Summer Festival 2025' },
    ],
    size: 'sm',
  },
};

/**
 * Large size breadcrumb
 */
export const LargeSize: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Festivals', href: '/festivals' },
      { label: 'Summer Festival 2025' },
    ],
    size: 'lg',
  },
};

/**
 * All sizes compared
 */
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-white/60 text-sm mb-2">Small</p>
        <Breadcrumb
          size="sm"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Festivals', href: '/festivals' },
            { label: 'Current' },
          ]}
        />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Medium</p>
        <Breadcrumb
          size="md"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Festivals', href: '/festivals' },
            { label: 'Current' },
          ]}
        />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Large</p>
        <Breadcrumb
          size="lg"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Festivals', href: '/festivals' },
            { label: 'Current' },
          ]}
        />
      </div>
    </div>
  ),
};

/**
 * Without home icon
 */
export const WithoutHomeIcon: Story = {
  args: {
    items: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Settings', href: '/dashboard/settings' },
      { label: 'Profile' },
    ],
    showHomeIcon: false,
  },
};

/**
 * With custom icons
 */
export const WithIcons: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      {
        label: 'Festivals',
        href: '/festivals',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        ),
      },
      {
        label: 'Summer Festival',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        ),
      },
    ],
    showHomeIcon: true,
  },
};

/**
 * Custom separator
 */
export const CustomSeparator: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Festivals', href: '/festivals' },
      { label: 'Summer Festival 2025' },
    ],
    separator: <span className="text-white/30">/</span>,
  },
};

/**
 * Dot separator
 */
export const DotSeparator: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Festivals', href: '/festivals' },
      { label: 'Summer Festival 2025' },
    ],
    separator: <span className="w-1 h-1 rounded-full bg-white/30" />,
  },
};

/**
 * Composition pattern using individual components
 */
export const CompositionPattern: Story = {
  render: () => (
    <nav className="flex items-center gap-2 text-sm">
      <BreadcrumbItem href="/">Home</BreadcrumbItem>
      <BreadcrumbSeparator className="w-4 h-4" />
      <BreadcrumbItem href="/festivals">Festivals</BreadcrumbItem>
      <BreadcrumbSeparator className="w-4 h-4" />
      <BreadcrumbItem isCurrent>Summer Festival</BreadcrumbItem>
    </nav>
  ),
};

/**
 * Festival-specific: Event details breadcrumb
 */
export const FestivalEventDetails: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Events', href: '/events' },
      { label: 'Summer Festival 2025', href: '/events/summer-festival-2025' },
      { label: 'Schedule' },
    ],
  },
};

/**
 * Festival-specific: Ticket purchase flow
 */
export const FestivalTicketFlow: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Summer Festival 2025', href: '/festivals/summer-2025' },
      { label: 'Tickets', href: '/festivals/summer-2025/tickets' },
      { label: 'Checkout', href: '/festivals/summer-2025/checkout' },
      { label: 'Payment' },
    ],
  },
};

/**
 * Festival-specific: Admin panel breadcrumb
 */
export const FestivalAdminPanel: Story = {
  args: {
    items: [
      { label: 'Dashboard', href: '/admin' },
      { label: 'Festivals', href: '/admin/festivals' },
      { label: 'Summer Festival 2025', href: '/admin/festivals/1' },
      { label: 'Ticket Categories', href: '/admin/festivals/1/tickets' },
      { label: 'VIP Pass' },
    ],
    showHomeIcon: false,
  },
};

/**
 * Festival-specific: User account navigation
 */
export const FestivalAccountNavigation: Story = {
  args: {
    items: [
      { label: 'My Account', href: '/account' },
      { label: 'Orders', href: '/account/orders' },
      { label: 'Order #ORD-2025-001' },
    ],
    showHomeIcon: false,
  },
};

/**
 * In a page header context
 */
export const InPageHeader: Story = {
  render: () => (
    <div className="space-y-4">
      <Breadcrumb
        size="sm"
        items={[
          { label: 'Home', href: '/' },
          { label: 'Festivals', href: '/festivals' },
          { label: 'Summer Festival 2025' },
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Summer Festival 2025</h1>
        <button className="px-4 py-2 bg-primary-500 text-white rounded-xl font-semibold">
          Buy Tickets
        </button>
      </div>
      <p className="text-white/60">
        The biggest music festival of the year. July 15-17, 2025.
      </p>
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
 * Responsive breadcrumb (collapses on narrow screens)
 */
export const ResponsiveExample: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">Full (desktop)</p>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Festivals', href: '/festivals' },
          { label: 'Summer Festival', href: '/festivals/summer' },
          { label: 'Tickets', href: '/festivals/summer/tickets' },
          { label: 'Checkout' },
        ]}
      />

      <p className="text-white/60 text-sm mt-6">Collapsed (mobile)</p>
      <Breadcrumb
        maxItems={3}
        items={[
          { label: 'Home', href: '/' },
          { label: 'Festivals', href: '/festivals' },
          { label: 'Summer Festival', href: '/festivals/summer' },
          { label: 'Tickets', href: '/festivals/summer/tickets' },
          { label: 'Checkout' },
        ]}
      />
    </div>
  ),
};
