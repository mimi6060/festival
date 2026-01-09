import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Tabs, TabList, Tab, TabPanel } from '../apps/web/components/ui/Tabs';

/**
 * Tabs component for organizing content into separate views.
 * Supports different visual variants, sizes, and can be controlled or uncontrolled.
 */
const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'pills', 'underline'],
      description: 'Visual style variant of the tabs',
      table: {
        type: { summary: 'TabVariant' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the tabs',
      table: {
        type: { summary: 'TabSize' },
        defaultValue: { summary: 'md' },
      },
    },
    defaultValue: {
      control: 'text',
      description: 'Default active tab (uncontrolled)',
    },
    value: {
      control: 'text',
      description: 'Controlled active tab value',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

/**
 * Default tabs with the standard boxed style
 */
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabList>
        <Tab value="overview">Overview</Tab>
        <Tab value="tickets">Tickets</Tab>
        <Tab value="schedule">Schedule</Tab>
      </TabList>
      <TabPanel value="overview">
        <div className="p-4 bg-white/5 rounded-xl text-white/70">
          <h3 className="text-lg font-semibold text-white mb-2">Festival Overview</h3>
          <p>Welcome to the festival! Here you can find all the information you need.</p>
        </div>
      </TabPanel>
      <TabPanel value="tickets">
        <div className="p-4 bg-white/5 rounded-xl text-white/70">
          <h3 className="text-lg font-semibold text-white mb-2">Available Tickets</h3>
          <p>Browse and purchase tickets for the event.</p>
        </div>
      </TabPanel>
      <TabPanel value="schedule">
        <div className="p-4 bg-white/5 rounded-xl text-white/70">
          <h3 className="text-lg font-semibold text-white mb-2">Event Schedule</h3>
          <p>Check out the full lineup and performance times.</p>
        </div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Pills variant with rounded full buttons
 */
export const Pills: Story = {
  render: () => (
    <Tabs defaultValue="all" variant="pills">
      <TabList>
        <Tab value="all">All</Tab>
        <Tab value="active">Active</Tab>
        <Tab value="completed">Completed</Tab>
        <Tab value="cancelled">Cancelled</Tab>
      </TabList>
      <TabPanel value="all">
        <div className="p-4 text-white/70">Showing all items</div>
      </TabPanel>
      <TabPanel value="active">
        <div className="p-4 text-white/70">Showing active items</div>
      </TabPanel>
      <TabPanel value="completed">
        <div className="p-4 text-white/70">Showing completed items</div>
      </TabPanel>
      <TabPanel value="cancelled">
        <div className="p-4 text-white/70">Showing cancelled items</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Underline variant with bottom border indicator
 */
export const Underline: Story = {
  render: () => (
    <Tabs defaultValue="details" variant="underline">
      <TabList>
        <Tab value="details">Details</Tab>
        <Tab value="reviews">Reviews</Tab>
        <Tab value="location">Location</Tab>
        <Tab value="faq">FAQ</Tab>
      </TabList>
      <TabPanel value="details">
        <div className="p-4 text-white/70">Event details and description</div>
      </TabPanel>
      <TabPanel value="reviews">
        <div className="p-4 text-white/70">Customer reviews and ratings</div>
      </TabPanel>
      <TabPanel value="location">
        <div className="p-4 text-white/70">Venue location and directions</div>
      </TabPanel>
      <TabPanel value="faq">
        <div className="p-4 text-white/70">Frequently asked questions</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Small size tabs
 */
export const SmallSize: Story = {
  render: () => (
    <Tabs defaultValue="tab1" size="sm">
      <TabList>
        <Tab value="tab1">Tab 1</Tab>
        <Tab value="tab2">Tab 2</Tab>
        <Tab value="tab3">Tab 3</Tab>
      </TabList>
      <TabPanel value="tab1">
        <div className="p-4 text-sm text-white/70">Small tab content</div>
      </TabPanel>
      <TabPanel value="tab2">
        <div className="p-4 text-sm text-white/70">Tab 2 content</div>
      </TabPanel>
      <TabPanel value="tab3">
        <div className="p-4 text-sm text-white/70">Tab 3 content</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Large size tabs
 */
export const LargeSize: Story = {
  render: () => (
    <Tabs defaultValue="tab1" size="lg">
      <TabList>
        <Tab value="tab1">Tab 1</Tab>
        <Tab value="tab2">Tab 2</Tab>
        <Tab value="tab3">Tab 3</Tab>
      </TabList>
      <TabPanel value="tab1">
        <div className="p-4 text-lg text-white/70">Large tab content</div>
      </TabPanel>
      <TabPanel value="tab2">
        <div className="p-4 text-lg text-white/70">Tab 2 content</div>
      </TabPanel>
      <TabPanel value="tab3">
        <div className="p-4 text-lg text-white/70">Tab 3 content</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Tabs with icons
 */
export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="home" variant="pills">
      <TabList>
        <Tab
          value="home"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        >
          Home
        </Tab>
        <Tab
          value="tickets"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          }
        >
          Tickets
        </Tab>
        <Tab
          value="settings"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        >
          Settings
        </Tab>
      </TabList>
      <TabPanel value="home">
        <div className="p-4 text-white/70">Home content</div>
      </TabPanel>
      <TabPanel value="tickets">
        <div className="p-4 text-white/70">Tickets content</div>
      </TabPanel>
      <TabPanel value="settings">
        <div className="p-4 text-white/70">Settings content</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Tabs with disabled tab
 */
export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="tab1">
      <TabList>
        <Tab value="tab1">Available</Tab>
        <Tab value="tab2" disabled>Coming Soon</Tab>
        <Tab value="tab3">Archive</Tab>
      </TabList>
      <TabPanel value="tab1">
        <div className="p-4 text-white/70">Available content</div>
      </TabPanel>
      <TabPanel value="tab2">
        <div className="p-4 text-white/70">Coming soon content</div>
      </TabPanel>
      <TabPanel value="tab3">
        <div className="p-4 text-white/70">Archive content</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Controlled tabs with external state
 */
const ControlledDemo = () => {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('tab1')}
          className="px-3 py-1 bg-white/10 rounded text-white text-sm"
        >
          Go to Tab 1
        </button>
        <button
          onClick={() => setActiveTab('tab2')}
          className="px-3 py-1 bg-white/10 rounded text-white text-sm"
        >
          Go to Tab 2
        </button>
        <button
          onClick={() => setActiveTab('tab3')}
          className="px-3 py-1 bg-white/10 rounded text-white text-sm"
        >
          Go to Tab 3
        </button>
      </div>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab value="tab1">Tab 1</Tab>
          <Tab value="tab2">Tab 2</Tab>
          <Tab value="tab3">Tab 3</Tab>
        </TabList>
        <TabPanel value="tab1">
          <div className="p-4 text-white/70">Content for Tab 1</div>
        </TabPanel>
        <TabPanel value="tab2">
          <div className="p-4 text-white/70">Content for Tab 2</div>
        </TabPanel>
        <TabPanel value="tab3">
          <div className="p-4 text-white/70">Content for Tab 3</div>
        </TabPanel>
      </Tabs>
    </div>
  );
};

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

/**
 * All variants comparison
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-white text-sm font-medium mb-3">Default</h3>
        <Tabs defaultValue="tab1" variant="default">
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
            <Tab value="tab3">Tab 3</Tab>
          </TabList>
        </Tabs>
      </div>
      <div>
        <h3 className="text-white text-sm font-medium mb-3">Pills</h3>
        <Tabs defaultValue="tab1" variant="pills">
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
            <Tab value="tab3">Tab 3</Tab>
          </TabList>
        </Tabs>
      </div>
      <div>
        <h3 className="text-white text-sm font-medium mb-3">Underline</h3>
        <Tabs defaultValue="tab1" variant="underline">
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
            <Tab value="tab3">Tab 3</Tab>
          </TabList>
        </Tabs>
      </div>
    </div>
  ),
};

/**
 * Festival-specific example: Ticket management
 */
export const FestivalExample: Story = {
  render: () => (
    <Tabs defaultValue="upcoming" variant="underline">
      <TabList>
        <Tab value="upcoming">Upcoming Events</Tab>
        <Tab value="past">Past Events</Tab>
        <Tab value="saved">Saved</Tab>
      </TabList>
      <TabPanel value="upcoming">
        <div className="space-y-3 mt-2">
          {['Summer Festival 2025', 'Rock Night', 'Jazz Evening'].map((event) => (
            <div key={event} className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-white font-medium">{event}</h4>
              <p className="text-white/50 text-sm mt-1">July 15-17, 2025</p>
            </div>
          ))}
        </div>
      </TabPanel>
      <TabPanel value="past">
        <div className="p-4 text-white/50 text-center">No past events</div>
      </TabPanel>
      <TabPanel value="saved">
        <div className="p-4 text-white/50 text-center">No saved events</div>
      </TabPanel>
    </Tabs>
  ),
};
