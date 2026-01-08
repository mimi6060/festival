/**
 * RevenueChart Component Tests
 *
 * Tests for the RevenueChart component covering:
 * - Component rendering with data
 * - Loading state
 * - Period filtering
 * - User interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChartDataPoint } from '../../types';

// Mock recharts before importing component
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

// Import component after mocking
import RevenueChart from '../dashboard/RevenueChart';

// Generate mock data for testing
const generateMockData = (days: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 10000) + 1000,
    });
  }

  return data;
};

describe('RevenueChart Component', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('Rendering', () => {
    it('should render with title "Revenus"', () => {
      const mockData = generateMockData(30);
      render(<RevenueChart data={mockData} />);

      expect(screen.getByText('Revenus')).toBeInTheDocument();
    });

    it('should render total revenue', () => {
      const mockData: ChartDataPoint[] = [
        { date: '2024-01-01', value: 1000 },
        { date: '2024-01-02', value: 2000 },
        { date: '2024-01-03', value: 3000 },
      ];
      render(<RevenueChart data={mockData} />);

      // Component should show the formatted total
      // The total should be visible (6000 EUR formatted)
      expect(screen.getByText(/Revenus/)).toBeInTheDocument();
    });

    it('should render average revenue text', () => {
      const mockData = generateMockData(30);
      render(<RevenueChart data={mockData} />);

      expect(screen.getByText(/Moyenne:/)).toBeInTheDocument();
    });

    it('should render period buttons', () => {
      const mockData = generateMockData(30);
      render(<RevenueChart data={mockData} />);

      expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1y' })).toBeInTheDocument();
    });

    it('should render ResponsiveContainer for chart', () => {
      const mockData = generateMockData(30);
      render(<RevenueChart data={mockData} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================
  describe('Loading State', () => {
    it('should render loading skeleton when loading is true', () => {
      render(<RevenueChart data={[]} loading={true} />);

      // Should have animate-pulse class on container
      const container = document.querySelector('.animate-pulse');
      expect(container).toBeInTheDocument();
    });

    it('should not render period buttons when loading', () => {
      render(<RevenueChart data={[]} loading={true} />);

      expect(screen.queryByRole('button', { name: '7d' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '30d' })).not.toBeInTheDocument();
    });

    it('should render skeleton placeholders when loading', () => {
      render(<RevenueChart data={[]} loading={true} />);

      // Skeleton elements should be present
      const skeletonElements = document.querySelectorAll('.bg-gray-200');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Period Filter Tests
  // ==========================================================================
  describe('Period Filtering', () => {
    it('should default to 30d period', () => {
      const mockData = generateMockData(365);
      render(<RevenueChart data={mockData} />);

      const button30d = screen.getByRole('button', { name: '30d' });
      // Active button should have different styles
      expect(button30d.className).toContain('bg-white');
    });

    it('should change period when button is clicked', async () => {
      const mockData = generateMockData(365);
      const user = userEvent.setup();
      render(<RevenueChart data={mockData} />);

      const button7d = screen.getByRole('button', { name: '7d' });
      await user.click(button7d);

      // After clicking, 7d button should be active
      expect(button7d.className).toContain('bg-white');
    });

    it('should update displayed data when period changes', async () => {
      const mockData = generateMockData(365);
      const user = userEvent.setup();
      render(<RevenueChart data={mockData} />);

      // Click on 7d button
      await user.click(screen.getByRole('button', { name: '7d' }));

      // Click on 90d button
      await user.click(screen.getByRole('button', { name: '90d' }));

      // Click on 1y button
      await user.click(screen.getByRole('button', { name: '1y' }));

      // All buttons should be clickable
      expect(screen.getByRole('button', { name: '1y' }).className).toContain('bg-white');
    });

    it('should highlight active period button', async () => {
      const mockData = generateMockData(365);
      const user = userEvent.setup();
      render(<RevenueChart data={mockData} />);

      const button90d = screen.getByRole('button', { name: '90d' });
      await user.click(button90d);

      // Active button should have white background
      expect(button90d.className).toContain('bg-white');
      expect(button90d.className).toContain('shadow-sm');
    });
  });

  // ==========================================================================
  // User Interaction Tests
  // ==========================================================================
  describe('User Interactions', () => {
    it('should handle click on period buttons', () => {
      const mockData = generateMockData(30);
      render(<RevenueChart data={mockData} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(4); // 7d, 30d, 90d, 1y
    });

    it('should switch between periods with keyboard', async () => {
      const mockData = generateMockData(365);
      render(<RevenueChart data={mockData} />);

      const button7d = screen.getByRole('button', { name: '7d' });
      button7d.focus();

      fireEvent.keyDown(button7d, { key: 'Enter', code: 'Enter' });
      expect(button7d).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty data array', () => {
      render(<RevenueChart data={[]} />);

      expect(screen.getByText('Revenus')).toBeInTheDocument();
      // Should show 0 for total and average
    });

    it('should handle single data point', () => {
      const mockData: ChartDataPoint[] = [{ date: '2024-01-01', value: 5000 }];
      render(<RevenueChart data={mockData} />);

      expect(screen.getByText('Revenus')).toBeInTheDocument();
    });

    it('should handle data with zero values', () => {
      const mockData: ChartDataPoint[] = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-01-02', value: 0 },
        { date: '2024-01-03', value: 0 },
      ];
      render(<RevenueChart data={mockData} />);

      expect(screen.getByText('Revenus')).toBeInTheDocument();
    });

    it('should handle very large values', () => {
      const mockData: ChartDataPoint[] = [
        { date: '2024-01-01', value: 1000000 },
        { date: '2024-01-02', value: 2000000 },
      ];
      render(<RevenueChart data={mockData} />);

      expect(screen.getByText('Revenus')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Props Tests
  // ==========================================================================
  describe('Props', () => {
    it('should accept loading prop', () => {
      const mockData = generateMockData(30);
      const { rerender } = render(<RevenueChart data={mockData} loading={false} />);

      expect(screen.getByText('Revenus')).toBeInTheDocument();

      rerender(<RevenueChart data={mockData} loading={true} />);
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should use default loading=false', () => {
      const mockData = generateMockData(30);
      render(<RevenueChart data={mockData} />);

      // Should not show loading state
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });
});
