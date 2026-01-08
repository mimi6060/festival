/**
 * Card Component Tests
 *
 * Tests for the Card component and its sub-components covering:
 * - Component rendering
 * - Variants and padding options
 * - Click and link functionality
 * - Sub-components (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardVariant,
} from './Card';

describe('Card Component', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('Rendering', () => {
    it('should render card with children', () => {
      render(<Card>Card Content</Card>);

      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should render as a div by default', () => {
      const { container } = render(<Card>Content</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.tagName).toBe('DIV');
    });

    it('should render as a link when href is provided', () => {
      render(<Card href="/test-page">Link Card</Card>);

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test-page');
    });

    it('should render nested components correctly', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Main Content</CardContent>
          <CardFooter>Footer Content</CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Variants Tests
  // ==========================================================================
  describe('Variants', () => {
    const variants: CardVariant[] = ['default', 'glow', 'solid', 'gradient'];

    variants.forEach((variant) => {
      it(`should render ${variant} variant`, () => {
        const { container } = render(<Card variant={variant}>Content</Card>);

        const card = container.firstChild as HTMLElement;
        expect(card).toBeInTheDocument();
      });
    });

    it('should default to default variant', () => {
      const { container } = render(<Card>Default</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-white/5');
      expect(card.className).toContain('backdrop-blur-lg');
    });

    it('should apply glow variant styles', () => {
      const { container } = render(<Card variant="glow">Glow</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('hover:shadow-lg');
    });

    it('should apply solid variant styles', () => {
      const { container } = render(<Card variant="solid">Solid</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-festival-darker');
    });

    it('should apply gradient variant styles', () => {
      const { container } = render(<Card variant="gradient">Gradient</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-gradient-to-br');
    });
  });

  // ==========================================================================
  // Padding Tests
  // ==========================================================================
  describe('Padding', () => {
    it('should default to md padding', () => {
      const { container } = render(<Card>Default Padding</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-6');
    });

    it('should apply no padding when padding="none"', () => {
      const { container } = render(<Card padding="none">No Padding</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain('p-4');
      expect(card.className).not.toContain('p-6');
      expect(card.className).not.toContain('p-8');
    });

    it('should apply sm padding', () => {
      const { container } = render(<Card padding="sm">Small Padding</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-4');
    });

    it('should apply lg padding', () => {
      const { container } = render(<Card padding="lg">Large Padding</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-8');
    });
  });

  // ==========================================================================
  // User Interactions Tests
  // ==========================================================================
  describe('User Interactions', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      const { container } = render(<Card onClick={handleClick}>Clickable Card</Card>);

      const card = container.firstChild as HTMLElement;
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have cursor-pointer when onClick is provided', () => {
      const handleClick = jest.fn();

      const { container } = render(<Card onClick={handleClick}>Clickable</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('cursor-pointer');
    });

    it('should have cursor-pointer when href is provided', () => {
      render(<Card href="/test">Link Card</Card>);

      const card = screen.getByRole('link');
      expect(card.className).toContain('cursor-pointer');
    });

    it('should not have cursor-pointer when neither onClick nor href provided', () => {
      const { container } = render(<Card>Static Card</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain('cursor-pointer');
    });
  });

  // ==========================================================================
  // Props Tests
  // ==========================================================================
  describe('Props', () => {
    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class">Custom</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });

    it('should combine variant and padding styles', () => {
      const { container } = render(
        <Card variant="glow" padding="lg">
          Combined
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('hover:shadow-lg');
      expect(card.className).toContain('p-8');
    });
  });

  // ==========================================================================
  // Link Mode Tests
  // ==========================================================================
  describe('Link Mode', () => {
    it('should render correct href on link card', () => {
      render(<Card href="/dashboard">Go to Dashboard</Card>);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/dashboard');
    });

    it('should wrap children in Fragment when link', () => {
      render(<Card href="/test">Link Content</Card>);

      const link = screen.getByRole('link');
      expect(link.textContent).toBe('Link Content');
    });

    it('should apply same styles in link mode', () => {
      render(
        <Card href="/test" variant="gradient" padding="lg">
          Link Card
        </Card>
      );

      const link = screen.getByRole('link');
      expect(link.className).toContain('bg-gradient-to-br');
      expect(link.className).toContain('p-8');
    });
  });
});

// ==========================================================================
// CardHeader Tests
// ==========================================================================
describe('CardHeader Component', () => {
  it('should render children', () => {
    render(<CardHeader>Header Content</CardHeader>);

    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('should apply mb-4 class by default', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);

    const header = container.firstChild as HTMLElement;
    expect(header.className).toContain('mb-4');
  });

  it('should apply custom className', () => {
    const { container } = render(<CardHeader className="custom-header">Header</CardHeader>);

    const header = container.firstChild as HTMLElement;
    expect(header.className).toContain('custom-header');
  });
});

// ==========================================================================
// CardTitle Tests
// ==========================================================================
describe('CardTitle Component', () => {
  it('should render children', () => {
    render(<CardTitle>Title Text</CardTitle>);

    expect(screen.getByText('Title Text')).toBeInTheDocument();
  });

  it('should render as h3 heading', () => {
    render(<CardTitle>Title</CardTitle>);

    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toBeInTheDocument();
  });

  it('should apply default styles', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);

    const title = container.firstChild as HTMLElement;
    expect(title.className).toContain('text-xl');
    expect(title.className).toContain('font-bold');
    expect(title.className).toContain('text-white');
  });

  it('should apply custom className', () => {
    const { container } = render(<CardTitle className="custom-title">Title</CardTitle>);

    const title = container.firstChild as HTMLElement;
    expect(title.className).toContain('custom-title');
  });
});

// ==========================================================================
// CardDescription Tests
// ==========================================================================
describe('CardDescription Component', () => {
  it('should render children', () => {
    render(<CardDescription>Description text</CardDescription>);

    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('should render as p element', () => {
    const { container } = render(<CardDescription>Description</CardDescription>);

    const description = container.firstChild as HTMLElement;
    expect(description.tagName).toBe('P');
  });

  it('should apply default styles', () => {
    const { container } = render(<CardDescription>Description</CardDescription>);

    const description = container.firstChild as HTMLElement;
    expect(description.className).toContain('text-white/60');
    expect(description.className).toContain('text-sm');
    expect(description.className).toContain('mt-1');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CardDescription className="custom-desc">Description</CardDescription>
    );

    const description = container.firstChild as HTMLElement;
    expect(description.className).toContain('custom-desc');
  });
});

// ==========================================================================
// CardContent Tests
// ==========================================================================
describe('CardContent Component', () => {
  it('should render children', () => {
    render(<CardContent>Content Area</CardContent>);

    expect(screen.getByText('Content Area')).toBeInTheDocument();
  });

  it('should render as div', () => {
    const { container } = render(<CardContent>Content</CardContent>);

    const content = container.firstChild as HTMLElement;
    expect(content.tagName).toBe('DIV');
  });

  it('should apply custom className', () => {
    const { container } = render(<CardContent className="custom-content">Content</CardContent>);

    const content = container.firstChild as HTMLElement;
    expect(content.className).toContain('custom-content');
  });

  it('should render without default classes if className empty', () => {
    const { container } = render(<CardContent>Content</CardContent>);

    const content = container.firstChild as HTMLElement;
    // Should have empty or no class without custom className
    expect(content.className).toBe('');
  });
});

// ==========================================================================
// CardFooter Tests
// ==========================================================================
describe('CardFooter Component', () => {
  it('should render children', () => {
    render(<CardFooter>Footer Content</CardFooter>);

    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('should apply default styles', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);

    const footer = container.firstChild as HTMLElement;
    expect(footer.className).toContain('mt-4');
    expect(footer.className).toContain('pt-4');
    expect(footer.className).toContain('border-t');
    expect(footer.className).toContain('border-white/10');
  });

  it('should apply custom className', () => {
    const { container } = render(<CardFooter className="custom-footer">Footer</CardFooter>);

    const footer = container.firstChild as HTMLElement;
    expect(footer.className).toContain('custom-footer');
  });
});

// ==========================================================================
// Integration Tests
// ==========================================================================
describe('Card Integration', () => {
  it('should render complete card with all sub-components', () => {
    const { container } = render(
      <Card variant="glow" padding="lg">
        <CardHeader>
          <CardTitle>Complete Card</CardTitle>
          <CardDescription>With all components</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is the main content area</p>
        </CardContent>
        <CardFooter>
          <button>Action Button</button>
        </CardFooter>
      </Card>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('With all components')).toBeInTheDocument();
    expect(screen.getByText('This is the main content area')).toBeInTheDocument();
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('should handle click events on full card', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    const { container } = render(
      <Card onClick={handleClick}>
        <CardHeader>
          <CardTitle>Clickable Card</CardTitle>
        </CardHeader>
        <CardContent>Click anywhere</CardContent>
      </Card>
    );

    const card = container.firstChild as HTMLElement;
    await user.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
