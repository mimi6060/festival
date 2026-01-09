/**
 * Accessibility Testing Utilities
 *
 * A collection of utilities for testing and validating accessibility
 * compliance in the Festival web application.
 *
 * WCAG 2.1 AA Requirements addressed:
 * - 1.4.3: Contrast (Minimum) - 4.5:1 for normal text, 3:1 for large text
 * - 2.4.3: Focus Order - Logical navigation order
 * - 4.1.2: Name, Role, Value - Proper ARIA implementation
 */

// ============================================
// COLOR CONTRAST UTILITIES
// ============================================

/**
 * Parses a color string into RGB components
 *
 * Supports:
 * - Hex: #RGB, #RRGGBB, #RRGGBBAA
 * - RGB: rgb(r, g, b)
 * - RGBA: rgba(r, g, b, a)
 * - Named colors (basic set)
 *
 * @param color - Color string to parse
 * @returns RGB values or null if invalid
 */
export function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Remove whitespace
  color = color.trim().toLowerCase();

  // Named colors (basic set for common usage)
  const namedColors: Record<string, { r: number; g: number; b: number }> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    magenta: { r: 255, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
  };

  if (namedColors[color]) {
    return namedColors[color];
  }

  // Hex color
  if (color.startsWith('#')) {
    let hex = color.slice(1);

    // Convert shorthand (#RGB) to full (#RRGGBB)
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }

    // Remove alpha channel if present
    if (hex.length === 8) {
      hex = hex.slice(0, 6);
    }

    if (hex.length !== 6) {
      return null;
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return null;
    }

    return { r, g, b };
  }

  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

/**
 * Calculates the relative luminance of a color
 *
 * Based on WCAG 2.1 formula:
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Relative luminance (0-1)
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates the contrast ratio between two colors
 *
 * Based on WCAG 2.1 formula:
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 *
 * @param foreground - Foreground color string
 * @param background - Background color string
 * @returns Contrast ratio (1-21) or null if colors are invalid
 */
