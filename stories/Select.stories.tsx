import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SelectComponent } from '../apps/web/components/ui/Select';

/**
 * Custom Select component with dropdown functionality.
 * Supports searchable options, groups, clearable selection, and various sizes.
 */
const meta: Meta<typeof SelectComponent> = {
  title: 'UI/Select',
  component: SelectComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text when no option is selected',
    },
    label: {
      control: 'text',
      description: 'Label text displayed above the select',
    },
    helperText: {
      control: 'text',
      description: 'Helper text displayed below the select',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the select',
      table: {
        type: { summary: 'SelectSize' },
        defaultValue: { summary: 'md' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'filled', 'outline'],
      description: 'Visual style variant',
      table: {
        type: { summary: 'SelectVariant' },
        defaultValue: { summary: 'default' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled',
    },
    clearable: {
      control: 'boolean',
      description: 'Whether the selection can be cleared',
    },
    searchable: {
      control: 'boolean',
      description: 'Whether the options are searchable',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px', minHeight: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SelectComponent>;

const countryOptions = [
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'es', label: 'Spain' },
  { value: 'it', label: 'Italy' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
];

/**
 * Default select with basic options
 */
const DefaultDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Select a country"
    />
  );
};

export const Default: Story = {
  render: () => <DefaultDemo />,
};

/**
 * Select with label
 */
const WithLabelDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      label="Country"
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Select a country"
    />
  );
};

export const WithLabel: Story = {
  render: () => <WithLabelDemo />,
};

/**
 * Select with helper text
 */
const WithHelperTextDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      label="Country"
      helperText="Select your country of residence"
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Select a country"
    />
  );
};

export const WithHelperText: Story = {
  render: () => <WithHelperTextDemo />,
};

/**
 * Select with error
 */
export const WithError: Story = {
  render: () => (
    <SelectComponent
      label="Country"
      error="Please select a country"
      options={countryOptions}
      placeholder="Select a country"
    />
  ),
};

/**
 * Required select
 */
const RequiredDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      label="Country"
      required
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Select a country"
    />
  );
};

export const Required: Story = {
  render: () => <RequiredDemo />,
};

/**
 * Clearable select
 */
const ClearableDemo = () => {
  const [value, setValue] = useState('fr');
  return (
    <SelectComponent
      label="Country"
      clearable
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Select a country"
    />
  );
};

export const Clearable: Story = {
  render: () => <ClearableDemo />,
};

/**
 * Searchable select
 */
const SearchableDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      label="Country"
      searchable
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Search countries..."
    />
  );
};

export const Searchable: Story = {
  render: () => <SearchableDemo />,
};

/**
 * Searchable and clearable
 */
const SearchableClearableDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      label="Country"
      searchable
      clearable
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Search countries..."
    />
  );
};

export const SearchableClearable: Story = {
  render: () => <SearchableClearableDemo />,
};

/**
 * Small size select
 */
const SmallSizeDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      size="sm"
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Select country"
    />
  );
};

export const SmallSize: Story = {
  render: () => <SmallSizeDemo />,
};

/**
 * Large size select
 */
const LargeSizeDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      size="lg"
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Select country"
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
      <SelectComponent
        size="sm"
        label="Small"
        options={countryOptions.slice(0, 3)}
        placeholder="Select"
      />
      <SelectComponent
        size="md"
        label="Medium"
        options={countryOptions.slice(0, 3)}
        placeholder="Select"
      />
      <SelectComponent
        size="lg"
        label="Large"
        options={countryOptions.slice(0, 3)}
        placeholder="Select"
      />
    </div>
  ),
};

/**
 * Filled variant
 */
const FilledVariantDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      variant="filled"
      label="Country"
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Select country"
    />
  );
};

export const FilledVariant: Story = {
  render: () => <FilledVariantDemo />,
};

/**
 * Outline variant
 */
const OutlineVariantDemo = () => {
  const [value, setValue] = useState('');
  return (
    <SelectComponent
      variant="outline"
      label="Country"
      options={countryOptions}
      value={value}
      onChange={setValue}
      placeholder="Select country"
    />
  );
};

export const OutlineVariant: Story = {
  render: () => <OutlineVariantDemo />,
};

/**
 * All variants compared
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <SelectComponent
        variant="default"
        label="Default"
        options={countryOptions.slice(0, 3)}
        placeholder="Select"
      />
      <SelectComponent
        variant="filled"
        label="Filled"
        options={countryOptions.slice(0, 3)}
        placeholder="Select"
      />
      <SelectComponent
        variant="outline"
        label="Outline"
        options={countryOptions.slice(0, 3)}
        placeholder="Select"
      />
    </div>
  ),
};

/**
 * Select with option groups
 */
const WithGroupsDemo = () => {
  const [value, setValue] = useState('');

  const groupedOptions = [
    {
      label: 'Europe',
      options: [
        { value: 'fr', label: 'France' },
        { value: 'de', label: 'Germany' },
        { value: 'es', label: 'Spain' },
        { value: 'it', label: 'Italy' },
      ],
    },
    {
      label: 'North America',
      options: [
        { value: 'us', label: 'United States' },
        { value: 'ca', label: 'Canada' },
        { value: 'mx', label: 'Mexico' },
      ],
    },
    {
      label: 'Asia Pacific',
      options: [
        { value: 'au', label: 'Australia' },
        { value: 'jp', label: 'Japan' },
        { value: 'kr', label: 'South Korea' },
      ],
    },
  ];

  return (
    <SelectComponent
      label="Country"
      options={groupedOptions}
      value={value}
      onChange={setValue}
      placeholder="Select country"
      searchable
    />
  );
};

export const WithGroups: Story = {
  render: () => <WithGroupsDemo />,
};

