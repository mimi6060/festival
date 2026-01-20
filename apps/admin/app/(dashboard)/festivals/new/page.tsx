'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FestivalForm from '@/components/forms/FestivalForm';
import { festivalsApi } from '@/lib/api';
import type { Festival } from '@/types';

export default function NewFestivalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Partial<Festival>) => {
    setLoading(true);
    setError(null);
    try {
      const createdFestival = await festivalsApi.create(data);
      // Redirect to festival detail page on success
      router.push(`/festivals/${createdFestival.id}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la creation du festival';
      setError(errorMessage);
      console.error('Error creating festival:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/festivals');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/festivals" className="text-gray-500 hover:text-gray-700">
          Festivals
        </Link>
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Nouveau festival</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Creer un nouveau festival</h1>
        <p className="text-gray-500 mt-1">Remplissez les informations pour creer votre festival.</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-700 font-medium">Erreur</p>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Form */}
      <FestivalForm onSubmit={handleSubmit} onCancel={handleCancel} loading={loading} />
    </div>
  );
}
