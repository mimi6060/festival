'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  soldToday: number;
  soldTotal: number;
  price: number;
  lastRestocked: string;
}

interface VendorInventoryDashboardProps {
  vendorId: string;
  festivalId: string;
  onRestock?: (productId: string, quantity: number) => Promise<void>;
  onUpdateAlert?: (productId: string, minStock: number) => Promise<void>;
}

type StockStatus = 'ok' | 'low' | 'critical' | 'out';

// Mock data generator
function generateMockProducts(): Product[] {
  const products = [
    { name: 'Bière pression', category: 'Boissons', base: 200 },
    { name: 'Eau 50cl', category: 'Boissons', base: 500 },
    { name: 'Coca-Cola', category: 'Boissons', base: 300 },
    { name: 'Hot-dog', category: 'Nourriture', base: 150 },
    { name: 'Frites', category: 'Nourriture', base: 200 },
    { name: 'Burger végé', category: 'Nourriture', base: 100 },
    { name: 'Chips', category: 'Snacks', base: 400 },
    { name: 'Barres énergétiques', category: 'Snacks', base: 250 },
    { name: 'T-shirt Festival', category: 'Merchandise', base: 100 },
    { name: 'Casquette', category: 'Merchandise', base: 75 },
  ];

  return products.map((p, i) => {
    const maxStock = p.base;
    const sold = Math.floor(Math.random() * maxStock * 0.8);
    const currentStock = maxStock - sold;
    const minStock = Math.floor(maxStock * 0.2);

    return {
      id: `product-${i + 1}`,
      name: p.name,
      category: p.category,
      currentStock,
      minStock,
      maxStock,
      soldToday: Math.floor(sold * 0.3),
      soldTotal: sold,
      price: [3.5, 2, 3, 5, 4, 7, 2.5, 3, 25, 15][i],
      lastRestocked: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    };
  });
}

function getStockStatus(product: Product): StockStatus {
  if (product.currentStock === 0) {
    return 'out';
  }
  if (product.currentStock <= product.minStock * 0.5) {
    return 'critical';
  }
  if (product.currentStock <= product.minStock) {
    return 'low';
  }
  return 'ok';
}

