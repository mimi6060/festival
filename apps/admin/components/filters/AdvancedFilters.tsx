'use client';

import { useState, useCallback, useEffect } from 'react';

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'daterange' | 'text' | 'number-range';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export type FilterValue = Record<
  string,
  string | string[] | { from?: string; to?: string } | { min?: number; max?: number }
>;

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterValue;
  createdAt: string;
}

interface AdvancedFiltersProps {
  filters: FilterConfig[];
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  storageKey?: string;
  onExport?: () => void;
  showSavedFilters?: boolean;
}

const STORAGE_PREFIX = 'admin-filters-';

export function AdvancedFilters({
  filters,
  value,
  onChange,
  storageKey,
  onExport,
  showSavedFilters = true,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Load saved filters from localStorage
  useEffect(() => {
    if (storageKey && showSavedFilters) {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      if (stored) {
        try {
          setSavedFilters(JSON.parse(stored));
        } catch {
          setSavedFilters([]);
        }
      }
    }
  }, [storageKey, showSavedFilters]);

  // Save filters to localStorage
  const saveFilter = useCallback(() => {
    if (!filterName.trim() || !storageKey) {
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: value,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(updated));
    setFilterName('');
    setShowSaveDialog(false);
  }, [filterName, value, savedFilters, storageKey]);

  // Load a saved filter
  const loadFilter = useCallback(
    (filter: SavedFilter) => {
      onChange(filter.filters);
    },
    [onChange]
  );

  // Delete a saved filter
  const deleteFilter = useCallback(
    (filterId: string) => {
      const updated = savedFilters.filter((f) => f.id !== filterId);
      setSavedFilters(updated);
      if (storageKey) {
        localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(updated));
      }
    },
    [savedFilters, storageKey]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    const emptyValue: FilterValue = {};
    filters.forEach((f) => {
      if (f.type === 'multiselect') {
        emptyValue[f.id] = [];
      } else if (f.type === 'daterange') {
        emptyValue[f.id] = {};
      } else if (f.type === 'number-range') {
        emptyValue[f.id] = {};
      } else {
        emptyValue[f.id] = '';
      }
    });
    onChange(emptyValue);
  }, [filters, onChange]);

  // Count active filters
  const activeFilterCount = Object.entries(value).filter(([_, v]) => {
    if (Array.isArray(v)) {
      return v.length > 0;
    }
    if (typeof v === 'object') {
      return Object.values(v).some(Boolean);
    }
    return Boolean(v);
  }).length;

  const updateFilter = (filterId: string, newValue: FilterValue[string]) => {
    onChange({ ...value, [filterId]: newValue });
  };

  const renderFilter = (config: FilterConfig) => {
    const filterValue = value[config.id];

    switch (config.type) {
      case 'select':
        return (
          <select
            value={(filterValue as string) || ''}
            onChange={(e) => updateFilter(config.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{config.placeholder || 'Tous'}</option>
            {config.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect': {
        const selectedValues = (filterValue as string[]) || [];
        return (
          <div className="relative">
            <div className="flex flex-wrap gap-1 min-h-[38px] p-2 border border-gray-300 rounded-lg bg-white">
              {selectedValues.length === 0 && (
                <span className="text-gray-400 text-sm">
                  {config.placeholder || 'Sélectionner...'}
                </span>
              )}
              {selectedValues.map((val) => {
                const option = config.options?.find((o) => o.value === val);
                return (
                  <span
                    key={val}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {option?.label || val}
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter(
                          config.id,
                          selectedValues.filter((v) => v !== val)
                        );
                      }}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      &times;
                    </button>
                  </span>
                );
              })}
            </div>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !selectedValues.includes(e.target.value)) {
                  updateFilter(config.id, [...selectedValues, e.target.value]);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="">Ajouter...</option>
              {config.options
                ?.filter((opt) => !selectedValues.includes(opt.value))
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
          </div>
        );
      }

      case 'daterange': {
        const dateRange = (filterValue as { from?: string; to?: string }) || {};
        return (
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.from || ''}
              onChange={(e) => updateFilter(config.id, { ...dateRange, from: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Du"
            />
            <input
              type="date"
              value={dateRange.to || ''}
              onChange={(e) => updateFilter(config.id, { ...dateRange, to: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Au"
            />
          </div>
        );
      }

      case 'number-range': {
        const numRange = (filterValue as { min?: number; max?: number }) || {};
        return (
          <div className="flex gap-2">
            <input
              type="number"
              value={numRange.min ?? ''}
              onChange={(e) =>
                updateFilter(config.id, {
                  ...numRange,
                  min: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Min"
            />
            <input
              type="number"
              value={numRange.max ?? ''}
              onChange={(e) =>
                updateFilter(config.id, {
                  ...numRange,
                  max: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Max"
            />
          </div>
        );
      }

      case 'text':
      default:
        return (
          <input
            type="text"
            value={(filterValue as string) || ''}
            onChange={(e) => updateFilter(config.id, e.target.value)}
            placeholder={config.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Filtres avancés
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Réinitialiser
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Exporter
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Saved Filters */}
          {showSavedFilters && storageKey && savedFilters.length > 0 && (
            <div className="pb-4 border-b border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                Filtres sauvegardés
              </h4>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => loadFilter(filter)}
                      className="text-gray-700 hover:text-gray-900"
                    >
                      {filter.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFilter(filter.id)}
                      className="text-gray-400 hover:text-red-600 ml-1"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((config) => (
              <div key={config.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {config.label}
                </label>
                {renderFilter(config)}
              </div>
            ))}
          </div>

          {/* Save Filter Button */}
          {showSavedFilters && storageKey && (
            <div className="pt-4 border-t border-gray-200">
              {showSaveDialog ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="Nom du filtre..."
                    className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={saveFilter}
                    disabled={!filterName.trim()}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sauvegarder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveDialog(false);
                      setFilterName('');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={activeFilterCount === 0}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Sauvegarder ce filtre
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
