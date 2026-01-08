/**
 * PromoCodeInput Component Tests
 *
 * Tests for the PromoCodeInput component covering:
 * - Component rendering
 * - User interactions (input, button clicks)
 * - Promo code validation (success, error)
 * - Props handling
 * - Loading states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromoCodeInput } from './PromoCodeInput';

describe('PromoCodeInput Component', () => {
  // Default mock function for onApply
  const mockOnApply = jest.fn();

  beforeEach(() => {
    mockOnApply.mockClear();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('Rendering', () => {
    it('should render input field', () => {
      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      expect(screen.getByPlaceholderText('CODE PROMO')).toBeInTheDocument();
    });

    it('should render apply button', () => {
      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      expect(screen.getByRole('button', { name: /appliquer/i })).toBeInTheDocument();
    });

    it('should render with default EUR currency', () => {
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 10,
        finalAmount: 90,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      // Currency will be shown after applying a code
      expect(screen.getByRole('button', { name: /appliquer/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Input Behavior Tests
  // ==========================================================================
  describe('Input Behavior', () => {
    it('should convert input to uppercase', async () => {
      const user = userEvent.setup();

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'promo2024');

      expect(input).toHaveValue('PROMO2024');
    });

    it('should disable input when code is applied', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 10,
        finalAmount: 90,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'VALID123');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });

    it('should call onApply when Enter key is pressed', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({ valid: false, error: 'Invalid code' });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'TESTCODE');
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith('TESTCODE');
      });
    });
  });

  // ==========================================================================
  // Button State Tests
  // ==========================================================================
  describe('Button States', () => {
    it('should disable button when input is empty', () => {
      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const button = screen.getByRole('button', { name: /appliquer/i });
      expect(button).toBeDisabled();
    });

    it('should enable button when input has text', async () => {
      const user = userEvent.setup();

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'CODE');

      const button = screen.getByRole('button', { name: /appliquer/i });
      expect(button).not.toBeDisabled();
    });

    it('should show loading text when validating', async () => {
      const user = userEvent.setup();
      // Create a promise that we can control
      let resolvePromise: ((value: unknown) => void) | undefined;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockOnApply.mockReturnValue(pendingPromise);

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'CODE');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('Validation...')).toBeInTheDocument();
      });

      // Clean up the promise
      if (resolvePromise) {
        resolvePromise({ valid: false });
      }
    });

    it('should show "Retirer" button after code is applied', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 10,
        finalAmount: 90,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'VALID');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retirer/i })).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Valid Promo Code Tests
  // ==========================================================================
  describe('Valid Promo Code', () => {
    it('should display success message on valid code', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 15,
        finalAmount: 85,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'VALID15');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('Code appliqué avec succès !')).toBeInTheDocument();
      });
    });

    it('should display discount amount', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 20,
        finalAmount: 80,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} currency="EUR" />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'DISCOUNT20');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText(/réduction.*-20\.00.*EUR/i)).toBeInTheDocument();
      });
    });

    it('should display new total amount', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 25,
        finalAmount: 75,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'SAVE25');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('75.00 EUR')).toBeInTheDocument();
      });
    });

    it('should display applied code in summary', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 10,
        finalAmount: 90,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'MYCODE');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('MYCODE')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Invalid Promo Code Tests
  // ==========================================================================
  describe('Invalid Promo Code', () => {
    it('should display error message on invalid code', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: false,
        error: 'Code promo invalide',
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'INVALIDCODE');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('Code promo invalide')).toBeInTheDocument();
      });
    });

    it('should display default error when no message provided', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: false,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'BADCODE');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('Code promo invalide')).toBeInTheDocument();
      });
    });

    it('should not disable input on invalid code', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: false,
        error: 'Invalid',
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'WRONG');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });

    it('should display error when onApply throws exception', async () => {
      const user = userEvent.setup();
      mockOnApply.mockRejectedValue(new Error('Network error'));

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'ERROR');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('Erreur lors de la validation du code promo')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Remove Code Tests
  // ==========================================================================
  describe('Remove Code', () => {
    it('should remove code when "Retirer" is clicked', async () => {
      const user = userEvent.setup();
      mockOnApply
        .mockResolvedValueOnce({
          valid: true,
          discountAmount: 10,
          finalAmount: 90,
        })
        .mockResolvedValueOnce({
          valid: true,
          discountAmount: 0,
          finalAmount: 100,
        });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      // Apply code first
      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'REMOVE');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      // Wait for code to be applied
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retirer/i })).toBeInTheDocument();
      });

      // Remove the code
      await user.click(screen.getByRole('button', { name: /retirer/i }));

      // Should show apply button again
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /appliquer/i })).toBeInTheDocument();
      });
    });

    it('should clear input when code is removed', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 10,
        finalAmount: 90,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'CLEAR');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retirer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /retirer/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('CODE PROMO')).toHaveValue('');
      });
    });

    it('should call onApply with empty string when removed', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 10,
        finalAmount: 90,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'TRACK');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retirer/i })).toBeInTheDocument();
      });

      mockOnApply.mockClear();
      await user.click(screen.getByRole('button', { name: /retirer/i }));

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith('');
      });
    });

    it('should hide validation messages when code is removed', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 10,
        finalAmount: 90,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'HIDE');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('Code appliqué avec succès !')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /retirer/i }));

      await waitFor(() => {
        expect(screen.queryByText('Code appliqué avec succès !')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Currency Tests
  // ==========================================================================
  describe('Currency', () => {
    it('should display custom currency', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 10,
        finalAmount: 90,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} currency="USD" />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'USD');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('90.00 USD')).toBeInTheDocument();
      });
    });

    it('should default to EUR currency', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 5,
        finalAmount: 95,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'DEFAULT');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('95.00 EUR')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should not call onApply with whitespace-only input', async () => {
      const user = userEvent.setup();

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, '   ');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      expect(mockOnApply).not.toHaveBeenCalled();
    });

    it('should handle zero discount amount', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 0,
        finalAmount: 100,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'ZERO');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('100.00 EUR')).toBeInTheDocument();
      });
    });

    it('should handle 100% discount', async () => {
      const user = userEvent.setup();
      mockOnApply.mockResolvedValue({
        valid: true,
        discountAmount: 100,
        finalAmount: 0,
      });

      render(<PromoCodeInput onApply={mockOnApply} originalAmount={100} />);

      const input = screen.getByPlaceholderText('CODE PROMO');
      await user.type(input, 'FREE');
      await user.click(screen.getByRole('button', { name: /appliquer/i }));

      await waitFor(() => {
        expect(screen.getByText('0.00 EUR')).toBeInTheDocument();
      });
    });
  });
});
