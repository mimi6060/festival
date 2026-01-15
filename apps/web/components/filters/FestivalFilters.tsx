'use client';

import React, { useState, useCallback, useMemo } from 'react';

// ============================================
// Types
// ============================================

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface DateRangeFilter {
  start: Date | null;
  end: Date | null;
}

export interface PriceRangeFilter {
  min: number | null;
  max: number | null;
}

export interface FestivalFiltersState {
  genres: string[];
  dateRange: DateRangeFilter;
  priceRange: PriceRangeFilter;
  locations: string[];
  status: string[];
  sortBy: 'date' | 'price' | 'popularity' | 'name';
  sortOrder: 'asc' | 'desc';
}

interface FestivalFiltersProps {
  filters: FestivalFiltersState;
  onFiltersChange: (filters: FestivalFiltersState) => void;
  genreOptions: FilterOption[];
  locationOptions: FilterOption[];
  statusOptions?: FilterOption[];
  priceMin?: number;
  priceMax?: number;
  showStatusFilter?: boolean;
  variant?: 'horizontal' | 'vertical' | 'drawer';
  className?: string;
}

// ============================================
// Default Filter State
// ============================================

export const defaultFilters: FestivalFiltersState = {
  genres: [],
  dateRange: { start: null, end: null },
  priceRange: { min: null, max: null },
  locations: [],
  status: [],
  sortBy: 'date',
  sortOrder: 'asc',
};

// ============================================
// Icons
// ============================================

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ============================================
// Dropdown Filter Component
// ============================================

interface DropdownFilterProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  className?: string;
}

