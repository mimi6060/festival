import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Checkbox } from '../apps/web/components/ui/Checkbox';

/**
 * Checkbox component for selecting one or multiple options from a list.
 * Supports multiple sizes, indeterminate state, and descriptive labels.
 */
const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text displayed next to the checkbox',
    },
    description: {
      control: 'text',
      description: 'Description text displayed below the label',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    checkboxSize: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the checkbox',
      table: {
        type: { summary: 'CheckboxSize' },
        defaultValue: { summary: 'md' },
      },
    },
    indeterminate: {
      control: 'boolean',
      description: 'Whether the checkbox is in indeterminate state',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled',
    },
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

/**
 * Default checkbox without label
 */
const DefaultDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const Default: Story = {
  render: () => <DefaultDemo />,
};

/**
 * Checkbox with label
 */
const WithLabelDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      label="Accept terms and conditions"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const WithLabel: Story = {
  render: () => <WithLabelDemo />,
};

/**
 * Checkbox with label and description
 */
const WithDescriptionDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      label="Newsletter subscription"
      description="Receive weekly updates about new events and exclusive offers"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const WithDescription: Story = {
  render: () => <WithDescriptionDemo />,
};

/**
 * Small size checkbox
 */
const SmallSizeDemo = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Checkbox
      checkboxSize="sm"
      label="Small checkbox"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const SmallSize: Story = {
  render: () => <SmallSizeDemo />,
};

/**
 * Large size checkbox
 */
const LargeSizeDemo = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Checkbox
      checkboxSize="lg"
      label="Large checkbox"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
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
    <div className="space-y-4">
      <Checkbox checkboxSize="sm" label="Small" defaultChecked />
      <Checkbox checkboxSize="md" label="Medium" defaultChecked />
      <Checkbox checkboxSize="lg" label="Large" defaultChecked />
    </div>
  ),
};

/**
 * Checkbox with error
 */
export const WithError: Story = {
  render: () => (
    <Checkbox
      label="Accept terms and conditions"
      error="You must accept the terms to continue"
    />
  ),
};

/**
 * Disabled states
 */
export const Disabled: Story = {
  render: () => (
    <div className="space-y-4">
      <Checkbox label="Disabled (unchecked)" disabled />
      <Checkbox label="Disabled (checked)" disabled defaultChecked />
    </div>
  ),
};

/**
 * Indeterminate state
 */
