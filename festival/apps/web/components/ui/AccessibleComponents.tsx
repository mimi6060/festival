'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  forwardRef,
} from 'react';

// ============================================
// Focus Trap Hook
// ============================================

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element
    firstElement?.focus();

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

// ============================================
// Keyboard Navigation Hook
// ============================================

interface UseKeyboardNavigationOptions {
  items: HTMLElement[] | null;
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  onSelect?: (index: number) => void;
}

export function useKeyboardNavigation({
  items,
  orientation = 'vertical',
  loop = true,
  onSelect,
}: UseKeyboardNavigationOptions) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!items || items.length === 0) return;

      let newIndex = activeIndex;
      const lastIndex = items.length - 1;

      switch (e.key) {
        case 'ArrowUp':
          if (orientation !== 'horizontal') {
            e.preventDefault();
            newIndex = activeIndex > 0 ? activeIndex - 1 : loop ? lastIndex : 0;
          }
          break;
        case 'ArrowDown':
          if (orientation !== 'horizontal') {
            e.preventDefault();
            newIndex = activeIndex < lastIndex ? activeIndex + 1 : loop ? 0 : lastIndex;
          }
          break;
        case 'ArrowLeft':
          if (orientation !== 'vertical') {
            e.preventDefault();
            newIndex = activeIndex > 0 ? activeIndex - 1 : loop ? lastIndex : 0;
          }
          break;
        case 'ArrowRight':
          if (orientation !== 'vertical') {
            e.preventDefault();
            newIndex = activeIndex < lastIndex ? activeIndex + 1 : loop ? 0 : lastIndex;
          }
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = lastIndex;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(activeIndex);
          return;
      }

      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
        items[newIndex]?.focus();
      }
    },
    [items, activeIndex, orientation, loop, onSelect]
  );

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}

// ============================================
// Announcer Context (for screen readers)
// ============================================

interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider');
  }
  return context;
}

// ============================================
// Skip Link Component
// ============================================

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[9999]
        px-4 py-2 rounded-lg
        bg-primary-500 text-white font-medium
        focus:outline-none focus:ring-2 focus:ring-white
        transition-all duration-200
      "
    >
      {children}
    </a>
  );
}

