import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Radio, RadioGroup } from '../apps/web/components/ui/Radio';

/**
 * Radio component for selecting a single option from a list.
 * Use RadioGroup to manage a group of related Radio buttons.
 */
const meta: Meta<typeof RadioGroup> = {
  title: 'UI/Radio',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'select',
      options: ['vertical', 'horizontal'],
      description: 'Layout direction of radio buttons',
      table: {
        defaultValue: { summary: 'vertical' },
      },
    },
    radioSize: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the radio buttons',
      table: {
        type: { summary: 'RadioSize' },
        defaultValue: { summary: 'md' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether all radios in the group are disabled',
    },
    label: {
      control: 'text',
      description: 'Label for the radio group',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

/**
 * Default vertical radio group
 */
const DefaultDemo = () => {
  const [value, setValue] = useState('option1');
  return (
    <RadioGroup name="default" value={value} onChange={setValue}>
      <Radio value="option1" label="Option 1" />
      <Radio value="option2" label="Option 2" />
      <Radio value="option3" label="Option 3" />
    </RadioGroup>
  );
};

export const Default: Story = {
  render: () => <DefaultDemo />,
};

/**
 * Radio group with group label
 */
const WithLabelDemo = () => {
  const [value, setValue] = useState('email');
  return (
    <RadioGroup
      name="contact"
      label="Preferred contact method"
      value={value}
      onChange={setValue}
    >
      <Radio value="email" label="Email" />
      <Radio value="phone" label="Phone" />
      <Radio value="sms" label="SMS" />
    </RadioGroup>
  );
};

export const WithGroupLabel: Story = {
  render: () => <WithLabelDemo />,
};

/**
 * Radio with descriptions
 */
const WithDescriptionsDemo = () => {
  const [value, setValue] = useState('standard');
  return (
    <RadioGroup
      name="shipping"
      label="Shipping method"
      value={value}
      onChange={setValue}
    >
      <Radio
        value="standard"
        label="Standard Shipping"
        description="5-7 business days"
      />
      <Radio
        value="express"
        label="Express Shipping"
        description="2-3 business days"
      />
      <Radio
        value="overnight"
        label="Overnight Shipping"
        description="Next business day"
      />
    </RadioGroup>
  );
};

export const WithDescriptions: Story = {
  render: () => <WithDescriptionsDemo />,
};

/**
 * Horizontal layout
 */
const HorizontalDemo = () => {
  const [value, setValue] = useState('all');
  return (
    <RadioGroup
      name="filter"
      label="Status filter"
      direction="horizontal"
      value={value}
      onChange={setValue}
    >
      <Radio value="all" label="All" />
      <Radio value="active" label="Active" />
      <Radio value="completed" label="Completed" />
    </RadioGroup>
  );
};

export const Horizontal: Story = {
  render: () => <HorizontalDemo />,
};

/**
 * Small size radios
 */
const SmallSizeDemo = () => {
  const [value, setValue] = useState('yes');
  return (
    <RadioGroup
      name="confirm"
      radioSize="sm"
      direction="horizontal"
      value={value}
      onChange={setValue}
    >
      <Radio value="yes" label="Yes" />
      <Radio value="no" label="No" />
      <Radio value="maybe" label="Maybe" />
    </RadioGroup>
  );
};

export const SmallSize: Story = {
  render: () => <SmallSizeDemo />,
};

/**
 * Large size radios
 */
const LargeSizeDemo = () => {
  const [value, setValue] = useState('monthly');
  return (
    <RadioGroup
      name="billing"
      radioSize="lg"
      label="Billing cycle"
      value={value}
      onChange={setValue}
    >
      <Radio value="monthly" label="Monthly" />
      <Radio value="yearly" label="Yearly" />
    </RadioGroup>
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
        <RadioGroup name="size-sm" radioSize="sm" direction="horizontal" defaultValue="a">
          <Radio value="a" label="Option A" />
          <Radio value="b" label="Option B" />
        </RadioGroup>
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Medium</p>
        <RadioGroup name="size-md" radioSize="md" direction="horizontal" defaultValue="a">
          <Radio value="a" label="Option A" />
          <Radio value="b" label="Option B" />
        </RadioGroup>
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Large</p>
        <RadioGroup name="size-lg" radioSize="lg" direction="horizontal" defaultValue="a">
          <Radio value="a" label="Option A" />
          <Radio value="b" label="Option B" />
        </RadioGroup>
      </div>
    </div>
  ),
};

/**
 * Radio group with error
 */
export const WithError: Story = {
  render: () => (
    <RadioGroup
      name="required"
      label="Select an option"
      error="Please select one of the options"
    >
      <Radio value="option1" label="Option 1" />
      <Radio value="option2" label="Option 2" />
      <Radio value="option3" label="Option 3" />
    </RadioGroup>
  ),
};

/**
 * Disabled states
 */
export const Disabled: Story = {
  render: () => (
    <div className="space-y-6">
      <RadioGroup name="disabled-group" label="Disabled group" disabled defaultValue="option1">
        <Radio value="option1" label="Option 1" />
        <Radio value="option2" label="Option 2" />
      </RadioGroup>
      <RadioGroup name="mixed" label="Individual disabled" defaultValue="option1">
        <Radio value="option1" label="Enabled" />
        <Radio value="option2" label="Disabled" disabled />
        <Radio value="option3" label="Enabled" />
      </RadioGroup>
    </div>
  ),
};

/**
 * Controlled radio group
 */
const ControlledDemo = () => {
  const [selected, setSelected] = useState('');

  return (
    <div className="space-y-4">
      <RadioGroup
        name="controlled"
        label="Select an option"
        value={selected}
        onChange={setSelected}
      >
        <Radio value="option1" label="Option 1" />
        <Radio value="option2" label="Option 2" />
        <Radio value="option3" label="Option 3" />
      </RadioGroup>
      <p className="text-white/60 text-sm">
        Selected: <span className="text-white">{selected || 'None'}</span>
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setSelected('option1')}
          className="px-2 py-1 bg-white/10 text-white rounded text-sm"
        >
          Select 1
        </button>
        <button
          onClick={() => setSelected('option2')}
          className="px-2 py-1 bg-white/10 text-white rounded text-sm"
        >
          Select 2
        </button>
        <button
          onClick={() => setSelected('')}
          className="px-2 py-1 bg-white/10 text-white rounded text-sm"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

/**
 * Card-style radio selection
 */
const CardSelectionDemo = () => {
  const [selected, setSelected] = useState('basic');

  const plans = [
    { value: 'basic', name: 'Basic', price: '$9', features: '5 tickets/month' },
    { value: 'pro', name: 'Pro', price: '$19', features: '20 tickets/month' },
    { value: 'enterprise', name: 'Enterprise', price: '$49', features: 'Unlimited' },
  ];

  return (
    <div className="w-80 space-y-3">
      {plans.map((plan) => (
        <label
          key={plan.value}
          className={`
            flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
            ${selected === plan.value
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-white/10 bg-white/5 hover:border-white/20'
            }
          `}
        >
          <Radio
            name="plan-cards"
            value={plan.value}
            checked={selected === plan.value}
            onChange={() => setSelected(plan.value)}
          />
          <div className="flex-1">
            <p className="text-white font-medium">{plan.name}</p>
            <p className="text-white/50 text-sm">{plan.features}</p>
          </div>
          <span className="text-primary-400 font-semibold">{plan.price}</span>
        </label>
      ))}
    </div>
  );
};

export const CardSelection: Story = {
  render: () => <CardSelectionDemo />,
};

/**
 * Festival-specific: Ticket type selection
 */
const FestivalTicketTypeDemo = () => {
  const [ticketType, setTicketType] = useState('general');

  return (
    <div className="w-96 p-6 bg-white/5 rounded-2xl border border-white/10">
      <h3 className="text-white font-semibold text-lg mb-4">Select Ticket Type</h3>
      <RadioGroup
        name="ticket-type"
        value={ticketType}
        onChange={setTicketType}
      >
        <div className="space-y-3">
          <div className={`
            p-4 rounded-xl border transition-all cursor-pointer
            ${ticketType === 'general' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'}
          `}>
            <div className="flex justify-between items-start">
              <Radio
                value="general"
                label="General Admission"
                description="Full festival access to all main stages"
              />
              <span className="text-white font-bold">$79</span>
            </div>
          </div>

          <div className={`
            p-4 rounded-xl border transition-all cursor-pointer
            ${ticketType === 'vip' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'}
          `}>
            <div className="flex justify-between items-start">
              <Radio
                value="vip"
                label="VIP Pass"
                description="VIP lounge access, premium viewing areas, free drinks"
              />
              <span className="text-white font-bold">$149</span>
            </div>
          </div>

          <div className={`
            p-4 rounded-xl border transition-all cursor-pointer
            ${ticketType === 'backstage' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'}
          `}>
            <div className="flex justify-between items-start">
              <Radio
                value="backstage"
                label="Backstage Access"
                description="All VIP benefits plus backstage tours and artist meetups"
              />
              <span className="text-white font-bold">$299</span>
            </div>
          </div>
        </div>
      </RadioGroup>

      <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
        <span className="text-white/60">Selected:</span>
        <span className="text-white font-semibold capitalize">{ticketType.replace('-', ' ')}</span>
      </div>
    </div>
  );
};

export const FestivalTicketType: Story = {
  render: () => <FestivalTicketTypeDemo />,
};

/**
 * Festival-specific: Payment method selection
 */
const FestivalPaymentDemo = () => {
  const [method, setMethod] = useState('card');

  return (
    <div className="w-80">
      <RadioGroup
        name="payment"
        label="Payment Method"
        value={method}
        onChange={setMethod}
      >
        <Radio
          value="card"
          label="Credit/Debit Card"
          description="Visa, Mastercard, Amex"
        />
        <Radio
          value="paypal"
          label="PayPal"
          description="Pay with your PayPal account"
        />
        <Radio
          value="apple"
          label="Apple Pay"
          description="Quick checkout with Apple Pay"
        />
        <Radio
          value="crypto"
          label="Cryptocurrency"
          description="Bitcoin, Ethereum"
          disabled
        />
      </RadioGroup>
    </div>
  );
};

export const FestivalPayment: Story = {
  render: () => <FestivalPaymentDemo />,
};

/**
 * In a form context
 */
export const FormExample: Story = {
  render: () => (
    <form className="w-80 space-y-6 p-4 bg-white/5 rounded-xl border border-white/10">
      <h3 className="text-white font-semibold">Event Registration</h3>

      <div>
        <label className="text-white/60 text-sm">Full Name</label>
        <input
          type="text"
          className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
          placeholder="Your name"
        />
      </div>

      <RadioGroup
        name="ticket"
        label="Ticket Type"
        defaultValue="general"
      >
        <Radio value="general" label="General - $79" />
        <Radio value="vip" label="VIP - $149" />
      </RadioGroup>

      <RadioGroup
        name="tshirt"
        label="T-Shirt Size"
        direction="horizontal"
        defaultValue="m"
        radioSize="sm"
      >
        <Radio value="s" label="S" />
        <Radio value="m" label="M" />
        <Radio value="l" label="L" />
        <Radio value="xl" label="XL" />
      </RadioGroup>

      <button
        type="submit"
        className="w-full py-2 bg-primary-500 text-white rounded-lg font-semibold"
      >
        Complete Registration
      </button>
    </form>
  ),
};

/**
 * Inline radio buttons
 */
export const Inline: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <span className="text-white/60 text-sm">Sort by:</span>
      <RadioGroup name="sort" direction="horizontal" defaultValue="date" radioSize="sm">
        <Radio value="date" label="Date" />
        <Radio value="price" label="Price" />
        <Radio value="popularity" label="Popularity" />
      </RadioGroup>
    </div>
  ),
};