const IndeterminateDemo = () => {
  const [items, setItems] = useState([
    { id: 1, label: 'Item 1', checked: true },
    { id: 2, label: 'Item 2', checked: false },
    { id: 3, label: 'Item 3', checked: true },
  ]);

  const allChecked = items.every((item) => item.checked);
  const someChecked = items.some((item) => item.checked);

  const toggleAll = () => {
    setItems(items.map((item) => ({ ...item, checked: !allChecked })));
  };

  const toggleItem = (id: number) => {
    setItems(items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  return (
    <div className="space-y-3">
      <Checkbox
        label="Select All"
        checked={allChecked}
        indeterminate={someChecked && !allChecked}
        onChange={toggleAll}
      />
      <div className="ml-6 space-y-2">
        {items.map((item) => (
          <Checkbox
            key={item.id}
            label={item.label}
            checked={item.checked}
            onChange={() => toggleItem(item.id)}
          />
        ))}
      </div>
    </div>
  );
};

export const Indeterminate: Story = {
  render: () => <IndeterminateDemo />,
};

/**
 * Checkbox group
 */
const CheckboxGroupDemo = () => {
  const [selected, setSelected] = useState<string[]>(['option1']);

  const toggleOption = (option: string) => {
    setSelected((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-white/60 text-sm">Select your preferences:</p>
      <Checkbox
        label="Email notifications"
        checked={selected.includes('option1')}
        onChange={() => toggleOption('option1')}
      />
      <Checkbox
        label="Push notifications"
        checked={selected.includes('option2')}
        onChange={() => toggleOption('option2')}
      />
      <Checkbox
        label="SMS notifications"
        checked={selected.includes('option3')}
        onChange={() => toggleOption('option3')}
      />
    </div>
  );
};

export const CheckboxGroup: Story = {
  render: () => <CheckboxGroupDemo />,
};

/**
 * Controlled checkbox
 */
const ControlledDemo = () => {
  const [checked, setChecked] = useState(false);

  return (
    <div className="space-y-4">
      <Checkbox
        label="Controlled checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      <p className="text-white/60 text-sm">
        State: <span className="text-white">{checked ? 'Checked' : 'Unchecked'}</span>
      </p>
      <button
        onClick={() => setChecked(!checked)}
        className="px-3 py-1 bg-white/10 text-white rounded text-sm"
      >
        Toggle from outside
      </button>
    </div>
  );
};

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

/**
 * In a form context
 */
export const FormExample: Story = {
  render: () => (
    <form className="w-80 space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <h3 className="text-white font-semibold">Create Account</h3>

      <div className="space-y-3">
        <div>
          <label className="text-white/60 text-sm">Email</label>
          <input
            type="email"
            className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="text-white/60 text-sm">Password</label>
          <input
            type="password"
            className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            placeholder="Create password"
          />
        </div>

        <Checkbox
          label="Remember me"
          description="Stay signed in on this device"
        />

        <Checkbox
          label="I agree to the Terms of Service and Privacy Policy"
          error="You must agree to continue"
        />
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-primary-500 text-white rounded-lg font-semibold"
      >
        Create Account
      </button>
    </form>
  ),
};

/**
 * Festival-specific: Ticket add-ons
 */
const FestivalAddOnsDemo = () => {
  const [addOns, setAddOns] = useState<string[]>([]);

  const toggleAddOn = (addon: string) => {
    setAddOns((prev) =>
      prev.includes(addon)
        ? prev.filter((a) => a !== addon)
        : [...prev, addon]
    );
  };

  const addOnOptions = [
    { id: 'parking', label: 'Parking Pass', price: 25, description: 'Reserved parking spot near entrance' },
    { id: 'camping', label: 'Camping Access', price: 75, description: '3-night camping with shower facilities' },
    { id: 'merch', label: 'Merch Bundle', price: 50, description: 'T-shirt, poster, and lanyard' },
    { id: 'locker', label: 'Locker Rental', price: 15, description: 'Secure storage for your belongings' },
  ];

  const total = addOnOptions
    .filter((opt) => addOns.includes(opt.id))
    .reduce((sum, opt) => sum + opt.price, 0);

  return (
    <div className="w-96 p-6 bg-white/5 rounded-2xl border border-white/10">
      <h3 className="text-white font-semibold text-lg mb-4">Add-ons</h3>
      <div className="space-y-3">
        {addOnOptions.map((option) => (
          <div
            key={option.id}
            className={`
              p-3 rounded-xl border cursor-pointer transition-colors
              ${addOns.includes(option.id)
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-white/10 hover:border-white/20'
              }
            `}
            onClick={() => toggleAddOn(option.id)}
          >
            <div className="flex items-start justify-between">
              <Checkbox
                label={option.label}
                description={option.description}
                checked={addOns.includes(option.id)}
                onChange={() => toggleAddOn(option.id)}
              />
              <span className="text-white font-semibold">${option.price}</span>
            </div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
          <span className="text-white/60">Add-ons Total</span>
          <span className="text-white font-bold">${total}</span>
        </div>
      )}
    </div>
  );
};

export const FestivalAddOns: Story = {
  render: () => <FestivalAddOnsDemo />,
};

/**
 * Festival-specific: Filter options
 */
export const FestivalFilters: Story = {
  render: () => (
    <div className="w-64 p-4 bg-white/5 rounded-xl border border-white/10">
      <h3 className="text-white font-semibold mb-4">Filter Events</h3>

      <div className="space-y-4">
        <div>
          <p className="text-white/60 text-sm mb-2">Genre</p>
          <div className="space-y-2">
            <Checkbox label="Electronic" checkboxSize="sm" defaultChecked />
            <Checkbox label="Rock" checkboxSize="sm" />
            <Checkbox label="Hip Hop" checkboxSize="sm" defaultChecked />
            <Checkbox label="Jazz" checkboxSize="sm" />
            <Checkbox label="Pop" checkboxSize="sm" />
          </div>
        </div>

        <div>
          <p className="text-white/60 text-sm mb-2">Venue</p>
          <div className="space-y-2">
            <Checkbox label="Main Stage" checkboxSize="sm" defaultChecked />
            <Checkbox label="Tent A" checkboxSize="sm" defaultChecked />
            <Checkbox label="Tent B" checkboxSize="sm" />
            <Checkbox label="Acoustic Area" checkboxSize="sm" />
          </div>
        </div>

        <div>
          <p className="text-white/60 text-sm mb-2">Time</p>
          <div className="space-y-2">
            <Checkbox label="Morning (10am-2pm)" checkboxSize="sm" />
            <Checkbox label="Afternoon (2pm-6pm)" checkboxSize="sm" defaultChecked />
            <Checkbox label="Evening (6pm-10pm)" checkboxSize="sm" defaultChecked />
            <Checkbox label="Night (10pm+)" checkboxSize="sm" />
          </div>
        </div>
      </div>

      <button className="w-full mt-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold">
        Apply Filters
      </button>
    </div>
  ),
};

/**
 * Stacked checkboxes with cards
 */
export const CardSelection: Story = {
  render: () => (
    <div className="space-y-3 w-80">
      {[
        { title: 'Basic Plan', price: '$9/mo', features: '5 tickets/month' },
        { title: 'Pro Plan', price: '$19/mo', features: '20 tickets/month' },
        { title: 'Enterprise', price: '$49/mo', features: 'Unlimited tickets' },
      ].map((plan, index) => (
        <label
          key={plan.title}
          className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
        >
          <Checkbox defaultChecked={index === 1} />
          <div className="flex-1">
            <p className="text-white font-medium">{plan.title}</p>
            <p className="text-white/50 text-sm">{plan.features}</p>
          </div>
          <span className="text-primary-400 font-semibold">{plan.price}</span>
        </label>
      ))}
    </div>
  ),
};