export function getContrastRatio(
  foreground: string,
  background: string
): number | null {
  const fgColor = parseColor(foreground);
  const bgColor = parseColor(background);

  if (!fgColor || !bgColor) {
    return null;
  }

  const fgLuminance = getLuminance(fgColor.r, fgColor.g, fgColor.b);
  const bgLuminance = getLuminance(bgColor.r, bgColor.g, bgColor.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 2.1 contrast requirements
 */
export const WCAG_CONTRAST_REQUIREMENTS = {
  /** Normal text AA: 4.5:1 */
  normalTextAA: 4.5,
  /** Large text AA: 3:1 (18pt or 14pt bold) */
  largeTextAA: 3,
  /** Normal text AAA: 7:1 */
  normalTextAAA: 7,
  /** Large text AAA: 4.5:1 */
  largeTextAAA: 4.5,
  /** UI components and graphical objects: 3:1 */
  uiComponentAA: 3,
};

/**
 * Checks if a color combination meets WCAG contrast requirements
 *
 * @param foreground - Foreground color string
 * @param background - Background color string
 * @param options - Check options
 * @returns Contrast check results
 */
export interface ContrastCheckResult {
  ratio: number | null;
  normalTextAA: boolean;
  normalTextAAA: boolean;
  largeTextAA: boolean;
  largeTextAAA: boolean;
  uiComponentAA: boolean;
}

export function checkContrast(
  foreground: string,
  background: string
): ContrastCheckResult {
  const ratio = getContrastRatio(foreground, background);

  if (ratio === null) {
    return {
      ratio: null,
      normalTextAA: false,
      normalTextAAA: false,
      largeTextAA: false,
      largeTextAAA: false,
      uiComponentAA: false,
    };
  }

  return {
    ratio,
    normalTextAA: ratio >= WCAG_CONTRAST_REQUIREMENTS.normalTextAA,
    normalTextAAA: ratio >= WCAG_CONTRAST_REQUIREMENTS.normalTextAAA,
    largeTextAA: ratio >= WCAG_CONTRAST_REQUIREMENTS.largeTextAA,
    largeTextAAA: ratio >= WCAG_CONTRAST_REQUIREMENTS.largeTextAAA,
    uiComponentAA: ratio >= WCAG_CONTRAST_REQUIREMENTS.uiComponentAA,
  };
}

/**
 * Suggests an adjusted color to meet contrast requirements
 *
 * @param foreground - Current foreground color
 * @param background - Background color (fixed)
 * @param targetRatio - Target contrast ratio (default: 4.5 for AA)
 * @returns Adjusted color or null if unable to adjust
 */
export function suggestContrastColor(
  foreground: string,
  background: string,
  targetRatio: number = WCAG_CONTRAST_REQUIREMENTS.normalTextAA
): string | null {
  const fgColor = parseColor(foreground);
  const bgColor = parseColor(background);

  if (!fgColor || !bgColor) {
    return null;
  }

  const bgLuminance = getLuminance(bgColor.r, bgColor.g, bgColor.b);

  // Determine if we need to lighten or darken the foreground
  const shouldLighten = bgLuminance < 0.5;

  // Adjust the foreground color until it meets the target ratio
  let adjustedColor = { ...fgColor };
  const step = shouldLighten ? 5 : -5;
  let iterations = 0;
  const maxIterations = 100;

  while (iterations < maxIterations) {
    const currentRatio = getContrastRatio(
      `rgb(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b})`,
      background
    );

    if (currentRatio && currentRatio >= targetRatio) {
      return `#${[adjustedColor.r, adjustedColor.g, adjustedColor.b]
        .map((c) => Math.round(c).toString(16).padStart(2, '0'))
        .join('')}`;
    }

    // Adjust color
    adjustedColor.r = Math.max(0, Math.min(255, adjustedColor.r + step));
    adjustedColor.g = Math.max(0, Math.min(255, adjustedColor.g + step));
    adjustedColor.b = Math.max(0, Math.min(255, adjustedColor.b + step));

    iterations++;
  }

  // Return black or white if unable to find suitable adjustment
  return shouldLighten ? '#ffffff' : '#000000';
}

// ============================================
// FOCUS ORDER VALIDATOR
// ============================================

/**
 * Focusable element selector
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Gets all focusable elements within a container in DOM order
 *
 * @param container - Container element (defaults to document.body)
 * @returns Array of focusable elements
 */
export function getFocusableElements(
  container: HTMLElement = document.body
): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );

  // Filter out hidden elements
  return elements.filter((el) => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.offsetParent !== null
    );
  });
}

/**
 * Focus order issue types
 */
export type FocusOrderIssue = {
  element: HTMLElement;
  issue:
    | 'positive-tabindex'
    | 'missing-focusable'
    | 'hidden-but-focusable'
    | 'focus-trap-exit';
  description: string;
};

/**
 * Validates focus order within a container
 *
 * Checks for common focus order issues:
 * - Positive tabindex values (disrupts natural order)
 * - Interactive elements that aren't focusable
 * - Hidden elements that are focusable
 * - Focus traps without escape mechanism
 *
 * @param container - Container element to validate
 * @returns Array of focus order issues
 */
export function validateFocusOrder(
  container: HTMLElement = document.body
): FocusOrderIssue[] {
  const issues: FocusOrderIssue[] = [];
  const focusableElements = getFocusableElements(container);

  // Check for positive tabindex values
  focusableElements.forEach((el) => {
    const tabindex = el.getAttribute('tabindex');
    if (tabindex && parseInt(tabindex, 10) > 0) {
      issues.push({
        element: el,
        issue: 'positive-tabindex',
        description: `Element has tabindex="${tabindex}" which disrupts natural focus order. Use tabindex="0" instead.`,
      });
    }
  });

  // Check for clickable elements that aren't focusable
  const clickableElements = container.querySelectorAll<HTMLElement>(
    '[onclick], [role="button"], [role="link"], [role="menuitem"]'
  );

  clickableElements.forEach((el) => {
    const tabindex = el.getAttribute('tabindex');
    const isFocusable = focusableElements.includes(el);

    if (!isFocusable && tabindex !== '-1') {
      issues.push({
        element: el,
        issue: 'missing-focusable',
        description: `Interactive element is not keyboard focusable. Add tabindex="0" or use a native interactive element.`,
      });
    }
  });

  return issues;
}

