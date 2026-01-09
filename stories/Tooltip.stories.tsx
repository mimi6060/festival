import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from '../apps/web/components/ui/Tooltip';
import { Button } from '../apps/web/components/ui/Button';

/**
 * Tooltip component for displaying additional information on hover.
 * Supports different placements, sizes, and can show an arrow indicator.
 */
const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: 'text',
      description: 'The content to display in the tooltip',
    },
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: 'Placement of the tooltip relative to the trigger',
      table: {
        type: { summary: 'TooltipPlacement' },
        defaultValue: { summary: 'top' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the tooltip',
      table: {
        type: { summary: 'TooltipSize' },
        defaultValue: { summary: 'md' },
      },
    },
    delay: {
      control: 'number',
      description: 'Delay in milliseconds before showing the tooltip',
      table: {
        defaultValue: { summary: '200' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the tooltip is disabled',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    showArrow: {
      control: 'boolean',
      description: 'Whether to show an arrow pointing to the trigger',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

/**
 * Default tooltip appearing above the trigger
 */
export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    children: <Button>Hover me</Button>,
  },
};

/**
 * Tooltip positioned at the top (default)
 */
export const Top: Story = {
  args: {
    content: 'Tooltip on top',
    placement: 'top',
    children: <Button variant="secondary">Top</Button>,
  },
};

/**
 * Tooltip positioned at the bottom
 */
export const Bottom: Story = {
  args: {
    content: 'Tooltip on bottom',
    placement: 'bottom',
    children: <Button variant="secondary">Bottom</Button>,
  },
};

/**
 * Tooltip positioned on the left
 */
export const Left: Story = {
  args: {
    content: 'Tooltip on left',
    placement: 'left',
    children: <Button variant="secondary">Left</Button>,
  },
};

/**
 * Tooltip positioned on the right
 */
export const Right: Story = {
  args: {
    content: 'Tooltip on right',
    placement: 'right',
    children: <Button variant="secondary">Right</Button>,
  },
};

/**
 * All placements displayed together
 */
export const AllPlacements: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-8 p-8">
      <Tooltip content="Top tooltip" placement="top">
        <Button variant="secondary">Top</Button>
      </Tooltip>
      <div className="flex gap-32">
        <Tooltip content="Left tooltip" placement="left">
          <Button variant="secondary">Left</Button>
        </Tooltip>
        <Tooltip content="Right tooltip" placement="right">
          <Button variant="secondary">Right</Button>
        </Tooltip>
      </div>
      <Tooltip content="Bottom tooltip" placement="bottom">
        <Button variant="secondary">Bottom</Button>
      </Tooltip>
    </div>
  ),
};

/**
 * Small size tooltip
 */
export const SmallSize: Story = {
  args: {
    content: 'Small tooltip',
    size: 'sm',
    children: <Button size="sm">Hover for small tooltip</Button>,
  },
};

/**
 * Large size tooltip
 */
export const LargeSize: Story = {
  args: {
    content: 'Large tooltip',
    size: 'lg',
    children: <Button size="lg">Hover for large tooltip</Button>,
  },
};

/**
 * All sizes compared
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip content="Small" size="sm">
        <Button variant="secondary" size="sm">Small</Button>
      </Tooltip>
      <Tooltip content="Medium" size="md">
        <Button variant="secondary" size="md">Medium</Button>
      </Tooltip>
      <Tooltip content="Large" size="lg">
        <Button variant="secondary" size="lg">Large</Button>
      </Tooltip>
    </div>
  ),
};

/**
 * Tooltip without arrow
 */
export const WithoutArrow: Story = {
  args: {
    content: 'No arrow on this tooltip',
    showArrow: false,
    children: <Button variant="secondary">No Arrow</Button>,
  },
};

/**
 * Tooltip with longer content
 */
export const LongContent: Story = {
  args: {
    content: 'This is a tooltip with longer content that explains more details about the element.',
    children: <Button variant="secondary">Hover for details</Button>,
  },
};

