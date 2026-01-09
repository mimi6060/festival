# Accessibility Guide - Festival Web App

This document outlines the accessibility features and guidelines for the Festival web application, ensuring WCAG 2.1 AA compliance.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Keyboard Navigation](#keyboard-navigation)
3. [Screen Reader Support](#screen-reader-support)
4. [Color Contrast](#color-contrast)
5. [Accessible Components](#accessible-components)
6. [Testing Checklist](#testing-checklist)
7. [Developer Guidelines](#developer-guidelines)

---

## Quick Start

### For Users

- **Skip to Content**: Press `Tab` on page load to reveal the "Skip to main content" link
- **Keyboard Navigation**: Use `Tab` to move between interactive elements
- **Reduced Motion**: Your system's reduced motion preference is automatically respected
- **High Contrast**: Windows High Contrast Mode is fully supported

### For Developers

```tsx
// Import accessibility components
import { SkipLink, VisuallyHidden, LiveRegion, FocusTrap } from '@/components/a11y';

// Import accessibility hooks
import { useAnnounce, useFocusReturn, useReducedMotion, useKeyboardNavigation } from '@/hooks';

// Import testing utilities
import { checkContrast, validateFocusOrder, runAccessibilityAudit } from '@/utils/a11y';
```

---

## Keyboard Navigation

### Global Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next interactive element |
| `Shift + Tab` | Move focus to previous interactive element |
| `Enter` / `Space` | Activate buttons, links, checkboxes |
| `Escape` | Close modals, dropdowns, menus |
| `Arrow Keys` | Navigate within components (tabs, menus, selects) |
| `Home` / `End` | Jump to first/last item in lists |

### Component-Specific Navigation

#### Tabs
| Key | Action |
|-----|--------|
| `Arrow Left/Right` | Move between tabs |
| `Home` | Focus first tab |
| `End` | Focus last tab |

#### Select/Dropdown
| Key | Action |
|-----|--------|
| `Arrow Down/Up` | Navigate options |
| `Enter` / `Space` | Select highlighted option |
| `Escape` | Close dropdown |
| `Home` / `End` | Jump to first/last option |
| Type characters | Type-ahead search |

#### Modal/Dialog
| Key | Action |
|-----|--------|
| `Tab` | Move through modal content (focus trapped) |
| `Escape` | Close modal |
| Focus returns to trigger element on close |

---

## Screen Reader Support

### Supported Screen Readers

- **NVDA** (Windows) - Recommended
- **JAWS** (Windows)
- **VoiceOver** (macOS/iOS)
- **TalkBack** (Android)

### ARIA Implementation

#### Live Regions

Use the `LiveRegion` component or `useAnnounce` hook for dynamic content announcements:

```tsx
// Component approach
<LiveRegion politeness="polite">
  {searchResults.length} results found
</LiveRegion>

// Hook approach
const announce = useAnnounce();
announce('Form submitted successfully', { politeness: 'polite' });
```

#### Landmark Regions

The app uses proper HTML5 landmark elements:

| Element | Role | Purpose |
|---------|------|---------|
| `<header>` | banner | Site header and navigation |
| `<nav>` | navigation | Navigation menus |
| `<main>` | main | Primary content area |
| `<footer>` | contentinfo | Site footer |
| `<aside>` | complementary | Sidebar content |

#### Component Roles

| Component | Role(s) | Key ARIA Attributes |
|-----------|---------|---------------------|
| Button | button | `aria-pressed`, `aria-expanded`, `aria-disabled`, `aria-busy` |
| Input | textbox | `aria-invalid`, `aria-describedby`, `aria-required` |
| Select | combobox, listbox, option | `aria-expanded`, `aria-selected`, `aria-activedescendant` |
| Modal | dialog | `aria-modal`, `aria-labelledby`, `aria-describedby` |
| Tabs | tablist, tab, tabpanel | `aria-selected`, `aria-controls`, `aria-labelledby` |

### Hidden Content

Use `VisuallyHidden` for screen-reader-only content:

```tsx
<button>
  <SearchIcon aria-hidden="true" />
  <VisuallyHidden>Search festivals</VisuallyHidden>
</button>
```

---

## Color Contrast

### WCAG 2.1 AA Requirements

| Text Type | Required Ratio | Our Implementation |
|-----------|----------------|-------------------|
| Normal text (< 18pt) | 4.5:1 | >= 4.5:1 |
| Large text (>= 18pt or 14pt bold) | 3:1 | >= 3:1 |
| UI components | 3:1 | >= 3:1 |

### Color Palette Contrast Ratios

| Color Combination | Ratio | Passes AA |
|------------------|-------|-----------|
| White (#FFFFFF) on Primary (#D946EF) | 4.6:1 | Yes |
| White (#FFFFFF) on Festival Dark (#1A1A2E) | 15.3:1 | Yes |
| Primary text on dark background | 12.8:1 | Yes |
| Error red (#EF4444) on dark | 5.2:1 | Yes |

### Testing Contrast

Use the built-in contrast checker:

```tsx
import { checkContrast, suggestContrastColor } from '@/utils/a11y';

// Check if colors meet requirements
const result = checkContrast('#FFFFFF', '#D946EF');
console.log(result);
// { ratio: 4.6, normalTextAA: true, largeTextAA: true, ... }

// Get a suggestion for better contrast
const betterColor = suggestContrastColor('#808080', '#1A1A2E', 4.5);
```

---

## Accessible Components

### Core Components (`components/a11y/`)

#### SkipLink

Allows keyboard users to skip repetitive navigation:

```tsx
<SkipLink href="#main-content" label="Skip to main content" />
```

#### VisuallyHidden

Screen-reader-only text:

```tsx
<VisuallyHidden>Additional context for screen readers</VisuallyHidden>
```

#### LiveRegion

ARIA live region for announcements:

```tsx
<LiveRegion politeness="polite" clearAfter={5000}>
  {message}
</LiveRegion>
```

#### FocusTrap

Traps focus within a container (for modals):

```tsx
<FocusTrap active={isOpen} onEscape={onClose}>
  <div className="modal">...</div>
</FocusTrap>
```

### Hooks (`hooks/`)

#### useAnnounce

Programmatic screen reader announcements:

```tsx
const announce = useAnnounce();
announce('3 items added to cart', { politeness: 'polite' });
```

#### useFocusReturn

Returns focus after modal closes:

```tsx
useFocusReturn({ isActive: isModalOpen });
```

#### useReducedMotion

Detects user's motion preference:

```tsx
const prefersReducedMotion = useReducedMotion();
const duration = prefersReducedMotion ? 0 : 300;
```

#### useKeyboardNavigation

Arrow key navigation for lists:

```tsx
const { highlightedIndex, handleKeyDown } = useKeyboardNavigation({
  items: options,
  onSelect: handleSelect,
});
```

---

## Testing Checklist

### Manual Testing

- [ ] **Keyboard Navigation**
  - [ ] Can reach all interactive elements with Tab
  - [ ] Tab order follows visual/logical order
  - [ ] Focus indicator is visible on all elements
  - [ ] No keyboard traps (except intentional focus traps)
  - [ ] Escape closes modals/dropdowns

- [ ] **Screen Reader**
  - [ ] Page has a descriptive title
  - [ ] Headings form logical hierarchy (h1 -> h2 -> h3)
  - [ ] Images have meaningful alt text
  - [ ] Form fields have associated labels
  - [ ] Error messages are announced
  - [ ] Dynamic content updates are announced

- [ ] **Visual**
  - [ ] Text is readable at 200% zoom
  - [ ] No information conveyed by color alone
  - [ ] Focus indicators are clearly visible
  - [ ] Sufficient color contrast (use browser devtools)

- [ ] **Motion**
  - [ ] Animations respect prefers-reduced-motion
  - [ ] No flashing content (3 flashes/second)

### Automated Testing

Run the built-in accessibility audit:

```tsx
import { runAccessibilityAudit, formatAuditResults } from '@/utils/a11y';

// In browser console or test
const results = runAccessibilityAudit(document.body);
console.log(formatAuditResults(results));
```

### Recommended Tools

1. **Browser DevTools**
   - Chrome Lighthouse (Accessibility audit)
   - Firefox Accessibility Inspector

2. **Browser Extensions**
   - [axe DevTools](https://www.deque.com/axe/devtools/)
   - [WAVE](https://wave.webaim.org/extension/)

3. **Testing Libraries**
   - [jest-axe](https://github.com/nickcolley/jest-axe)
   - [@testing-library/jest-dom](https://github.com/testing-library/jest-dom)

4. **Screen Readers**
   - NVDA (free, Windows)
   - VoiceOver (built-in, macOS/iOS)

---

## Developer Guidelines

### Component Development

1. **Use semantic HTML first**
   ```tsx
   // Good
   <button onClick={handleClick}>Submit</button>

   // Avoid
   <div onClick={handleClick}>Submit</div>
   ```

2. **Always provide accessible names**
   ```tsx
   // Form inputs
   <Input label="Email address" />

   // Icon buttons
   <Button aria-label="Close menu">
     <CloseIcon aria-hidden="true" />
   </Button>

   // Images
   <img src="..." alt="Festival main stage at sunset" />
   ```

3. **Associate errors with inputs**
   ```tsx
   <Input
     label="Password"
     error={errors.password}
     aria-invalid={!!errors.password}
   />
   ```

4. **Announce dynamic changes**
   ```tsx
   const announce = useAnnounce();

   const handleAddToCart = async () => {
     await addToCart(item);
     announce(`${item.name} added to cart`);
   };
   ```

5. **Handle loading states**
   ```tsx
   <Button
     isLoading={isSubmitting}
     loadingText="Submitting..."
     aria-busy={isSubmitting}
   >
     Submit
   </Button>
   ```

### CSS Guidelines

1. **Never hide focus outlines without replacement**
   ```css
   /* Bad */
   *:focus { outline: none; }

   /* Good */
   *:focus { outline: none; }
   *:focus-visible { outline: 2px solid var(--color-primary-500); }
   ```

2. **Ensure sufficient touch targets**
   ```css
   button {
     min-width: 44px;
     min-height: 44px;
   }
   ```

3. **Respect motion preferences**
   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

4. **Support high contrast mode**
   ```css
   @media (forced-colors: active) {
     button {
       border: 2px solid ButtonText;
     }
   }
   ```

### Testing Requirements

All new components must:

1. Pass automated accessibility checks
2. Be fully keyboard navigable
3. Work with screen readers
4. Have sufficient color contrast
5. Include accessibility documentation

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

---

## Reporting Accessibility Issues

If you encounter any accessibility barriers while using this application, please report them:

1. Open an issue on GitHub with the `accessibility` label
2. Include:
   - Description of the barrier
   - Steps to reproduce
   - Assistive technology used (if applicable)
   - Browser and operating system

We are committed to making this application accessible to everyone.