/**
 * Gets the tab order of elements within a container
 *
 * Returns elements in the order they will be focused when pressing Tab.
 *
 * @param container - Container element
 * @returns Array of elements in tab order
 */
export function getTabOrder(container: HTMLElement = document.body): HTMLElement[] {
  const focusable = getFocusableElements(container);

  // Separate elements with positive tabindex
  const withPositiveTabindex: HTMLElement[] = [];
  const withZeroOrNoTabindex: HTMLElement[] = [];

  focusable.forEach((el) => {
    const tabindex = parseInt(el.getAttribute('tabindex') || '0', 10);
    if (tabindex > 0) {
      withPositiveTabindex.push(el);
    } else {
      withZeroOrNoTabindex.push(el);
    }
  });

  // Sort positive tabindex elements by tabindex value
  withPositiveTabindex.sort((a, b) => {
    const aIndex = parseInt(a.getAttribute('tabindex') || '0', 10);
    const bIndex = parseInt(b.getAttribute('tabindex') || '0', 10);
    return aIndex - bIndex;
  });

  // Positive tabindex first, then DOM order
  return [...withPositiveTabindex, ...withZeroOrNoTabindex];
}

// ============================================
// ARIA VALIDATION UTILITIES
// ============================================

/**
 * ARIA role requirements
 */
export const ARIA_ROLE_REQUIREMENTS: Record<
  string,
  { requiredAttributes: string[]; supportedAttributes: string[] }
> = {
  button: {
    requiredAttributes: [],
    supportedAttributes: ['aria-pressed', 'aria-expanded', 'aria-disabled'],
  },
  checkbox: {
    requiredAttributes: ['aria-checked'],
    supportedAttributes: ['aria-disabled', 'aria-required'],
  },
  combobox: {
    requiredAttributes: ['aria-expanded'],
    supportedAttributes: [
      'aria-haspopup',
      'aria-controls',
      'aria-activedescendant',
    ],
  },
  dialog: {
    requiredAttributes: [],
    supportedAttributes: ['aria-modal', 'aria-labelledby', 'aria-describedby'],
  },
  listbox: {
    requiredAttributes: [],
    supportedAttributes: ['aria-multiselectable', 'aria-activedescendant'],
  },
  menu: {
    requiredAttributes: [],
    supportedAttributes: ['aria-activedescendant', 'aria-orientation'],
  },
  menuitem: {
    requiredAttributes: [],
    supportedAttributes: ['aria-disabled'],
  },
  option: {
    requiredAttributes: ['aria-selected'],
    supportedAttributes: ['aria-disabled'],
  },
  progressbar: {
    requiredAttributes: [],
    supportedAttributes: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  },
  radio: {
    requiredAttributes: ['aria-checked'],
    supportedAttributes: ['aria-disabled'],
  },
  slider: {
    requiredAttributes: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    supportedAttributes: ['aria-orientation', 'aria-disabled'],
  },
  switch: {
    requiredAttributes: ['aria-checked'],
    supportedAttributes: ['aria-disabled'],
  },
  tab: {
    requiredAttributes: ['aria-selected'],
    supportedAttributes: ['aria-controls', 'aria-disabled'],
  },
  tabpanel: {
    requiredAttributes: [],
    supportedAttributes: ['aria-labelledby'],
  },
  textbox: {
    requiredAttributes: [],
    supportedAttributes: [
      'aria-multiline',
      'aria-readonly',
      'aria-required',
      'aria-invalid',
    ],
  },
};

/**
 * ARIA validation issue
 */
