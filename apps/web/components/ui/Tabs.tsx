'use client';

import React, { createContext, useContext, useState } from 'react';

/**
 * Tab size options
 */
export type TabSize = 'sm' | 'md' | 'lg';

/**
 * Tab variant styles
 */
export type TabVariant = 'default' | 'pills' | 'underline';

// Tabs Context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  variant: TabVariant;
  size: TabSize;
}

const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * Props for the Tabs container
 */
export interface TabsProps {
  /** The currently active tab value */
  value?: string;
  /** Default active tab (uncontrolled) */
  defaultValue?: string;
  /** Callback when tab changes */
  onChange?: (value: string) => void;
  /** Visual style variant */
  variant?: TabVariant;
  /** Size of the tabs */
  size?: TabSize;
  /** Children (TabList and TabPanels) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Container component for tabs
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="tab1">
 *   <TabList>
 *     <Tab value="tab1">Tab 1</Tab>
 *     <Tab value="tab2">Tab 2</Tab>
 *   </TabList>
 *   <TabPanel value="tab1">Content 1</TabPanel>
 *   <TabPanel value="tab2">Content 2</TabPanel>
 * </Tabs>
 * ```
 */
export function Tabs({
  value,
  defaultValue = '',
  onChange,
  variant = 'default',
  size = 'md',
  children,
  className = '',
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalValue;

  const setActiveTab = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant, size }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/**
 * Props for TabList
 */
export interface TabListProps {
  /** Tab components */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantListStyles: Record<TabVariant, string> = {
  default: 'bg-white/5 p-1 rounded-xl',
  pills: 'gap-2',
  underline: 'border-b border-white/10 gap-0',
};

/**
 * Container for Tab triggers
 */
export function TabList({ children, className = '' }: TabListProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabList must be used within Tabs');

  return (
    <div
      role="tablist"
      className={`
        flex items-center
        ${variantListStyles[context.variant]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Props for individual Tab
 */
export interface TabProps {
  /** Unique value identifying this tab */
  value: string;
  /** Tab label content */
  children: React.ReactNode;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Icon to display before label */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<TabSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

const variantTabStyles: Record<TabVariant, { base: string; active: string; inactive: string }> = {
  default: {
    base: 'rounded-lg transition-all duration-200',
    active: 'bg-primary-500 text-white shadow-lg shadow-primary-500/20',
    inactive: 'text-white/60 hover:text-white hover:bg-white/5',
  },
  pills: {
    base: 'rounded-full transition-all duration-200',
    active: 'bg-primary-500 text-white shadow-lg shadow-primary-500/20',
    inactive: 'text-white/60 hover:text-white hover:bg-white/10',
  },
  underline: {
    base: 'relative border-b-2 -mb-px transition-colors duration-200',
    active: 'border-primary-500 text-white',
    inactive: 'border-transparent text-white/60 hover:text-white hover:border-white/30',
  },
};

/**
 * Individual tab trigger component
 */
export function Tab({ value, children, disabled = false, icon, className = '' }: TabProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const isActive = context.activeTab === value;
  const styles = variantTabStyles[context.variant];

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      onClick={() => !disabled && context.setActiveTab(value)}
      className={`
        flex items-center gap-2
        font-medium
        ${sizeStyles[context.size]}
        ${styles.base}
        ${isActive ? styles.active : styles.inactive}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

/**
 * Props for TabPanel
 */
export interface TabPanelProps {
  /** Value that corresponds to a Tab */
  value: string;
  /** Panel content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Content panel for a tab
 */
export function TabPanel({ value, children, className = '' }: TabPanelProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  if (context.activeTab !== value) return null;

  return (
    <div role="tabpanel" tabIndex={0} className={`mt-4 ${className}`}>
      {children}
    </div>
  );
}

Tabs.displayName = 'Tabs';
TabList.displayName = 'TabList';
Tab.displayName = 'Tab';
TabPanel.displayName = 'TabPanel';
