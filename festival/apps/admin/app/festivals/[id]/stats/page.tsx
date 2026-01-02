'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { mockFestivals, mockTicketCategories, generateRevenueChartData, generateTicketSalesChartData } from '../../../../lib/mock-data';
import { formatCurrency, formatNumber, formatPercentage } from '../../../../lib/utils';
import RevenueChart from '../../../../components/dashboard/RevenueChart';
import TicketSalesChart from '../../../../components/dashboard/TicketSalesChart';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface StatsPageProps {
  params: Promise<{ id: string }>;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export default function StatsPage({ params }: StatsPageProps) {
  const { id } = use(params);
  const festival = mockFestivals.find((f) => f.id === id);
  const categories = mockTicketCategories.filter((c) => c.festivalId === id);

  const revenueData = useMemo(() => generateRevenueChartData(30), []);
  const ticketSalesData = useMemo(() => generateTicketSalesChartData(30), []);

  if (!festival) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Festival non trouve</h2>
          <Link href="/festivals" className="btn-primary mt-4 inline-block">
            Retour aux festivals
          </Link>
        </div>
      </div>
    );
  }

  const categoryData = categories.map((c) => ({
    name: c.name,
    value: c.sold,
    revenue: c.sold * c.price,
  }));

  const totalSold = categories.reduce((sum, c) => sum + c.sold, 0);
  const totalRevenue = categories.reduce((sum, c) => sum + c.sold * c.price, 0);
  const avgTicketPrice = totalSold > 0 ? totalRevenue / totalSold : 0;

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
        <Link href={`/festivals/${id}`} className="text-gray-500 hover:text-gray-700">
          {festival.name}
        </Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Statistiques</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-gray-500 mt-1">{festival.name}</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter le rapport
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        <Link
          href={`/festivals/${id}`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
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
          className="px-4 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-600 whitespace-nowrap"
        >
          Statistiques
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total des ventes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalSold)}</p>
          <p className="text-sm text-green-600 mt-1">+12% vs semaine derniere</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Chiffre d&apos;affaires</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-green-600 mt-1">+8% vs semaine derniere</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Prix moyen du billet</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(avgTicketPrice)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Taux de conversion</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">4.2%</p>
          <p className="text-sm text-red-600 mt-1">-0.3% vs semaine derniere</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenueData} />
        <TicketSalesChart data={ticketSalesData} />
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Repartition par categorie</h3>
          {categoryData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((_entry: { name: string; value: number; revenue: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={(props) => {
                      const { active, payload } = props;
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload as { name: string; value: number; revenue: number } | undefined;
                        return (
                          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                            <p className="font-medium text-gray-900">{data?.name}</p>
                            <p className="text-sm text-gray-600">{formatNumber(data?.value ?? 0)} billets</p>
                            <p className="text-sm text-gray-600">{formatCurrency(data?.revenue ?? 0)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Aucune donnee disponible
            </div>
          )}
        </div>

        {/* Category Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Detail par categorie</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Categorie</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Vendus</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Revenus</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Part</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((category, index) => {
                  const revenue = category.sold * category.price;
                  const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

                  return (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-gray-900">{category.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900">
                        {formatNumber(category.sold)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatCurrency(revenue)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {formatPercentage(share)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-6 py-4 font-semibold text-gray-900">Total</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {formatNumber(totalSold)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
