/**
 * FestivalForm Component Tests
 *
 * Tests for the FestivalForm component covering:
 * - Component rendering
 * - Edit mode
 * - User interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FestivalForm from './FestivalForm';
import type { Festival } from '../../types';

// Helper to get input by name attribute
const getInputByName = (name: string) => {
  return document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
};

const getTextareaByName = (name: string) => {
  return document.querySelector(`textarea[name="${name}"]`) as HTMLTextAreaElement;
};

const getSelectByName = (name: string) => {
  return document.querySelector(`select[name="${name}"]`) as HTMLSelectElement;
};

// Mock festival for edit mode
const mockFestival: Festival = {
  id: '1',
  name: 'Summer Festival',
  slug: 'summer-festival',
  description: 'An amazing summer music festival',
  startDate: '2024-07-01T00:00:00.000Z',
  endDate: '2024-07-03T00:00:00.000Z',
  location: {
    name: 'Central Park',
    address: '123 Park Avenue',
    city: 'Paris',
    country: 'France',
  },
  status: 'draft',
  coverImage: 'https://example.com/cover.jpg',
  organizerId: 'org-1',
  capacity: 10000,
  ticketsSold: 0,
  revenue: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('FestivalForm Component', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('Rendering', () => {
    it('should render all form sections', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText('Informations generales')).toBeInTheDocument();
      expect(screen.getByText("Dates de l'evenement")).toBeInTheDocument();
      expect(screen.getByText('Lieu')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Check inputs exist by name
      expect(getInputByName('name')).toBeInTheDocument();
      expect(getTextareaByName('description')).toBeInTheDocument();
      expect(getInputByName('coverImage')).toBeInTheDocument();
      expect(getInputByName('startDate')).toBeInTheDocument();
      expect(getInputByName('endDate')).toBeInTheDocument();
      expect(getInputByName('locationName')).toBeInTheDocument();
      expect(getInputByName('locationAddress')).toBeInTheDocument();
      expect(getInputByName('locationCity')).toBeInTheDocument();
      expect(getSelectByName('locationCountry')).toBeInTheDocument();
      expect(getInputByName('capacity')).toBeInTheDocument();
      expect(getSelectByName('status')).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /Creer le festival/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument();
    });

    it('should show "Enregistrer" button text in edit mode', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      render(
        <FestivalForm festival={mockFestival} onSubmit={onSubmit} onCancel={onCancel} />
      );

      expect(screen.getByRole('button', { name: /Enregistrer/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edit Mode Tests
  // ==========================================================================
  describe('Edit Mode', () => {
    it('should populate form with festival data', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      render(
        <FestivalForm festival={mockFestival} onSubmit={onSubmit} onCancel={onCancel} />
      );

      expect(screen.getByDisplayValue('Summer Festival')).toBeInTheDocument();
      expect(screen.getByDisplayValue('An amazing summer music festival')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Central Park')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 Park Avenue')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Paris')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
    });

    it('should populate date fields correctly', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      render(
        <FestivalForm festival={mockFestival} onSubmit={onSubmit} onCancel={onCancel} />
      );

      const startDate = getInputByName('startDate');
      const endDate = getInputByName('endDate');

      expect(startDate.value).toBe('2024-07-01');
      expect(endDate.value).toBe('2024-07-03');
    });

    it('should populate status dropdown correctly', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      render(
        <FestivalForm festival={mockFestival} onSubmit={onSubmit} onCancel={onCancel} />
      );

      const statusSelect = getSelectByName('status');
      expect(statusSelect.value).toBe('draft');
    });
  });

  // ==========================================================================
  // Form Validation Tests
  // ==========================================================================
  describe('Form Validation', () => {
    it('should not submit when form is empty', async () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /Creer le festival/i }));

      // Form should not have called onSubmit due to validation
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should not call onSubmit when required fields are empty', async () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Submit with only partial data - missing required fields
      await user.type(getInputByName('name'), 'Test Festival');
      // Missing description, dates, location, etc.

      await user.click(screen.getByRole('button', { name: /Creer le festival/i }));

      // onSubmit should not have been called due to validation
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should validate all required fields before submission', async () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Fill some fields but not all required ones
      await user.type(getInputByName('name'), 'Test');
      await user.type(getTextareaByName('description'), 'Description');
      // Missing dates, location, capacity

      await user.click(screen.getByRole('button', { name: /Creer le festival/i }));

      // Form should not submit with missing required fields
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Form Submission Tests
  // ==========================================================================
  describe('Form Submission', () => {
    it('should call onSubmit with correct data on valid form', async () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(getInputByName('name'), 'New Festival');
      await user.type(getTextareaByName('description'), 'Festival description');
      fireEvent.change(getInputByName('startDate'), { target: { value: '2024-07-01' } });
      fireEvent.change(getInputByName('endDate'), { target: { value: '2024-07-03' } });
      await user.type(getInputByName('locationName'), 'Venue Name');
      await user.type(getInputByName('locationCity'), 'Paris');
      await user.clear(getInputByName('capacity'));
      await user.type(getInputByName('capacity'), '5000');

      fireEvent.click(screen.getByRole('button', { name: /Creer le festival/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /Annuler/i }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================
  describe('Loading State', () => {
    it('should disable buttons when loading', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} loading={true} />);

      expect(screen.getByRole('button', { name: /Creer le festival/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Annuler/i })).toBeDisabled();
    });

    it('should show loading spinner when loading', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} loading={true} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // User Interaction Tests
  // ==========================================================================
  describe('User Interactions', () => {
    it('should update form values on input change', async () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      const nameInput = getInputByName('name');
      await user.type(nameInput, 'My Festival');

      expect(nameInput.value).toBe('My Festival');
    });

    it('should update status dropdown', async () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      const statusSelect = getSelectByName('status');
      await user.selectOptions(statusSelect, 'published');

      expect(statusSelect.value).toBe('published');
    });

    it('should handle textarea input', async () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<FestivalForm onSubmit={onSubmit} onCancel={onCancel} />);

      const description = getTextareaByName('description');
      await user.type(description, 'This is a test description');

      expect(description.value).toBe('This is a test description');
    });
  });
});
