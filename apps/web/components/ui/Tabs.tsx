'use client';

import React, { createContext, useContext, useState, useId, useRef, useCallback } from 'react';

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
  tabListId: string;
  registerTab: (value: string) => void;
  tabs: string[];
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
  /** ID for the tabs component (used for ARIA relationships) */
  id?: string;
}

/**
 * Container component for tabs
 *
 * WCAG 2.1 AA Compliance:
 * - 2.1.1 Keyboard: Full keyboard navigation (arrows, home, end)
 * - 2.4.7 Focus Visible: Clear focus indicators
 * - 4.1.2 Name, Role, Value: Proper ARIA roles (tablist, tab, tabpanel)
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="tab1">
 *   <TabList aria-label="Account settings">
 *     <Tab value="tab1">Profile</Tab>
 *     <Tab value="tab2">Security</Tab>
 *   </TabList>
 *   <TabPanel value="tab1">Profile content</TabPanel>
 *   <TabPanel value="tab2">Security content</TabPanel>
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
  id,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [tabs, setTabs] = useState<string[]>([]);
  const generatedId = useId();
  const tabListId = id || generatedId;
  const activeTab = value !== undefined ? value : internalValue;

  const setActiveTab = useCallback((newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  }, [value, onChange]);

  const registerTab = useCallback((tabValue: string) => {
    setTabs(prev => {
      if (prev.includes(tabValue)) {return prev;}
      return [...prev, tabValue];
    });
  }, []);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant, size, tabListId, registerTab, tabs }}>
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
  /** Accessible label for the tab list */
  'aria-label'?: string;
  /** ID of element that labels the tab list */
  'aria-labelledby'?: string;
}

const variantListStyles: Record<TabVariant, string> = {
  default: 'bg-white/5 p-1 rounded-xl',
  pills: 'gap-2',
  underline: 'border-b border-white/10 gap-0',
};

/**
 * Container for Tab triggers
 *
 * The TabList should have either an aria-label or aria-labelledby
 * to provide an accessible name for the tab list.
 */
export function TabList({
  children,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: TabListProps) {
  const context = useContext(TabsContext);
  if (!context) {throw new Error('TabList must be used within Tabs');}

  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { tabs, activeTab, setActiveTab } = context;
    const currentIndex = tabs.indexOf(activeTab);

    let newIndex: number | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
    }

    if (newIndex !== null && tabs[newIndex]) {
      setActiveTab(tabs[newIndex]);
      // Focus the new tab
      const tabButton = tabListRef.current?.querySelector(
        `[data-tab-value="${tabs[newIndex]}"]`
      ) as HTMLButtonElement;
      tabButton?.focus();
    }
  }, [context]);

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onKeyDown={handleKeyDown}
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
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
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
  if (!context) {throw new Error('Tab must be used within Tabs');}

  const { activeTab, setActiveTab, variant, size, tabListId, registerTab } = context;
  const isActive = activeTab === value;
  const styles = variantTabStyles[variant];
  const tabId = `${tabListId}-tab-${value}`;
  const panelId = `${tabListId}-panel-${value}`;

  // Register this tab
  React.useEffect(() => {
    registerTab(value);
  }, [value, registerTab]);

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      aria-disabled={disabled || undefined}
      tabIndex={isActive ? 0 : -1}
      data-tab-value={value}
      onClick={() => !disabled && setActiveTab(value)}
      className={`
        flex items-center gap-2
        font-medium
        ${sizeStyles[size]}
        ${styles.base}
        ${isActive ? styles.active : styles.inactive}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
        focus-visible:ring-offset-2 focus-visible:ring-offset-festival-dark
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
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
  /** Whether to always render content (but hide when inactive) */
  forceMount?: boolean;
}

/**
 * Content panel for a tab
 *
 * The TabPanel is automatically hidden when its corresponding Tab
 * is not active. Use forceMount to always render the content (hidden).
 */
export function TabPanel({
  value,
  children,
  className = '',
  forceMount = false,
}: TabPanelProps) {
  const context = useContext(TabsContext);
  if (!context) {throw new Error('TabPanel must be used within Tabs');}

  const { activeTab, tabListId } = context;
  const isActive = activeTab === value;
  const tabId = `${tabListId}-tab-${value}`;
  const panelId = `${tabListId}-panel-${value}`;

  // If not active and not force mounted, don't render
  if (!isActive && !forceMount) {return null;}

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      tabIndex={0}
      hidden={!isActive}
      className={`
        mt-4
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded-lg
        ${!isActive ? 'sr-only' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

Tabs.displayName = 'Tabs';
TabList.displayName = 'TabList';
Tab.displayName = 'Tab';
TabPanel.displayName = 'TabPanel';
