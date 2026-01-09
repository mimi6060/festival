import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect } from 'react';
import { Progress, CircularProgress } from '../apps/web/components/ui/Progress';

/**
 * Progress bar component for displaying completion status.
 * Supports linear and circular variants with multiple color options.
 */
const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Current progress value (0-100)',
    },
    max: {
      control: 'number',
      description: 'Maximum value',
      table: {
        defaultValue: { summary: '100' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'error', 'gradient'],
      description: 'Visual style variant',
      table: {
        type: { summary: 'ProgressVariant' },
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the progress bar',
      table: {
        type: { summary: 'ProgressSize' },
        defaultValue: { summary: 'md' },
      },
    },
    showLabel: {
      control: 'boolean',
      description: 'Whether to show the percentage label',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    label: {
      control: 'text',
      description: 'Custom label text',
    },
    animated: {
      control: 'boolean',
      description: 'Whether to show animation',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    striped: {
      control: 'boolean',
      description: 'Whether to show striped pattern',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Progress>;

/**
 * Default progress bar at 50%
 */
export const Default: Story = {
  args: {
    value: 50,
    variant: 'primary',
  },
};

/**
 * Progress bar with percentage label
 */
export const WithLabel: Story = {
  args: {
    value: 75,
    showLabel: true,
    label: 'Upload Progress',
  },
};

/**
 * Primary variant (default)
 */
export const Primary: Story = {
  args: {
    value: 65,
    variant: 'primary',
    showLabel: true,
  },
};

/**
 * Success variant for completed or positive states
 */
export const Success: Story = {
  args: {
    value: 100,
    variant: 'success',
    showLabel: true,
    label: 'Complete',
  },
};

/**
 * Warning variant for cautionary states
 */
export const Warning: Story = {
  args: {
    value: 80,
    variant: 'warning',
    showLabel: true,
    label: 'Storage Used',
  },
};

/**
 * Error variant for critical states
 */
export const Error: Story = {
  args: {
    value: 95,
    variant: 'error',
    showLabel: true,
    label: 'Disk Full',
  },
};

/**
 * Gradient variant for a vibrant look
 */
export const Gradient: Story = {
  args: {
    value: 70,
    variant: 'gradient',
    showLabel: true,
  },
};

/**
 * All variants displayed together
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Progress value={60} variant="default" label="Default" showLabel />
      <Progress value={60} variant="primary" label="Primary" showLabel />
      <Progress value={60} variant="success" label="Success" showLabel />
      <Progress value={60} variant="warning" label="Warning" showLabel />
      <Progress value={60} variant="error" label="Error" showLabel />
      <Progress value={60} variant="gradient" label="Gradient" showLabel />
    </div>
  ),
};

/**
 * Small size progress bar
 */
export const SmallSize: Story = {
  args: {
    value: 45,
    size: 'sm',
  },
};

/**
 * Large size progress bar
 */
export const LargeSize: Story = {
  args: {
    value: 45,
    size: 'lg',
    showLabel: true,
  },
};

/**
 * All sizes compared
 */
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-white/60 text-sm mb-2">Small</p>
        <Progress value={60} size="sm" />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Medium</p>
        <Progress value={60} size="md" />
      </div>
      <div>
        <p className="text-white/60 text-sm mb-2">Large</p>
        <Progress value={60} size="lg" />
      </div>
    </div>
  ),
};

/**
 * Animated progress bar (simulated loading)
 */
const AnimatedDemo = () => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setValue((v) => (v >= 100 ? 0 : v + 5));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return <Progress value={value} showLabel label="Loading..." />;
};

export const Animated: Story = {
  render: () => <AnimatedDemo />,
};

/**
 * Circular progress indicator
 */
export const Circular: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <CircularProgress value={25} showValue />
      <CircularProgress value={50} showValue />
      <CircularProgress value={75} showValue />
      <CircularProgress value={100} showValue />
    </div>
  ),
};

/**
 * Circular progress with different sizes
 */
export const CircularSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <CircularProgress value={65} size={48} strokeWidth={4} showValue />
      <CircularProgress value={65} size={80} strokeWidth={6} showValue />
      <CircularProgress value={65} size={120} strokeWidth={8} showValue />
    </div>
  ),
};

