'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DataTable from '@/components/tables/DataTable';
import ExportButton from '@/components/export/ExportButton';
import { mockFestivals } from '@/lib/mock-data';
import { festivalExportColumns } from '@/lib/export';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getStatusColor,
  getStatusLabel,
} from '@/lib/utils';
import type { Festival, TableColumn } from '@/types';

export default function FestivalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredFestivals =
    statusFilter === 'all' ? mockFestivals : mockFestivals.filter((f) => f.status === statusFilter);

  const columns: TableColumn<Festival>[] = [
    {
      key: 'name',
      label: 'Festival',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {row.coverImage ? (
              <Image src={row.coverImage} alt={row.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-sm text-gray-500">
              {row.location.city}, {row.location.country}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'startDate',
      label: 'Dates',
      sortable: true,
      render: (_, row) => (
        <div className="text-sm">
          <p className="text-gray-900">
            {formatDate(row.startDate, { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-gray-500">
            au {formatDate(row.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (value) => (
        <span className={`badge ${getStatusColor(value as string)}`}>
          {getStatusLabel(value as string)}
        </span>
      ),
    },
    {
      key: 'ticketsSold',
      label: 'Billets',
      sortable: true,
      render: (_, row) => (
        <div className="text-sm">
          <p className="text-gray-900 font-medium">{formatNumber(row.ticketsSold)}</p>
          <p className="text-gray-500">/ {formatNumber(row.capacity)}</p>
        </div>
      ),
    },
    {
      key: 'revenue',
      label: 'Revenus',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">{formatCurrency(value as number)}</span>
      ),
    },
  ];

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'published', label: 'Publie' },
    { value: 'completed', label: 'Termine' },
    { value: 'cancelled', label: 'Annule' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Festivals</h1>
          <p className="text-gray-500 mt-1">Gerez vos festivals et suivez leurs performances.</p>
        </div>
        <Link href="/festivals/new" className="btn-primary flex items-center gap-2 w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau festival
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Statut:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <ExportButton
          data={filteredFestivals as unknown as Record<string, unknown>[]}
          columns={festivalExportColumns}
          filename="festivals"
          formats={['csv', 'excel']}
        />
      </div>

      {/* Table */}
      <DataTable
        data={filteredFestivals}
        columns={columns}
        searchPlaceholder="Rechercher un festival..."
        onRowClick={(festival) => {
          window.location.href = `/festivals/${festival.id}`;
        }}
        actions={(festival) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/festivals/${festival.id}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </Link>
            <Link
              href={`/festivals/${festival.id}/edit`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </Link>
            <button
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Handle delete
              }}
            >
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      />
    </div>
  );
}
