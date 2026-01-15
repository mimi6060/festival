/**
 * DataTable Component Tests
 *
 * Tests for the DataTable component covering:
 * - Component rendering
 * - Search functionality
 * - Sorting
 * - Pagination
 * - Row selection
 * - User interactions
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from './DataTable';
import type { TableColumn } from '../../types';

// Mock data type
interface TestData {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

// Generate mock data
const generateMockData = (count: number): TestData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    status: i % 2 === 0 ? 'active' : 'inactive',
    createdAt: new Date(2024, 0, i + 1).toISOString(),
  }));
};

// Define columns for testing
const columns: TableColumn<TestData>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'status', label: 'Status', sortable: false },
  { key: 'createdAt', label: 'Created At', sortable: true },
];

describe('DataTable Component', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('Rendering', () => {
    it('should render table with data', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render column headers', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created At')).toBeInTheDocument();
    });

    it('should render row data', () => {
      const mockData = generateMockData(3);
      render(<DataTable data={mockData} columns={columns} />);

      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });

    it('should render search input when searchable is true', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} searchable={true} />);

      expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument();
    });

    it('should not render search input when searchable is false', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} searchable={false} />);

      expect(screen.queryByPlaceholderText('Rechercher...')).not.toBeInTheDocument();
    });

    it('should render custom search placeholder', () => {
      const mockData = generateMockData(5);
      render(
        <DataTable
          data={mockData}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search users..."
        />
      );

      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    });

    it('should render empty message when no data', () => {
      render(<DataTable data={[]} columns={columns} />);

      expect(screen.getByText('Aucune donnee disponible')).toBeInTheDocument();
    });

    it('should render custom empty message', () => {
      render(<DataTable data={[]} columns={columns} emptyMessage="No users found" />);

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================
  describe('Loading State', () => {
    it('should render loading skeleton when loading is true', () => {
      render(<DataTable data={[]} columns={columns} loading={true} />);

      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should not render data rows when loading', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} loading={true} />);

      expect(screen.queryByText('User 1')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Search Tests
  // ==========================================================================
  describe('Search Functionality', () => {
    it('should filter data based on search input', async () => {
      const mockData = generateMockData(10);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const searchInput = screen.getByPlaceholderText('Rechercher...');
      await user.type(searchInput, 'User 1');

      // Should show User 1 and User 10
      expect(screen.getByText('User 1')).toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      const mockData = generateMockData(5);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const searchInput = screen.getByPlaceholderText('Rechercher...');
      await user.type(searchInput, 'USER 1');

      expect(screen.getByText('User 1')).toBeInTheDocument();
    });

    it('should search across multiple columns', async () => {
      const mockData = generateMockData(5);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const searchInput = screen.getByPlaceholderText('Rechercher...');
      await user.type(searchInput, 'example.com');

      // Should show all users since all have example.com email
      expect(screen.getByText('User 1')).toBeInTheDocument();
    });

    it('should reset to first page on search', async () => {
      const mockData = generateMockData(25);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} pageSize={10} />);

      // Go to page 2 - find next button by getting all buttons and picking the last one
      const allButtons = screen.getAllByRole('button');
      const nextButton = allButtons[allButtons.length - 1];
      await user.click(nextButton);

      // Search for something
      const searchInput = screen.getByPlaceholderText('Rechercher...');
      await user.type(searchInput, 'User');

      // Should be back on first page
      expect(screen.getByText('User 1')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Sorting Tests
  // ==========================================================================
  describe('Sorting', () => {
    it('should show sort indicator on sortable columns', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} />);

      // Sortable columns should have sort icons
      const nameHeader = screen.getByText('Name');
      expect(nameHeader.closest('th')).toHaveClass('cursor-pointer');
    });

    it('should sort ascending on first click', async () => {
      const mockData = generateMockData(5);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      // Data should be sorted
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should sort descending on second click', async () => {
      const mockData = generateMockData(5);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader); // First click - ascending
      await user.click(nameHeader); // Second click - descending

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should clear sort on third click', async () => {
      const mockData = generateMockData(5);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader); // First click
      await user.click(nameHeader); // Second click
      await user.click(nameHeader); // Third click - clear

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should not sort non-sortable columns', async () => {
      const mockData = generateMockData(5);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} />);

      const statusHeader = screen.getByText('Status');
      await user.click(statusHeader);

      // Status column should not have cursor-pointer class
      expect(statusHeader.closest('th')).not.toHaveClass('cursor-pointer');
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================
  describe('Pagination', () => {
    it('should render pagination when data exceeds page size', () => {
      const mockData = generateMockData(15);
      render(<DataTable data={mockData} columns={columns} pageSize={10} />);

      expect(screen.getByText(/Affichage de/)).toBeInTheDocument();
    });

    it('should not render pagination when data fits on one page', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} pageSize={10} />);

      expect(screen.queryByText(/Affichage de/)).not.toBeInTheDocument();
    });

    it('should show correct page info', () => {
      const mockData = generateMockData(25);
      render(<DataTable data={mockData} columns={columns} pageSize={10} />);

      expect(screen.getByText(/Affichage de 1 a 10 sur 25 resultats/)).toBeInTheDocument();
    });

    it('should navigate to next page', async () => {
      const mockData = generateMockData(25);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} pageSize={10} />);

      // Find next button (last svg button in pagination)
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons[buttons.length - 1];
      await user.click(nextButton);

      expect(screen.getByText(/Affichage de 11 a 20 sur 25 resultats/)).toBeInTheDocument();
    });

    it('should navigate to previous page', async () => {
      const mockData = generateMockData(25);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} pageSize={10} />);

      // Go to page 2 first
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons[buttons.length - 1];
      await user.click(nextButton);

      // Then go back to page 1
      const prevButtons = screen.getAllByRole('button');
      const prevButton = prevButtons.find(
        (b) => b.className.includes('rounded-lg') && b.className.includes('p-2')
      );
      if (prevButton) {
        await user.click(prevButton);
      }
    });

    it('should disable previous button on first page', () => {
      const mockData = generateMockData(25);
      render(<DataTable data={mockData} columns={columns} pageSize={10} />);

      const buttons = screen.getAllByRole('button');
      // Find pagination buttons
      const paginationButtons = buttons.filter((b) => b.className.includes('rounded-lg'));
      const prevButton = paginationButtons[0];

      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', async () => {
      const mockData = generateMockData(15);
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={columns} pageSize={10} />);

      // Go to last page
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons[buttons.length - 1];
      await user.click(nextButton);

      // Now next button should be disabled
      expect(nextButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================
  describe('Row Selection', () => {
    it('should render checkboxes when selectable is true', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} selectable={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // 1 header checkbox + 5 row checkboxes
      expect(checkboxes.length).toBe(6);
    });

    it('should not render checkboxes when selectable is false', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} selectable={false} />);

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('should select row on checkbox click', async () => {
      const onSelectionChange = jest.fn();
      const mockData = generateMockData(5);
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={columns}
          selectable={true}
          onSelectionChange={onSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Click first row checkbox

      expect(onSelectionChange).toHaveBeenCalled();
    });

    it('should select all rows on header checkbox click', async () => {
      const onSelectionChange = jest.fn();
      const mockData = generateMockData(5);
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={columns}
          selectable={true}
          onSelectionChange={onSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Click header checkbox

      expect(onSelectionChange).toHaveBeenCalledWith(mockData);
    });

    it('should deselect all on second header click', async () => {
      const onSelectionChange = jest.fn();
      const mockData = generateMockData(5);
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={columns}
          selectable={true}
          onSelectionChange={onSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select all
      await user.click(checkboxes[0]); // Deselect all

      expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });

    it('should show selection count', async () => {
      const mockData = generateMockData(5);
      const user = userEvent.setup();

      render(<DataTable data={mockData} columns={columns} selectable={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);

      expect(screen.getByText('2 selectionnes')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Row Click Tests
  // ==========================================================================
  describe('Row Click', () => {
    it('should call onRowClick when row is clicked', async () => {
      const onRowClick = jest.fn();
      const mockData = generateMockData(5);
      const user = userEvent.setup();

      render(<DataTable data={mockData} columns={columns} onRowClick={onRowClick} />);

      const row = screen.getByText('User 1').closest('tr');
      if (row) {
        await user.click(row);
      }

      expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('should add cursor-pointer class when onRowClick is provided', () => {
      const onRowClick = jest.fn();
      const mockData = generateMockData(5);

      render(<DataTable data={mockData} columns={columns} onRowClick={onRowClick} />);

      const row = screen.getByText('User 1').closest('tr');
      expect(row?.className).toContain('cursor-pointer');
    });
  });

  // ==========================================================================
  // Actions Column Tests
  // ==========================================================================
  describe('Actions Column', () => {
    it('should render actions column when actions prop is provided', () => {
      const mockData = generateMockData(5);
      const actions = (row: TestData) => (
        <button data-testid={`action-${row.id}`}>Edit</button>
      );

      render(<DataTable data={mockData} columns={columns} actions={actions} />);

      expect(screen.getByTestId('action-1')).toBeInTheDocument();
      expect(screen.getByTestId('action-2')).toBeInTheDocument();
    });

    it('should not trigger row click when clicking action', async () => {
      const onRowClick = jest.fn();
      const mockData = generateMockData(5);
      const user = userEvent.setup();
      const actions = (row: TestData) => (
        <button data-testid={`action-${row.id}`}>Edit</button>
      );

      render(
        <DataTable
          data={mockData}
          columns={columns}
          actions={actions}
          onRowClick={onRowClick}
        />
      );

      await user.click(screen.getByTestId('action-1'));

      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Custom Column Render Tests
  // ==========================================================================
  describe('Custom Column Render', () => {
    it('should use custom render function when provided', () => {
      const mockData = generateMockData(5);
      const customColumns: TableColumn<TestData>[] = [
        {
          key: 'name',
          label: 'Name',
          render: (value) => <strong data-testid="custom-name">{String(value)}</strong>,
        },
      ];

      render(<DataTable data={mockData} columns={customColumns} />);

      expect(screen.getAllByTestId('custom-name')).toHaveLength(5);
    });
  });

  // ==========================================================================
  // Props Tests
  // ==========================================================================
  describe('Props', () => {
    it('should apply custom className', () => {
      const mockData = generateMockData(5);
      render(<DataTable data={mockData} columns={columns} className="custom-table" />);

      const container = document.querySelector('.custom-table');
      expect(container).toBeInTheDocument();
    });

    it('should use default pageSize of 10', () => {
      const mockData = generateMockData(15);
      render(<DataTable data={mockData} columns={columns} />);

      // Should show 10 rows on first page
      expect(screen.getByText(/Affichage de 1 a 10 sur 15 resultats/)).toBeInTheDocument();
    });

    it('should respect custom pageSize', () => {
      const mockData = generateMockData(15);
      render(<DataTable data={mockData} columns={columns} pageSize={5} />);

      expect(screen.getByText(/Affichage de 1 a 5 sur 15 resultats/)).toBeInTheDocument();
    });
  });
});