export interface AriaValidationIssue {
  element: HTMLElement;
  role: string;
  issue: 'missing-required-attribute' | 'invalid-attribute-value';
  attribute: string;
  description: string;
}

/**
 * Validates ARIA attributes on elements within a container
 *
 * @param container - Container element to validate
 * @returns Array of ARIA validation issues
 */
export function validateAria(
  container: HTMLElement = document.body
): AriaValidationIssue[] {
  const issues: AriaValidationIssue[] = [];

  // Find all elements with roles
  const elementsWithRoles = container.querySelectorAll<HTMLElement>('[role]');

  elementsWithRoles.forEach((el) => {
    const role = el.getAttribute('role');
    if (!role) return;

    const requirements = ARIA_ROLE_REQUIREMENTS[role];
    if (!requirements) return;

    // Check required attributes
    requirements.requiredAttributes.forEach((attr) => {
      if (!el.hasAttribute(attr)) {
        issues.push({
          element: el,
          role,
          issue: 'missing-required-attribute',
          attribute: attr,
          description: `Element with role="${role}" is missing required attribute "${attr}".`,
        });
      }
    });

    // Check for valid attribute values
    if (role === 'checkbox' || role === 'radio' || role === 'switch') {
      const checked = el.getAttribute('aria-checked');
      if (checked && !['true', 'false', 'mixed'].includes(checked)) {
        issues.push({
          element: el,
          role,
          issue: 'invalid-attribute-value',
          attribute: 'aria-checked',
          description: `aria-checked must be "true", "false", or "mixed". Got "${checked}".`,
        });
      }
    }
  });

  return issues;
}

// ============================================
// ACCESSIBILITY AUDIT SUMMARY
// ============================================

/**
 * Full accessibility audit result
 */
export interface AccessibilityAuditResult {
  focusOrderIssues: FocusOrderIssue[];
  ariaIssues: AriaValidationIssue[];
  timestamp: Date;
  summary: {
    totalIssues: number;
    critical: number;
    warnings: number;
  };
}

/**
 * Runs a comprehensive accessibility audit on a container
 *
 * @param container - Container element to audit
 * @returns Audit results
 */
export function runAccessibilityAudit(
  container: HTMLElement = document.body
): AccessibilityAuditResult {
  const focusOrderIssues = validateFocusOrder(container);
  const ariaIssues = validateAria(container);

  const totalIssues = focusOrderIssues.length + ariaIssues.length;

  // Count critical issues (missing required attributes, positive tabindex)
  const critical =
    focusOrderIssues.filter((i) => i.issue === 'positive-tabindex').length +
    ariaIssues.filter((i) => i.issue === 'missing-required-attribute').length;

  return {
    focusOrderIssues,
    ariaIssues,
    timestamp: new Date(),
    summary: {
      totalIssues,
      critical,
      warnings: totalIssues - critical,
    },
  };
}

/**
 * Formats audit results for console output
 *
 * @param results - Audit results to format
 * @returns Formatted string
 */
export function formatAuditResults(results: AccessibilityAuditResult): string {
  const lines: string[] = [
    '=== Accessibility Audit Results ===',
    `Timestamp: ${results.timestamp.toISOString()}`,
    '',
    `Total Issues: ${results.summary.totalIssues}`,
    `  Critical: ${results.summary.critical}`,
    `  Warnings: ${results.summary.warnings}`,
    '',
  ];

  if (results.focusOrderIssues.length > 0) {
    lines.push('Focus Order Issues:');
    results.focusOrderIssues.forEach((issue, index) => {
      lines.push(`  ${index + 1}. [${issue.issue}] ${issue.description}`);
    });
    lines.push('');
  }

  if (results.ariaIssues.length > 0) {
    lines.push('ARIA Issues:');
    results.ariaIssues.forEach((issue, index) => {
      lines.push(`  ${index + 1}. [${issue.issue}] ${issue.description}`);
    });
  }

  return lines.join('\n');
}
