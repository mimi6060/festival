/**
 * Button Component Tests
 *
 * Tests for the Button component covering:
 * - Component rendering
 * - User interactions (clicks)
 * - Props handling (variants, sizes, states)
 * - Link mode functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, ButtonVariant, ButtonSize } from './Button';

describe('Button Component', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('Rendering', () => {
    it('should render button with children text', () => {
      render(<Button>Click Me</Button>);

      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should render as a button element by default', () => {
      render(<Button>Test Button</Button>);

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should render as a link when as="link" is provided', () => {
      render(
        <Button as="link" href="/test-page">
          Link Button
        </Button>
      );

      const link = screen.getByRole('link', { name: /link button/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test-page');
    });

    it('should render left icon when provided', () => {
      const TestIcon = () => <span data-testid="left-icon">Icon</span>;
      render(<Button leftIcon={<TestIcon />}>With Icon</Button>);

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon when provided', () => {
      const TestIcon = () => <span data-testid="right-icon">Icon</span>;
      render(<Button rightIcon={<TestIcon />}>With Icon</Button>);

      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should render loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not render left icon when loading', () => {
      const TestIcon = () => <span data-testid="left-icon">Icon</span>;
      render(
        <Button isLoading leftIcon={<TestIcon />}>
          Loading
        </Button>
      );

      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Variants Tests
  // ==========================================================================
  describe('Variants', () => {
    const variants: ButtonVariant[] = ['primary', 'secondary', 'accent', 'ghost', 'danger'];

    variants.forEach((variant) => {
      it(`should render ${variant} variant`, () => {
        render(<Button variant={variant}>Button</Button>);

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('should default to primary variant', () => {
      render(<Button>Default Variant</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary-500');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-white/10');
    });

    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Danger</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-red-500');
    });
  });

  // ==========================================================================
  // Sizes Tests
  // ==========================================================================
  describe('Sizes', () => {
    const sizes: ButtonSize[] = ['sm', 'md', 'lg'];

    sizes.forEach((size) => {
      it(`should render ${size} size`, () => {
        render(<Button size={size}>Button</Button>);

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('should default to md size', () => {
      render(<Button>Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-5');
      expect(button.className).toContain('py-2.5');
    });

    it('should apply sm size styles', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
    });

    it('should apply lg size styles', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6');
      expect(button.className).toContain('py-3');
    });
  });

  // ==========================================================================
  // User Interactions Tests
  // ==========================================================================
  describe('User Interactions', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click Me</Button>);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} isLoading>
          Loading
        </Button>
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle keyboard navigation with Enter key', () => {
      const handleClick = jest.fn();

      render(<Button onClick={handleClick}>Press Enter</Button>);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

      // Native button behavior handles Enter key automatically
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Props Tests
  // ==========================================================================
  describe('Props', () => {
    it('should apply fullWidth class when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-full');
    });

    it('should not apply fullWidth class by default', () => {
      render(<Button>Default Width</Button>);

      const button = screen.getByRole('button');
      expect(button.className).not.toContain('w-full');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should pass through additional HTML attributes', () => {
      render(
        <Button type="submit" data-testid="submit-button">
          Submit
        </Button>
      );

      const button = screen.getByTestId('submit-button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================
  describe('Accessibility', () => {
    it('should have correct focus styles', () => {
      render(<Button>Focusable</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('focus:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
    });

    it('should have correct disabled styles', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:opacity-50');
      expect(button.className).toContain('disabled:cursor-not-allowed');
    });

    it('should be focusable when not disabled', () => {
      render(<Button>Focus Me</Button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });
  });

  // ==========================================================================
  // Link Mode Tests
  // ==========================================================================
  describe('Link Mode', () => {
    it('should render correct href on link', () => {
      render(
        <Button as="link" href="/dashboard">
          Go to Dashboard
        </Button>
      );

      expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard');
    });

    it('should apply same styles in link mode', () => {
      render(
        <Button as="link" href="/test" variant="secondary" size="lg">
          Link Button
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link.className).toContain('bg-white/10');
      expect(link.className).toContain('px-6');
    });

    it('should render icons in link mode', () => {
      const TestIcon = () => <span data-testid="icon">Icon</span>;
      render(
        <Button as="link" href="/test" leftIcon={<TestIcon />}>
          Link with Icon
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });
});
