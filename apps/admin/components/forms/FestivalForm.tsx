'use client';

import { useState } from 'react';
import type { Festival } from '../../types';

interface FestivalFormProps {
  festival?: Festival;
  onSubmit: (data: Partial<Festival>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function FestivalForm({
  festival,
  onSubmit,
  onCancel,
  loading = false,
}: FestivalFormProps) {
  const [formData, setFormData] = useState({
    name: festival?.name || '',
    description: festival?.description || '',
    startDate: festival?.startDate?.split('T')[0] || '',
    endDate: festival?.endDate?.split('T')[0] || '',
    locationName: festival?.location?.name || '',
    locationAddress: festival?.location?.address || '',
    locationCity: festival?.location?.city || '',
    locationCountry: festival?.location?.country || 'France',
    capacity: festival?.capacity || 0,
    status: festival?.status || 'draft',
    coverImage: festival?.coverImage || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'La date de debut est requise';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'La date de fin est requise';
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'La date de fin doit etre apres la date de debut';
    }
    if (!formData.locationName.trim()) {
      newErrors.locationName = 'Le nom du lieu est requis';
    }
    if (!formData.locationCity.trim()) {
      newErrors.locationCity = 'La ville est requise';
    }
    if (formData.capacity <= 0) {
      newErrors.capacity = 'La capacite doit etre superieure a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {return;}

    const festivalData: Partial<Festival> = {
      name: formData.name,
      description: formData.description,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      location: {
        name: formData.locationName,
        address: formData.locationAddress,
        city: formData.locationCity,
        country: formData.locationCountry,
      },
      capacity: Number(formData.capacity),
      status: formData.status as Festival['status'],
      coverImage: formData.coverImage || undefined,
    };

    onSubmit(festivalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations generales</h2>
        <div className="space-y-4">
          <div>
            <label className="form-label">Nom du festival *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input-field ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Ex: Summer Beats Festival"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="form-label">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`input-field ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Decrivez votre festival..."
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="form-label">Image de couverture (URL)</label>
            <input
              type="url"
              name="coverImage"
              value={formData.coverImage}
              onChange={handleChange}
              className="input-field"
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dates de l&apos;evenement</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Date de debut *</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={`input-field ${errors.startDate ? 'border-red-500' : ''}`}
            />
            {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
          </div>
          <div>
            <label className="form-label">Date de fin *</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={`input-field ${errors.endDate ? 'border-red-500' : ''}`}
            />
            {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lieu</h2>
        <div className="space-y-4">
          <div>
            <label className="form-label">Nom du lieu *</label>
            <input
              type="text"
              name="locationName"
              value={formData.locationName}
              onChange={handleChange}
              className={`input-field ${errors.locationName ? 'border-red-500' : ''}`}
              placeholder="Ex: Parc des Expositions"
            />
            {errors.locationName && <p className="text-red-500 text-sm mt-1">{errors.locationName}</p>}
          </div>
          <div>
            <label className="form-label">Adresse</label>
            <input
              type="text"
              name="locationAddress"
              value={formData.locationAddress}
              onChange={handleChange}
              className="input-field"
              placeholder="Ex: 1 Place de la Porte de Versailles"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Ville *</label>
              <input
                type="text"
                name="locationCity"
                value={formData.locationCity}
                onChange={handleChange}
                className={`input-field ${errors.locationCity ? 'border-red-500' : ''}`}
                placeholder="Paris"
              />
              {errors.locationCity && <p className="text-red-500 text-sm mt-1">{errors.locationCity}</p>}
            </div>
            <div>
              <label className="form-label">Pays</label>
              <select
                name="locationCountry"
                value={formData.locationCountry}
                onChange={handleChange}
                className="input-field"
              >
                <option value="France">France</option>
                <option value="Belgium">Belgique</option>
                <option value="Switzerland">Suisse</option>
                <option value="Luxembourg">Luxembourg</option>
                <option value="Germany">Allemagne</option>
                <option value="Spain">Espagne</option>
                <option value="Italy">Italie</option>
                <option value="United Kingdom">Royaume-Uni</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity & Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Capacite totale *</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min="1"
              className={`input-field ${errors.capacity ? 'border-red-500' : ''}`}
              placeholder="10000"
            />
            {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity}</p>}
          </div>
          <div>
            <label className="form-label">Statut</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="input-field"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publie</option>
              <option value="cancelled">Annule</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
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
          {festival ? 'Enregistrer' : 'Creer le festival'}
        </button>
      </div>
    </form>
  );
}
