import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Switch } from '../apps/web/components/ui/Switch';

/**
 * Switch toggle component for binary on/off states.
 * Supports multiple sizes, colors, and label positions.
 */
const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text displayed next to the switch',
    },
    description: {
      control: 'text',
      description: 'Description text displayed below the label',
    },
    switchSize: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the switch',
      table: {
        type: { summary: 'SwitchSize' },
        defaultValue: { summary: 'md' },
      },
    },
    color: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'error'],
      description: 'Color when active',
      table: {
        type: { summary: 'SwitchColor' },
        defaultValue: { summary: 'primary' },
      },
    },
    labelPosition: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Position of the label relative to the switch',
      table: {
        defaultValue: { summary: 'right' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the switch is disabled',
    },
    checked: {
      control: 'boolean',
      description: 'Whether the switch is checked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

/**
 * Default switch without label
 */
const DefaultDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Switch
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const Default: Story = {
  render: () => <DefaultDemo />,
};

/**
 * Switch with label
 */
const WithLabelDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Switch
      label="Enable notifications"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const WithLabel: Story = {
  render: () => <WithLabelDemo />,
};

/**
 * Switch with label and description
 */
const WithDescriptionDemo = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Switch
      label="Email notifications"
      description="Receive email updates about your orders and events"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const WithDescription: Story = {
  render: () => <WithDescriptionDemo />,
};

/**
 * Small size switch
 */
const SmallSizeDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Switch
      switchSize="sm"
      label="Small switch"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const SmallSize: Story = {
  render: () => <SmallSizeDemo />,
};

/**
 * Large size switch
 */
const LargeSizeDemo = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Switch
      switchSize="lg"
      label="Large switch"
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
    <div className="space-y-6">
      <Switch switchSize="sm" label="Small" defaultChecked />
      <Switch switchSize="md" label="Medium" defaultChecked />
      <Switch switchSize="lg" label="Large" defaultChecked />
    </div>
  ),
};

/**
 * Primary color (default)
 */
const PrimaryColorDemo = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Switch
      color="primary"
      label="Primary"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const PrimaryColor: Story = {
  render: () => <PrimaryColorDemo />,
};

/**
 * Success color
 */
const SuccessColorDemo = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Switch
      color="success"
      label="Success"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const SuccessColor: Story = {
  render: () => <SuccessColorDemo />,
};

/**
 * Warning color
 */
const WarningColorDemo = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Switch
      color="warning"
      label="Warning"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const WarningColor: Story = {
  render: () => <WarningColorDemo />,
};

/**
 * Error color
 */
const ErrorColorDemo = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Switch
      color="error"
      label="Error"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const ErrorColor: Story = {
  render: () => <ErrorColorDemo />,
};

/**
 * All colors compared
 */
export const AllColors: Story = {
  render: () => (
    <div className="space-y-4">
      <Switch color="primary" label="Primary" defaultChecked />
      <Switch color="success" label="Success" defaultChecked />
      <Switch color="warning" label="Warning" defaultChecked />
      <Switch color="error" label="Error" defaultChecked />
    </div>
  ),
};

/**
 * Label on left
 */
const LabelLeftDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Switch
      label="Label on left"
      labelPosition="left"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const LabelLeft: Story = {
  render: () => <LabelLeftDemo />,
};

/**
 * Disabled states
 */
export const Disabled: Story = {
  render: () => (
    <div className="space-y-4">
      <Switch label="Disabled (off)" disabled />
      <Switch label="Disabled (on)" disabled defaultChecked />
    </div>
  ),
};

/**
 * Controlled switch example
 */
