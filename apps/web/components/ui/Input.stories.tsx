import type { Meta, StoryObj } from '@storybook/react';
import { Input, Textarea, Select } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'filled', 'outline'],
      description: 'Visual style of the input',
    },
    inputSize: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the input',
    },
    label: {
      control: 'text',
      description: 'Label text',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    helperText: {
      control: 'text',
      description: 'Helper text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the input',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '350px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Input>;

// Basic variants
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
    variant: 'default',
  },
};

export const Filled: Story = {
  args: {
    placeholder: 'Enter text...',
    variant: 'filled',
  },
};

export const Outline: Story = {
  args: {
    placeholder: 'Enter text...',
    variant: 'outline',
  },
};

// With label
export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com',
    type: 'email',
  },
};

// With helper text
export const WithHelperText: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter password',
    type: 'password',
    helperText: 'Must be at least 8 characters',
  },
};

// With error
export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
  },
};

// With icons
export const WithLeftIcon: Story = {
  args: {
    placeholder: 'Search festivals...',
    leftIcon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
};

export const WithRightIcon: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    rightIcon: (
      <svg
        className="w-5 h-5 cursor-pointer hover:text-white/60"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
  },
};

// Sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input inputSize="sm" placeholder="Small input" />
      <Input inputSize="md" placeholder="Medium input" />
      <Input inputSize="lg" placeholder="Large input" />
    </div>
  ),
};

// Disabled
export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit',
    disabled: true,
    value: 'Read only value',
  },
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input variant="default" label="Default" placeholder="Default input..." />
      <Input variant="filled" label="Filled" placeholder="Filled input..." />
      <Input variant="outline" label="Outline" placeholder="Outline input..." />
    </div>
  ),
};

// Textarea
export const TextareaDefault: Story = {
  render: () => <Textarea label="Description" placeholder="Enter a description..." rows={4} />,
};

export const TextareaWithError: Story = {
  render: () => (
    <Textarea
      label="Bio"
      placeholder="Tell us about yourself..."
      rows={4}
      error="Bio is required"
    />
  ),
};

// Select
export const SelectDefault: Story = {
  render: () => (
    <Select
      label="Country"
      placeholder="Select a country"
      options={[
        { value: 'fr', label: 'France' },
        { value: 'de', label: 'Germany' },
        { value: 'es', label: 'Spain' },
        { value: 'it', label: 'Italy' },
        { value: 'uk', label: 'United Kingdom' },
      ]}
    />
  ),
};

export const SelectWithError: Story = {
  render: () => (
    <Select
      label="Ticket Type"
      placeholder="Select ticket type"
      error="Please select a ticket type"
      options={[
        { value: 'standard', label: 'Standard Pass' },
        { value: 'vip', label: 'VIP Pass' },
        { value: 'backstage', label: 'Backstage Access' },
      ]}
    />
  ),
};

// Form Example
export const FormExample: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Full Name" placeholder="John Doe" />
      <Input label="Email" type="email" placeholder="john@example.com" />
      <Select
        label="Country"
        placeholder="Select country"
        options={[
          { value: 'fr', label: 'France' },
          { value: 'de', label: 'Germany' },
        ]}
      />
      <Textarea label="Message" placeholder="Your message..." rows={3} />
    </div>
  ),
};
