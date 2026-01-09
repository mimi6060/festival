import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Alert } from '../apps/web/components/ui/Alert';

/**
 * Alert component for displaying notifications, warnings, errors, and informational messages.
 * Supports multiple variants, sizes, and can be dismissible.
 */
const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
      description: 'The type/variant of the alert that determines its color scheme',
      table: {
        type: { summary: 'AlertVariant' },
        defaultValue: { summary: 'info' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the alert',
      table: {
        type: { summary: 'AlertSize' },
        defaultValue: { summary: 'md' },
      },
    },
    title: {
      control: 'text',
      description: 'Optional title displayed at the top of the alert',
    },
    children: {
      control: 'text',
      description: 'The content/message of the alert',
    },
    dismissible: {
      control: 'boolean',
      description: 'Whether the alert can be dismissed by the user',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to show the default icon for the variant',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '500px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Alert>;

/**
 * Default info alert
 */
export const Default: Story = {
  args: {
    children: 'This is an informational alert message.',
    variant: 'info',
  },
};

/**
 * Info alert with additional context
 */
export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Information',
    children: 'A new version of the app is available. Please refresh to update.',
  },
};

/**
 * Success alert for positive feedback
 */
export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Success!',
    children: 'Your ticket purchase has been confirmed. Check your email for details.',
  },
};

/**
 * Warning alert for cautionary messages
 */
export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    children: 'Your session will expire in 5 minutes. Please save your work.',
  },
};

/**
 * Error alert for critical issues
 */
export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Error',
    children: 'Payment failed. Please check your card details and try again.',
  },
};

/**
 * Small size alert
 */
export const SmallSize: Story = {
  args: {
    variant: 'info',
    size: 'sm',
    children: 'This is a small alert.',
  },
};

/**
 * Large size alert
 */
export const LargeSize: Story = {
  args: {
    variant: 'success',
    size: 'lg',
    title: 'Large Alert',
    children: 'This is a large alert with more prominent styling.',
  },
};

/**
 * Alert without title
 */
export const WithoutTitle: Story = {
  args: {
    variant: 'warning',
    children: 'This alert has no title, just content.',
  },
};

/**
 * Alert without icon
 */
export const WithoutIcon: Story = {
  args: {
    variant: 'info',
    title: 'No Icon',
    children: 'This alert does not display an icon.',
    showIcon: false,
  },
};

/**
 * Dismissible alert that can be closed
 */
const DismissibleDemo = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="px-4 py-2 bg-primary-500 text-white rounded-lg"
      >
        Show Alert Again
      </button>
    );
  }

  return (
    <Alert
      variant="success"
      title="Dismissible Alert"
      dismissible
      onDismiss={() => setVisible(false)}
    >
      Click the X button to dismiss this alert.
    </Alert>
  );
};

export const Dismissible: Story = {
  render: () => <DismissibleDemo />,
};

/**
 * Alert with custom icon
 */
export const WithCustomIcon: Story = {
  args: {
    variant: 'info',
    title: 'Custom Icon',
    children: 'This alert uses a custom icon instead of the default.',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
};

/**
 * All alert variants displayed together
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Alert variant="info" title="Info Alert">
        This is an informational message.
      </Alert>
      <Alert variant="success" title="Success Alert">
        Operation completed successfully.
      </Alert>
      <Alert variant="warning" title="Warning Alert">
        Please proceed with caution.
      </Alert>
      <Alert variant="error" title="Error Alert">
        An error occurred during the operation.
      </Alert>
    </div>
  ),
};

/**
 * All sizes compared
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Alert variant="info" size="sm" title="Small">
        Small alert message
      </Alert>
      <Alert variant="info" size="md" title="Medium">
        Medium alert message
      </Alert>
      <Alert variant="info" size="lg" title="Large">
        Large alert message
      </Alert>
    </div>
  ),
};

/**
 * Festival-specific example: Ticket notification
 */
export const FestivalExample: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Alert variant="success" title="Ticket Purchased!">
        Your VIP Pass for Summer Festival 2025 has been confirmed. Check your email for the QR code.
      </Alert>
      <Alert variant="warning" title="Limited Availability">
        Only 50 VIP tickets remaining. Complete your purchase soon!
      </Alert>
      <Alert variant="error" title="Zone Full">
        The Main Stage zone has reached capacity. Please try another zone.
      </Alert>
      <Alert variant="info">
        Gates open at 2:00 PM. Make sure to arrive early for the best experience!
      </Alert>
    </div>
  ),
};