const ControlledDemo = () => {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="space-y-4">
      <Switch
        label="Controlled switch"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
      />
      <p className="text-white/60 text-sm">
        State: <span className="text-white">{enabled ? 'On' : 'Off'}</span>
      </p>
      <button
        onClick={() => setEnabled(!enabled)}
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
 * Settings list example
 */
const SettingsListDemo = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    autoPlay: true,
    location: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-80 p-4 bg-white/5 rounded-xl border border-white/10 space-y-1">
      <div className="py-3 border-b border-white/10">
        <Switch
          label="Push Notifications"
          description="Receive push notifications on your device"
          checked={settings.notifications}
          onChange={() => toggle('notifications')}
        />
      </div>
      <div className="py-3 border-b border-white/10">
        <Switch
          label="Dark Mode"
          description="Use dark theme across the app"
          checked={settings.darkMode}
          onChange={() => toggle('darkMode')}
        />
      </div>
      <div className="py-3 border-b border-white/10">
        <Switch
          label="Auto-play Videos"
          description="Automatically play videos in the feed"
          checked={settings.autoPlay}
          onChange={() => toggle('autoPlay')}
        />
      </div>
      <div className="py-3">
        <Switch
          label="Location Services"
          description="Allow app to access your location"
          checked={settings.location}
          onChange={() => toggle('location')}
        />
      </div>
    </div>
  );
};

export const SettingsList: Story = {
  render: () => <SettingsListDemo />,
};

/**
 * Festival-specific: Notification preferences
 */
const FestivalNotificationsDemo = () => {
  const [prefs, setPrefs] = useState({
    eventReminders: true,
    artistUpdates: true,
    promotions: false,
    socialActivity: true,
    emergencyAlerts: true,
  });

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-96 p-6 bg-white/5 rounded-2xl border border-white/10">
      <h3 className="text-white font-semibold text-lg mb-4">Notification Settings</h3>
      <div className="space-y-4">
        <Switch
          label="Event Reminders"
          description="Get notified before events start"
          color="primary"
          checked={prefs.eventReminders}
          onChange={() => toggle('eventReminders')}
        />
        <Switch
          label="Artist Updates"
          description="News from your favorite artists"
          color="primary"
          checked={prefs.artistUpdates}
          onChange={() => toggle('artistUpdates')}
        />
        <Switch
          label="Promotions & Offers"
          description="Special deals and discount codes"
          color="primary"
          checked={prefs.promotions}
          onChange={() => toggle('promotions')}
        />
        <Switch
          label="Social Activity"
          description="When friends buy tickets or check in"
          color="primary"
          checked={prefs.socialActivity}
          onChange={() => toggle('socialActivity')}
        />
        <div className="pt-4 border-t border-white/10">
          <Switch
            label="Emergency Alerts"
            description="Critical safety and weather updates"
            color="error"
            checked={prefs.emergencyAlerts}
            onChange={() => toggle('emergencyAlerts')}
            disabled
          />
          <p className="text-white/40 text-xs mt-2 ml-14">
            Emergency alerts cannot be disabled for your safety
          </p>
        </div>
      </div>
    </div>
  );
};

export const FestivalNotifications: Story = {
  render: () => <FestivalNotificationsDemo />,
};

/**
 * Festival-specific: Quick toggles
 */
export const FestivalQuickToggles: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="flex flex-col items-center gap-2">
        <Switch switchSize="lg" color="success" defaultChecked />
        <span className="text-white text-sm">Online</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Switch switchSize="lg" color="primary" />
        <span className="text-white text-sm">Available</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Switch switchSize="lg" color="warning" defaultChecked />
        <span className="text-white text-sm">Alerts</span>
      </div>
    </div>
  ),
};

/**
 * Form integration example
 */
export const FormIntegration: Story = {
  render: () => (
    <form className="w-80 space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <h3 className="text-white font-semibold">Account Settings</h3>

      <div className="space-y-3">
        <div>
          <label className="text-white/60 text-sm">Display Name</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            placeholder="Your name"
          />
        </div>

        <Switch
          name="publicProfile"
          label="Public Profile"
          description="Allow others to see your profile"
          defaultChecked
        />

        <Switch
          name="twoFactor"
          label="Two-Factor Authentication"
          description="Add an extra layer of security"
        />
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-primary-500 text-white rounded-lg font-semibold"
      >
        Save Changes
      </button>
    </form>
  ),
};
