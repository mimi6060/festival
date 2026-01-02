'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FestivalForm from '../../../../components/forms/FestivalForm';
import { mockFestivals } from '../../../../lib/mock-data';
import type { Festival } from '../../../../types';

interface EditFestivalPageProps {
  params: Promise<{ id: string }>;
}

export default function EditFestivalPage({ params }: EditFestivalPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const festival = mockFestivals.find((f) => f.id === id);

  if (!festival) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Festival non trouve</h2>
          <p className="text-gray-500 mt-2">Le festival demande n&apos;existe pas.</p>
          <Link href="/festivals" className="btn-primary mt-4 inline-block">
            Retour aux festivals
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: Partial<Festival>) => {
    setLoading(true);
    try {
      // Simulation de la mise a jour
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Festival updated:', { id, ...data });

      // Rediriger vers la page du festival
      router.push(`/festivals/${id}`);
    } catch (error) {
      console.error('Error updating festival:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/festivals/${id}`);
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
        <Link href={`/festivals/${id}`} className="text-gray-500 hover:text-gray-700">
          {festival.name}
        </Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Modifier</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le festival</h1>
        <p className="text-gray-500 mt-1">
          Modifiez les informations de {festival.name}.
        </p>
      </div>

      {/* Form */}
      <FestivalForm
        festival={festival}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
}