/**
 * Tooltip with custom delay
 */
export const CustomDelay: Story = {
  args: {
    content: 'This tooltip appears after 500ms',
    delay: 500,
    children: <Button variant="secondary">Delayed tooltip (500ms)</Button>,
  },
};

/**
 * Tooltip with no delay
 */
export const NoDelay: Story = {
  args: {
    content: 'This tooltip appears instantly',
    delay: 0,
    children: <Button variant="secondary">Instant tooltip</Button>,
  },
};

/**
 * Disabled tooltip
 */
export const Disabled: Story = {
  args: {
    content: 'You will not see this',
    disabled: true,
    children: <Button variant="secondary">Disabled tooltip</Button>,
  },
};

/**
 * Tooltip on icon button
 */
export const OnIconButton: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip content="Edit">
        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Delete">
        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Share">
        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </Tooltip>
    </div>
  ),
};

/**
 * Tooltip with rich content (JSX)
 */
export const RichContent: Story = {
  render: () => (
    <Tooltip
      content={
        <div className="text-center">
          <p className="font-semibold">Premium Feature</p>
          <p className="text-white/60 text-xs mt-1">Upgrade to access</p>
        </div>
      }
    >
      <Button variant="secondary">
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Locked Feature
      </Button>
    </Tooltip>
  ),
};

/**
 * Tooltip on text element
 */
export const OnTextElement: Story = {
  render: () => (
    <p className="text-white">
      Hover over the{' '}
      <Tooltip content="Terms and conditions apply">
        <span className="text-primary-400 underline cursor-help">terms</span>
      </Tooltip>{' '}
      to see more information.
    </p>
  ),
};

/**
 * Festival-specific: Zone capacity tooltip
 */
export const FestivalZoneTooltip: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip
        content={
          <div>
            <p className="font-semibold">Main Stage</p>
            <p className="text-white/60 text-xs">Capacity: 5,000</p>
            <p className="text-green-400 text-xs">Currently: 3,200 (64%)</p>
          </div>
        }
        placement="bottom"
      >
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl cursor-help">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-white font-medium">Main Stage</span>
          </div>
        </div>
      </Tooltip>
      <Tooltip
        content={
          <div>
            <p className="font-semibold">VIP Lounge</p>
            <p className="text-white/60 text-xs">Capacity: 500</p>
            <p className="text-orange-400 text-xs">Currently: 425 (85%)</p>
          </div>
        }
        placement="bottom"
      >
        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl cursor-help">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-white font-medium">VIP Lounge</span>
          </div>
        </div>
      </Tooltip>
      <Tooltip
        content={
          <div>
            <p className="font-semibold">Food Court</p>
            <p className="text-white/60 text-xs">Capacity: 2,000</p>
            <p className="text-red-400 text-xs">Currently: 1,950 (98%)</p>
          </div>
        }
        placement="bottom"
      >
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl cursor-help">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-white font-medium">Food Court</span>
          </div>
        </div>
      </Tooltip>
    </div>
  ),
};

/**
 * Keyboard shortcut tooltip pattern
 */
export const KeyboardShortcuts: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip
        content={
          <div className="flex items-center gap-2">
            <span>Save</span>
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">Ctrl+S</kbd>
          </div>
        }
      >
        <Button variant="secondary" size="sm">Save</Button>
      </Tooltip>
      <Tooltip
        content={
          <div className="flex items-center gap-2">
            <span>Undo</span>
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">Ctrl+Z</kbd>
          </div>
        }
      >
        <Button variant="secondary" size="sm">Undo</Button>
      </Tooltip>
      <Tooltip
        content={
          <div className="flex items-center gap-2">
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">Ctrl+K</kbd>
          </div>
        }
      >
        <Button variant="secondary" size="sm">Search</Button>
      </Tooltip>
    </div>
  ),
};