// ============================================
// Accessible Button Component
// ============================================

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary:
        'bg-gradient-to-r from-primary-500 to-pink-500 text-white hover:from-primary-600 hover:to-pink-600',
      secondary:
        'border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30',
      ghost: 'text-white/70 hover:text-white hover:bg-white/5',
      danger: 'bg-red-500/90 text-white hover:bg-red-600',
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm rounded-lg',
      md: 'px-6 py-3 text-base rounded-xl',
      lg: 'px-8 py-4 text-lg rounded-2xl',
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        aria-disabled={isLoading || disabled}
        aria-busy={isLoading}
        className={`
          inline-flex items-center justify-center gap-2
          font-semibold transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-festival-dark
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{loadingText || 'Loading...'}</span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

// ============================================
// Accessible Input Component
// ============================================

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  hideLabel?: boolean;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ label, helperText, error, hideLabel = false, id, className = '', ...props }, ref) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    return (
      <div className={className}>
        <label
          htmlFor={inputId}
          className={hideLabel ? 'sr-only' : 'block text-sm font-medium text-white/80 mb-2'}
        >
          {label}
          {props.required && (
            <span className="text-red-400 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-invalid={!!error}
          className={`
            w-full px-4 py-3 rounded-xl
            bg-white/5 border transition-all duration-300
            text-white placeholder-white/40
            focus:outline-none focus:ring-2 focus:ring-primary-500/50
            ${error
              ? 'border-red-500 focus:border-red-500'
              : 'border-white/10 focus:border-primary-500/50'
            }
          `}
          {...props}
        />
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-white/50">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

// ============================================
// Accessible Select Component
// ============================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AccessibleSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  hideLabel?: boolean;
  placeholder?: string;
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  (
    { label, options, helperText, error, hideLabel = false, placeholder, id, className = '', ...props },
    ref
  ) => {
    const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    return (
      <div className={className}>
        <label
          htmlFor={selectId}
          className={hideLabel ? 'sr-only' : 'block text-sm font-medium text-white/80 mb-2'}
        >
          {label}
          {props.required && (
            <span className="text-red-400 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-invalid={!!error}
          className={`
            w-full px-4 py-3 rounded-xl
            bg-white/5 border transition-all duration-300
            text-white
            focus:outline-none focus:ring-2 focus:ring-primary-500/50
            ${error
              ? 'border-red-500 focus:border-red-500'
              : 'border-white/10 focus:border-primary-500/50'
            }
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-white/50">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';

// ============================================
// Accessible Checkbox Component
// ============================================

interface AccessibleCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const AccessibleCheckbox = forwardRef<HTMLInputElement, AccessibleCheckboxProps>(
  ({ label, description, id, className = '', ...props }, ref) => {
    const checkboxId = id || `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const descriptionId = description ? `${checkboxId}-description` : undefined;

    return (
      <div className={`flex items-start ${className}`}>
        <div className="flex items-center h-5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            aria-describedby={descriptionId}
            className="
              w-4 h-4 rounded
              bg-white/5 border-white/20
              text-primary-500
              focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-0
              transition-colors duration-200
            "
            {...props}
          />
        </div>
        <div className="ml-3">
          <label htmlFor={checkboxId} className="text-sm font-medium text-white">
            {label}
          </label>
          {description && (
            <p id={descriptionId} className="text-sm text-white/50">
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

AccessibleCheckbox.displayName = 'AccessibleCheckbox';

// ============================================
// Accessible Radio Group Component
// ============================================

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface AccessibleRadioGroupProps {
  name: string;
  legend: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function AccessibleRadioGroup({
  name,
  legend,
  options,
  value,
  onChange,
  orientation = 'vertical',
  className = '',
}: AccessibleRadioGroupProps) {
  return (
    <fieldset className={className}>
      <legend className="text-sm font-medium text-white/80 mb-3">{legend}</legend>
      <div
        className={`
          ${orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3'}
        `}
        role="radiogroup"
        aria-label={legend}
      >
        {options.map((option) => {
          const optionId = `${name}-${option.value}`;
          const descriptionId = option.description ? `${optionId}-description` : undefined;

          return (
            <div key={option.value} className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => onChange?.(option.value)}
                  disabled={option.disabled}
                  aria-describedby={descriptionId}
                  className="
                    w-4 h-4
                    bg-white/5 border-white/20
                    text-primary-500
                    focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-0
                    transition-colors duration-200
                  "
                />
              </div>
              <div className="ml-3">
                <label
                  htmlFor={optionId}
                  className={`
                    text-sm font-medium
                    ${option.disabled ? 'text-white/40' : 'text-white'}
                  `}
                >
                  {option.label}
                </label>
                {option.description && (
                  <p
                    id={descriptionId}
                    className={`text-sm ${option.disabled ? 'text-white/30' : 'text-white/50'}`}
                  >
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

// ============================================
// Accessible Tabs Component
// ============================================

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface AccessibleTabsProps {
  tabs: Tab[];
  defaultActiveId?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function AccessibleTabs({
  tabs,
  defaultActiveId,
  onChange,
  className = '',
}: AccessibleTabsProps) {
  const [activeId, setActiveId] = useState(defaultActiveId || tabs[0]?.id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabClick = (id: string, index: number) => {
    setActiveId(id);
    onChange?.(id);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const enabledIndexes = tabs.map((t, i) => (!t.disabled ? i : -1)).filter((i) => i >= 0);
    const currentEnabledIndex = enabledIndexes.indexOf(currentIndex);

    let nextIndex: number | undefined;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex =
          enabledIndexes[
            currentEnabledIndex > 0 ? currentEnabledIndex - 1 : enabledIndexes.length - 1
          ];
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextIndex =
          enabledIndexes[
            currentEnabledIndex < enabledIndexes.length - 1 ? currentEnabledIndex + 1 : 0
          ];
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = enabledIndexes[0];
        break;
      case 'End':
        e.preventDefault();
        nextIndex = enabledIndexes[enabledIndexes.length - 1];
        break;
    }

    if (nextIndex !== undefined) {
      const nextTab = tabs[nextIndex];
      setActiveId(nextTab.id);
      onChange?.(nextTab.id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <div className={className}>
      {/* Tab List */}
      <div
        role="tablist"
        aria-label="Tabs"
        className="flex border-b border-white/10"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeId === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeId === tab.id ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => handleTabClick(tab.id, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`
              px-4 py-3 text-sm font-medium
              border-b-2 -mb-px
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/50
              ${activeId === tab.id
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
              }
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panel */}
      <div
        role="tabpanel"
        id={`panel-${activeId}`}
        aria-labelledby={`tab-${activeId}`}
        tabIndex={0}
        className="py-4 focus:outline-none"
      >
        {activeTab?.content}
      </div>
    </div>
  );
}

// ============================================
// Accessible Dialog Component
// ============================================

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AccessibleDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: AccessibleDialogProps) {
  const focusTrapRef = useFocusTrap(isOpen);
  const titleId = `dialog-title-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const descriptionId = description
    ? `dialog-description-${title.toLowerCase().replace(/\s+/g, '-')}`
    : undefined;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`
          relative w-full ${sizeStyles[size]}
          bg-festival-dark border border-white/10
          rounded-2xl shadow-2xl
          animate-scaleIn
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-white">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-white/60">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="
              p-2 -m-2 text-white/50 hover:text-white
              rounded-lg hover:bg-white/5
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
            "
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ============================================
// Accessible Alert Component
// ============================================

interface AccessibleAlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function AccessibleAlert({
  type,
  title,
  children,
  onDismiss,
  className = '',
}: AccessibleAlertProps) {
  const styles = {
    info: {
      container: 'bg-blue-500/10 border-blue-500/30',
      icon: 'text-blue-400',
      title: 'text-blue-300',
    },
    success: {
      container: 'bg-green-500/10 border-green-500/30',
      icon: 'text-green-400',
      title: 'text-green-300',
    },
    warning: {
      container: 'bg-orange-500/10 border-orange-500/30',
      icon: 'text-orange-400',
      title: 'text-orange-300',
    },
    error: {
      container: 'bg-red-500/10 border-red-500/30',
      icon: 'text-red-400',
      title: 'text-red-300',
    },
  };

  const icons = {
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`
        flex gap-3 p-4 rounded-xl border
        ${styles[type].container}
        ${className}
      `}
    >
      <div className={`flex-shrink-0 ${styles[type].icon}`} aria-hidden="true">
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className={`font-semibold ${styles[type].title}`}>{title}</h3>
        )}
        <div className="text-sm text-white/70">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="
            flex-shrink-0 p-1 -m-1
            text-white/40 hover:text-white
            rounded transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-500/50
          "
          aria-label="Dismiss alert"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================
// Accessible Tooltip Component
// ============================================

interface AccessibleTooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function AccessibleTooltip({
  content,
  children,
  position = 'top',
}: AccessibleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = `tooltip-${content.slice(0, 10).toLowerCase().replace(/\s+/g, '-')}`;

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      {React.cloneElement(children, {
        'aria-describedby': isVisible ? tooltipId : undefined,
        onMouseEnter: () => setIsVisible(true),
        onMouseLeave: () => setIsVisible(false),
        onFocus: () => setIsVisible(true),
        onBlur: () => setIsVisible(false),
      })}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`
            absolute z-50 ${positionStyles[position]}
            px-3 py-1.5 rounded-lg
            bg-festival-darker border border-white/10
            text-sm text-white whitespace-nowrap
            shadow-lg
            animate-fadeIn
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ============================================
// Visually Hidden Component (sr-only)
// ============================================

export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