function DropdownFilter({
  label,
  options,
  selectedValues,
  onChange,
  multiple = true,
  className = '',
}: DropdownFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = useCallback(
    (value: string) => {
      if (multiple) {
        const newValues = selectedValues.includes(value)
          ? selectedValues.filter((v) => v !== value)
          : [...selectedValues, value];
        onChange(newValues);
      } else {
        onChange([value]);
        setIsOpen(false);
      }
    },
    [selectedValues, onChange, multiple]
  );

  const displayValue = useMemo(() => {
    if (selectedValues.length === 0) {return label;}
    if (selectedValues.length === 1) {
      const option = options.find((o) => o.value === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
    return `${selectedValues.length} selected`;
  }, [selectedValues, options, label]);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 w-full
          px-4 py-2.5 rounded-xl
          bg-white/5 border transition-all duration-300
          text-sm font-medium
          ${isOpen
            ? 'border-primary-500/50 ring-2 ring-primary-500/20'
            : selectedValues.length > 0
            ? 'border-primary-500/30 text-primary-300'
            : 'border-white/10 text-white/70 hover:border-white/20'
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="
              absolute top-full left-0 mt-2 z-20
              min-w-full w-max max-w-xs
              bg-festival-dark/95 backdrop-blur-xl
              border border-white/10 rounded-xl
              shadow-2xl overflow-hidden
              animate-fadeInUp
            "
            role="listbox"
            aria-multiselectable={multiple}
          >
            <ul className="max-h-64 overflow-y-auto py-1">
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <li key={option.value}>
                    <button
                      onClick={() => toggleOption(option.value)}
                      className={`
                        flex items-center gap-3 w-full px-4 py-2.5
                        text-sm transition-colors duration-150
                        ${isSelected
                          ? 'bg-primary-500/20 text-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }
                      `}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span
                        className={`
                          flex items-center justify-center w-4 h-4 rounded
                          border transition-all duration-200
                          ${isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-white/30'
                          }
                        `}
                      >
                        {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                      </span>
                      <span className="flex-1 text-left">{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-white/40 text-xs">({option.count})</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {multiple && selectedValues.length > 0 && (
              <div className="border-t border-white/10 p-2">
                <button
                  onClick={() => onChange([])}
                  className="w-full px-3 py-1.5 text-sm text-white/50 hover:text-white transition-colors"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Price Range Slider Component
// ============================================

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: PriceRangeFilter;
  onChange: (value: PriceRangeFilter) => void;
  currency?: string;
  className?: string;
}

function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  currency = 'EUR',
  className = '',
}: PriceRangeSliderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMin = value.min ?? min;
  const currentMax = value.max ?? max;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const hasFilter = value.min !== null || value.max !== null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 w-full
          px-4 py-2.5 rounded-xl
          bg-white/5 border transition-all duration-300
          text-sm font-medium
          ${isOpen
            ? 'border-primary-500/50 ring-2 ring-primary-500/20'
            : hasFilter
            ? 'border-primary-500/30 text-primary-300'
            : 'border-white/10 text-white/70 hover:border-white/20'
          }
        `}
        aria-expanded={isOpen}
      >
        <span>
          {hasFilter
            ? `${formatPrice(currentMin)} - ${formatPrice(currentMax)}`
            : 'Price Range'}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="
              absolute top-full left-0 mt-2 z-20
              w-72 p-4
              bg-festival-dark/95 backdrop-blur-xl
              border border-white/10 rounded-xl
              shadow-2xl
              animate-fadeInUp
            "
          >
            <div className="space-y-4">
              {/* Min/Max Inputs */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">Min</label>
                  <input
                    type="number"
                    min={min}
                    max={currentMax}
                    value={currentMin}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        min: parseInt(e.target.value) || null,
                      })
                    }
                    className="
                      w-full px-3 py-2 rounded-lg
                      bg-white/5 border border-white/10
                      text-white text-sm
                      focus:outline-none focus:border-primary-500/50
                    "
                    aria-label="Minimum price"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">Max</label>
                  <input
                    type="number"
                    min={currentMin}
                    max={max}
                    value={currentMax}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        max: parseInt(e.target.value) || null,
                      })
                    }
                    className="
                      w-full px-3 py-2 rounded-lg
                      bg-white/5 border border-white/10
                      text-white text-sm
                      focus:outline-none focus:border-primary-500/50
                    "
                    aria-label="Maximum price"
                  />
                </div>
              </div>

              {/* Range Slider */}
              <div className="relative pt-2">
                <div className="h-1 bg-white/10 rounded-full">
                  <div
                    className="absolute h-1 bg-primary-500 rounded-full"
                    style={{
                      left: `${((currentMin - min) / (max - min)) * 100}%`,
                      right: `${100 - ((currentMax - min) / (max - min)) * 100}%`,
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={currentMin}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      min: Math.min(parseInt(e.target.value), currentMax),
                    })
                  }
                  className="absolute top-0 w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                  aria-label="Minimum price slider"
                />
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={currentMax}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      max: Math.max(parseInt(e.target.value), currentMin),
                    })
                  }
                  className="absolute top-0 w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                  aria-label="Maximum price slider"
                />
              </div>

              {/* Quick Select */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Under 50', min: null, max: 50 },
                  { label: '50-100', min: 50, max: 100 },
                  { label: '100-200', min: 100, max: 200 },
                  { label: '200+', min: 200, max: null },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => onChange({ min: preset.min, max: preset.max })}
                    className="
                      px-3 py-1 rounded-full text-xs
                      bg-white/5 text-white/60
                      hover:bg-white/10 hover:text-white
                      transition-colors duration-200
                    "
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Clear Button */}
              {hasFilter && (
                <button
                  onClick={() => onChange({ min: null, max: null })}
                  className="w-full text-sm text-white/50 hover:text-white transition-colors"
                >
                  Clear price filter
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Date Range Picker Component
// ============================================

interface DateRangePickerProps {
  value: DateRangeFilter;
  onChange: (value: DateRangeFilter) => void;
  className?: string;
}

function DateRangePicker({
  value,
  onChange,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) {return '';}
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const hasFilter = value.start !== null || value.end !== null;

  const displayValue = hasFilter
    ? `${formatDate(value.start) || 'Any'} - ${formatDate(value.end) || 'Any'}`
    : 'Any Date';

  // Quick select presets
  const presets = [
    { label: 'This Week', start: new Date(), end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { label: 'This Month', start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { label: 'Next 3 Months', start: new Date(), end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    { label: 'Summer 2026', start: new Date('2026-06-01'), end: new Date('2026-08-31') },
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 w-full
          px-4 py-2.5 rounded-xl
          bg-white/5 border transition-all duration-300
          text-sm font-medium
          ${isOpen
            ? 'border-primary-500/50 ring-2 ring-primary-500/20'
            : hasFilter
            ? 'border-primary-500/30 text-primary-300'
            : 'border-white/10 text-white/70 hover:border-white/20'
          }
        `}
        aria-expanded={isOpen}
      >
        <span>{displayValue}</span>
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="
              absolute top-full left-0 mt-2 z-20
              w-72 p-4
              bg-festival-dark/95 backdrop-blur-xl
              border border-white/10 rounded-xl
              shadow-2xl
              animate-fadeInUp
            "
          >
            <div className="space-y-4">
              {/* Date Inputs */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">From</label>
                  <input
                    type="date"
                    value={value.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        start: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                    className="
                      w-full px-3 py-2 rounded-lg
                      bg-white/5 border border-white/10
                      text-white text-sm
                      focus:outline-none focus:border-primary-500/50
                    "
                    aria-label="Start date"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">To</label>
                  <input
                    type="date"
                    value={value.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        end: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                    className="
                      w-full px-3 py-2 rounded-lg
                      bg-white/5 border border-white/10
                      text-white text-sm
                      focus:outline-none focus:border-primary-500/50
                    "
                    aria-label="End date"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-1">
                <div className="text-xs text-white/50 mb-2">Quick Select</div>
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      onChange({ start: preset.start, end: preset.end });
                      setIsOpen(false);
                    }}
                    className="
                      block w-full text-left px-3 py-2 rounded-lg
                      text-sm text-white/70
                      hover:bg-white/5 hover:text-white
                      transition-colors duration-150
                    "
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Clear */}
              {hasFilter && (
                <button
                  onClick={() => onChange({ start: null, end: null })}
                  className="w-full text-sm text-white/50 hover:text-white transition-colors"
                >
                  Clear date filter
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Sort Selector Component
// ============================================

interface SortSelectorProps {
  sortBy: FestivalFiltersState['sortBy'];
  sortOrder: FestivalFiltersState['sortOrder'];
  onChange: (sortBy: FestivalFiltersState['sortBy'], sortOrder: FestivalFiltersState['sortOrder']) => void;
  className?: string;
}

function SortSelector({
  sortBy,
  sortOrder,
  onChange,
  className = '',
}: SortSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'price', label: 'Price' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'name', label: 'Name' },
  ] as const;

  const currentLabel = sortOptions.find((o) => o.value === sortBy)?.label || 'Sort';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 w-full
          px-4 py-2.5 rounded-xl
          bg-white/5 border border-white/10 transition-all duration-300
          text-sm font-medium text-white/70
          hover:border-white/20
          ${isOpen ? 'border-primary-500/50 ring-2 ring-primary-500/20' : ''}
        `}
        aria-expanded={isOpen}
      >
        <span>Sort: {currentLabel}</span>
        <span className="text-white/40">
          {sortOrder === 'asc' ? '(A-Z)' : '(Z-A)'}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="
              absolute top-full right-0 mt-2 z-20
              w-48
              bg-festival-dark/95 backdrop-blur-xl
              border border-white/10 rounded-xl
              shadow-2xl overflow-hidden
              animate-fadeInUp
            "
          >
            <ul className="py-1">
              {sortOptions.map((option) => (
                <li key={option.value}>
                  <button
                    onClick={() => {
                      if (sortBy === option.value) {
                        onChange(option.value, sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        onChange(option.value, 'asc');
                      }
                      setIsOpen(false);
                    }}
                    className={`
                      flex items-center justify-between w-full px-4 py-2.5
                      text-sm transition-colors duration-150
                      ${sortBy === option.value
                        ? 'bg-primary-500/20 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      <span className="text-primary-400">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Active Filters Pills Component
// ============================================

interface ActiveFiltersPillsProps {
  filters: FestivalFiltersState;
  genreOptions: FilterOption[];
  locationOptions: FilterOption[];
  onRemove: (key: keyof FestivalFiltersState, value?: string) => void;
  onClearAll: () => void;
}

function ActiveFiltersPills({
  filters,
  genreOptions,
  locationOptions,
  onRemove,
  onClearAll,
}: ActiveFiltersPillsProps) {
  const pills: { key: keyof FestivalFiltersState; label: string; value?: string }[] = [];

  // Genre pills
  filters.genres.forEach((genre) => {
    const option = genreOptions.find((o) => o.value === genre);
    pills.push({ key: 'genres', label: option?.label || genre, value: genre });
  });

  // Location pills
  filters.locations.forEach((location) => {
    const option = locationOptions.find((o) => o.value === location);
    pills.push({ key: 'locations', label: option?.label || location, value: location });
  });

  // Date range pill
  if (filters.dateRange.start || filters.dateRange.end) {
    const formatDate = (date: Date | null) =>
      date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Any';
    pills.push({
      key: 'dateRange',
      label: `${formatDate(filters.dateRange.start)} - ${formatDate(filters.dateRange.end)}`,
    });
  }

  // Price range pill
  if (filters.priceRange.min !== null || filters.priceRange.max !== null) {
    const min = filters.priceRange.min ?? 0;
    const max = filters.priceRange.max ?? '∞';
    pills.push({ key: 'priceRange', label: `${min} - ${max}` });
  }

  if (pills.length === 0) {return null;}

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill, index) => (
        <span
          key={`${pill.key}-${pill.value || index}`}
          className="
            inline-flex items-center gap-1.5 px-3 py-1.5
            bg-primary-500/20 border border-primary-500/30
            text-primary-300 text-sm rounded-full
          "
        >
          {pill.label}
          <button
            onClick={() => onRemove(pill.key, pill.value)}
            className="hover:text-white transition-colors"
            aria-label={`Remove ${pill.label} filter`}
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-sm text-white/50 hover:text-white transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}

// ============================================
// Main Festival Filters Component
// ============================================

export function FestivalFilters({
  filters,
  onFiltersChange,
  genreOptions,
  locationOptions,
  statusOptions = [],
  priceMin = 0,
  priceMax = 500,
  showStatusFilter = false,
  variant = 'horizontal',
  className = '',
}: FestivalFiltersProps) {
  // Handle filter changes
  const handleGenresChange = useCallback(
    (genres: string[]) => onFiltersChange({ ...filters, genres }),
    [filters, onFiltersChange]
  );

  const handleLocationsChange = useCallback(
    (locations: string[]) => onFiltersChange({ ...filters, locations }),
    [filters, onFiltersChange]
  );

  const handleStatusChange = useCallback(
    (status: string[]) => onFiltersChange({ ...filters, status }),
    [filters, onFiltersChange]
  );

  const handleDateRangeChange = useCallback(
    (dateRange: DateRangeFilter) => onFiltersChange({ ...filters, dateRange }),
    [filters, onFiltersChange]
  );

  const handlePriceRangeChange = useCallback(
    (priceRange: PriceRangeFilter) => onFiltersChange({ ...filters, priceRange }),
    [filters, onFiltersChange]
  );

  const handleSortChange = useCallback(
    (sortBy: FestivalFiltersState['sortBy'], sortOrder: FestivalFiltersState['sortOrder']) =>
      onFiltersChange({ ...filters, sortBy, sortOrder }),
    [filters, onFiltersChange]
  );

  // Handle removing individual filters
  const handleRemoveFilter = useCallback(
    (key: keyof FestivalFiltersState, value?: string) => {
      if (key === 'genres' && value) {
        onFiltersChange({ ...filters, genres: filters.genres.filter((g) => g !== value) });
      } else if (key === 'locations' && value) {
        onFiltersChange({ ...filters, locations: filters.locations.filter((l) => l !== value) });
      } else if (key === 'dateRange') {
        onFiltersChange({ ...filters, dateRange: { start: null, end: null } });
      } else if (key === 'priceRange') {
        onFiltersChange({ ...filters, priceRange: { min: null, max: null } });
      }
    },
    [filters, onFiltersChange]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    onFiltersChange(defaultFilters);
  }, [onFiltersChange]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.genres.length > 0) {count++;}
    if (filters.locations.length > 0) {count++;}
    if (filters.dateRange.start || filters.dateRange.end) {count++;}
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) {count++;}
    if (filters.status.length > 0) {count++;}
    return count;
  }, [filters]);

  const isVertical = variant === 'vertical';

  return (
    <div className={className}>
      {/* Filters Row */}
      <div
        className={`
          ${isVertical ? 'flex flex-col space-y-3' : 'flex flex-wrap items-center gap-3'}
        `}
        role="group"
        aria-label="Festival filters"
      >
        {/* Genres */}
        <DropdownFilter
          label="Genres"
          options={genreOptions}
          selectedValues={filters.genres}
          onChange={handleGenresChange}
          className={isVertical ? 'w-full' : 'w-40'}
        />

        {/* Locations */}
        <DropdownFilter
          label="Location"
          options={locationOptions}
          selectedValues={filters.locations}
          onChange={handleLocationsChange}
          className={isVertical ? 'w-full' : 'w-40'}
        />

        {/* Date Range */}
        <DateRangePicker
          value={filters.dateRange}
          onChange={handleDateRangeChange}
          className={isVertical ? 'w-full' : 'w-48'}
        />

        {/* Price Range */}
        <PriceRangeSlider
          min={priceMin}
          max={priceMax}
          value={filters.priceRange}
          onChange={handlePriceRangeChange}
          className={isVertical ? 'w-full' : 'w-44'}
        />

        {/* Status (optional) */}
        {showStatusFilter && statusOptions.length > 0 && (
          <DropdownFilter
            label="Status"
            options={statusOptions}
            selectedValues={filters.status}
            onChange={handleStatusChange}
            className={isVertical ? 'w-full' : 'w-36'}
          />
        )}

        {/* Spacer for horizontal layout */}
        {!isVertical && <div className="flex-1" />}

        {/* Sort */}
        <SortSelector
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onChange={handleSortChange}
          className={isVertical ? 'w-full' : 'w-44'}
        />
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="mt-4">
          <ActiveFiltersPills
            filters={filters}
            genreOptions={genreOptions}
            locationOptions={locationOptions}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearAll}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Mobile Filter Drawer
// ============================================

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FestivalFiltersState;
  onFiltersChange: (filters: FestivalFiltersState) => void;
  genreOptions: FilterOption[];
  locationOptions: FilterOption[];
  priceMin?: number;
  priceMax?: number;
}

export function FilterDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  genreOptions,
  locationOptions,
  priceMin = 0,
  priceMax = 500,
}: FilterDrawerProps) {
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.genres.length > 0) {count++;}
    if (filters.locations.length > 0) {count++;}
    if (filters.dateRange.start || filters.dateRange.end) {count++;}
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) {count++;}
    return count;
  }, [filters]);

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="
          absolute bottom-0 left-0 right-0
          bg-festival-dark border-t border-white/10
          rounded-t-3xl max-h-[85vh] overflow-hidden
          animate-slideUp
        "
        role="dialog"
        aria-modal="true"
        aria-label="Filter options"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
            aria-label="Close filters"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <FestivalFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
            genreOptions={genreOptions}
            locationOptions={locationOptions}
            priceMin={priceMin}
            priceMax={priceMax}
            variant="vertical"
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-white/10">
          <button
            onClick={() => onFiltersChange(defaultFilters)}
            className="
              flex-1 px-4 py-3 rounded-xl
              bg-white/10 text-white font-medium
              hover:bg-white/15 transition-colors
            "
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="
              flex-1 px-4 py-3 rounded-xl
              bg-gradient-to-r from-primary-500 to-pink-500
              text-white font-medium
              hover:from-primary-600 hover:to-pink-600
              transition-all duration-300
            "
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
