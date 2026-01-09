import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'glow', 'solid', 'gradient'],
      description: 'Visual style of the card',
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Padding inside the card',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

// Basic variants
export const Default: Story = {
  args: {
    variant: 'default',
    children: (
      <div>
        <h3 className="text-white text-lg font-bold">Default Card</h3>
        <p className="text-white/60 mt-2">This is a default card with subtle border.</p>
      </div>
    ),
  },
};

export const Glow: Story = {
  args: {
    variant: 'glow',
    children: (
      <div>
        <h3 className="text-white text-lg font-bold">Glow Card</h3>
        <p className="text-white/60 mt-2">This card has a glow effect on hover.</p>
      </div>
    ),
  },
};

export const Solid: Story = {
  args: {
    variant: 'solid',
    children: (
      <div>
        <h3 className="text-white text-lg font-bold">Solid Card</h3>
        <p className="text-white/60 mt-2">This card has a solid dark background.</p>
      </div>
    ),
  },
};

export const Gradient: Story = {
  args: {
    variant: 'gradient',
    children: (
      <div>
        <h3 className="text-white text-lg font-bold">Gradient Card</h3>
        <p className="text-white/60 mt-2">This card has a gradient background.</p>
      </div>
    ),
  },
};

// With subcomponents
export const WithSubcomponents: Story = {
  render: () => (
    <Card variant="default" className="w-[350px]">
      <CardHeader>
        <CardTitle>Festival Pass</CardTitle>
        <CardDescription>Access to all stages and areas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Price</span>
          <span className="text-2xl font-bold text-white">149</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button fullWidth>Buy Now</Button>
      </CardFooter>
    </Card>
  ),
};

// Festival Card Example
export const FestivalCard: Story = {
  render: () => (
    <Card variant="glow" className="w-[350px]">
      <div className="aspect-video bg-gradient-to-br from-primary-500/30 to-pink-500/30 rounded-xl mb-4" />
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="primary">Electronic</Badge>
          <Badge variant="secondary">Summer</Badge>
        </div>
        <CardTitle>Electronica Festival 2026</CardTitle>
        <CardDescription>July 15-17, 2026 - Paris, France</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Starting from</span>
          <span className="text-xl font-bold text-primary-400">89</span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="secondary" className="flex-1">
          Details
        </Button>
        <Button variant="primary" className="flex-1">
          Get Tickets
        </Button>
      </CardFooter>
    </Card>
  ),
};

// Clickable Card
export const ClickableCard: Story = {
  args: {
    variant: 'default',
    href: '#',
    className: 'w-[300px]',
    children: (
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-primary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h3 className="text-white font-bold">Quick Access</h3>
        <p className="text-white/60 text-sm mt-1">Click to navigate</p>
      </div>
    ),
  },
};

// All Variants Grid
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <Card variant="default">
        <h3 className="text-white font-bold">Default</h3>
        <p className="text-white/60 text-sm">Subtle border</p>
      </Card>
      <Card variant="glow">
        <h3 className="text-white font-bold">Glow</h3>
        <p className="text-white/60 text-sm">Hover effect</p>
      </Card>
      <Card variant="solid">
        <h3 className="text-white font-bold">Solid</h3>
        <p className="text-white/60 text-sm">Dark background</p>
      </Card>
      <Card variant="gradient">
        <h3 className="text-white font-bold">Gradient</h3>
        <p className="text-white/60 text-sm">Gradient bg</p>
      </Card>
    </div>
  ),
};