/**
 * Circular progress with different variants
 */
export const CircularVariants: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <CircularProgress value={65} variant="primary" showValue />
      <CircularProgress value={65} variant="success" showValue />
      <CircularProgress value={65} variant="warning" showValue />
      <CircularProgress value={65} variant="error" showValue />
    </div>
  ),
};

/**
 * Circular progress with custom label
 */
export const CircularWithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <CircularProgress value={85} size={100} label="A+" />
      <CircularProgress value={72} size={100} label="B-" />
      <CircularProgress value={45} size={100} label="F" variant="error" />
    </div>
  ),
};

/**
 * Multi-step progress example
 */
export const MultiStep: Story = {
  render: () => {
    const steps = ['Account', 'Profile', 'Payment', 'Confirm'];
    const currentStep = 2;

    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div key={step} className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${index < currentStep ? 'bg-primary-500 text-white' : index === currentStep ? 'bg-primary-500/30 text-primary-400 border-2 border-primary-500' : 'bg-white/10 text-white/50'}
                `}
              >
                {index < currentStep ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`text-xs mt-2 ${index <= currentStep ? 'text-white' : 'text-white/50'}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
        <Progress value={(currentStep / (steps.length - 1)) * 100} />
      </div>
    );
  },
};

/**
 * Festival-specific: Ticket sales progress
 */
export const FestivalTicketSales: Story = {
  render: () => (
    <div className="space-y-6 p-4 bg-white/5 rounded-xl border border-white/10">
      <h3 className="text-white font-semibold">Ticket Sales</h3>
      <div className="space-y-4">
        <div>
          <Progress
            value={95}
            variant="error"
            showLabel
            label="VIP Passes (475/500)"
          />
        </div>
        <div>
          <Progress
            value={78}
            variant="warning"
            showLabel
            label="General Admission (7,800/10,000)"
          />
        </div>
        <div>
          <Progress
            value={45}
            variant="success"
            showLabel
            label="Early Bird (450/1,000)"
          />
        </div>
      </div>
      <div className="pt-4 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Total Revenue</span>
          <span className="text-white font-semibold">$245,000</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-white/60">Target</span>
          <span className="text-white/50">$350,000</span>
        </div>
        <Progress value={70} variant="gradient" size="sm" className="mt-2" />
      </div>
    </div>
  ),
};

/**
 * Festival-specific: Zone capacity meters
 */
export const FestivalZoneCapacity: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center">
        <CircularProgress value={64} size={80} variant="success" showValue />
        <p className="text-white font-medium mt-3">Main Stage</p>
        <p className="text-white/50 text-sm">3,200 / 5,000</p>
      </div>
      <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center">
        <CircularProgress value={85} size={80} variant="warning" showValue />
        <p className="text-white font-medium mt-3">VIP Lounge</p>
        <p className="text-white/50 text-sm">425 / 500</p>
      </div>
      <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center">
        <CircularProgress value={98} size={80} variant="error" showValue />
        <p className="text-white font-medium mt-3">Food Court</p>
        <p className="text-white/50 text-sm">1,960 / 2,000</p>
      </div>
      <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center">
        <CircularProgress value={35} size={80} variant="primary" showValue />
        <p className="text-white font-medium mt-3">Camping Area</p>
        <p className="text-white/50 text-sm">700 / 2,000</p>
      </div>
    </div>
  ),
};

/**
 * Download/Upload progress example
 */
const DownloadProgressDemo = () => {
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const startDownload = () => {
    setDownloading(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setDownloading(false);
          return 100;
        }
        return p + Math.random() * 15;
      });
    }, 300);
  };

  return (
    <div className="space-y-4">
      <Progress
        value={Math.min(progress, 100)}
        showLabel
        label={downloading ? 'Downloading...' : progress >= 100 ? 'Complete!' : 'Ready'}
        variant={progress >= 100 ? 'success' : 'primary'}
      />
      <button
        onClick={startDownload}
        disabled={downloading}
        className="px-4 py-2 bg-primary-500 text-white rounded-lg disabled:opacity-50"
      >
        {downloading ? 'Downloading...' : 'Start Download'}
      </button>
    </div>
  );
};

export const DownloadProgress: Story = {
  render: () => <DownloadProgressDemo />,
};
