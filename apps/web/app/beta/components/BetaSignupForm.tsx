'use client';

import { useState } from 'react';
import { z } from 'zod';

// Validation schema avec Zod
const betaSignupSchema = z.object({
  email: z.string().email('Veuillez entrer une adresse email valide'),
  festivalName: z.string().min(2, 'Le nom du festival doit contenir au moins 2 caractères'),
  estimatedSize: z.enum(['small', 'medium', 'large', 'xlarge']),
  message: z.string().optional(),
});

type BetaSignupFormData = z.infer<typeof betaSignupSchema>;

export function BetaSignupForm() {
  const [formData, setFormData] = useState<BetaSignupFormData>({
    email: '',
    festivalName: '',
    estimatedSize: 'medium',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation avec Zod
    const result = betaSignupSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result.data),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du formulaire');
      }

      setIsSuccess(true);
      setFormData({
        email: '',
        festivalName: '',
        estimatedSize: 'medium',
        message: '',
      });
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-2xl p-12 text-center backdrop-blur-sm animate-fadeIn">
        <div className="text-6xl mb-6">✓</div>
        <h3 className="text-2xl font-bold mb-4 text-white">Merci pour votre inscription !</h3>
        <p className="text-gray-300 mb-6">
          Nous avons bien reçu votre demande. Notre équipe va l'examiner et vous contactera dans les 48h.
        </p>
        <p className="text-sm text-gray-400">
          Vérifiez votre boîte mail (et les spams !) pour notre email de confirmation.
        </p>
        <button
          onClick={() => setIsSuccess(false)}
          className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full font-semibold transition"
        >
          Soumettre une autre demande
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
      <div className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-200">
            Email professionnel <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-3 bg-white/10 border ${
              errors.email ? 'border-red-500' : 'border-white/20'
            } rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition text-white placeholder-gray-400`}
            placeholder="votre.email@festival.com"
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Festival Name */}
        <div>
          <label htmlFor="festivalName" className="block text-sm font-medium mb-2 text-gray-200">
            Nom du festival <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="festivalName"
            name="festivalName"
            value={formData.festivalName}
            onChange={handleChange}
            className={`w-full px-4 py-3 bg-white/10 border ${
              errors.festivalName ? 'border-red-500' : 'border-white/20'
            } rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition text-white placeholder-gray-400`}
            placeholder="Festival des Étoiles"
            disabled={isSubmitting}
          />
          {errors.festivalName && (
            <p className="mt-1 text-sm text-red-400">{errors.festivalName}</p>
          )}
        </div>

        {/* Estimated Size */}
        <div>
          <label htmlFor="estimatedSize" className="block text-sm font-medium mb-2 text-gray-200">
            Taille estimée du festival <span className="text-red-400">*</span>
          </label>
          <select
            id="estimatedSize"
            name="estimatedSize"
            value={formData.estimatedSize}
            onChange={handleChange}
            className={`w-full px-4 py-3 bg-white/10 border ${
              errors.estimatedSize ? 'border-red-500' : 'border-white/20'
            } rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition text-white cursor-pointer`}
            disabled={isSubmitting}
          >
            <option value="small" className="bg-slate-800">Petit (moins de 5 000 participants)</option>
            <option value="medium" className="bg-slate-800">Moyen (5 000 - 20 000 participants)</option>
            <option value="large" className="bg-slate-800">Grand (20 000 - 100 000 participants)</option>
            <option value="xlarge" className="bg-slate-800">Très grand (plus de 100 000 participants)</option>
          </select>
          {errors.estimatedSize && (
            <p className="mt-1 text-sm text-red-400">{errors.estimatedSize}</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2 text-gray-200">
            Parlez-nous de votre projet (optionnel)
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition text-white placeholder-gray-400 resize-none"
            placeholder="Décrivez vos besoins spécifiques, vos défis actuels, ou ce que vous attendez de la plateforme..."
            disabled={isSubmitting}
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
            isSubmitting ? 'animate-pulse' : ''
          }`}
        >
          {isSubmitting ? 'Envoi en cours...' : 'Rejoindre le programme Beta'}
        </button>

        <p className="text-center text-sm text-gray-400">
          En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe.
        </p>
      </div>
    </form>
  );
}
