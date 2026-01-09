import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  DropdownCheckboxItem,
} from '../apps/web/components/ui/Dropdown';
import { Button } from '../apps/web/components/ui/Button';

/**
 * Dropdown menu component for displaying a list of actions or options.
 * Supports various item types including checkboxes, separators, and labels.
 */
const meta: Meta<typeof Dropdown> = {
  title: 'UI/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

/**
 * Basic dropdown with simple menu items
 */
export const Default: Story = {
  render: () => (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary">
          Open Menu
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownTrigger>
      <DropdownMenu>
        <DropdownItem onClick={() => alert('Edit clicked')}>Edit</DropdownItem>
        <DropdownItem onClick={() => alert('Duplicate clicked')}>Duplicate</DropdownItem>
        <DropdownItem onClick={() => alert('Archive clicked')}>Archive</DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onClick={() => alert('Delete clicked')}>Delete</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

/**
 * Dropdown with icons on menu items
 */
export const WithIcons: Story = {
  render: () => (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary">
          Actions
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownTrigger>
      <DropdownMenu>
        <DropdownItem
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        >
          Edit
        </DropdownItem>
        <DropdownItem
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        >
          Duplicate
        </DropdownItem>
        <DropdownItem
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          }
        >
          Archive
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          danger
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        >
          Delete
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

/**
 * Dropdown with grouped sections using labels
 */
export const WithLabels: Story = {
  render: () => (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary">My Account</Button>
      </DropdownTrigger>
      <DropdownMenu>
        <DropdownLabel>Account</DropdownLabel>
        <DropdownItem>Profile</DropdownItem>
        <DropdownItem>Settings</DropdownItem>
        <DropdownItem>Billing</DropdownItem>
        <DropdownSeparator />
        <DropdownLabel>Team</DropdownLabel>
        <DropdownItem>Invite Members</DropdownItem>
        <DropdownItem>Team Settings</DropdownItem>
        <DropdownSeparator />
        <DropdownItem>Log Out</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

/**
 * Dropdown with checkbox items
 */
const CheckboxDemo = () => {
  const [options, setOptions] = useState({
    notifications: true,
    newsletter: false,
    marketing: false,
  });

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary">Preferences</Button>
      </DropdownTrigger>
      <DropdownMenu>
        <DropdownLabel>Notifications</DropdownLabel>
        <DropdownCheckboxItem
          checked={options.notifications}
          onChange={(checked) => setOptions({ ...options, notifications: checked })}
        >
          Push Notifications
        </DropdownCheckboxItem>
        <DropdownCheckboxItem
          checked={options.newsletter}
          onChange={(checked) => setOptions({ ...options, newsletter: checked })}
        >
          Email Newsletter
        </DropdownCheckboxItem>
        <DropdownCheckboxItem
          checked={options.marketing}
          onChange={(checked) => setOptions({ ...options, marketing: checked })}
        >
          Marketing Emails
        </DropdownCheckboxItem>
      </DropdownMenu>
    </Dropdown>
  );
};

export const WithCheckboxItems: Story = {
  render: () => <CheckboxDemo />,
};

/**
 * Dropdown with disabled items
 */
export const WithDisabledItems: Story = {
  render: () => (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary">Options</Button>
      </DropdownTrigger>
      <DropdownMenu>
        <DropdownItem>Available Action</DropdownItem>
        <DropdownItem disabled>Disabled Action</DropdownItem>
        <DropdownItem>Another Action</DropdownItem>
        <DropdownItem disabled>Also Disabled</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

/**
 * Dropdown with different placements
 */
export const Placements: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <Dropdown>
        <DropdownTrigger>
          <Button variant="secondary" size="sm">Bottom Start</Button>
        </DropdownTrigger>
        <DropdownMenu placement="bottom-start">
          <DropdownItem>Item 1</DropdownItem>
          <DropdownItem>Item 2</DropdownItem>
        </DropdownMenu>
      </Dropdown>
      <Dropdown>
        <DropdownTrigger>
          <Button variant="secondary" size="sm">Bottom End</Button>
        </DropdownTrigger>
        <DropdownMenu placement="bottom-end">
          <DropdownItem>Item 1</DropdownItem>
          <DropdownItem>Item 2</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  ),
};

/**
 * Icon button dropdown (common pattern)
 */
export const IconButtonTrigger: Story = {
  render: () => (
    <Dropdown>
      <DropdownTrigger className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </DropdownTrigger>
      <DropdownMenu placement="bottom-end">
        <DropdownItem>View Details</DropdownItem>
        <DropdownItem>Edit</DropdownItem>
        <DropdownItem>Share</DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger>Delete</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

/**
 * User menu dropdown pattern
 */
export const UserMenu: Story = {
  render: () => (
    <Dropdown>
      <DropdownTrigger className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
          JD
        </div>
        <div className="text-left">
          <p className="text-white font-medium text-sm">John Doe</p>
          <p className="text-white/50 text-xs">john@example.com</p>
        </div>
        <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </DropdownTrigger>
      <DropdownMenu placement="bottom-end" minWidth="min-w-56">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-white font-medium">John Doe</p>
          <p className="text-white/50 text-sm">john@example.com</p>
        </div>
        <DropdownItem
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        >
          Profile
        </DropdownItem>
        <DropdownItem
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          }
        >
          My Tickets
        </DropdownItem>
        <DropdownItem
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        >
          Settings
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
        >
          Log Out
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

/**
 * Festival-specific: Ticket actions dropdown
 */
export const FestivalTicketActions: Story = {
  render: () => (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 max-w-md">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-semibold">VIP Pass - Summer Festival</h3>
          <p className="text-white/50 text-sm mt-1">Valid: July 15-17, 2025</p>
          <span className="inline-block mt-2 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">Active</span>
        </div>
        <Dropdown>
          <DropdownTrigger className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </DropdownTrigger>
          <DropdownMenu placement="bottom-end">
            <DropdownItem
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              }
            >
              Show QR Code
            </DropdownItem>
            <DropdownItem
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              Download PDF
            </DropdownItem>
            <DropdownItem
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              }
            >
              Share Ticket
            </DropdownItem>
            <DropdownItem
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              }
            >
              Transfer Ticket
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              danger
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
            >
              Request Refund
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  ),
};
