'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { mockFestivals, mockTicketCategories } from '../../../lib/mock-data';
import { formatCurrency, formatDate, formatNumber, formatPercentage, getStatusColor, getStatusLabel } from '../../../lib/utils';
import StatCard from '../../../components/dashboard/StatCard';

interface FestivalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function FestivalDetailPage({ params }: FestivalDetailPageProps) {
  const { id } = use(params);
  const festival = mockFestivals.find((f) => f.id === id);
  const categories = mockTicketCategories.filter((c) => c.festivalId === id);

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

  const soldPercentage = festival.capacity > 0 ? (festival.ticketsSold / festival.capacity) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/festivals" className="text-gray-500 hover:text-gray-700">
          Festivals
        </Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">{festival.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="relative h-48 sm:h-64">
          {festival.coverImage ? (
            <Image
              src={festival.coverImage}
              alt={festival.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-400" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div>
                <span className={`badge ${getStatusColor(festival.status)} mb-2`}>
                  {getStatusLabel(festival.status)}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{festival.name}</h1>
                <p className="text-white/80 mt-1">
                  {festival.location.name} - {festival.location.city}, {festival.location.country}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/festivals/${id}/edit`}
                  className="btn-secondary bg-white/90 hover:bg-white"
                >
                  Modifier
                </Link>
                {festival.status === 'draft' && (
                  <button className="btn-primary">
                    Publier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Billets vendus"
          value={festival.ticketsSold}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          }
          color="purple"
        />
        <StatCard
          title="Capacite"
          value={festival.capacity}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Revenus"
          value={festival.revenue}
          type="currency"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Taux de remplissage"
          value={soldPercentage}
          type="percentage"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="orange"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        <Link
          href={`/festivals/${id}`}
          className="px-4 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-600 whitespace-nowrap"
        >
          Vue d&apos;ensemble
        </Link>
        <Link
          href={`/festivals/${id}/tickets`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Billets
        </Link>
        <Link
          href={`/festivals/${id}/lineup`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Lineup
        </Link>
        <Link
          href={`/festivals/${id}/vendors`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Vendeurs
        </Link>
        <Link
          href={`/festivals/${id}/stages`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Scenes
        </Link>
        <Link
          href={`/festivals/${id}/stats`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Statistiques
        </Link>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-600">{festival.description}</p>
          </div>

          {/* Ticket Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Categories de billets</h2>
              <Link
                href={`/festivals/${id}/tickets`}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Gerer les billets
              </Link>
            </div>
            <div className="space-y-4">
              {categories.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Aucune categorie de billets configuree.
                </p>
              ) : (
                categories.map((category) => {
                  const soldPercent = category.quantity > 0
                    ? (category.sold / category.quantity) * 100
                    : 0;
                  return (
                    <div key={category.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{category.name}</h3>
                          <p className="text-sm text-gray-500">{category.description}</p>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCurrency(category.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                        <span>{formatNumber(category.sold)} / {formatNumber(category.quantity)} vendus</span>
                        <span>{formatPercentage(soldPercent)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            soldPercent >= 90
                              ? 'bg-red-500'
                              : soldPercent >= 70
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(soldPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          {/* Event Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500">Dates</dt>
                <dd className="text-gray-900 font-medium mt-1">
                  {formatDate(festival.startDate)} - {formatDate(festival.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Lieu</dt>
                <dd className="text-gray-900 font-medium mt-1">
                  {festival.location.name}
                  <br />
                  <span className="text-sm text-gray-500 font-normal">
                    {festival.location.address}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Cree le</dt>
                <dd className="text-gray-900 font-medium mt-1">
                  {formatDate(festival.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Derniere modification</dt>
                <dd className="text-gray-900 font-medium mt-1">
                  {formatDate(festival.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
            <div className="space-y-2">
              <Link
                href={`/festivals/${id}/tickets`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Gerer les billets</p>
                  <p className="text-sm text-gray-500">Categories et tarifs</p>
                </div>
              </Link>
              <Link
                href={`/festivals/${id}/stats`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Statistiques</p>
                  <p className="text-sm text-gray-500">Ventes et performances</p>
                </div>
              </Link>
              <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors w-full text-left">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Exporter les donnees</p>
                  <p className="text-sm text-gray-500">CSV ou Excel</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