const STATUS_COLORS: Record<StockStatus, { bg: string; text: string; border: string }> = {
  ok: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  low: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  critical: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  out: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const STATUS_LABELS: Record<StockStatus, string> = {
  ok: 'OK',
  low: 'Stock bas',
  critical: 'Critique',
  out: 'Rupture',
};

export function VendorInventoryDashboard({
  vendorId,
  festivalId,
  onRestock,
  onUpdateAlert,
}: VendorInventoryDashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'sold'>('stock');
  const [restockModal, setRestockModal] = useState<{ product: Product; quantity: number } | null>(
    null
  );
  const [alertModal, setAlertModal] = useState<{ product: Product; minStock: number } | null>(null);

  // Load products
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setProducts(generateMockProducts());
      setLoading(false);
    }, 500);
  }, [vendorId, festivalId]);

  // Categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Filter and sort products
  const displayProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stock':
          return a.currentStock - b.currentStock;
        case 'sold':
          return b.soldToday - a.soldToday;
        default:
          return 0;
      }
    });
  }, [products, selectedCategory, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const lowStockCount = products.filter((p) =>
      ['low', 'critical', 'out'].includes(getStockStatus(p))
    ).length;
    const outOfStockCount = products.filter((p) => p.currentStock === 0).length;
    const totalRevenue = products.reduce((sum, p) => sum + p.soldToday * p.price, 0);
    const totalSold = products.reduce((sum, p) => sum + p.soldToday, 0);

    return { lowStockCount, outOfStockCount, totalRevenue, totalSold };
  }, [products]);

  const handleRestock = useCallback(async () => {
    if (!restockModal || !onRestock) {
      return;
    }

    try {
      await onRestock(restockModal.product.id, restockModal.quantity);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === restockModal.product.id
            ? {
                ...p,
                currentStock: p.currentStock + restockModal.quantity,
                lastRestocked: new Date().toISOString(),
              }
            : p
        )
      );
      setRestockModal(null);
    } catch {
      // Handle error
    }
  }, [restockModal, onRestock]);

  const handleUpdateAlert = useCallback(async () => {
    if (!alertModal || !onUpdateAlert) {
      return;
    }

    try {
      await onUpdateAlert(alertModal.product.id, alertModal.minStock);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === alertModal.product.id ? { ...p, minStock: alertModal.minStock } : p
        )
      );
      setAlertModal(null);
    } catch {
      // Handle error
    }
  }, [alertModal, onUpdateAlert]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Produits vendus aujourd'hui</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSold}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Revenus du jour</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toFixed(2)} EUR</p>
        </div>
        <div
          className={cn(
            'rounded-lg border p-4',
            stats.lowStockCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
          )}
        >
          <p className="text-sm text-gray-500">Stock bas</p>
          <p
            className={cn(
              'text-2xl font-bold',
              stats.lowStockCount > 0 ? 'text-yellow-700' : 'text-gray-900'
            )}
          >
            {stats.lowStockCount}
          </p>
        </div>
        <div
          className={cn(
            'rounded-lg border p-4',
            stats.outOfStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
          )}
        >
          <p className="text-sm text-gray-500">Ruptures</p>
          <p
            className={cn(
              'text-2xl font-bold',
              stats.outOfStockCount > 0 ? 'text-red-700' : 'text-gray-900'
            )}
          >
            {stats.outOfStockCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {cat === 'all' ? 'Tous' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Trier par:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
          >
            <option value="stock">Stock (croissant)</option>
            <option value="sold">Ventes (décroissant)</option>
            <option value="name">Nom</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayProducts.map((product) => {
          const status = getStockStatus(product);
          const colors = STATUS_COLORS[status];
          const stockPercent = (product.currentStock / product.maxStock) * 100;

          return (
            <div key={product.id} className={cn('rounded-lg border p-4', colors.bg, colors.border)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
                <span
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    colors.bg,
                    colors.text,
                    'border',
                    colors.border
                  )}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>

              {/* Stock Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Stock</span>
                  <span className="font-medium">
                    {product.currentStock} / {product.maxStock}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      status === 'ok'
                        ? 'bg-green-500'
                        : status === 'low'
                          ? 'bg-yellow-500'
                          : status === 'critical'
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                    )}
                    style={{ width: `${Math.max(0, stockPercent)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Alerte sous {product.minStock} unités</p>
              </div>

              {/* Sales */}
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-600">Vendus aujourd'hui</span>
                <span className="font-medium text-blue-600">{product.soldToday}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setRestockModal({ product, quantity: product.maxStock - product.currentStock })
                  }
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Réapprovisionner
                </button>
                <button
                  onClick={() => setAlertModal({ product, minStock: product.minStock })}
                  className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Alerte
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Restock Modal */}
      {restockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Réapprovisionner {restockModal.product.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Stock actuel: {restockModal.product.currentStock} / {restockModal.product.maxStock}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité à ajouter
              </label>
              <input
                type="number"
                value={restockModal.quantity}
                onChange={(e) =>
                  setRestockModal({ ...restockModal, quantity: parseInt(e.target.value) || 0 })
                }
                min={1}
                max={restockModal.product.maxStock - restockModal.product.currentStock}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRestockModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRestock}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Configurer l'alerte - {alertModal.product.name}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seuil d'alerte (stock minimum)
              </label>
              <input
                type="number"
                value={alertModal.minStock}
                onChange={(e) =>
                  setAlertModal({ ...alertModal, minStock: parseInt(e.target.value) || 0 })
                }
                min={1}
                max={alertModal.product.maxStock}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Une notification sera envoyée quand le stock descend sous ce seuil
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAlertModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateAlert}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