/**
 * Select with disabled options
 */
const WithDisabledOptionsDemo = () => {
  const [value, setValue] = useState('');

  const optionsWithDisabled = [
    { value: 'general', label: 'General Admission - $79' },
    { value: 'vip', label: 'VIP Pass - $149' },
    { value: 'backstage', label: 'Backstage - $299', disabled: true },
    { value: 'platinum', label: 'Platinum - $499', disabled: true },
  ];

  return (
    <SelectComponent
      label="Ticket Type"
      options={optionsWithDisabled}
      value={value}
      onChange={setValue}
      placeholder="Select ticket"
      helperText="Some options may be sold out"
    />
  );
};

export const WithDisabledOptions: Story = {
  render: () => <WithDisabledOptionsDemo />,
};

/**
 * Disabled select
 */
export const Disabled: Story = {
  render: () => (
    <SelectComponent
      label="Country"
      disabled
      options={countryOptions}
      defaultValue="fr"
      placeholder="Select country"
    />
  ),
};

/**
 * Select with icons
 */
const WithIconsDemo = () => {
  const [value, setValue] = useState('');

  const optionsWithIcons = [
    {
      value: 'card',
      label: 'Credit Card',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      value: 'paypal',
      label: 'PayPal',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.217a.64.64 0 0 1 .632-.544h6.012c2.065 0 3.593.518 4.498 1.516.898.987 1.196 2.381.884 4.14-.009.05-.02.103-.032.156a9.87 9.87 0 0 1-.143.643c-.627 2.375-2.222 3.869-4.682 4.39-.567.12-1.198.18-1.886.18H8.682a.64.64 0 0 0-.632.544l-.974 6.095z" />
        </svg>
      ),
    },
    {
      value: 'apple',
      label: 'Apple Pay',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      ),
    },
  ];

  return (
    <SelectComponent
      label="Payment Method"
      options={optionsWithIcons}
      value={value}
      onChange={setValue}
      placeholder="Select payment method"
    />
  );
};

export const WithIcons: Story = {
  render: () => <WithIconsDemo />,
};

/**
 * Festival-specific: Ticket category selection
 */
const FestivalTicketCategoryDemo = () => {
  const [category, setCategory] = useState('');

  const ticketCategories = [
    { value: 'day1', label: 'Day 1 Pass - Friday, July 15' },
    { value: 'day2', label: 'Day 2 Pass - Saturday, July 16' },
    { value: 'day3', label: 'Day 3 Pass - Sunday, July 17' },
    { value: 'weekend', label: 'Full Weekend Pass (3 Days)' },
    { value: 'vip-weekend', label: 'VIP Weekend Pass' },
  ];

  return (
    <SelectComponent
      label="Select Ticket"
      options={ticketCategories}
      value={category}
      onChange={setCategory}
      placeholder="Choose your ticket"
      helperText="All tickets include festival entry and access to all stages"
    />
  );
};

export const FestivalTicketCategory: Story = {
  render: () => <FestivalTicketCategoryDemo />,
};

/**
 * Festival-specific: Stage/Zone selection
 */
const FestivalZoneDemo = () => {
  const [zone, setZone] = useState('');

  const zoneOptions = [
    {
      label: 'Main Stages',
      options: [
        { value: 'main', label: 'Main Stage' },
        { value: 'second', label: 'Second Stage' },
        { value: 'electronic', label: 'Electronic Arena' },
      ],
    },
    {
      label: 'Special Areas',
      options: [
        { value: 'vip', label: 'VIP Lounge' },
        { value: 'backstage', label: 'Backstage Area' },
        { value: 'acoustic', label: 'Acoustic Corner' },
      ],
    },
    {
      label: 'Amenities',
      options: [
        { value: 'food', label: 'Food Court' },
        { value: 'camping', label: 'Camping Zone' },
        { value: 'parking', label: 'Parking Area' },
      ],
    },
  ];

  return (
    <SelectComponent
      label="Select Zone"
      options={zoneOptions}
      value={zone}
      onChange={setZone}
      placeholder="Choose a zone"
      searchable
      clearable
    />
  );
};

export const FestivalZone: Story = {
  render: () => <FestivalZoneDemo />,
};

/**
 * In a form context
 */
export const FormExample: Story = {
  render: () => (
    <form className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <h3 className="text-white font-semibold">Shipping Information</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/60 text-sm">First Name</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            placeholder="John"
          />
        </div>
        <div>
          <label className="text-white/60 text-sm">Last Name</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            placeholder="Doe"
          />
        </div>
      </div>

      <SelectComponent
        label="Country"
        size="sm"
        options={countryOptions}
        placeholder="Select country"
        required
      />

      <SelectComponent
        label="State/Region"
        size="sm"
        options={[
          { value: 'idf', label: 'Ile-de-France' },
          { value: 'paca', label: 'Provence-Alpes-Cote d\'Azur' },
          { value: 'occ', label: 'Occitanie' },
        ]}
        placeholder="Select state"
      />

      <button
        type="submit"
        className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold"
      >
        Continue to Payment
      </button>
    </form>
  ),
};

/**
 * Controlled select example
 */
const ControlledDemo = () => {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-4">
      <SelectComponent
        label="Country"
        options={countryOptions}
        value={value}
        onChange={setValue}
        placeholder="Select country"
      />
      <p className="text-white/60 text-sm">
        Selected: <span className="text-white">{value || 'None'}</span>
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setValue('fr')}
          className="px-2 py-1 bg-white/10 text-white rounded text-sm"
        >
          France
        </button>
        <button
          onClick={() => setValue('de')}
          className="px-2 py-1 bg-white/10 text-white rounded text-sm"
        >
          Germany
        </button>
        <button
          onClick={() => setValue('')}
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
