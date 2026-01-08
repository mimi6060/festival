'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FestivalForm from '@/components/forms/FestivalForm';
import type { Festival } from '@/types';

export default function NewFestivalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Partial<Festival>) => {
    setLoading(true);
    try {
      // Simulation de la création
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Festival created:', data);

      // Rediriger vers la liste des festivals
      router.push('/festivals');
    } catch (error) {
      console.error('Error creating festival:', error);
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
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Nouveau festival</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Creer un nouveau festival</h1>
        <p className="text-gray-500 mt-1">
          Remplissez les informations pour creer votre festival.
        </p>
      </div>

      {/* Form */}
      <FestivalForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
}
