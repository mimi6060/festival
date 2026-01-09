import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarGroup } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Size of the avatar',
    },
    status: {
      control: 'select',
      options: [undefined, 'online', 'offline', 'away', 'busy'],
      description: 'Status indicator',
    },
    rounded: {
      control: 'select',
      options: ['full', 'lg', 'md'],
      description: 'Border radius style',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

// Basic - with initials
export const WithInitials: Story = {
  args: {
    name: 'John Doe',
    size: 'lg',
  },
};

// Different names generate different colors
export const DifferentNames: Story = {
  render: () => (
    <div className="flex gap-3">
      <Avatar name="Alice Smith" size="lg" />
      <Avatar name="Bob Johnson" size="lg" />
      <Avatar name="Carol Williams" size="lg" />
      <Avatar name="David Brown" size="lg" />
      <Avatar name="Eva Davis" size="lg" />
    </div>
  ),
};

// All Sizes
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar name="John Doe" size="xs" />
      <Avatar name="John Doe" size="sm" />
      <Avatar name="John Doe" size="md" />
      <Avatar name="John Doe" size="lg" />
      <Avatar name="John Doe" size="xl" />
      <Avatar name="John Doe" size="2xl" />
    </div>
  ),
};

// With Status
export const WithStatus: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <Avatar name="Online User" size="lg" status="online" />
        <p className="text-white/60 text-xs mt-2">Online</p>
      </div>
      <div className="text-center">
        <Avatar name="Offline User" size="lg" status="offline" />
        <p className="text-white/60 text-xs mt-2">Offline</p>
      </div>
      <div className="text-center">
        <Avatar name="Away User" size="lg" status="away" />
        <p className="text-white/60 text-xs mt-2">Away</p>
      </div>
      <div className="text-center">
        <Avatar name="Busy User" size="lg" status="busy" />
        <p className="text-white/60 text-xs mt-2">Busy</p>
      </div>
    </div>
  ),
};

// Rounded Variants
export const RoundedVariants: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <Avatar name="Full Rounded" size="xl" rounded="full" />
        <p className="text-white/60 text-xs mt-2">Full</p>
      </div>
      <div className="text-center">
        <Avatar name="Large Rounded" size="xl" rounded="lg" />
        <p className="text-white/60 text-xs mt-2">Large</p>
      </div>
      <div className="text-center">
        <Avatar name="Medium Rounded" size="xl" rounded="md" />
        <p className="text-white/60 text-xs mt-2">Medium</p>
      </div>
    </div>
  ),
};

// Avatar Group
export const Group: Story = {
  render: () => (
    <AvatarGroup size="md">
      <Avatar name="Alice Smith" />
      <Avatar name="Bob Johnson" />
      <Avatar name="Carol Williams" />
      <Avatar name="David Brown" />
      <Avatar name="Eva Davis" />
    </AvatarGroup>
  ),
};

// Avatar Group with Max
export const GroupWithMax: Story = {
  render: () => (
    <AvatarGroup size="md" max={3}>
      <Avatar name="Alice Smith" />
      <Avatar name="Bob Johnson" />
      <Avatar name="Carol Williams" />
      <Avatar name="David Brown" />
      <Avatar name="Eva Davis" />
      <Avatar name="Frank Miller" />
      <Avatar name="Grace Lee" />
    </AvatarGroup>
  ),
};

// Avatar Group Sizes
export const GroupSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-white/60 text-sm mb-2">Small</p>
        <AvatarGroup size="sm">
          <Avatar name="Alice Smith" />
          <Avatar name="Bob Johnson" />
          <Avatar name="Carol Williams" />
        </AvatarGroup>
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Medium</p>
        <AvatarGroup size="md">
          <Avatar name="Alice Smith" />
          <Avatar name="Bob Johnson" />
          <Avatar name="Carol Williams" />
        </AvatarGroup>
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Large</p>
        <AvatarGroup size="lg">
          <Avatar name="Alice Smith" />
          <Avatar name="Bob Johnson" />
          <Avatar name="Carol Williams" />
        </AvatarGroup>
      </div>
    </div>
  ),
};

// Fallback (no name)
export const Fallback: Story = {
  args: {
    size: 'lg',
  },
};

// User Card Example
export const UserCardExample: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl w-[300px]">
      <Avatar name="Sarah Connor" size="lg" status="online" />
      <div>
        <p className="text-white font-medium">Sarah Connor</p>
        <p className="text-white/60 text-sm">sarah@festival.com</p>
      </div>
    </div>
  ),
};

// Team List Example
export const TeamListExample: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-[350px]">
      {[
        { name: 'Alex Turner', role: 'Tech Lead', status: 'online' as const },
        { name: 'Maya Patel', role: 'Frontend Dev', status: 'away' as const },
        { name: 'Chris Johnson', role: 'Backend Dev', status: 'busy' as const },
        { name: 'Sam Wilson', role: 'Designer', status: 'offline' as const },
      ].map((member, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
          <Avatar name={member.name} size="md" status={member.status} />
          <div className="flex-1">
            <p className="text-white font-medium">{member.name}</p>
            <p className="text-white/60 text-sm">{member.role}</p>
          </div>
        </div>
      ))}
    </div>
  ),
};
