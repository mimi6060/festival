'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

// ============================================
// Types
// ============================================

export interface SearchSuggestion {
  id: string;
  type: 'festival' | 'artist' | 'venue' | 'genre';
  name: string;
  subtitle?: string;
  imageUrl?: string;
}

export interface SearchFilters {
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  genres?: string[];
  location?: string;
  sortBy?: 'date' | 'price' | 'popularity' | 'name';
  sortOrder?: 'asc' | 'desc';
}

interface FestivalSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  suggestions?: SearchSuggestion[];
  isLoading?: boolean;
  placeholder?: string;
  showFilters?: boolean;
  showSuggestions?: boolean;
  className?: string;
  recentSearches?: string[];
  popularSearches?: string[];
  availableGenres?: string[];
}

// ============================================
// Search Icon Component
// ============================================

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

// ============================================
// Close Icon Component
// ============================================

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// ============================================
// Filter Icon Component
// ============================================

function FilterIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

// ============================================
// Main Search Component
// ============================================

export function FestivalSearch({
  onSearch,
  onSuggestionSelect,
  suggestions = [],
  isLoading = false,
  placeholder = 'Search festivals, artists, venues...',
  showFilters = true,
  showSuggestions = true,
  className = '',
  recentSearches = [],
  popularSearches = [],
  availableGenres = [],
}: FestivalSearchProps) {
  // State
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'date',
    sortOrder: 'asc',
  });

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  // Debounced query
  const debouncedQuery = useDebounce(query, 300);

  // Handle search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      onSearch(debouncedQuery, filters);
    }
  }, [debouncedQuery, filters, onSearch]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
        setIsFiltersOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const totalItems = suggestions.length + recentSearches.length + popularSearches.length;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < totalItems - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : totalItems - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0) {
            // Handle selection based on index
            if (selectedIndex < suggestions.length) {
              handleSuggestionClick(suggestions[selectedIndex]);
            } else if (selectedIndex < suggestions.length + recentSearches.length) {
              const recentIndex = selectedIndex - suggestions.length;
              setQuery(recentSearches[recentIndex]);
              onSearch(recentSearches[recentIndex], filters);
            } else {
              const popularIndex = selectedIndex - suggestions.length - recentSearches.length;
              setQuery(popularSearches[popularIndex]);
              onSearch(popularSearches[popularIndex], filters);
            }
          } else {
            onSearch(query, filters);
          }
          setIsFocused(false);
          break;
        case 'Escape':
          setIsFocused(false);
          inputRef.current?.blur();
          break;
      }
    },
    [suggestions, recentSearches, popularSearches, selectedIndex, query, filters, onSearch]
  );

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.name);
    setIsFocused(false);
    onSuggestionSelect?.(suggestion);
  };

  // Handle filter change
  const handleFilterChange = (key: keyof SearchFilters, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Clear query
  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange?.start || filters.dateRange?.end) count++;
    if (filters.priceRange?.min || filters.priceRange?.max) count++;
    if (filters.genres && filters.genres.length > 0) count++;
    if (filters.location) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();
  const showDropdown = isFocused && (suggestions.length > 0 || recentSearches.length > 0 || popularSearches.length > 0 || !query);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Container */}
      <div
        className={`
          relative flex items-center gap-3
          bg-white/5 backdrop-blur-lg
          border rounded-2xl
          transition-all duration-300
          ${isFocused
            ? 'border-primary-500/50 ring-2 ring-primary-500/20'
            : 'border-white/10 hover:border-white/20'
          }
        `}
      >
        {/* Search Icon */}
        <div className="pl-4">
          <SearchIcon className="w-5 h-5 text-white/50" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            flex-1 py-4 bg-transparent
            text-white placeholder-white/50
            focus:outline-none
          `}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined
          }
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="pr-2">
            <svg
              className="animate-spin w-5 h-5 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}

        {/* Clear Button */}
        {query && (
          <button
            onClick={clearQuery}
            className="p-2 text-white/50 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}

        {/* Filter Button */}
        {showFilters && (
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`
              relative p-2 mr-2 rounded-xl
              transition-all duration-300
              ${isFiltersOpen
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-white/50 hover:text-white hover:bg-white/5'
              }
            `}
            aria-label="Toggle filters"
            aria-expanded={isFiltersOpen}
          >
            <FilterIcon className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span
                className="
                  absolute -top-1 -right-1
                  w-4 h-4 rounded-full
                  bg-primary-500 text-white text-xs
                  flex items-center justify-center
                  font-semibold
                "
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && showDropdown && (
        <div
          className="
            absolute top-full left-0 right-0 mt-2 z-50
            bg-festival-dark/95 backdrop-blur-xl
            border border-white/10 rounded-2xl
            shadow-2xl overflow-hidden
            animate-fadeInUp
          "
        >
          <ul
            ref={suggestionsRef}
            id="search-suggestions"
            role="listbox"
            className="max-h-96 overflow-y-auto"
          >
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <>
                <li className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Suggestions
                </li>
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.id}
                    id={`suggestion-${index}`}
                    role="option"
                    aria-selected={selectedIndex === index}
                    className={`
                      flex items-center gap-3 px-4 py-3 cursor-pointer
                      transition-colors duration-150
                      ${selectedIndex === index
                        ? 'bg-primary-500/20 text-white'
                        : 'text-white/80 hover:bg-white/5'
                      }
                    `}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion.imageUrl ? (
                      <img
                        src={suggestion.imageUrl}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className={`
                          w-10 h-10 rounded-lg flex items-center justify-center
                          ${suggestion.type === 'festival'
                            ? 'bg-primary-500/20 text-primary-400'
                            : suggestion.type === 'artist'
                            ? 'bg-pink-500/20 text-pink-400'
                            : suggestion.type === 'venue'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-secondary-400/20 text-secondary-400'
                          }
                        `}
                      >
                        {suggestion.type === 'festival' && '🎪'}
                        {suggestion.type === 'artist' && '🎤'}
                        {suggestion.type === 'venue' && '📍'}
                        {suggestion.type === 'genre' && '🎵'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{suggestion.name}</div>
                      {suggestion.subtitle && (
                        <div className="text-sm text-white/50 truncate">
                          {suggestion.subtitle}
                        </div>
                      )}
                    </div>
                    <span
                      className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${suggestion.type === 'festival'
                          ? 'bg-primary-500/10 text-primary-400'
                          : suggestion.type === 'artist'
                          ? 'bg-pink-500/10 text-pink-400'
                          : suggestion.type === 'venue'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-secondary-400/10 text-secondary-400'
                        }
                      `}
                    >
                      {suggestion.type}
                    </span>
                  </li>
                ))}
              </>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <>
                <li className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider border-t border-white/10">
                  Recent Searches
                </li>
                {recentSearches.map((search, index) => {
                  const itemIndex = suggestions.length + index;
                  return (
                    <li
                      key={`recent-${index}`}
                      id={`suggestion-${itemIndex}`}
                      role="option"
                      aria-selected={selectedIndex === itemIndex}
                      className={`
                        flex items-center gap-3 px-4 py-3 cursor-pointer
                        transition-colors duration-150
                        ${selectedIndex === itemIndex
                          ? 'bg-primary-500/20 text-white'
                          : 'text-white/80 hover:bg-white/5'
                        }
                      `}
                      onClick={() => {
                        setQuery(search);
                        onSearch(search, filters);
                        setIsFocused(false);
                      }}
                    >
                      <svg
                        className="w-5 h-5 text-white/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{search}</span>
                    </li>
                  );
                })}
              </>
            )}

            {/* Popular Searches */}
            {!query && popularSearches.length > 0 && (
              <>
                <li className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider border-t border-white/10">
                  Popular Searches
                </li>
                {popularSearches.map((search, index) => {
                  const itemIndex = suggestions.length + recentSearches.length + index;
                  return (
                    <li
                      key={`popular-${index}`}
                      id={`suggestion-${itemIndex}`}
                      role="option"
                      aria-selected={selectedIndex === itemIndex}
                      className={`
                        flex items-center gap-3 px-4 py-3 cursor-pointer
                        transition-colors duration-150
                        ${selectedIndex === itemIndex
                          ? 'bg-primary-500/20 text-white'
                          : 'text-white/80 hover:bg-white/5'
                        }
                      `}
                      onClick={() => {
                        setQuery(search);
                        onSearch(search, filters);
                        setIsFocused(false);
                      }}
                    >
                      <svg
                        className="w-5 h-5 text-secondary-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      <span>{search}</span>
                    </li>
                  );
                })}
              </>
            )}

            {/* No Results */}
            {query && suggestions.length === 0 && !isLoading && (
              <li className="px-4 py-8 text-center text-white/50">
                <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-1">Try different keywords or filters</p>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Filters Panel */}
      {isFiltersOpen && (
        <div
          className="
            absolute top-full left-0 right-0 mt-2 z-40
            bg-festival-dark/95 backdrop-blur-xl
            border border-white/10 rounded-2xl
            shadow-2xl p-6
            animate-fadeInUp
          "
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="
                    flex-1 px-3 py-2 rounded-lg
                    bg-white/5 border border-white/10
                    text-white text-sm
                    focus:outline-none focus:border-primary-500/50
                  "
                  onChange={(e) =>
                    handleFilterChange('dateRange', {
                      ...filters.dateRange,
                      start: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  aria-label="Start date"
                />
                <input
                  type="date"
                  className="
                    flex-1 px-3 py-2 rounded-lg
                    bg-white/5 border border-white/10
                    text-white text-sm
                    focus:outline-none focus:border-primary-500/50
                  "
                  onChange={(e) =>
                    handleFilterChange('dateRange', {
                      ...filters.dateRange,
                      end: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  aria-label="End date"
                />
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Price Range
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  className="
                    flex-1 px-3 py-2 rounded-lg
                    bg-white/5 border border-white/10
                    text-white text-sm placeholder-white/30
                    focus:outline-none focus:border-primary-500/50
                  "
                  onChange={(e) =>
                    handleFilterChange('priceRange', {
                      ...filters.priceRange,
                      min: parseInt(e.target.value) || 0,
                    })
                  }
                  aria-label="Minimum price"
                />
                <span className="text-white/40">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  className="
                    flex-1 px-3 py-2 rounded-lg
                    bg-white/5 border border-white/10
                    text-white text-sm placeholder-white/30
                    focus:outline-none focus:border-primary-500/50
                  "
                  onChange={(e) =>
                    handleFilterChange('priceRange', {
                      ...filters.priceRange,
                      max: parseInt(e.target.value) || 0,
                    })
                  }
                  aria-label="Maximum price"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Location
              </label>
              <input
                type="text"
                placeholder="City or region"
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-white/5 border border-white/10
                  text-white text-sm placeholder-white/30
                  focus:outline-none focus:border-primary-500/50
                "
                onChange={(e) => handleFilterChange('location', e.target.value)}
                aria-label="Location filter"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Sort By
              </label>
              <select
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-white/5 border border-white/10
                  text-white text-sm
                  focus:outline-none focus:border-primary-500/50
                "
                value={filters.sortBy}
                onChange={(e) =>
                  handleFilterChange('sortBy', e.target.value as SearchFilters['sortBy'])
                }
                aria-label="Sort by"
              >
                <option value="date">Date</option>
                <option value="price">Price</option>
                <option value="popularity">Popularity</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Genres */}
          {availableGenres.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-white/60 mb-3">
                Genres
              </label>
              <div className="flex flex-wrap gap-2">
                {availableGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => {
                      const currentGenres = filters.genres || [];
                      const newGenres = currentGenres.includes(genre)
                        ? currentGenres.filter((g) => g !== genre)
                        : [...currentGenres, genre];
                      handleFilterChange('genres', newGenres);
                    }}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium
                      transition-all duration-200
                      ${filters.genres?.includes(genre)
                        ? 'bg-primary-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }
                    `}
                    aria-pressed={filters.genres?.includes(genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter Actions */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/10">
            <button
              onClick={() => {
                setFilters({
                  sortBy: 'date',
                  sortOrder: 'asc',
                });
              }}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
            <button
              onClick={() => {
                onSearch(query, filters);
                setIsFiltersOpen(false);
              }}
              className="
                px-6 py-2 rounded-xl
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
      )}
    </div>
  );
}

// ============================================
// Search Bar Minimal (for header)
// ============================================

interface SearchBarMinimalProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBarMinimal({
  onSearch,
  placeholder = 'Search...',
  className = '',
}: SearchBarMinimalProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div
        className={`
          flex items-center gap-2 px-4 py-2
          bg-white/5 rounded-full
          border transition-all duration-300
          ${isFocused
            ? 'border-primary-500/50 ring-2 ring-primary-500/20'
            : 'border-white/10 hover:border-white/20'
          }
        `}
      >
        <SearchIcon className="w-4 h-4 text-white/50" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="
            bg-transparent text-white text-sm
            placeholder-white/50 focus:outline-none
            w-32 sm:w-48 focus:w-64
            transition-all duration-300
          "
          aria-label="Search"
        />
      </div>
    </form>
  );
}
