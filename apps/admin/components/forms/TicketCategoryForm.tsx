'use client';

import { useState } from 'react';
import type { TicketCategory } from '../../types';

interface TicketCategoryFormProps {
  category?: TicketCategory;
  festivalId: string;
  onSubmit: (data: Partial<TicketCategory>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function TicketCategoryForm({
  category,
  festivalId,
  onSubmit,
  onCancel,
  loading = false,
}: TicketCategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    price: category?.price || 0,
    currency: category?.currency || 'EUR',
    quantity: category?.quantity || 0,
    maxPerOrder: category?.maxPerOrder || 4,
    salesStart: category?.salesStart?.split('T')[0] || '',
    salesEnd: category?.salesEnd?.split('T')[0] || '',
    isActive: category?.isActive ?? true,
    benefits: category?.benefits?.join('\n') || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    if (formData.price < 0) {
      newErrors.price = 'Le prix doit etre positif';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'La quantite doit etre superieure a 0';
    }
    if (formData.maxPerOrder <= 0) {
      newErrors.maxPerOrder = 'Le max par commande doit etre superieur a 0';
    }
    if (!formData.salesStart) {
      newErrors.salesStart = 'La date de debut des ventes est requise';
    }
    if (!formData.salesEnd) {
      newErrors.salesEnd = 'La date de fin des ventes est requise';
    }
    if (formData.salesStart && formData.salesEnd && formData.salesStart > formData.salesEnd) {
      newErrors.salesEnd = 'La date de fin doit etre apres la date de debut';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const categoryData: Partial<TicketCategory> = {
      festivalId,
      name: formData.name,
      description: formData.description || undefined,
      price: Number(formData.price),
      currency: formData.currency,
      quantity: Number(formData.quantity),
      maxPerOrder: Number(formData.maxPerOrder),
      salesStart: new Date(formData.salesStart).toISOString(),
      salesEnd: new Date(formData.salesEnd).toISOString(),
      isActive: formData.isActive,
      benefits: formData.benefits
        .split('\n')
        .map((b) => b.trim())
        .filter((b) => b.length > 0),
    };

    onSubmit(categoryData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="form-label">Nom de la categorie *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`input-field ${errors.name ? 'border-red-500' : ''}`}
          placeholder="Ex: Pass VIP"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="form-label">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={2}
          className="input-field"
          placeholder="Description de la categorie..."
        />
      </div>

      {/* Price & Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Prix *</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            className={`input-field ${errors.price ? 'border-red-500' : ''}`}
            placeholder="0.00"
          />
          {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
        </div>
        <div>
          <label className="form-label">Devise</label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="input-field"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CHF">CHF</option>
          </select>
        </div>
      </div>

      {/* Quantity & Max per Order */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Quantite disponible *</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            min="1"
            className={`input-field ${errors.quantity ? 'border-red-500' : ''}`}
            placeholder="100"
          />
          {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
        </div>
        <div>
          <label className="form-label">Max par commande *</label>
          <input
            type="number"
            name="maxPerOrder"
            value={formData.maxPerOrder}
            onChange={handleChange}
            min="1"
            className={`input-field ${errors.maxPerOrder ? 'border-red-500' : ''}`}
            placeholder="4"
          />
          {errors.maxPerOrder && <p className="text-red-500 text-sm mt-1">{errors.maxPerOrder}</p>}
        </div>
      </div>

      {/* Sales Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Debut des ventes *</label>
          <input
            type="date"
            name="salesStart"
            value={formData.salesStart}
            onChange={handleChange}
            className={`input-field ${errors.salesStart ? 'border-red-500' : ''}`}
          />
          {errors.salesStart && <p className="text-red-500 text-sm mt-1">{errors.salesStart}</p>}
        </div>
        <div>
          <label className="form-label">Fin des ventes *</label>
          <input
            type="date"
            name="salesEnd"
            value={formData.salesEnd}
            onChange={handleChange}
            className={`input-field ${errors.salesEnd ? 'border-red-500' : ''}`}
          />
          {errors.salesEnd && <p className="text-red-500 text-sm mt-1">{errors.salesEnd}</p>}
        </div>
      </div>

      {/* Benefits */}
      <div>
        <label className="form-label">Avantages (un par ligne)</label>
        <textarea
          name="benefits"
          value={formData.benefits}
          onChange={handleChange}
          rows={3}
          className="input-field"
          placeholder="Acces VIP&#10;Open bar&#10;Meet & Greet"
        />
        <p className="text-xs text-gray-500 mt-1">Entrez un avantage par ligne</p>
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="isActive" className="text-sm text-gray-700">
          Categorie active (visible et achetable)
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          type="submit"
          className="btn-primary flex items-center gap-2"
          disabled={loading}
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {category ? 'Enregistrer' : 'Creer la categorie'}
        </button>
      </div>
    </form>
  );
}
