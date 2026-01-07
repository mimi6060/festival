'use client';

import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface PromoCodeInputProps {
  onApply: (code: string) => Promise<{
    valid: boolean;
    discountAmount?: number;
    finalAmount?: number;
    error?: string;
  }>;
  originalAmount: number;
  currency?: string;
}

export function PromoCodeInput({
  onApply,
  originalAmount: _originalAmount,
  currency = 'EUR',
}: PromoCodeInputProps) {
  const [promoCode, setPromoCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    discountAmount?: number;
    finalAmount?: number;
    error?: string;
  } | null>(null);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  const handleApply = async () => {
    if (!promoCode.trim()) {
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await onApply(promoCode.toUpperCase());
      setValidationResult(result);

      if (result.valid) {
        setAppliedCode(promoCode.toUpperCase());
      }
    } catch {
      setValidationResult({
        valid: false,
        error: 'Erreur lors de la validation du code promo',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    setPromoCode('');
    setAppliedCode(null);
    setValidationResult(null);
    onApply('').catch(console.error); // Reset to original amount
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="CODE PROMO"
            disabled={!!appliedCode || isValidating}
            className="uppercase"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApply();
              }
            }}
          />
        </div>
        {!appliedCode ? (
          <Button
            type="button"
            onClick={handleApply}
            disabled={!promoCode.trim() || isValidating}
            variant="secondary"
          >
            {isValidating ? 'Validation...' : 'Appliquer'}
          </Button>
        ) : (
          <Button type="button" onClick={handleRemove} variant="secondary">
            Retirer
          </Button>
        )}
      </div>

      {/* Validation Message */}
      {validationResult && (
        <div
          className={`p-3 rounded-lg text-sm ${
            validationResult.valid
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {validationResult.valid ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Code appliqué avec succès !</div>
                <div className="text-xs mt-1">
                  Réduction : -{validationResult.discountAmount?.toFixed(2)} {currency}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-70">Nouveau total</div>
                <div className="text-lg font-bold">
                  {validationResult.finalAmount?.toFixed(2)} {currency}
                </div>
              </div>
            </div>
          ) : (
            <div>{validationResult.error || 'Code promo invalide'}</div>
          )}
        </div>
      )}

      {/* Applied Code Summary */}
      {appliedCode && validationResult?.valid && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-400">Code promo:</span>{' '}
              <span className="font-mono font-bold text-primary-400">{appliedCode}</span>
            </div>
            <div className="text-green-400 font-semibold">
              -{validationResult.discountAmount?.toFixed(2)} {currency}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
